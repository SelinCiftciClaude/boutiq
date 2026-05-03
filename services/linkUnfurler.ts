import { supabase } from './supabase';

// ── Tipler ───────────────────────────────────────────────────────────────────

export interface UnfurledProduct {
  name: string;
  description?: string;
  primaryImageUrl?: string;
  imageUrls: string[];
  price: number;
  originalPrice?: number;
  currency: string;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
  stockCount?: number;
  merchantName: string;
  productUrl: string;
  parserUsed: string;
  needsManualReview?: boolean;
}

export interface UnfurlResult {
  success: boolean;
  data?: UnfurledProduct;
  error?: string;
}

// ── URL normalizasyonu ────────────────────────────────────────────────────────

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // Tracking parametrelerini temizle
    ['utm_source','utm_medium','utm_campaign','fbclid','gclid','ref','src'].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url;
  }
}

function hashUrl(url: string): string {
  // Basit deterministik hash (64 char)
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const c = url.charCodeAt(i);
    hash = (hash << 5) - hash + c;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0') + btoa(url.slice(0, 40)).replace(/[^a-z0-9]/gi, '').slice(0, 56);
}

function extractMerchantName(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace('www.', '').replace('tr.', '');
    const base = hostname.split('.')[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return 'Butik';
  }
}

