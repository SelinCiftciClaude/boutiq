// Supabase Edge Function: check-prices
// pg_cron ile 15 dakikada bir tetiklenir
// Takip edilen ürünlerin fiyatlarını kontrol eder, bildirim üretir

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MIN_DROP_PCT = 5; // %5'ten az değişimi yoksay

Deno.serve(async (req) => {
  // Cron job authorization
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Takip edilen tüm aktif ürünleri getir (benzersiz product_id)
  const { data: watches, error: watchErr } = await supabase
    .from('product_watches')
    .select(`
      *,
      products ( id, name, price, original_price, in_stock, affiliate_url,
        brands ( name, logo_url )
      )
    `)
    .eq('is_active', true);

  if (watchErr) {
    console.error('Watch listesi alınamadı:', watchErr.message);
    return new Response(JSON.stringify({ error: watchErr.message }), { status: 500 });
  }

  let processed = 0;
  let notificationsSent = 0;

  // Her benzersiz ürünü bir kez scrape et
  const productIds = [...new Set((watches ?? []).map(w => w.product_id))];

  for (const productId of productIds) {
    const product = watches?.find(w => w.product_id === productId)?.products;
    if (!product) continue;

    // Gerçek scraping için affiliate_url kullanılır (şimdilik DB değerini kullan)
    const currentPrice = product.price as number;
    const currentStock = product.in_stock ? 'in_stock' : 'out_of_stock';

    // Son fiyat kaydını al
    const { data: lastRecord } = await supabase
      .from('product_price_history')
      .select('price, stock_status')
      .eq('product_id', productId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const oldPrice = lastRecord?.price ?? currentPrice;
    const oldStock = lastRecord?.stock_status ?? 'in_stock';
    const dropPct = oldPrice > 0 ? ((oldPrice - currentPrice) / oldPrice) * 100 : 0;
    processed++;

    // Bu ürünü takip eden tüm kullanıcılara bildirim gönder
    const productWatches = (watches ?? []).filter(w => w.product_id === productId);

    for (const watch of productWatches) {
      const prefs = await getUserPrefs(supabase, watch.user_id);

      // Sessiz saatler kontrolü
      if (prefs?.quiet_hours_enabled && isQuietHour(prefs.quiet_start, prefs.quiet_end)) continue;

      // Günlük limit
      if (prefs && prefs.notifications_sent_today >= prefs.daily_limit) continue;

      const notifications = [];

      // Fiyat düşüşü
      if (watch.watch_price_drop && currentPrice < oldPrice && dropPct >= MIN_DROP_PCT) {
        if (!prefs || dropPct >= prefs.min_discount_pct) {
          notifications.push({
            user_id: watch.user_id,
            product_id: productId,
            type: 'price_drop',
            title: 'Fiyat düştü! 🎉',
            body: `${product.brands?.name} ürününde %${dropPct.toFixed(0)} indirim: ₺${oldPrice.toLocaleString('tr')} → ₺${currentPrice.toLocaleString('tr')}`,
            payload: { old_price: oldPrice, new_price: currentPrice, drop_pct: dropPct },
            is_read: false,
          });
        }
      }

      // Hedef fiyat
      if (watch.target_price && currentPrice <= watch.target_price && oldPrice > watch.target_price) {
        notifications.push({
          user_id: watch.user_id,
          product_id: productId,
          type: 'target_reached',
          title: 'Hedef fiyata ulaştı! ✨',
          body: `Takipteki ürün hedef fiyatın altına düştü: ₺${currentPrice.toLocaleString('tr')}`,
          payload: { target_price: watch.target_price, new_price: currentPrice },
          is_read: false,
        });
      }

      // Stok azaldı
      if (watch.watch_low_stock && currentStock === 'low_stock' && oldStock === 'in_stock') {
        notifications.push({
          user_id: watch.user_id,
          product_id: productId,
          type: 'low_stock',
          title: 'Stok azalıyor ⚠️',
          body: `${product.name} ürününden son birkaç adet kaldı!`,
          payload: { stock_status: currentStock },
          is_read: false,
        });
      }

      // Tekrar stoğa girdi
      if (watch.watch_back_in_stock && currentStock === 'in_stock' && oldStock === 'out_of_stock') {
        notifications.push({
          user_id: watch.user_id,
          product_id: productId,
          type: 'back_in_stock',
          title: 'Tekrar stokta! ✨',
          body: `${product.name} ürünü tekrar satışa girdi.`,
          payload: { stock_status: currentStock },
          is_read: false,
        });
      }

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
        notificationsSent += notifications.length;

        // Günlük sayacı artır
        if (prefs) {
          await supabase
            .from('notification_preferences')
            .update({ notifications_sent_today: prefs.notifications_sent_today + notifications.length })
            .eq('user_id', watch.user_id);
        }
      }
    }

    // Fiyat geçmişi güncelle (değişiklik varsa)
    if (currentPrice !== oldPrice || currentStock !== oldStock) {
      await supabase.from('product_price_history').insert({
        product_id: productId,
        price: currentPrice,
        stock_status: currentStock,
        is_on_sale: currentPrice < oldPrice,
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed, notificationsSent }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function getUserPrefs(supabase: any, userId: string) {
  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

function isQuietHour(start: string, end: string): boolean {
  const now = new Date();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin   = eh * 60 + em;
  // Gece yarısını geçen aralık (22:00 → 09:00)
  if (startMin > endMin) return nowMin >= startMin || nowMin < endMin;
  return nowMin >= startMin && nowMin < endMin;
}
