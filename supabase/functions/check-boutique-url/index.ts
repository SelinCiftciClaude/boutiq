/**
 * check-boutique-url
 * Verilen URL'yi fetch eder, site adını/logosunu/platformunu çıkarır.
 * AddBoutiqueModal'ın URL aramasında gerçek zamanlı öneri için kullanılır.
 */

function extractMeta(html: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

function toAbsolute(url: string, base: string): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return `https://${base}${url}`;
  return null;
}

// Marka adını temizle: "Casa Naturale | Online Shop" → "Casa Naturale"
function cleanBrandName(raw: string): string {
  return raw
    .replace(/\s*[\|—–\-]\s*.*/g, '')
    .replace(/\b(store|shop|online|mağaza|butik|resmi site|official)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 60);
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
    const { url } = await req.json();
    if (!url?.trim()) {
      return Response.json({ found: false, reason: 'empty_url' });
    }

    // URL normalize
    const raw    = url.trim();
    const domain = raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
    const base   = `https://${domain}`;

    console.log(`check-boutique-url: ${base}`);

    // ── Ana sayfa fetch ──────────────────────────────────────────────────────
    let html = '';
    let finalUrl = base;
    try {
      const res = await fetch(base, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(10_000),
      });
      html = await res.text();
      finalUrl = res.url || base;
    } catch (e: any) {
      console.warn(`fetch failed: ${e.message}`);
      return Response.json({ found: false, reason: 'unreachable', domain });
    }

    // ── Platform tespiti ─────────────────────────────────────────────────────
    const isShopify = html.includes('cdn.shopify.com') || html.includes('myshopify.com') || html.includes('Shopify.theme');
    const isIkas    = html.includes('myikas.com') || html.toLowerCase().includes('"ikas"');
    const platform  = isShopify ? 'shopify' : isIkas ? 'ikas' : 'other';

    // Shopify doğrulaması: /products.json erişilebilir mi?
    let shopifyProductCount = 0;
    if (isShopify) {
      try {
        const pRes = await fetch(`${base}/products.json?limit=1`, {
          signal: AbortSignal.timeout(5_000),
        });
        if (pRes.ok) {
          const pData = await pRes.json();
          shopifyProductCount = pData?.products?.length ?? 0;
        }
      } catch { /* sessizce geç */ }
    }

    // ── Metadata çıkarımı ────────────────────────────────────────────────────
    const ogTitle = extractMeta(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    ]);
    const pageTitle = extractMeta(html, [/<title[^>]*>([^<]{2,80})<\/title>/i]);
    const ogImage   = extractMeta(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    ]);
    const touchIcon = extractMeta(html, [
      /<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon[^"']*["']/i,
    ]);
    const themeColor = extractMeta(html, [
      /<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9a-fA-F]{3,8})["']/i,
      /<meta[^>]+content=["'](#[0-9a-fA-F]{3,8})["'][^>]+name=["']theme-color["']/i,
    ]);
    const description = extractMeta(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{10,200})["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,200})["']/i,
    ]);

    // Marka adı: og:title > page title > domain
    const rawName   = ogTitle || pageTitle || domain;
    const brandName = cleanBrandName(rawName) || domain;

    const result = {
      found: true,
      name: brandName,
      platform,
      website: domain,
      logoUrl:   touchIcon ? toAbsolute(touchIcon, domain) : null,
      coverUrl:  ogImage   ? toAbsolute(ogImage,   domain) : null,
      brandColor: themeColor || null,
      description: description?.substring(0, 120) || null,
      shopifyVerified: isShopify && shopifyProductCount > 0,
    };

    console.log(`check-boutique-url result:`, JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e: any) {
    console.error('check-boutique-url error:', e.message);
    return new Response(JSON.stringify({ found: false, reason: 'error', error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});