function parseTurkishPrice(text: string): number {
  if (!text) return 0;
  // "14.000,00 TL", "₺1.890", "1890.00" → float
  const cleaned = text
    .replace(/[₺TL\s]/g, '')
    .trim();

  // Türk formatı: nokta binlik, virgül ondalık
  if (/\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  // Uluslararası format
  return parseFloat(cleaned.replace(/,/g, '')) || 0;
}

// ── Tier 2a: Shopify ──────────────────────────────────────────────────────────

async function parseShopify(url: string): Promise<UnfurledProduct> {
  const u = new URL(url);
  const handleMatch = u.pathname.match(/\/products\/([^/?#]+)/);
  if (!handleMatch) throw new Error('Shopify handle bulunamadı');

  const jsonUrl = `${u.origin}/products/${handleMatch[1]}.json`;
  const res = await fetch(jsonUrl, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Butika/1.0' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const { product } = await res.json();
  const variant = product.variants?.[0] ?? {};
  const price = parseFloat(variant.price ?? '0');
  const compareAt = parseFloat(variant.compare_at_price ?? '0');
  const totalStock = product.variants?.reduce((s: number, v: any) => s + (v.inventory_quantity ?? 0), 0) ?? 0;
  const anyAvailable = product.variants?.some((v: any) => v.available) ?? true;

  return {
    name: product.title,
    description: product.body_html?.replace(/<[^>]+>/g, '').trim(),
    primaryImageUrl: product.image?.src ?? product.images?.[0]?.src,
    imageUrls: product.images?.map((i: any) => i.src) ?? [],
    price,
    originalPrice: compareAt > price ? compareAt : undefined,
    currency: 'TRY',
    stockStatus: anyAvailable ? (totalStock <= 3 && totalStock > 0 ? 'low_stock' : 'in_stock') : 'out_of_stock',
    stockCount: totalStock,
    merchantName: extractMerchantName(url),
    productUrl: url,
    parserUsed: 'shopify_api',
  };
}

// ── Tier 2b: Ikas GraphQL ─────────────────────────────────────────────────────

async function parseIkas(url: string, html: string): Promise<UnfurledProduct | null> {
  try {
    // Token ve slug'ı HTML'den çıkar
    const tokenMatch = html.match(/"apiKey":"(eyJ[^"]+)"/);
    const slugMatch = url.match(/\/([^/?#]+)(?:[?#]|$)/);
    if (!tokenMatch || !slugMatch) return null;

    const token = tokenMatch[1];
    const slug = slugMatch[1];

    const gql = await fetch('https://api.myikas.com/api/sf/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `{
          searchProducts(input:{page:1,perPage:1,slug:"${slug}"}) {
            results {
              id name
              variants {
                prices { sellPrice discountPrice }
                stocks { stockCount }
              }
            }
          }
        }`,
      }),
      signal: AbortSignal.timeout(8000),
    }).then(r => r.json());

    const product = gql?.data?.searchProducts?.results?.[0];
    if (!product) return null;

    const variant = product.variants?.[0] ?? {};
    const priceObj = variant.prices?.[0] ?? {};
    const totalStock = (variant.stocks ?? []).reduce((s: number, st: any) => s + (st.stockCount ?? 0), 0);
    const sell = priceObj.sellPrice ?? 0;
    const discount = priceObj.discountPrice ?? null;

    return {
      name: product.name,
      imageUrls: [],
      price: discount ?? sell,
      originalPrice: discount ? sell : undefined,
      currency: 'TRY',
      stockStatus: totalStock > 3 ? 'in_stock' : totalStock > 0 ? 'low_stock' : 'out_of_stock',
      stockCount: totalStock,
      merchantName: extractMerchantName(url),
      productUrl: url,
      parserUsed: 'ikas_graphql',
    };
  } catch {
    return null;
  }
}

// ── Tier 3: Generic (OG + JSON-LD + microdata) ────────────────────────────────

async function parseGeneric(url: string, html?: string): Promise<UnfurledProduct> {
  const pageHtml: string = html ?? await fetch(url, {
    headers: { 'User-Agent': 'Butika/1.0 (+https://butika.app/bot)' },
    signal: AbortSignal.timeout(10000),
  }).then(r => r.text()).catch(() => '');

  // 1. JSON-LD Product schema
  const ldMatches = [...pageHtml.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ldMatches) {
    try {
      let d = JSON.parse(m[1]);
      if (Array.isArray(d)) d = d.find((x: any) => x['@type'] === 'Product');
      if (d?.['@graph']) d = d['@graph'].find((x: any) => x['@type'] === 'Product');
      if (d?.['@type'] !== 'Product') continue;

      const offer = Array.isArray(d.offers) ? d.offers[0] : d.offers ?? {};
      const price = parseTurkishPrice(String(offer.price ?? '0'));
      const imgs = Array.isArray(d.image) ? d.image : d.image ? [d.image] : [];

      return {
        name: d.name ?? '',
        description: d.description,
        primaryImageUrl: imgs[0],
        imageUrls: imgs,
        price,
        currency: offer.priceCurrency ?? 'TRY',
        stockStatus: (offer.availability ?? '').toLowerCase().includes('outofstock') ? 'out_of_stock' : 'in_stock',
        merchantName: d.brand?.name ?? extractMerchantName(url),
        productUrl: url,
        parserUsed: 'json_ld',
      };
    } catch {}
  }

  // 2. Open Graph + product meta
  const metaGet = (prop: string) =>
    pageHtml.match(new RegExp(`property="${prop}"\\s+content="([^"]+)"`))?.[1] ??
    pageHtml.match(new RegExp(`name="${prop}"\\s+content="([^"]+)"`))?.[1];

  const ogTitle = metaGet('og:title');
  const ogImage = metaGet('og:image');
  const priceStr = metaGet('product:price:amount') ?? metaGet('og:price:amount');
  const currency = metaGet('product:price:currency') ?? 'TRY';

  if (ogTitle) {
    return {
      name: ogTitle,
      description: metaGet('og:description'),
      primaryImageUrl: ogImage,
      imageUrls: ogImage ? [ogImage] : [],
      price: parseTurkishPrice(priceStr ?? '0'),
      currency,
      stockStatus: 'unknown',
      merchantName: extractMerchantName(url),
      productUrl: url,
      parserUsed: 'open_graph',
    };
  }

  // 3. itemprop microdata
  const nameM = pageHtml.match(/itemprop="name"[^>]*>([^<]+)</);
  const priceM = pageHtml.match(/itemprop="price"\s+content="([^"]+)"/);
  const imgM  = pageHtml.match(/itemprop="image"\s+(?:src|content)="([^"]+)"/);

  if (nameM) {
    return {
      name: nameM[1].trim(),
      imageUrls: imgM ? [imgM[1]] : [],
      primaryImageUrl: imgM?.[1],
      price: parseTurkishPrice(priceM?.[1] ?? '0'),
      currency: 'TRY',
      stockStatus: 'unknown',
      merchantName: extractMerchantName(url),
      productUrl: url,
      parserUsed: 'microdata',
    };
  }

  // 4. Fallback — sadece sayfa başlığı
  const titleM = pageHtml.match(/<title[^>]*>([^<]+)<\/title>/i);
  return {
    name: titleM?.[1]?.trim() ?? 'Bilinmeyen ürün',
    imageUrls: [],
    price: 0,
    currency: 'TRY',
    stockStatus: 'unknown',
    merchantName: extractMerchantName(url),
    productUrl: url,
    parserUsed: 'fallback',
    needsManualReview: true,
  };
}

// ── Ana unfurl fonksiyonu ─────────────────────────────────────────────────────

export async function unfurlUrl(rawUrl: string): Promise<UnfurlResult> {
  const url = normalizeUrl(rawUrl);
  const hash = hashUrl(url);

  // Cache kontrolü
  const { data: cached } = await supabase
    .from('link_unfurl_cache')
    .select('product_info')
    .eq('url_hash', hash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (cached?.product_info) {
    return { success: true, data: cached.product_info as UnfurledProduct };
  }

  let result: UnfurledProduct;

  try {
    // HTML'i bir kez fetch et (yeniden kullan)
    const html = await fetch(url, {
      headers: { 'User-Agent': 'Butika/1.0 (+https://butika.app/bot)', 'Accept-Language': 'tr-TR,tr;q=0.9' },
      signal: AbortSignal.timeout(10000),
    }).then(r => r.text()).catch(() => '');

    // Platform tespiti
    const isShopify = html.includes('cdn.shopify.com') || html.includes('myshopify.com');
    const isIkas    = html.includes('myikas.com') || html.toLowerCase().includes('"ikas"');
    const isIdeaSoft = html.toLowerCase().includes('ideasoft') || html.includes('ideacdn.net');

    if (isShopify && url.includes('/products/')) {
      result = await parseShopify(url);
    } else if (isIkas) {
      const ikasResult = await parseIkas(url, html);
      result = ikasResult ?? await parseGeneric(url, html);
    } else {
      // IdeaSoft + WooCommerce + Generic hepsi OG/JSON-LD kullanır
      result = await parseGeneric(url, html);
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }

  // Cache'e yaz
  await supabase.from('link_unfurl_cache').upsert({
    url_hash: hash,
    url,
    product_info: result,
    parser_used: result.parserUsed,
  });

  return { success: true, data: result };
}
