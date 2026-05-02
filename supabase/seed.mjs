#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

function readLocalEnv() {
  try {
    const out = execSync('npx supabase status -o env', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const env = {};
    for (const raw of out.split('\n')) {
      const line = raw.trim();
      const m = line.match(/^([A-Z_]+)="?([^"]*?)"?$/);
      if (m) env[m[1]] = m[2];
    }
    return env;
  } catch {
    console.error('\n❌  Local Supabase is not running. Start it first:\n      npx supabase start\n');
    process.exit(1);
  }
}

const env = readLocalEnv();
const SUPABASE_URL = env.API_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Could not find SERVICE_ROLE_KEY in `supabase status -o env` output.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = 'demo@boutiq.app';
const DEMO_PASSWORD = 'demo1234';
const DEMO_NAME = 'Selin';

const B = {
  noire: '11111111-1111-1111-1111-000000000001',
  arce: '11111111-1111-1111-1111-000000000002',
  sol: '11111111-1111-1111-1111-000000000003',
  velo: '11111111-1111-1111-1111-000000000004',
  kura: '11111111-1111-1111-1111-000000000005',
  atmos: '11111111-1111-1111-1111-000000000006',
};

const P = {
  dress: '22222222-2222-2222-2222-000000000001',
  saddle: '22222222-2222-2222-2222-000000000002',
  rings: '22222222-2222-2222-2222-000000000003',
  blazer: '22222222-2222-2222-2222-000000000004',
  serum: '22222222-2222-2222-2222-000000000005',
  trousers: '22222222-2222-2222-2222-000000000006',
};

const S = {
  arceShip: '33333333-3333-3333-3333-000000000001',
  noireShip: '33333333-3333-3333-3333-000000000002',
  kuraShip: '33333333-3333-3333-3333-000000000003',
};

const C = {
  noireSale: '44444444-4444-4444-4444-000000000001',
  solCosmos: '44444444-4444-4444-4444-000000000002',
  arceVintage: '44444444-4444-4444-4444-000000000003',
};

async function ensureDemoUser() {
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;
  const existing = list.users.find((u) => u.email === DEMO_EMAIL);
  if (existing) {
    console.log(`✓  Demo user already present (${DEMO_EMAIL})`);
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { name: DEMO_NAME },
  });
  if (error) throw error;
  console.log(`✓  Created demo user (${DEMO_EMAIL} / ${DEMO_PASSWORD})`);
  return data.user.id;
}

