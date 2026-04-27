import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // in_stock=true olan ürünler için bekleyen uyarıları bul
  const { data: alerts } = await supabase
    .from('stock_alerts')
    .select('id, user_id, product_id, products(name, in_stock), profiles(id)')
    .is('notified_at', null);

  const toNotify = (alerts ?? []).filter((a: any) => a.products?.in_stock === true);

  for (const alert of toNotify) {
    // device_tokens'dan token al
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('token')
      .eq('user_id', alert.user_id);

    if (tokens?.length) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens.map((t: any) => ({
          to: t.token,
          title: 'Ürün Tekrar Stokta!',
          body: `${alert.products.name} tekrar stokta. Hemen incele!`,
          data: { productId: alert.product_id },
        }))),
      });
    }

    await supabase.from('stock_alerts').update({ notified_at: new Date().toISOString() }).eq('id', alert.id);
  }

  return new Response(JSON.stringify({ notified: toNotify.length }), { headers: { 'Content-Type': 'application/json' } });
});
