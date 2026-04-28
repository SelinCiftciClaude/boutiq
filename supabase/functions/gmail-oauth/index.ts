import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CLIENT_ID     = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY          = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const REDIRECT_URI         = `${SUPABASE_URL}/functions/v1/gmail-oauth`;
const APP_SCHEME           = 'boutiq://connect-mail';

// ── Kargo e-posta arama sorgusu ───────────────────────────────────────────
const CARGO_QUERY = [
  'from:bildirim@yurticikargo.com',
  'from:bilgi@mngkargo.com.tr',
  'from:bildirim@pttkargo.com',
  'from:kargo@araskargo.com.tr',
  'from:bildirim@suratkargo.com',
  'from:noreply@ups.com',
  'from:pkginfo@dhl.com',
  'kargo OR takip OR sipariş OR "tracking number" OR "kargo takip"',
].join(' OR ');

// ── Takip numarası regex'leri ─────────────────────────────────────────────
const TRACKING_PATTERNS: { carrier: string; regex: RegExp }[] = [
  { carrier: 'Yurtiçi Kargo',  regex: /\b(YK[0-9]{9,12}TR?)\b/i },
  { carrier: 'MNG Kargo',      regex: /\b(MNG[0-9]{9,12})\b/i },
  { carrier: 'PTT Kargo',      regex: /\b(PTT[0-9]{9,12})\b/i },
  { carrier: 'Aras Kargo',     regex: /\b(ARS[0-9]{9,12})\b/i },
  { carrier: 'Sürat Kargo',    regex: /\b(SRT[0-9]{9,12})\b/i },
  { carrier: 'UPS',            regex: /\b(1Z[A-Z0-9]{16})\b/i },
  { carrier: 'DHL',            regex: /\b([0-9]{10,12})\b/ },
  { carrier: 'Kargo',          regex: /takip\s*(?:no|numarası)[:\s]*([A-Z0-9]{8,20})/i },
];

// ── Gönderici adını marka adına çevir ─────────────────────────────────────
function extractBrandName(from: string, subject: string): string {
  const fromName = from.replace(/<.*>/, '').replace(/"/g, '').trim();
  if (fromName && fromName.includes('@') === false) return fromName;
  // Subject'ten marka adı bulmaya çalış
  const match = subject.match(/(?:sipariş|order|kargo)\s*[:\-]?\s*([A-ZÇĞIİÖŞÜa-zçğıiöşü\s]{2,30})/i);
  if (match) return match[1].trim();
  return fromName.split('@')[0] ?? 'Bilinmeyen Marka';
}

// ── Sipariş numarası çıkar ────────────────────────────────────────────────
function extractOrderNumber(body: string, subject: string): string {
  const patterns = [
    /sipariş\s*(?:no|numarası)[:\s#]*([A-Z0-9\-]{6,20})/i,
    /order\s*(?:no|number)[:\s#]*([A-Z0-9\-]{6,20})/i,
    /#([A-Z0-9\-]{6,20})/,
  ];
  for (const p of patterns) {
    const m = (body + ' ' + subject).match(p);
    if (m) return m[1].trim();
  }
  return `ORD-${Date.now().toString(36).toUpperCase()}`;
}

// ── Gmail mesajını decode et ──────────────────────────────────────────────
function decodeBase64Url(str: string): string {
  try {
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  } catch {
    return '';
  }
}

function extractTextFromParts(parts: any[]): string {
  let text = '';
  for (const part of parts ?? []) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text += decodeBase64Url(part.body.data);
    } else if (part.parts) {
      text += extractTextFromParts(part.parts);
    }
  }
  return text;
}

// ── Gmail API çağrıları ────────────────────────────────────────────────────
async function gmailSearch(token: string, query: string): Promise<string[]> {
  const after = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query + ` after:${after}`)}&maxResults=50`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  return (data.messages ?? []).map((m: any) => m.id);
}

async function gmailGetMessage(token: string, id: string): Promise<any> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

// ── Ana handler ────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  const url = new URL(req.url);
  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // userId
  const error = url.searchParams.get('error');

  // Google OAuth hata durumu
  if (error) {
    return Response.redirect(`${APP_SCHEME}?error=${error}`, 302);
  }

  // OAuth kod exchange
  if (!code || !state) {
    return new Response('Geçersiz istek', { status: 400 });
  }

  try {
    // 1. Kodu access_token ile değiştir
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;

    if (!accessToken) {
      return Response.redirect(`${APP_SCHEME}?error=token_exchange_failed`, 302);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 2. Token'ı profile'a kaydet
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', state)
      .single();

    const { data: gmailUser } = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then(r => r.json()).then(d => ({ data: d }));

    await supabase.from('profiles').update({
      connected_accounts: {
        gmail: {
          connected: true,
          email: gmailUser?.email ?? profile?.email ?? '',
          access_token: accessToken,
          refresh_token: refreshToken,
          connected_at: new Date().toISOString(),
        },
      },
    }).eq('id', state);

    // 3. Son 30 günün kargo e-postalarını çek
    const messageIds = await gmailSearch(accessToken, CARGO_QUERY);
    const created: string[] = [];

    for (const msgId of messageIds) {
      try {
        const msg = await gmailGetMessage(accessToken, msgId);
        const headers = msg.payload?.headers ?? [];
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

        const subject = getHeader('Subject');
        const from    = getHeader('From');
        const dateStr = getHeader('Date');
        const msgDate = dateStr ? new Date(dateStr) : new Date();

        // Body text
        const bodyText = msg.payload?.body?.data
          ? decodeBase64Url(msg.payload.body.data)
          : extractTextFromParts(msg.payload?.parts ?? []);

        const fullText = subject + ' ' + bodyText;

        // Takip numarası bul
        let trackingNumber = '';
        let carrier = 'Kargo';
        for (const p of TRACKING_PATTERNS) {
          const m = fullText.match(p.regex);
          if (m) { trackingNumber = m[1]; carrier = p.carrier; break; }
        }

        if (!trackingNumber) continue; // Takip numarası yoksa atla

        // Aynı takip numarasıyla kayıt var mı?
        const { data: existing } = await supabase
          .from('shipments')
          .select('id')
          .eq('user_id', state)
          .eq('tracking_number', trackingNumber)
          .maybeSingle();
        if (existing) continue;

        const brandName   = extractBrandName(from, subject);
        const orderNumber = extractOrderNumber(bodyText, subject);

        await supabase.from('shipments').insert({
          user_id: state,
          brand_name: brandName,
          order_number: orderNumber,
          tracking_number: trackingNumber,
          carrier,
          status: 'shipped',
          status_label: 'Kargoya Verildi',
          source: 'email',
          created_at: msgDate.toISOString(),
          products: [],
        });

        created.push(trackingNumber);
      } catch {
        // tek mesaj hatası genel akışı durdurmasın
      }
    }

    // 4. Uygulamaya dön
    return Response.redirect(
      `${APP_SCHEME}?success=true&found=${created.length}`,
      302
    );
  } catch (err: any) {
    console.error(err);
    return Response.redirect(`${APP_SCHEME}?error=server_error`, 302);
  }
});
