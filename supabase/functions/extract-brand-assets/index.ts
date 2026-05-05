// extract-brand-assets
// Bir markanın websitesinden logo, og:image ve brand color çeker.
// Tetikleme: brand eklendikten hemen sonra (non-blocking).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Markaya özgü renk yok → isimden deterministik bir palet rengi üret
const PALETTE = [
  '#4A1520', '#2A3D4A', '#3A2A10', '#1A3D2A', '#3A1A3A',
  '#2A3A10', '#4A3A20', '#1A2A4A', '#3A1020', '#20304A',
];
function brandColorFallback(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return PALETTE[h % PALETTE.length];
}

// Regex ile HTML'den tag içeriği çek
function extractMeta(html: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

// Göreli URL'yi mutlak yap
function absoluteUrl(url: string, base: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return new URL(base).origin + url;
  return base.replace(/\/$/, '') + '/' + url;
}

// Renk geçerli hex mi?
function isValidHex(c: string): boolean {
  return /^#[0-9a-fA-F]{3,8}$/.test(c);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const { brand_id } = await req.json();
    if (!brand_id) {
      return new Response(JSON.stringify({ error: 'brand_id required' }), { status: 400 });
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Markanın mevcut verilerini al
    const { data: brand } = await db
      .from('brands')
      .select('id, name, website, logo_url, cover_url, brand_color, card_style')
      .eq('id', brand_id)
      .maybeSingle();

    if (!brand) {
      return new Response(JSON.stringify({ error: 'brand not found' }), { status: 404 });
    }

    const website = brand.website?.startsWith('http')
      ? brand.website
      : `https://${brand.website}`;

    console.log(`extract-brand-assets: ${brand.name} (${website})`);

    // HTML çek
    let html = '';
    try {
      html = await fetch(website, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Butika/1.0)',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(12_000),
      }).then(r => r.text());
    } catch {
      console.warn(`fetch failed for ${website}`);
    }

    // ── Logo (apple-touch-icon → en yüksek kalite) ──────────────────────────
    const logoUrl = extractMeta(html, [
      /<link[^>]+rel=["']apple-touch-icon-precomposed["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon-precomposed["']/i,
      /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon["']/i,
      /<link[^>]+rel=["']icon["'][^>]+sizes=["']192x192["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+sizes=["']192x192["']/i,
    ]);

    // ── Hero image (og:image) ────────────────────────────────────────────────
    const ogImage = extractMeta(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ]);

    // ── Brand color ──────────────────────────────────────────────────────────
    let brandColor = extractMeta(html, [
      /<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-fA-F]{3,8})["']/i,
      /<meta[^>]+content=["'](#[0-9a-fA-F]{3,8})["'][^>]+name=["']theme-color["']/i,
      /<meta[^>]+name=["']msapplication-TileColor["'][^>]+content=["'](#[0-9a-fA-F]{3,8})["']/i,
    ]);

    if (!brandColor || !isValidHex(brandColor)) {
      // CSS değişkenlerinden çık: --primary-color, --brand-color
      const cssVarMatch = html.match(/--(?:primary|brand|accent|main)(?:-color)?:\s*(#[0-9a-fA-F]{3,8})/i);
      if (cssVarMatch?.[1] && isValidHex(cssVarMatch[1])) {
        brandColor = cssVarMatch[1];
      } else {
        brandColor = brandColorFallback(brand.name);
      }
    }

    // Çok açık veya çok koyu renkleri normalize et
    if (brandColor === '#ffffff' || brandColor === '#FFFFFF') {
      brandColor = brandColorFallback(brand.name);
    }

    // ── Absolute URL'ler ─────────────────────────────────────────────────────
    const finalLogoUrl  = logoUrl ? absoluteUrl(logoUrl, website)  : (brand.logo_url  || null);
    const finalCoverUrl = ogImage ? absoluteUrl(ogImage, website)  : (brand.cover_url || null);

    // ── card_style belirle ───────────────────────────────────────────────────
    // og:image varsa → hero (tam kart görsel, üstüne logo overlay)
    // sadece logo varsa → logo_centered
    // hiçbiri yok    → initials
    let cardStyle: string;
    if (finalCoverUrl) {
      cardStyle = 'hero';
    } else if (finalLogoUrl) {
      cardStyle = 'logo_centered';
    } else {
      cardStyle = 'initials';
    }

    // ── DB güncelle ──────────────────────────────────────────────────────────
    const updates: Record<string, unknown> = {
      brand_color: brandColor,
      card_style:  cardStyle,
    };
    if (finalLogoUrl)  updates.logo_url  = finalLogoUrl;
    if (finalCoverUrl) updates.cover_url = finalCoverUrl;

    const { error } = await db
      .from('brands')
      .update(updates)
      .eq('id', brand_id);

    if (error) throw error;

    console.log(`extract-brand-assets done: ${brand.name}`, {
      cardStyle,
      hasLogo:  !!finalLogoUrl,
      hasCover: !!finalCoverUrl,
      brandColor,
    });

    return new Response(
      JSON.stringify({ ok: true, card_style: cardStyle, brand_color: brandColor, logo: !!finalLogoUrl, cover: !!finalCoverUrl }),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
    );
  } catch (e: any) {
    console.error('extract-brand-assets error:', e.message);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