async function seedBrands() {
  const rows = [
    {
      id: B.noire,
      name: 'Noire Studio',
      handle: '@noirestudio',
      logo_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&h=120&fit=crop&crop=faces',
      cover_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=400&fit=crop',
      category: 'giyim',
      tags: ['minimal', 'kadın', 'günlük'],
      website: 'https://noirestudio.com',
      affiliate_url: 'https://noirestudio.com?ref=boutiq',
      is_verified: true,
      product_count: 148,
      description: 'Minimalist kadın giyimde sanatsal bir anlayış.',
      rating: 4.8,
      latitude: 41.0155,
      longitude: 28.9795,
      address: 'Nişantaşı, İstanbul',
    },
    {
      id: B.arce,
      name: 'Arce Leather',
      handle: '@arceleather',
      logo_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop',
      cover_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=400&fit=crop',
      category: 'çanta',
      tags: ['deri', 'el yapımı', 'lüks'],
      website: 'https://arceleather.com',
      affiliate_url: 'https://arceleather.com?ref=boutiq',
      is_verified: true,
      product_count: 64,
      description: 'El yapımı deri çantalar. Her parça benzersiz.',
      rating: 4.9,
      latitude: 41.0370,
      longitude: 28.9850,
      address: 'Bebek, İstanbul',
    },
    {
      id: B.sol,
      name: 'Sol Kollektiv',
      handle: '@solkollektiv',
      logo_url: 'https://images.unsplash.com/photo-1511556820780-d912e42b4980?w=120&h=120&fit=crop',
      cover_url: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&h=400&fit=crop',
      category: 'takı',
      tags: ['altın', 'gümüş', 'el yapımı', 'minimal'],
      website: 'https://solkollektiv.com',
      affiliate_url: 'https://solkollektiv.com?ref=boutiq',
      is_verified: true,
      product_count: 92,
      description: 'Güneşin altınından ilham alan minimal takılar.',
      rating: 4.7,
    },
    {
      id: B.velo,
      name: 'Velo Boutique',
      handle: '@veloboutique',
      logo_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=120&h=120&fit=crop&crop=faces',
      cover_url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=400&fit=crop',
      category: 'giyim',
      tags: ['vintage', 'retro', 'kadın'],
      website: 'https://veloboutique.com',
      affiliate_url: 'https://veloboutique.com?ref=boutiq',
      is_verified: false,
      product_count: 230,
      description: 'Vintage esintili modern kadın giyimi.',
      rating: 4.6,
      latitude: 41.0082,
      longitude: 28.9784,
      address: 'Beyoğlu, İstanbul',
    },
    {
      id: B.kura,
      name: 'Kura Cosmetics',
      handle: '@kuracosmetics',
      logo_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=120&h=120&fit=crop',
      cover_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=400&fit=crop',
      category: 'güzellik',
      tags: ['doğal', 'vegan', 'cilt bakımı'],
      website: 'https://kuracosmetics.com',
      affiliate_url: 'https://kuracosmetics.com?ref=boutiq',
      is_verified: true,
      product_count: 55,
      description: 'Doğal ve vegan içeriklerle hazırlanan lüks kozmetik.',
      rating: 4.9,
    },
    {
      id: B.atmos,
      name: 'Atmos Sneakers',
      handle: '@atmossneakers',
      logo_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop&crop=center',
      cover_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=400&fit=crop',
      category: 'ayakkabı',
      tags: ['spor', 'streetwear', 'koleksiyon'],
      website: 'https://atmossneakers.com',
      affiliate_url: 'https://atmossneakers.com?ref=boutiq',
      is_verified: true,
      product_count: 178,
      description: 'Sınırlı üretim sneaker koleksiyonları.',
      rating: 4.5,
    },
  ];
  const { error } = await supabase.from('brands').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓  Seeded ${rows.length} brands`);
}

async function seedProducts() {
  const rows = [
    {
      id: P.dress,
      brand_id: B.noire,
      name: 'Asymmetric Linen Dress',
      image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=500&fit=crop',
      price: 2450,
      original_price: 3200,
      currency: 'TL',
      url: 'https://noirestudio.com/dress-001',
      affiliate_url: 'https://noirestudio.com/dress-001?ref=boutiq',
      category: 'elbise',
      tags: ['yaz', 'keten', 'asimetrik'],
      is_on_sale: true,
      in_stock: true,
      sizes: ['XS', 'S', 'M', 'L'],
      colors: ['Ekru', 'Siyah', 'Haki'],
      instagram_post_id: 'ig_001',
    },
    {
      id: P.saddle,
      brand_id: B.arce,
      name: 'Mini Saddle Bag',
      image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=500&fit=crop',
      price: 4800,
      currency: 'TL',
      url: 'https://arceleather.com/mini-saddle',
      affiliate_url: 'https://arceleather.com/mini-saddle?ref=boutiq',
      category: 'çanta',
      tags: ['deri', 'mini', 'saddle'],
      is_on_sale: false,
      in_stock: true,
      colors: ['Konyak', 'Siyah', 'Krem'],
      instagram_post_id: 'ig_002',
    },
    {
      id: P.rings,
      brand_id: B.sol,
      name: 'Gold Demi-Fine Ring Set',
      image_url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=500&fit=crop',
      price: 980,
      original_price: 1200,
      currency: 'TL',
      url: 'https://solkollektiv.com/ring-set',
      affiliate_url: 'https://solkollektiv.com/ring-set?ref=boutiq',
      category: 'takı',
      tags: ['altın', 'yüzük', 'set'],
      is_on_sale: true,
      in_stock: true,
      sizes: ['14', '15', '16', '17', '18'],
      instagram_post_id: 'ig_003',
    },
    {
      id: P.blazer,
      brand_id: B.velo,
      name: 'Velvet Blazer',
      image_url: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400&h=500&fit=crop',
      price: 3100,
      currency: 'TL',
      url: 'https://veloboutique.com/velvet-blazer',
      affiliate_url: 'https://veloboutique.com/velvet-blazer?ref=boutiq',
      category: 'ceket',
      tags: ['kadife', 'blazer', 'vintage'],
      is_on_sale: false,
      in_stock: false,
      sizes: ['XS', 'S', 'M'],
      colors: ['Bordo', 'Lacivert'],
      instagram_post_id: 'ig_004',
    },
    {
      id: P.serum,
      brand_id: B.kura,
      name: 'Luminous Glow Serum',
      image_url: 'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=400&h=500&fit=crop',
      price: 650,
      currency: 'TL',
      url: 'https://kuracosmetics.com/glow-serum',
      affiliate_url: 'https://kuracosmetics.com/glow-serum?ref=boutiq',
      category: 'serum',
      tags: ['vegan', 'aydınlatıcı', 'niacinamide'],
      is_on_sale: false,
      in_stock: true,
      instagram_post_id: 'ig_005',
    },
    {
      id: P.trousers,
      brand_id: B.noire,
      name: 'Wide-Leg Trousers',
      image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=500&fit=crop',
      price: 1890,
      currency: 'TL',
      url: 'https://noirestudio.com/trousers-wide',
      affiliate_url: 'https://noirestudio.com/trousers-wide?ref=boutiq',
      category: 'pantolon',
      tags: ['geniş paça', 'yüksek bel', 'ofis'],
      is_on_sale: false,
      in_stock: true,
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Krem', 'Siyah', 'Camel'],
      instagram_post_id: 'ig_006',
    },
  ];
  const { error } = await supabase.from('products').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓  Seeded ${rows.length} products`);
}

