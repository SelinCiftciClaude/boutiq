// Edge Function: check-favorite-prices
// Tetikleme: pg_cron ile 6 saatte bir
// Takip edilen favorilerin fiyatlarını ve stok durumunu günceller, bildirim üretir.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BATCH_SIZE = 20;
const MIN_DROP_PCT = 3;

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization');
  if (auth !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: favs, error } = await supabase
    .from('favorites')
    .select('id, user_id, source_url, product_name, price_at_save, current_price, current_stock_status, watch_price_drop, watch_stock_change, target_price')
    .lte('next_price_check_at', new Date().toISOString())
    .or('watch_price_drop.eq.true,watch_stock_change.eq.true')
    .limit(BATCH_SIZE);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let processed = 0;
  let notifications = 0;

  for (const fav of (favs ?? [])) {
    try {
      const info = await fetchProductInfo(fav.source_url);
      if (!info) continue;

      const oldPrice = fav.current_price ?? fav.price_at_save ?? 0;
      const newPrice = info.price;
      const oldStock = fav.current_stock_status ?? 'unknown';
      const newStock = info.stockStatus;
      const dropPct  = oldPrice > 0 ? ((oldPrice - newPrice) / oldPrice) * 100 : 0;

      await supabase.from('favorites').update({
        current_price: newPrice,
        current_stock_status: newStock,
        last_price_check_at: new Date().toISOString(),
        next_price_check_at: new Date(Date.now() + 6 * 3_600_000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', fav.id);

      if (Math.abs(newPrice - oldPrice) > 0.01 || newStock !== oldStock) {
        await supabase.from('favorite_price_history').insert({
          favorite_id: fav.id,
          price: newPrice,
          stock_status: newStock,
        });
      }

      const notifs: any[] = [];

      if (fav.watch_price_drop && newPrice < oldPrice && dropPct >= MIN_DROP_PCT) {
        notifs.push({
          user_id: fav.user_id,
          type: 'price_drop',
          title: 'Fiyat düştü! 🎉',
          body: `${fav.product_name}: ₺${oldPrice.toLocaleString('tr')} → ₺${newPrice.toLocaleString('tr')} (%${dropPct.toFixed(0)} düştü)`,
          payload: { favorite_id: fav.id, old_price: oldPrice, new_price: newPrice, drop_pct: dropPct },
          is_read: false,
        });
      }

      if (fav.target_price && newPrice <= fav.target_price && oldPrice > fav.target_price) {
        notifs.push({
          user_id: fav.user_id,
          type: 'target_reached',
          title: 'Hedef fiyata ulaştı! ✨',
          body: `${fav.product_name} ₺${newPrice.toLocaleString('tr')} oldu`,
          payload: { favorite_id: fav.id, target_price: fav.target_price, new_price: newPrice },
          is_read: false,
        });
      }

      if (fav.watch_stock_change) {
        if (newStock === 'out_of_stock' && oldStock !== 'out_of_stock') {
          notifs.push({
            user_id: fav.user_id,
            type: 'out_of_stock',
            title: 'Tükendi ⚠️',
            body: `${fav.product_name} stoktan çıktı`,
            payload: { favorite_id: fav.id },
            is_read: false,
          });
        } else if (newStock === 'in_stock' && oldStock === 'out_of_stock') {
          notifs.push({
            user_id: fav.user_id,
            type: 'back_in_stock',
            title: 'Tekrar stokta! ✨',
            body: `${fav.product_name} tekrar satışa girdi`,
            payload: { favorite_id: fav.id },
            is_read: false,
          });
        }
      }

      if (notifs.length) {
        await supabase.from('notifications').insert(notifs);
        notifications += notifs.length;
      }

      processed++;
    } catch (e) {
      console.error(`favorite ${fav.id}:`, e);
    }
  }

  return new Response(JSON.stringify({ ok: true, processed, notifications }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

interface ProductInfo { price: number; stockStatus: string; }

async function fetchProductInfo(url: string): Promise<ProductInfo | null> {
  try {
    const html = await fetch(url, {
      headers: { 'User-Agent': 'Butika/1.0', 'Accept-Language': 'tr-TR,tr;q=0.9' },
      signal: AbortSignal.timeout(10_000),
    }).then(r => r.text());

    // JSON-LD Product schema
    const ldMatches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const m of ldMatches) {
      try {
        let d = JSON.parse(m[1]);
        if (Array.isArray(d)) d = d.find((x: any) => x['@type'] === 'Product');
        if (d?.['@graph']) d = d['@graph'].find((x: any) => x['@type'] === 'Product');
        if (d?.['@type'] !== 'Product') continue;
        const offer = Array.isArray(d.offers) ? d.offers[0] : (d.offers ?? {});
        return {
          price: parseTurkishPrice(String(offer.price ?? '0')),
          stockStatus: (offer.availability ?? '').toLowerCase().includes('outofstock')
            ? 'out_of_stock' : 'in_stock',
        };
      } catch {}
    }

    // Open Graph / product meta fallback
    const priceStr =
      html.match(/property="product:price:amount"\s+content="([^"]+)"/)?.[1] ??
      html.match(/name="product:price:amount"\s+content="([^"]+)"/)?.[1];
    if (priceStr) {
      return { price: parseTurkishPrice(priceStr), stockStatus: 'unknown' };
    }

    return null;
  } catch {
    return null;
  }
}

function parseTurkishPrice(text: string): number {
  const cleaned = text.replace(/[₺TL\s]/g, '').trim();
  if (/\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
}
