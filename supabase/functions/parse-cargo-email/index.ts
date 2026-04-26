// Supabase Edge Function: Gmail kargo e-postası parse edici
// Çağrı: supabase functions invoke parse-cargo-email --body '{"userId":"...","emailBody":"..."}'
//
// Gereksinimler:
//   - Google Cloud Console'da OAuth 2.0 client ID ayarlanmış olmalı
//   - GOOGLE_CLIENT_ID ve GOOGLE_CLIENT_SECRET env var'ları set edilmeli
//   - Kullanıcının profiles.connected_accounts.gmail.refresh_token'ı olmalı

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Kargo firması tespiti ve takip numarası çıkarımı
const CARRIER_PATTERNS: { carrier: string; patterns: RegExp[] }[] = [
  { carrier: 'Yurtiçi Kargo', patterns: [/yurtiçi/i, /yurtici/i, /yk\s*:\s*(\w+)/i] },
  { carrier: 'MNG Kargo',     patterns: [/mng\s*kargo/i, /mng\s*:\s*(\w+)/i] },
  { carrier: 'PTT Kargo',     patterns: [/ptt\s*kargo/i, /ptt\s*:\s*(\w+)/i] },
  { carrier: 'Aras Kargo',    patterns: [/aras\s*kargo/i, /aras\s*:\s*(\w+)/i] },
  { carrier: 'Sürat Kargo',   patterns: [/sürat\s*kargo/i, /surat\s*kargo/i] },
  { carrier: 'UPS',           patterns: [/\bups\b/i] },
  { carrier: 'DHL',           patterns: [/\bdhl\b/i] },
];

const TRACKING_PATTERNS = [
  /takip\s*no[:.]\s*([A-Z0-9]{6,20})/i,
  /kargo\s*no[:.]\s*([A-Z0-9]{6,20})/i,
  /tracking[:\s]+([A-Z0-9]{6,20})/i,
  /barkod[:.]\s*([A-Z0-9]{6,20})/i,
];

function detectCarrier(emailBody: string): string {
  for (const { carrier, patterns } of CARRIER_PATTERNS) {
    if (patterns.some(p => p.test(emailBody))) return carrier;
  }
  return 'Bilinmiyor';
}

function extractTrackingNumber(emailBody: string): string | null {
  for (const pattern of TRACKING_PATTERNS) {
    const match = emailBody.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const { userId, emailBody, brandName, orderNumber } = await req.json();

    if (!userId || !emailBody) {
      return new Response(JSON.stringify({ error: 'userId ve emailBody zorunlu' }), { status: 400 });
    }

    const carrier = detectCarrier(emailBody);
    const trackingNumber = extractTrackingNumber(emailBody);

    // Kargo kaydı oluştur
    const { data: shipment, error } = await supabase.from('shipments').insert({
      user_id: userId,
      brand_name: brandName ?? 'Bilinmiyor',
      order_number: orderNumber ?? `EMAIL-${Date.now()}`,
      tracking_number: trackingNumber,
      carrier,
      status: 'processing',
      status_label: 'İşleniyor',
      source: 'email',
    }).select('id').single();

    if (error) throw error;

    // İlk event ekle
    await supabase.from('shipment_events').insert({
      shipment_id: shipment.id,
      timestamp: new Date().toISOString(),
      description: 'E-posta ile otomatik tespit edildi',
      status: 'processing',
    });

    // In-app bildirim
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'shipment',
      title: 'Yeni kargo tespit edildi 📦',
      body: `${brandName ?? 'Siparişin'} kargo takibine eklendi (${carrier})`,
      data: { shipmentId: shipment.id },
    });

    return new Response(JSON.stringify({ shipmentId: shipment.id, carrier, trackingNumber }));
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