async function seedCampaigns() {
  const rows = [
    {
      id: C.noireSale,
      brand_id: B.noire,
      title: 'Yaz Koleksiyonu %25 İndirim',
      description: 'Tüm yaz koleksiyonunda özel indirim! Kaçırma, stoklar sınırlı.',
      discount: 25,
      discount_type: 'percent',
      ends_at: '2026-04-30T23:59:00Z',
      image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=300&fit=crop',
      code: 'BOUTIQ25',
      url: 'https://noirestudio.com/yaz',
      affiliate_url: 'https://noirestudio.com/yaz?ref=boutiq',
      is_active: true,
    },
    {
      id: C.solCosmos,
      brand_id: B.sol,
      title: 'Yeni Koleksiyon: Cosmos',
      description: 'Evrenin güzelliğinden ilham alan yeni Cosmos koleksiyonu çıktı.',
      ends_at: '2026-05-15T23:59:00Z',
      image_url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&h=300&fit=crop',
      url: 'https://solkollektiv.com/cosmos',
      affiliate_url: 'https://solkollektiv.com/cosmos?ref=boutiq',
      is_active: true,
    },
    {
      id: C.arceVintage,
      brand_id: B.arce,
      title: 'Sınırlı Sayıda: Vintage Çanta',
      description: 'El yapımı vintage deri çantalardan yalnızca 20 adet üretildi.',
      discount: 500,
      discount_type: 'fixed',
      ends_at: '2026-04-28T23:59:00Z',
      code: 'VINTAGE500',
      url: 'https://arceleather.com/vintage',
      affiliate_url: 'https://arceleather.com/vintage?ref=boutiq',
      is_active: true,
    },
  ];
  const { error } = await supabase.from('campaigns').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓  Seeded ${rows.length} campaigns`);
}

async function seedShipments(userId) {
  const rows = [
    {
      id: S.arceShip,
      user_id: userId,
      brand_id: B.arce,
      brand_name: 'Arce Leather',
      order_number: 'ARC-2026-04891',
      tracking_number: 'YK123456789TR',
      carrier: 'Yurtiçi Kargo',
      status: 'ordered',
      status_label: 'Henüz kargoya verilmedi',
      estimated_delivery: 'Tahmini 3-5 iş günü',
      last_location: 'Sipariş hazırlanıyor',
      products: [
        {
          name: 'Mini Saddle Bag — Konyak',
          image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=100&h=100&fit=crop',
          quantity: 1,
        },
      ],
      total_amount: 4800,
      currency: 'TL',
      source: 'manual',
    },
    {
      id: S.noireShip,
      user_id: userId,
      brand_id: B.noire,
      brand_name: 'Noire Studio',
      order_number: 'NST-2026-01247',
      tracking_number: 'MNG987654321',
      carrier: 'MNG Kargo',
      status: 'in_transit',
      status_label: 'Yolda',
      estimated_delivery: 'Yarın, 25 Nisan',
      last_location: 'Bursa Aktarma Merkezi',
      products: [
        {
          name: 'Asymmetric Linen Dress — Ekru',
          image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=100&h=100&fit=crop',
          quantity: 1,
        },
        {
          name: 'Wide-Leg Trousers — Siyah/S',
          image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=100&h=100&fit=crop',
          quantity: 1,
        },
      ],
      total_amount: 4340,
      currency: 'TL',
      source: 'manual',
    },
    {
      id: S.kuraShip,
      user_id: userId,
      brand_id: B.kura,
      brand_name: 'Kura Cosmetics',
      order_number: 'KUR-2026-00552',
      tracking_number: 'PTT445566778',
      carrier: 'PTT Kargo',
      status: 'delivered',
      status_label: 'Teslim Edildi',
      estimated_delivery: '21 Nisan (Teslim Edildi)',
      last_location: 'İstanbul, Şişli — Komşunuza bırakıldı',
      products: [
        {
          name: 'Luminous Glow Serum',
          image: 'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?w=100&h=100&fit=crop',
          quantity: 2,
        },
      ],
      total_amount: 1300,
      currency: 'TL',
      source: 'manual',
    },
  ];
  const { error } = await supabase.from('shipments').upsert(rows, { onConflict: 'id' });
  if (error) throw error;

  await supabase.from('shipment_events').delete().in('shipment_id', Object.values(S));

  const events = [
    { shipment_id: S.arceShip, timestamp: '2026-04-24T10:42:00Z', location: 'İstanbul, Beşiktaş', description: 'Dağıtıma çıktı', status: 'out_for_delivery' },
    { shipment_id: S.arceShip, timestamp: '2026-04-24T07:15:00Z', location: 'İstanbul Hub', description: 'Yerel dağıtım merkezine ulaştı', status: 'in_transit' },
    { shipment_id: S.arceShip, timestamp: '2026-04-23T22:30:00Z', location: 'Ankara Hub', description: 'Transit merkezden çıktı', status: 'in_transit' },
    { shipment_id: S.arceShip, timestamp: '2026-04-22T14:00:00Z', location: 'Arce Leather Depo', description: 'Kargoya verildi', status: 'shipped' },
    { shipment_id: S.noireShip, timestamp: '2026-04-23T19:30:00Z', location: 'Bursa Aktarma', description: 'Aktarma merkezine ulaştı', status: 'in_transit' },
    { shipment_id: S.noireShip, timestamp: '2026-04-22T11:00:00Z', location: 'Noire Studio Depo, İzmir', description: 'Kargoya verildi', status: 'shipped' },
    { shipment_id: S.kuraShip, timestamp: '2026-04-21T14:15:00Z', location: 'İstanbul, Şişli', description: 'Teslim edildi — Komşuya bırakıldı', status: 'delivered' },
  ];
  const { error: evtErr } = await supabase.from('shipment_events').insert(events);
  if (evtErr) throw evtErr;
  console.log(`✓  Seeded ${rows.length} shipments + ${events.length} events`);
}

async function seedDemoUserAssociations(userId) {
  const userBrands = [
    { user_id: userId, brand_id: B.noire, is_favorite: true },
    { user_id: userId, brand_id: B.arce, is_favorite: true },
    { user_id: userId, brand_id: B.velo, is_favorite: false },
  ];
  const { error: ubErr } = await supabase
    .from('user_brands')
    .upsert(userBrands, { onConflict: 'user_id,brand_id' });
  if (ubErr) throw ubErr;

  const savedProducts = [
    { user_id: userId, product_id: P.dress },
    { user_id: userId, product_id: P.saddle },
    { user_id: userId, product_id: P.rings },
    { user_id: userId, product_id: P.blazer },
  ];
  const { error: spErr } = await supabase
    .from('saved_products')
    .upsert(savedProducts, { onConflict: 'user_id,product_id' });
  if (spErr) throw spErr;

  const reads = [{ user_id: userId, campaign_id: C.arceVintage }];
  const { error: rdErr } = await supabase
    .from('user_campaign_reads')
    .upsert(reads, { onConflict: 'user_id,campaign_id' });
  if (rdErr) throw rdErr;

  console.log(
    `✓  Demo user has ${userBrands.length} saved brands, ${savedProducts.length} saved products, ${reads.length} read campaign`
  );
}

async function seedPriceHistory() {
  const now = new Date('2026-04-25T00:00:00Z');
  const basePrices = {
    [P.dress]:    { base: 3200, current: 2450 },
    [P.saddle]:   { base: 4800, current: 4800 },
    [P.rings]:    { base: 1200, current: 980  },
    [P.blazer]:   { base: 3100, current: 3100 },
    [P.serum]:    { base: 650,  current: 650  },
    [P.trousers]: { base: 1890, current: 1890 },
  };

  const rows = [];
  for (const [productId, { base, current }] of Object.entries(basePrices)) {
    for (let day = 29; day >= 0; day--) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);
      // Son 7 günde indirim uygulandıysa düşük fiyat göster
      const discounted = current < base && day < 7;
      const price = discounted ? current : base;
      // Küçük günlük dalgalanma
      const jitter = (Math.random() - 0.5) * price * 0.02;
      rows.push({
        product_id: productId,
        price: Math.round((price + jitter) * 100) / 100,
        original_price: base,
        is_on_sale: discounted,
        recorded_at: date.toISOString(),
      });
    }
  }

  await supabase.from('product_price_history').delete().in('product_id', Object.keys(basePrices));
  const { error } = await supabase.from('product_price_history').insert(rows);
  if (error) throw error;
  console.log(`✓  Seeded ${rows.length} price history records`);
}

async function main() {
  console.log(`\n🌱  Seeding local Supabase at ${SUPABASE_URL}\n`);
  const userId = await ensureDemoUser();
  await seedBrands();
  await seedProducts();
  await seedCampaigns();
  await seedShipments(userId);
  await seedDemoUserAssociations(userId);
  await seedPriceHistory();
  console.log(`\n✅  Done. Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
}

main().catch((err) => {
  console.error('\n❌  Seed failed:', err.message || err);
  process.exit(1);
});
