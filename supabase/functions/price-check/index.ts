// Supabase Edge Function: Günlük fiyat düşüş kontrolü
// Tetiklemek için: supabase functions invoke price-check
// Cron schedule için: supabase/config.toml'a [functions.price-check.cron] = "0 9 * * *" eklenebilir

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
}

async function sendPushNotifications(messages: PushMessage[]) {
  if (messages.length === 0) return;
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
}

Deno.serve(async () => {
  try {
    // 1. Tüm kayıtlı ürünleri kullanıcılarıyla al
    const { data: savedProducts, error: spErr } = await supabase
      .from('saved_products')
      .select('user_id, product_id, products(id, name, price)');

    if (spErr) throw spErr;

    const droppedItems: { userId: string; productId: string; productName: string; newPrice: number; oldPrice: number }[] = [];

    // 2. Her ürün için fiyat geçmişini kontrol et
    for (const sp of savedProducts ?? []) {
      const product = (sp as any).products;
      if (!product) continue;

      const { data: history } = await supabase
        .from('product_price_history')
        .select('price, recorded_at')
        .eq('product_id', sp.product_id)
        .order('recorded_at', { ascending: false })
        .limit(2);

      if (!history || history.length < 2) continue;

      const latestPrice = Number(history[0].price);
      const prevPrice = Number(history[1].price);

      // %2'den fazla düşüş varsa bildirim gönder
      if (latestPrice < prevPrice * 0.98) {
        droppedItems.push({
          userId: sp.user_id,
          productId: sp.product_id,
          productName: product.name,
          newPrice: latestPrice,
          oldPrice: prevPrice,
        });
      }
    }

    if (droppedItems.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: 'Fiyat düşüşü yok' }));
    }

    // 3. In-app bildirimler oluştur
    const notifications = droppedItems.map(item => ({
      user_id: item.userId,
      type: 'priceDrop',
      title: 'Fiyat düştü! 🎉',
      body: `"${item.productName}" artık ₺${item.newPrice.toLocaleString('tr-TR')} (önceden ₺${item.oldPrice.toLocaleString('tr-TR')})`,
      data: { productId: item.productId, type: 'priceDrop' },
    }));

    const { error: notifErr } = await supabase.from('notifications').insert(notifications);
    if (notifErr) throw notifErr;

    // 4. Push token'larını al ve push gönder
    const userIds = [...new Set(droppedItems.map(i => i.userId))];
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('user_id, token')
      .in('user_id', userIds);

    const pushMessages: PushMessage[] = droppedItems.flatMap(item => {
      const userTokens = (tokens ?? []).filter(t => t.user_id === item.userId);
      return userTokens.map(t => ({
        to: t.token,
        title: 'Fiyat düştü! 🎉',
        body: `"${item.productName}" ₺${item.newPrice.toLocaleString('tr-TR')} oldu`,
        data: { productId: item.productId },
        sound: 'default',
      }));
    });

    await sendPushNotifications(pushMessages);

    return new Response(
      JSON.stringify({ processed: droppedItems.length, pushSent: pushMessages.length }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
