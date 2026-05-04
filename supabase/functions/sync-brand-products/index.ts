// Edge Function: sync-brand-products
// Bir markanın tüm ürünlerini Shopify / Ikas'tan çekip products tablosuna yazar.
// Tetikleme: kullanıcı yeni bir butik kaydettiğinde çağrılır (non-blocking).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ── Kategori eşleştirme (linkUnfurler ile aynı mantık) ───────────────────────

const CATEGORY_MAP: Array<{ slug: string; keywords: string[] }> = [
  { slug: 'giyim',       keywords: ['elbise','bluz','pantolon','etek','ceket','mont','kazak','tişört','gömlek','tulum','kimono','trençkot','blazer','bodysuit','babydoll','pijama','sweatshirt','dress','top','shirt','pants','skirt','jacket','coat','sweater','clothing','apparel','üst','alt'] },
  { slug: 'canta',       keywords: ['çanta','bag','tote','clutch','purse','handbag','crossbody','backpack','cüzdan','wallet','pouch'] },
  { slug: 'ayakkabi',    keywords: ['ayakkabı','bot','çizme','sandalet','terlik','sneaker','loafer','shoes','boots','heels','slippers','footwear'] },
  { slug: 'taki',        keywords: ['takı','kolye','bileklik','yüzük','küpe','broş','bilezik','jewelry','necklace','bracelet','ring','earring'] },
  { slug: 'kozmetik',    keywords: ['kozmetik','makyaj','ruj','fondöten','maskara','allık','makeup','cosmetics','lipstick','foundation','mascara','blush'] },
  { slug: 'cilt-bakimi', keywords: ['cilt bakımı','serum','krem','tonik','nemlendirici','temizleyici','peeling','maske','güneş kremi','spf','retinol','niacinamide','skincare','skin care','moisturizer','toner','cleanser','brightening','acid'] },
  { slug: 'sac-bakimi',  keywords: ['saç','şampuan','saç kremi','hair','shampoo','conditioner','hair mask','scalp'] },
  { slug: 'parfum',      keywords: ['parfüm','eau de parfum','edp','edt','cologne','fragrance','perfume','koku','mist','oud'] },
  { slug: 'ev-tekstil',  keywords: ['nevresim','yorgan','yastık','havlu','bornoz','perde','bedding','towel','curtain','duvet','pillow','linen'] },
  { slug: 'ev-dekor',    keywords: ['dekorasyon','vazo','mum','rattan','hasır','koltuk','sandalye','masa','oturma','yemek takımı','home decor','decoration','furniture','mobilya','vase','candle','mirror'] },
  { slug: 'mutfak',      keywords: ['mutfak','tabak','kase','bardak','tencere','tava','bıçak','kitchen','cookware','plate','bowl','cup','pot','pan','cutlery'] },
  { slug: 'bebek',       keywords: ['bebek','çocuk','oyuncak','baby','kids','children','toddler'] },
  { slug: 'evcil',       keywords: ['evcil hayvan','kedi','köpek','pet','cat','dog','petshop','mama','tasma'] },
  { slug: 'gida',        keywords: ['gıda','organik','zeytinyağı','ceviz','badem','şarap','bal','kahve','çay','food','organic','olive oil','wine','honey','coffee','tea'] },
  { slug: 'aksesuar',    keywords: ['aksesuar','şapka','bere','eşarp','kemer','gözlük','eldiven','atkı','kravat','hat','scarf','belt','sunglasses','gloves'] },
];

function mapToMasterCategory(raw: string): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  for (const { slug, keywords } of CATEGORY_MAP) {
    if (keywords.some(k => lower.includes(k))) return slug;
  }
  return null;
}

// ── Beden / Renk option tespiti ───────────────────────────────────────────────

const SIZE_NAMES  = ['size', 'beden', 'boyut', 'numara', 'uzunluk'];
const COLOR_NAMES = ['color', 'colour', 'renk', 'color/renk', 'renk/color'];

function isSizeOption(name: string): boolean {
  return SIZE_NAMES.some(s => name.toLowerCase().includes(s));
}
function isColorOption(name: string): boolean {
  return COLOR_NAMES.some(c => name.toLowerCase().includes(c));
}

// ── Platform tespiti ──────────────────────────────────────────────────────────

async function detectPlatform(websiteUrl: string): Promise<'shopify' | 'ikas' | 'other'> {
  try {
    const html = await fetch(websiteUrl, {
      headers: { 'User-Agent': 'Butika/1.0', 'Accept-Language': 'tr-TR,tr;q=0.9' },
      signal: AbortSignal.timeout(10_000),
    }).then(r => r.text()).catch(() => '');

    if (html.includes('cdn.shopify.com') || html.includes('myshopify.com')) return 'shopify';
    if (html.includes('myikas.com') || html.toLowerCase().includes('"ikas"')) return 'ikas';
    return 'other';
  } catch {
    return 'other';
  }
}

