#!/usr/bin/env node
/**
 * Stok yenileme: tüm bedenlerde tükenmiş ürünleri is_available=false yapar.
 * Shopify: variant.available === false (tüm varyantlar kapalıysa)
 * İkas: JSON-LD offer.availability === OutOfStock
 *
 * Kullanım: node supabase/refresh-stock.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

function readLocalEnv() {
  const out = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] });
  const env = {};
  for (const r of out.split('\n')) { const m = r.trim().match(/^([A-Z_]+)="?([^"]*?)"?$/); if (m) env[m[1]] = m[2]; }
  return env;
}
const env = readLocalEnv();
const sb = createClient(env.API_URL || 'http://127.0.0.1:54321', env.SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function withTimeout(p, ms = 10000) {
  return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
}
async function fetchText(url) {
  const r = await withTimeout(fetch(url, { headers: { 'User-Agent': UA } }));
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

// ── Shopify: bir sayfanın tüm ürünlerinde stok durumu ────────────────────────

async function getShopifyAvailableIds(baseUrl) {
  const available = new Set();
  let page = 1;
  while (true) {
    try {
      const text = await withTimeout(
        fetch(`${baseUrl}/products.json?limit=250&page=${page}`, { headers: { 'User-Agent': UA } })
          .then(r => r.text())
      );
      const json = JSON.parse(text);
      if (!json.products?.length) break;

      for (const p of json.products) {
        // En az bir varyant stokta ise ürün aktif
        const hasStock = p.variants.some(v => v.available === true);
        if (hasStock) available.add(String(p.id));
      }
      if (json.products.length < 250) break;
      page++;
      await sleep(200);
    } catch { break; }
  }
  return available;
}

// ── İkas: tek ürün sayfasından JSON-LD availability ─────────────────────────

function parseIkasAvailability(html) {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]+?)<\/script>/g)];
  for (const m of matches) {
    try {
      const d = JSON.parse(m[1].trim());
      if (d['@type'] !== 'Product') continue;
      const offers = Array.isArray(d.offers) ? d.offers : [d.offers].filter(Boolean);
      // En az bir offer InStock ise ürün aktif
      return offers.some(o =>
        o.availability === 'https://schema.org/InStock' ||
        o.availability === 'InStock'
      );
    } catch {}
  }
  return null; // belirlenemedi → koruma amaçlı aktif say
}

async function checkIkasProduct(baseUrl, slug) {
  try {
    const html = await withTimeout(fetchText(`${baseUrl}/${slug}`), 8000);
    const result = parseIkasAvailability(html);
    return result !== false; // null veya true ise aktif say
  } catch {
    return true; // erişilemiyorsa dokunma
  }
}

// ── Ana mantık ────────────────────────────────────────────────────────────────

async function main() {
  const { data: brands } = await sb
    .from('brands')
    .select('id, name, website, platform')
    .in('platform', ['shopify', 'ikas']);

  if (!brands?.length) { console.log('Marka bulunamadı.'); return; }

  console.log(`\n🔄  ${brands.length} marka stok kontrolü yapılıyor...\n`);

  let totalHidden = 0;

  for (const brand of brands) {
    const baseUrl = brand.website.replace(/\/$/, '');
    console.log(`\n── ${brand.name} (${brand.platform})`);

    // Bu markanın DB'deki ürünlerini çek
    const { data: dbProducts } = await sb
      .from('products')
      .select('id, external_product_id, name')
      .eq('brand_id', brand.id)
      .eq('is_available', true);

    if (!dbProducts?.length) { console.log('  Ürün yok, atlandı.'); continue; }

    let hidden = 0;

    if (brand.platform === 'shopify') {
      // Shopify: tek API çağrısıyla tüm stok durumunu al
      const availableIds = await getShopifyAvailableIds(baseUrl);
      console.log(`  ${availableIds.size} stokta ürün (toplam DB: ${dbProducts.length})`);

      const toHide = dbProducts.filter(p => !availableIds.has(p.external_product_id));
      if (toHide.length) {
        const ids = toHide.map(p => p.id);
        await sb.from('products').update({ is_available: false, in_stock: false }).in('id', ids);
        hidden = toHide.length;
        console.log(`  ✗ ${hidden} ürün gizlendi (tüm bedenlerde tükendi)`);
      } else {
        console.log('  ✓ Stok sorunu yok');
      }

    } else if (brand.platform === 'ikas') {
      // İkas: her ürün sayfasını kontrol et (batch 10)
      const BATCH = 8;
      for (let i = 0; i < dbProducts.length; i += BATCH) {
        const batch = dbProducts.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map(async p => ({
            id: p.id,
            slug: p.external_product_id,
            available: await checkIkasProduct(baseUrl, p.external_product_id),
          }))
        );
        const toHideBatch = results.filter(r => !r.available);
        if (toHideBatch.length) {
          await sb.from('products')
            .update({ is_available: false, in_stock: false })
            .in('id', toHideBatch.map(r => r.id));
          hidden += toHideBatch.length;
        }
        process.stdout.write(`\r  ${Math.min(i + BATCH, dbProducts.length)}/${dbProducts.length} kontrol edildi`);
        await sleep(100);
      }
      console.log(`\n  ✗ ${hidden} ürün gizlendi`);
    }

    totalHidden += hidden;
  }

  // Özet
  const { count: activeCount } = await sb
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('is_available', true);

  console.log(`\n✅  Tamamlandı.`);
  console.log(`   ${totalHidden} ürün gizlendi (stok tükendi)`);
  console.log(`   Aktif ürün sayısı: ${activeCount}\n`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