// ── Shopify tam katalog çekimi ────────────────────────────────────────────────

interface ShopifyProduct {
  id: number;
  handle: string;
  title: string;
  body_html: string;
  product_type: string;
  tags: string[];
  published_at: string;
  options: Array<{ name: string; values: string[] }>;
  images: Array<{ src: string; width: number; height: number }>;
  variants: Array<{
    price: string;
    compare_at_price: string | null;
    available: boolean;
    inventory_quantity: number;
    option1: string | null;
    option2: string | null;
    option3: string | null;
  }>;
}

async function syncShopify(
  supabase: ReturnType<typeof createClient>,
  brandId: string,
  websiteUrl: string,
  categoryCache: Map<string, string>,
): Promise<{ inserted: number; updated: number; skipped: number }> {
  const base = websiteUrl.replace(/\/$/, '');
  let inserted = 0, updated = 0, skipped = 0;
  let sinceId = 0;

  while (true) {
    const url = `${base}/products.json?limit=250&published_status=published${sinceId ? `&since_id=${sinceId}` : ''}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Butika/1.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) break;

    const { products }: { products: ShopifyProduct[] } = await res.json();
    if (!products?.length) break;

    sinceId = products[products.length - 1].id;

    for (const p of products) {
      if (!p.images?.length || !p.variants?.length) { skipped++; continue; }

      // En ucuz müsait varyant
      const availableVariants = p.variants.filter(v => v.available);
      const primaryVariant = availableVariants[0] ?? p.variants[0];
      const price = parseFloat(primaryVariant.price);
      const compareAt = parseFloat(primaryVariant.compare_at_price ?? '0');
      const originalPrice = compareAt > price ? compareAt : null;
      const isOnSale = !!originalPrice;

      // Beden / Renk
      const sizeOpt  = p.options.find(o => isSizeOption(o.name));
      const colorOpt = p.options.find(o => isColorOption(o.name));
      const sizes  = sizeOpt?.values  ?? [];
      const colors = colorOpt?.values ?? [];

      // Görsel & aspect ratio
      const mainImage = p.images[0];
      const aspectRatio = mainImage.height > 0
        ? Number((mainImage.height / mainImage.width).toFixed(4))
        : 0.75;
      const imageUrls = p.images.map(i => i.src);

      // Kategori
      const categorySlug = mapToMasterCategory(p.product_type || p.tags?.[0] || '');
      let masterCategoryId: string | null = null;
      if (categorySlug) {
        if (categoryCache.has(categorySlug)) {
          masterCategoryId = categoryCache.get(categorySlug)!;
        } else {
          const { data } = await supabase
            .from('master_categories').select('id').eq('slug', categorySlug).maybeSingle();
          masterCategoryId = data?.id ?? null;
          if (masterCategoryId) categoryCache.set(categorySlug, masterCategoryId);
        }
      }

      // is_new: son 60 gün
      const isNew = new Date(p.published_at) > new Date(Date.now() - 60 * 86_400_000);

      const row = {
        brand_id: brandId,
        external_product_id: p.handle,
        name: p.title,
        image_url: mainImage.src,
        image_urls: imageUrls,
        image_aspect_ratio: aspectRatio,
        price,
        original_price: originalPrice,
        currency: 'TRY',
        url: `${base}/products/${p.handle}`,
        affiliate_url: `${base}/products/${p.handle}?utm_source=butika&utm_medium=app`,
        tags: p.tags,
        sizes,
        colors,
        is_on_sale: isOnSale,
        is_available: availableVariants.length > 0,
        is_new: isNew,
        in_stock: availableVariants.length > 0,
        master_category_id: masterCategoryId,
        source: 'shopify_api',
        updated_at: new Date().toISOString(),
      };

      const { error, data: upserted } = await supabase
        .from('products')
        .upsert(row, { onConflict: 'brand_id,external_product_id' })
        .select('id')
        .maybeSingle();

      if (error) { skipped++; continue; }
      if (upserted) inserted++;
      else updated++;
    }

    if (products.length < 250) break; // son sayfa
  }

  return { inserted, updated, skipped };
}

// ── Ikas katalog çekimi ───────────────────────────────────────────────────────

async function syncIkas(
  supabase: ReturnType<typeof createClient>,
  brandId: string,
  websiteUrl: string,
  categoryCache: Map<string, string>,
): Promise<{ inserted: number; updated: number; skipped: number }> {
  let inserted = 0, updated = 0, skipped = 0;

  try {
    // Token'ı ana sayfadan çek
    const html = await fetch(websiteUrl, {
      headers: { 'User-Agent': 'Butika/1.0', 'Accept-Language': 'tr-TR,tr;q=0.9' },
      signal: AbortSignal.timeout(10_000),
    }).then(r => r.text()).catch(() => '');

    const tokenMatch = html.match(/"apiKey":"(eyJ[^"]+)"/);
    if (!tokenMatch) return { inserted: 0, updated: 0, skipped: 0 };

    const token = tokenMatch[1];
    let page = 1;

    while (true) {
      const gql = await fetch('https://api.myikas.com/api/sf/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          query: `{
            listProduct(input: { page: ${page}, perPage: 50 }) {
              data {
                id name slug
                createdAt
                categories { name }
                images { fileName }
                variants {
                  prices { sellPrice discountPrice }
                  stocks { stockCount }
                  variantValues { name value { name } }
                }
              }
              pagination { totalCount page perPage }
            }
          }`,
        }),
        signal: AbortSignal.timeout(15_000),
      }).then(r => r.json()).catch(() => null);

      const results = gql?.data?.listProduct?.data ?? [];
      if (!results.length) break;

      for (const p of results) {
        const variant = p.variants?.[0] ?? {};
        const priceObj = variant.prices?.[0] ?? {};
        const sell = priceObj.sellPrice ?? 0;
        const discount = priceObj.discountPrice ?? null;
        const price = discount ?? sell;
        const originalPrice = discount ? sell : null;
        const totalStock = (variant.stocks ?? []).reduce((s: number, st: any) => s + (st.stockCount ?? 0), 0);

        // Beden / Renk'i variantValues'dan çıkar
        const sizes: string[] = [];
        const colors: string[] = [];
        for (const v of p.variants ?? []) {
          for (const vv of v.variantValues ?? []) {
            const optName = (vv.name ?? '').toLowerCase();
            const val = vv.value?.name ?? '';
            if (!val) continue;
            if (isSizeOption(optName) && !sizes.includes(val)) sizes.push(val);
            if (isColorOption(optName) && !colors.includes(val)) colors.push(val);
          }
        }

        // Görsel URL'si (Ikas CDN formatı)
        const firstImg = p.images?.[0];
        const imageUrl = firstImg
          ? `https://cdn.myikas.com/images/${firstImg.fileName}`
          : null;
        if (!imageUrl) { skipped++; continue; }

        const categorySlug = mapToMasterCategory(p.categories?.[0]?.name ?? '');
        let masterCategoryId: string | null = null;
        if (categorySlug) {
          if (categoryCache.has(categorySlug)) {
            masterCategoryId = categoryCache.get(categorySlug)!;
          } else {
            const { data } = await supabase
              .from('master_categories').select('id').eq('slug', categorySlug).maybeSingle();
            masterCategoryId = data?.id ?? null;
            if (masterCategoryId) categoryCache.set(categorySlug, masterCategoryId);
          }
        }

        const base = websiteUrl.replace(/\/$/, '');
        const row = {
          brand_id: brandId,
          external_product_id: p.slug,
          name: p.name,
          image_url: imageUrl,
          image_urls: (p.images ?? []).map((i: any) => `https://cdn.myikas.com/images/${i.fileName}`),
          image_aspect_ratio: 0.75,
          price,
          original_price: originalPrice,
          currency: 'TRY',
          url: `${base}/${p.slug}`,
          affiliate_url: `${base}/${p.slug}?utm_source=butika&utm_medium=app`,
          sizes,
          colors,
          is_on_sale: !!originalPrice,
          is_available: totalStock > 0,
          is_new: new Date(p.createdAt) > new Date(Date.now() - 60 * 86_400_000),
          in_stock: totalStock > 0,
          master_category_id: masterCategoryId,
          source: 'ikas_graphql',
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('products')
          .upsert(row, { onConflict: 'brand_id,external_product_id' });

        if (error) skipped++;
        else inserted++;
      }

      const pagination = gql?.data?.listProduct?.pagination;
      if (!pagination || page * pagination.perPage >= pagination.totalCount) break;
      page++;
    }
  } catch (e) {
    console.error('Ikas sync error:', e);
  }

  return { inserted, updated, skipped };
}

// ── Ana handler ───────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const { brand_id, website_url } = await req.json();
    if (!brand_id || !website_url) {
      return new Response(JSON.stringify({ error: 'brand_id and website_url required' }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const categoryCache = new Map<string, string>();

    // 1. Platform tespit
    const { data: brand } = await supabase
      .from('brands').select('platform').eq('id', brand_id).maybeSingle();

    let platform = brand?.platform ?? 'other';
    if (platform === 'other' || !platform) {
      platform = await detectPlatform(website_url);
      // Tespit edilen platform'u güncelle
      if (platform !== 'other') {
        await supabase.from('brands').update({ platform }).eq('id', brand_id);
      }
    }

    // 2. Sync
    let result = { inserted: 0, updated: 0, skipped: 0 };
    if (platform === 'shopify') {
      result = await syncShopify(supabase, brand_id, website_url, categoryCache);
    } else if (platform === 'ikas') {
      result = await syncIkas(supabase, brand_id, website_url, categoryCache);
    }

    console.log(`sync-brand-products [${platform}] brand=${brand_id}`, result);

    return new Response(
      JSON.stringify({ ok: true, platform, ...result }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
