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

const DEMO_EMAIL    = 'demo@boutiq.app';
const DEMO_PASSWORD = 'demo1234';
const DEMO_NAME     = 'Selin';

// Sabit cover görselleri (kategori bazlı)
const COVERS = {
  giyim:    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=400&fit=crop',
  canta:    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=400&fit=crop',
  ev:       'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=400&fit=crop',
  guzellik: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=400&fit=crop',
  gida:     'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop',
  pet:      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&h=400&fit=crop',
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
    // ── Giyim ────────────────────────────────────────────────────────────────
    { id: 'bbbbbbbb-0001-0001-0001-000000000001', name: 'Selma Çilek',        handle: '@selmacilek',        website: 'https://www.selmacilek.com',            platform: 'shopify', category: 'giyim',    cover_url: COVERS.giyim,    description: 'Zarif ve kadınsı tasarımlarıyla öne çıkan Türk moda markası.', is_verified: true },
    { id: 'bbbbbbbb-0001-0001-0001-000000000002', name: 'MyBestFriends',      handle: '@mybestfriendstr',   website: 'https://www.mybestfriends.com.tr',      platform: 'shopify', category: 'giyim',    cover_url: COVERS.giyim,    description: 'Günlük hayatın şıklığı için tasarlanmış koleksiyonlar.', is_verified: true },
    { id: 'bbbbbbbb-0001-0001-0001-000000000003', name: 'Hof Silk',           handle: '@hofsilk',           website: 'https://www.hofsilk.com',               platform: 'shopify', category: 'giyim',    cover_url: COVERS.giyim,    description: 'İpek dokuların sadeliği ve lüksü.', is_verified: true },
    { id: 'bbbbbbbb-0001-0001-0001-000000000004', name: 'Less & Romance',     handle: '@lessandromance',    website: 'https://www.lessandromance.com',         platform: 'shopify', category: 'giyim',    cover_url: COVERS.giyim,    description: 'Az ama öz romantizm; özgür ve akıcı silüetler.' },
    { id: 'bbbbbbbb-0001-0001-0001-000000000005', name: 'LOL Official',       handle: '@lolofficial',       website: 'https://www.lolofficial.com',            platform: 'shopify', category: 'giyim',    cover_url: COVERS.giyim,    description: 'Genç ve dinamik sokak modasının adresi.' },
    { id: 'bbbbbbbb-0001-0001-0001-000000000006', name: 'Sinem Kıvanç',       handle: '@sinemkivanc',       website: 'https://www.sinemkivanc.com',            platform: 'ikas',    category: 'giyim',    cover_url: COVERS.giyim,    description: 'Sinem Kıvanç imzalı sofistike ve şık kadın giyim koleksiyonu.', is_verified: true },
    { id: 'bbbbbbbb-0001-0001-0001-000000000007', name: 'Butik Merve Aksoy',  handle: '@butikmerveaksoy',   website: 'https://www.butikmerveaksoy.com',        platform: 'shopify', category: 'giyim',    cover_url: COVERS.giyim,    description: 'Merve Aksoy imzasıyla şık ve rafine kadın giyimi.', is_verified: true },
    { id: 'bbbbbbbb-0001-0001-0001-000000000008', name: 'Love on Friday',     handle: '@loveonfriday',      website: 'https://www.love-onfriday.com',          platform: 'shopify', category: 'giyim',    cover_url: COVERS.giyim,    description: 'Her gün cuma gibi hissettiren akıcı ve özgür parçalar.', is_verified: true },
    // ── Çanta & Aksesuar ──────────────────────────────────────────────────────
    { id: 'bbbbbbbb-0001-0001-0001-000000000009', name: 'Mlouye',             handle: '@mlouye',            website: 'https://www.mlouye.com',                platform: 'shopify', category: 'çanta',    cover_url: COVERS.canta,    description: 'Özgün tasarımlı, el yapımı lüks çantalar.', is_verified: true },
    { id: 'bbbbbbbb-0001-0001-0001-000000000010', name: 'Manuel Atelier',     handle: '@manuatelier',       website: 'https://www.manuatelier.com',            platform: 'shopify', category: 'çanta',    cover_url: COVERS.canta,    description: "Türkiye'nin en prestijli deri çanta markalarından.", is_verified: true },
    { id: 'bbbbbbbb-0001-0001-0001-000000000011', name: 'Misela',             handle: '@misela',            website: 'https://www.misela.com',                platform: 'shopify', category: 'çanta',    cover_url: COVERS.canta,    description: 'Modern kadın için geometrik ve özgün deri çanta tasarımları.', is_verified: true },
    { id: 'bbbbbbbb-0001-0001-0001-000000000012', name: 'MANC Official',      handle: '@mancofficial',      website: 'https://www.mancofficial.com',           platform: 'shopify', category: 'giyim',    cover_url: COVERS.giyim,    description: 'Unisex streetwear ve minimalist günlük giyim.' },
    // ── Ev & Yaşam ────────────────────────────────────────────────────────────
    { id: 'bbbbbbbb-0001-0001-0001-000000000013', name: 'VavRattan',          handle: '@vavrattan',         website: 'https://www.vavrattan.com',              platform: 'shopify', category: 'ev',       cover_url: COVERS.ev,       description: 'Hasır ve rattan dokunuşlarıyla doğal ev dekorasyonu.' },
    { id: 'bbbbbbbb-0001-0001-0001-000000000014', name: 'GiquHome',           handle: '@giquhome',          website: 'https://www.giquhome.com.tr',            platform: 'shopify', category: 'ev',       cover_url: COVERS.ev,       description: 'Estetik ev tekstili ve yaşam ürünleri.' },
    // ── Güzellik & Kozmetik ───────────────────────────────────────────────────
    { id: 'bbbbbbbb-0001-0001-0001-000000000015', name: 'Atelier Rebul',      handle: '@atelierrebul',      website: 'https://www.atelierrebul.com.tr',        platform: 'other',   category: 'güzellik', cover_url: COVERS.guzellik, description: "1895'ten bu yana lüks Türk parfüm ve kozmetik markası.", is_verified: true },
    { id: 'bbbbbbbb-0001-0001-0001-000000000016', name: 'The Purest Solutions',handle: '@thepurestsolutions',website: 'https://www.thepurestsolutions.com',     platform: 'shopify', category: 'güzellik', cover_url: COVERS.guzellik, description: 'Temiz formüllü, bilim destekli cilt bakımı.', is_verified: true },
    { id: 'bbbbbbbb-0001-0001-0001-000000000017', name: 'İno Beauty',         handle: '@inobeauty',         website: 'https://www.inobeauty.com.tr',           platform: 'shopify', category: 'güzellik', cover_url: COVERS.guzellik, description: 'Doğal içeriklerle hazırlanan el yapımı güzellik ürünleri.' },
    { id: 'bbbbbbbb-0001-0001-0001-000000000018', name: 'Gulsha',             handle: '@gulsha',            website: 'https://www.gulsha.com',                platform: 'shopify', category: 'güzellik', cover_url: COVERS.guzellik, description: 'Çiçek özlü, doğa ilhamlı cilt bakım ve parfüm koleksiyonu.' },
    { id: 'bbbbbbbb-0001-0001-0001-000000000019', name: 'Rosece',             handle: '@rosece',            website: 'https://www.rosece.com',                platform: 'shopify', category: 'güzellik', cover_url: COVERS.guzellik, description: 'Gül suyu ve botanik özlerle hassas cilt bakımı.' },
    // ── Gıda & Organik ────────────────────────────────────────────────────────
    { id: 'bbbbbbbb-0001-0001-0001-000000000020', name: 'İyice Ceviz Bahçesi',handle: '@iyicevizbahcesi',   website: 'https://www.iyicevizbahcesi.com.tr',     platform: 'other',   category: 'gıda',     cover_url: COVERS.gida,     description: "Ege'nin bereketli topraklarından kuru ceviz ve yağ." },
    { id: 'bbbbbbbb-0001-0001-0001-000000000021', name: 'İka Bağları',        handle: '@ikabaglari',        website: 'https://www.ikabaglari.com',             platform: 'other',   category: 'gıda',     cover_url: COVERS.gida,     description: 'Küçük üreticiden doğrudan masa şarabı ve organik bağ ürünleri.' },
    { id: 'bbbbbbbb-0001-0001-0001-000000000022', name: 'Datça Murat Çiftliği',handle: '@datcamuratciftligi',website: 'https://www.datcamuratciftligi.com',    platform: 'other',   category: 'gıda',     cover_url: COVERS.gida,     description: 'Datça yarımadasından sertifikalı organik badem ve zeytinyağı.' },
    { id: 'bbbbbbbb-0001-0001-0001-000000000023', name: 'Anamur Bahçesi',     handle: '@anamurbahcesi',     website: 'https://www.anamurbahcesi.com',          platform: 'other',   category: 'gıda',     cover_url: COVERS.gida,     description: "Anamur'un tropik iklimiyle yetişen muz ve tropikal meyveler." },
    // ── Pet ───────────────────────────────────────────────────────────────────
    { id: 'bbbbbbbb-0001-0001-0001-000000000024', name: 'Veteriner Anne',     handle: '@veterineranne',     website: 'https://www.veterineranne.com',          platform: 'shopify', category: 'evcil',    cover_url: COVERS.pet,      description: 'Veteriner hekim önerisiyle hazırlanmış evcil hayvan ürünleri.' },
  ];

  const { error } = await supabase.from('brands').upsert(rows, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓  Seeded ${rows.length} brands`);
}

async function seedShipments(userId) {
  const now   = new Date();
  const today = now.toISOString().slice(0, 10);

  // Takvim yardımcıları
  const daysAgo  = (n) => new Date(now - n * 86400000).toISOString();
  const hoursAgo = (n) => new Date(now - n * 3600000).toISOString();

  const shipments = [
    // ── 1. Selma Çilek — DAĞITIMDA ──────────────────────────────────────────
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      user_id: userId,
      brand_name: 'Selma Çilek',
      brand_logo: 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=80&h=80&fit=crop',
      order_number: 'SC-2026-08421',
      tracking_number: '00123456789',
      carrier: 'yurtici',
      status: 'out_for_delivery',
      status_label: 'Dağıtımda',
      estimated_delivery: `Bugün, ${now.getHours() < 15 ? '14:00 - 18:00' : '18:00 - 21:00'}`,
      last_location: 'İstanbul, Kadıköy Şubesi',
      products: [
        {
          name: 'Keten Beyaz Gömlek',
          image: 'https://images.unsplash.com/photo-1564859228273-274232fdb516?w=200&h=250&fit=crop',
          quantity: 1,
        },
      ],
      total_amount: 1890,
      currency: 'TL',
      source: 'manual',
      is_archived: false,
      created_at: daysAgo(3),
      updated_at: hoursAgo(2),
    },
    // ── 2. HOF Silk — BUGÜN TESLİM EDİLDİ ──────────────────────────────────
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      user_id: userId,
      brand_name: 'HOF Silk',
      brand_logo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&h=80&fit=crop',
      order_number: 'HOF-2026-03147',
      tracking_number: '00987654321',
      carrier: 'aras',
      status: 'delivered',
      status_label: 'Teslim Edildi',
      estimated_delivery: `Bugün teslim edildi`,
      last_location: 'Teslim edildi',
      products: [
        {
          name: 'İpek Saten Bluz — Krem',
          image: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=200&h=250&fit=crop',
          quantity: 1,
        },
      ],
      total_amount: 3250,
      currency: 'TL',
      source: 'manual',
      is_archived: false,
      created_at: daysAgo(5),
      updated_at: hoursAgo(1),
    },
  ];

  const { error: shipErr } = await supabase
    .from('shipments')
    .upsert(shipments, { onConflict: 'id' });
  if (shipErr) throw shipErr;

  // ── Kargo olayları ────────────────────────────────────────────────────────

  const events = [
    // Selma Çilek — dağıtımda
    { shipment_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', status: 'ordered',          description: 'Sipariş alındı',             location: 'Selma Çilek Depo',            timestamp: daysAgo(3) },
    { shipment_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', status: 'processing',       description: 'Paket hazırlandı, kargoya teslim edildi', location: 'İstanbul, Anadolu Yakası Hub', timestamp: daysAgo(2) },
    { shipment_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', status: 'in_transit',       description: 'Transfer merkezine ulaştı',  location: 'İstanbul, Kartal Transfer Merkezi', timestamp: daysAgo(1) },
    { shipment_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', status: 'out_for_delivery', description: 'Dağıtıma çıktı',             location: 'İstanbul, Kadıköy Şubesi',      timestamp: hoursAgo(2) },

    // HOF Silk — teslim edildi
    { shipment_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', status: 'ordered',          description: 'Sipariş alındı',             location: 'HOF Silk Depo',                timestamp: daysAgo(5) },
    { shipment_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', status: 'processing',       description: 'Paket hazırlandı',           location: 'İstanbul, Avrupa Yakası Hub',   timestamp: daysAgo(4) },
    { shipment_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', status: 'in_transit',       description: 'Yolda',                      location: 'İstanbul, Bağcılar Transfer',   timestamp: daysAgo(3) },
    { shipment_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', status: 'out_for_delivery', description: 'Dağıtıma çıktı',             location: 'İstanbul, Beşiktaş Şubesi',     timestamp: hoursAgo(5) },
    { shipment_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', status: 'delivered',        description: 'Teslim edildi — Kapıya bırakıldı', location: 'İstanbul, Beşiktaş',      timestamp: hoursAgo(1) },
  ];

  // Önce bu shipment'lara ait eski event'leri temizle
  await supabase.from('shipment_events')
    .delete()
    .in('shipment_id', shipments.map(s => s.id));

  const { error: evErr } = await supabase.from('shipment_events').insert(events);
  if (evErr) throw evErr;

  console.log('✓  Seeded 2 shipments (Selma Çilek — dağıtımda, HOF Silk — teslim edildi)');
}

async function seedProducts() {
  // Önce kategori ID'lerini çek
  const { data: cats } = await supabase
    .from('master_categories')
    .select('id, slug');
  const catId = Object.fromEntries((cats ?? []).map(c => [c.slug, c.id]));

  const B = {
    selmacilek:  'bbbbbbbb-0001-0001-0001-000000000001',
    hofsilk:     'bbbbbbbb-0001-0001-0001-000000000003',
    sinemkivanc: 'bbbbbbbb-0001-0001-0001-000000000006',
    loveonfriday:'bbbbbbbb-0001-0001-0001-000000000008',
    mylouye:     'bbbbbbbb-0001-0001-0001-000000000009',
    manuel:      'bbbbbbbb-0001-0001-0001-000000000010',
    rebul:       'bbbbbbbb-0001-0001-0001-000000000015',
    purest:      'bbbbbbbb-0001-0001-0001-000000000016',
    vavrattan:   'bbbbbbbb-0001-0001-0001-000000000013',
  };

  // image_aspect_ratio = height/width (Shopify API'dan ölçülen gerçek değerler)
  // Giyim: ~1.5 (3:2 portrait), Çanta: 1.0-1.34, Güzellik: 1.0
  const products = [
    // ── Selma Çilek (Shopify · gerçek aspect: 1.50) ──────────────────────────
    { id: 'aa000001-aa01-aa01-aa01-aa0000000001', brand_id: B.selmacilek, name: 'Aeris Elbise', price: 16000, original_price: null, is_on_sale: false, is_new: true,  sizes: ['XS','S','M','L'], colors: [], master_category_id: catId['giyim'], image_url: 'https://www.selmacilek.com/cdn/shop/files/Artboard6_1.jpg?v=1756215502&width=1080', image_aspect_ratio: 1.5, url: 'https://www.selmacilek.com/products/f-kahverengi-elbise-kopya', is_available: true },
    { id: 'aa000001-aa01-aa01-aa01-aa0000000002', brand_id: B.selmacilek, name: 'Alina Ekru Bluz', price: 8800, original_price: null, is_on_sale: false, is_new: true,  sizes: ['XS','S','M','L'], colors: ['Ekru'], master_category_id: catId['giyim'], image_url: 'https://www.selmacilek.com/cdn/shop/files/IMG-0443.jpg?v=1714039138&width=1080', image_aspect_ratio: 1.5, url: 'https://www.selmacilek.com/products/beyaz-straplez-uzun-kollu-tul-bluz', is_available: true },
    { id: 'aa000001-aa01-aa01-aa01-aa0000000003', brand_id: B.selmacilek, name: 'Alto Siyah Tulum', price: 13800, original_price: null, is_on_sale: false, is_new: false, sizes: ['XS','S','M','L'], colors: ['Siyah'], master_category_id: catId['giyim'], image_url: 'https://www.selmacilek.com/cdn/shop/files/Artboard57.jpg?v=1745215491&width=1080', image_aspect_ratio: 1.5, url: 'https://www.selmacilek.com/products/siyah-boyundan-baglamali-kapri-tulum', is_available: true },

    // ── Hof Silk (Shopify · gerçek aspect: 1.50) ─────────────────────────────
    { id: 'bb000002-bb02-bb02-bb02-bb0000000001', brand_id: B.hofsilk, name: 'Béatrice Babydoll — Siyah', price: 2490, original_price: null, is_on_sale: false, is_new: true,  sizes: ['XS','S','M','L','XL'], colors: ['Siyah'], master_category_id: catId['giyim'], image_url: 'https://www.hofsilk.com/cdn/shop/files/beatrice_a2518f40-7b9c-4a91-9026-9f9661234be3.jpg', image_aspect_ratio: 1.5, url: 'https://www.hofsilk.com/products/beatrice-babydoll-siyah', is_available: true },
    { id: 'bb000002-bb02-bb02-bb02-bb0000000002', brand_id: B.hofsilk, name: 'Béatrice Ouvert Bodysuit — Siyah', price: 2290, original_price: null, is_on_sale: false, is_new: true,  sizes: ['XS','S','M','L'], colors: ['Siyah'], master_category_id: catId['giyim'], image_url: 'https://www.hofsilk.com/cdn/shop/files/beatrice_a9ae691c-f579-4f76-9bd3-423e437c0793.jpg', image_aspect_ratio: 1.5, url: 'https://www.hofsilk.com/products/beatrice-ouvert-bodysuit-siyah', is_available: true },
    { id: 'bb000002-bb02-bb02-bb02-bb0000000003', brand_id: B.hofsilk, name: 'Lucy Dantel & Tül Sütyen — Siyah', price: 1990, original_price: null, is_on_sale: false, is_new: false, sizes: ['XS','S','M','L'], colors: ['Siyah'], master_category_id: catId['giyim'], image_url: 'https://www.hofsilk.com/cdn/shop/files/lucy_copy_3.jpg', image_aspect_ratio: 1.5, url: 'https://www.hofsilk.com/products/lucy-dantel-tul-sutyen-siyah', is_available: true },

    // ── Sinem Kıvanç (Ikas · aspect: 1.33 tahmini) ───────────────────────────
    { id: 'cc000003-cc03-cc03-cc03-cc0000000001', brand_id: B.sinemkivanc, name: 'Askılı Hardal Çizgili Elbise', price: 2200, original_price: null, is_on_sale: false, is_new: true,  sizes: ['XS','S','M','L'], colors: ['Hardal'], master_category_id: catId['giyim'], image_url: 'https://cdn.myikas.com/images/464bde5b-438b-4d5d-94b8-2eb3673c9483/f3a56e53-d39c-486c-8914-4567787cf8fb/1080/photo-2026-04-28-12-15-33-5.jpg', image_aspect_ratio: 1.33, url: 'https://sinemkivanc.com/askili-hardal-cizgili-elbise', is_available: true },
    { id: 'cc000003-cc03-cc03-cc03-cc0000000002', brand_id: B.sinemkivanc, name: 'Bel Vurgulu Puantiye Elbise', price: 1850, original_price: 2400, is_on_sale: true, is_new: false,  sizes: ['XS','S','M','L'], colors: ['Siyah'], master_category_id: catId['giyim'], image_url: 'https://cdn.myikas.com/images/464bde5b-438b-4d5d-94b8-2eb3673c9483/437ead1a-c732-4a52-b4f5-4d8924068843/1080/img-0153.jpg', image_aspect_ratio: 1.33, url: 'https://sinemkivanc.com/bel-vurgulu-puantiye-elbise', is_available: true },
    { id: 'cc000003-cc03-cc03-cc03-cc0000000003', brand_id: B.sinemkivanc, name: 'Fular Detaylı Puantiye Elbise', price: 2080, original_price: null, is_on_sale: false, is_new: true,  sizes: ['XS','S','M','L'], colors: ['Beyaz'], master_category_id: catId['giyim'], image_url: 'https://cdn.myikas.com/images/464bde5b-438b-4d5d-94b8-2eb3673c9483/769bd40d-9d8a-490e-9f72-a5491fcf5eb1/1080/img-9023.jpg', image_aspect_ratio: 1.33, url: 'https://sinemkivanc.com/fular-detayli-puantiye-elbise', is_available: true },

    // ── Love on Friday (Shopify · gerçek aspect: 1.4994) ────────────────────
    { id: 'dd000004-dd04-dd04-dd04-dd0000000001', brand_id: B.loveonfriday, name: 'LIORA Üst — Siyah', price: 2189, original_price: null, is_on_sale: false, is_new: true,  sizes: ['XS/S','M/L'], colors: ['Siyah'], master_category_id: catId['giyim'], image_url: 'https://www.love-onfriday.com/cdn/shop/files/LIOR-UST-S-01-Siyah_1.jpg?v=1776420551&width=2401', image_aspect_ratio: 1.4994, url: 'https://www.love-onfriday.com/products/liora-ust-siyah', is_available: true },
    { id: 'dd000004-dd04-dd04-dd04-dd0000000002', brand_id: B.loveonfriday, name: 'ALEYA Teknik Bomber Ceket — Krem', price: 7249, original_price: 9800, is_on_sale: true, is_new: false, sizes: ['XS/S','M/L'], colors: ['Krem','Kırmızı'], master_category_id: catId['giyim'], image_url: 'https://www.love-onfriday.com/cdn/shop/files/ALY-CKT-S-001-Krem_1.jpg?v=1776420733&width=2401', image_aspect_ratio: 1.4994, url: 'https://www.love-onfriday.com/products/aleya-teknik-bomber-ceket-krem', is_available: true },
    { id: 'dd000004-dd04-dd04-dd04-dd0000000003', brand_id: B.loveonfriday, name: 'ELIA Streç Çan Paça Pantolon — Siyah', price: 3289, original_price: null, is_on_sale: false, is_new: true,  sizes: ['XS','S','M','L'], colors: ['Siyah'], master_category_id: catId['giyim'], image_url: 'https://www.love-onfriday.com/cdn/shop/files/ELIA-PNT-S-01-Siyah_1.jpg?v=1776420620&width=2401', image_aspect_ratio: 1.4994, url: 'https://www.love-onfriday.com/products/elia-mini-flare-pantolon-siyah', is_available: true },

    // ── Mlouye (Shopify · gerçek aspect: 1.0 kare) ───────────────────────────
    { id: 'ee000005-ee05-ee05-ee05-ee0000000001', brand_id: B.mylouye, name: 'Isla Grab Purse — Espresso', price: 14450, original_price: null, is_on_sale: false, is_new: true, sizes: [], colors: ['Espresso'], master_category_id: catId['canta'], image_url: 'https://www.mlouye.com/cdn/shop/files/Isla-Grab-Purse-Espresso_01_3a2cc992-ace7-4eca-8829-0a8ee00b5840.jpg?v=1776682283&width=1200', image_aspect_ratio: 1.0, url: 'https://www.mlouye.com/products/isla-grab-purse-espresso', is_available: true },
    { id: 'ee000005-ee05-ee05-ee05-ee0000000002', brand_id: B.mylouye, name: 'Luna 20 — Parrot', price: 14800, original_price: null, is_on_sale: false, is_new: true, sizes: [], colors: ['Parrot'], master_category_id: catId['canta'], image_url: 'https://www.mlouye.com/cdn/shop/files/Luna-20-Parrot_01_c99120eb-e192-46c7-a633-448628e470e1.jpg?v=1768294828&width=1200', image_aspect_ratio: 1.0, url: 'https://www.mlouye.com/products/luna-20-parrot', is_available: true },
    { id: 'ee000005-ee05-ee05-ee05-ee0000000003', brand_id: B.mylouye, name: 'M Tote — Tan & Pink', price: 16830, original_price: null, is_on_sale: false, is_new: false, sizes: [], colors: ['Tan','Pink'], master_category_id: catId['canta'], image_url: 'https://www.mlouye.com/cdn/shop/files/M-Tote-Tan_Pink_01.jpg?v=1767687819&width=1200', image_aspect_ratio: 1.0, url: 'https://www.mlouye.com/products/m-tote-tan-pink', is_available: true },

    // ── Manuel Atelier (Shopify · gerçek aspect: 1.34) ───────────────────────
    { id: 'ff000006-ff06-ff06-ff06-ff0000000001', brand_id: B.manuel, name: 'Mini Tote du Jour — Ecru Crochet', price: 21590, original_price: null, is_on_sale: false, is_new: true, sizes: [], colors: ['Ecru'], master_category_id: catId['canta'], image_url: 'https://manuatelier.com/cdn/shop/files/2026161MINITOTEDUJOURCROCHET_SOFTCALFLEATHERECRU_BLACK_3.jpg?width=800', image_aspect_ratio: 1.34, url: 'https://manuatelier.com/products/mini-tote-du-jour-ecru-crochet-black-soft', is_available: true },
    { id: 'ff000006-ff06-ff06-ff06-ff0000000002', brand_id: B.manuel, name: 'Le Cambon 20 — Siyah', price: 19720, original_price: 24000, is_on_sale: true, is_new: false, sizes: [], colors: ['Siyah'], master_category_id: catId['canta'], image_url: 'https://manuatelier.com/cdn/shop/files/2024389_LeCambon20_Black_CalfLeather_1.jpg?width=800', image_aspect_ratio: 1.34, url: 'https://manuatelier.com/products/le-cambon-20-black', is_available: true },
    { id: 'ff000006-ff06-ff06-ff06-ff0000000003', brand_id: B.manuel, name: 'Le Cambon East West — Vanilla', price: 25160, original_price: null, is_on_sale: false, is_new: true, sizes: [], colors: ['Vanilla'], master_category_id: catId['canta'], image_url: 'https://manuatelier.com/cdn/shop/files/2026143_LE_CAMBON_EAST_WEST_VANILLA_FRONT.jpg?width=800', image_aspect_ratio: 1.34, url: 'https://manuatelier.com/products/le-cambon-east-west-vanilla', is_available: true },

    // ── Atelier Rebul (Akinon · kare görsel: 1.0) ────────────────────────────
    { id: 'ab000007-ab07-ab07-ab07-ab0000000001', brand_id: B.rebul, name: 'Istanbul Eau de Parfum 125ml', price: 5250, original_price: null, is_on_sale: false, is_new: false, sizes: [], colors: [], master_category_id: catId['parfum'], image_url: 'https://akn-atelier.a-cdn.akinoncloud.com/products/2023/11/03/272/9052fdd1-41bc-4be1-8f95-4c5d0bfcce1d_size400x400_cropCenter.jpg', image_aspect_ratio: 1.0, url: 'https://www.atelierrebul.com.tr/istanbul-eau-de-parfum-125-ml/', is_available: true },
    { id: 'ab000007-ab07-ab07-ab07-ab0000000002', brand_id: B.rebul, name: 'Istanbul Bosphorus EDP 125ml', price: 5250, original_price: null, is_on_sale: false, is_new: true, sizes: [], colors: [], master_category_id: catId['parfum'], image_url: 'https://akn-atelier.a-cdn.akinoncloud.com/products/2024/04/18/12146/f17994b1-1de4-4549-a41e-94c03b5e458a_size400x400_cropCenter.jpg', image_aspect_ratio: 1.0, url: 'https://www.atelierrebul.com.tr/istanbul-bosphorus-eau-de-parfum-125-ml/', is_available: true },
    { id: 'ab000007-ab07-ab07-ab07-ab0000000003', brand_id: B.rebul, name: '1895 Eau de Parfum 125ml', price: 5250, original_price: 6200, is_on_sale: true, is_new: false, sizes: [], colors: [], master_category_id: catId['parfum'], image_url: 'https://akn-atelier.a-cdn.akinoncloud.com/products/2024/08/16/55/d1a72e6f-87c7-4014-84df-e75f31f57425_size400x400_cropCenter.jpg', image_aspect_ratio: 1.0, url: 'https://www.atelierrebul.com.tr/1895-eau-de-parfum-125-ml/', is_available: true },

    // ── The Purest Solutions (Shopify · kare görsel: 1.0) ────────────────────
    { id: 'ac000008-ac08-ac08-ac08-ac0000000001', brand_id: B.purest, name: 'Vitamin C Serum 30ml', price: 300, original_price: null, is_on_sale: false, is_new: false, sizes: [], colors: [], master_category_id: catId['cilt-bakimi'], image_url: 'https://thepurestsolutions.com/cdn/shop/files/Brightening_LighteningVitaminCSerum-1.jpg?v=1776666975&width=1100', image_aspect_ratio: 1.0, url: 'https://thepurestsolutions.com/products/aydinlatici-ve-cilt-tonu-esitleyici-c-vitamini-cilt-serumu-30-ml-kopya', is_available: true },
    { id: 'ac000008-ac08-ac08-ac08-ac0000000002', brand_id: B.purest, name: 'Arbutin Brightening Serum 30ml', price: 280, original_price: 380, is_on_sale: true, is_new: false, sizes: [], colors: [], master_category_id: catId['cilt-bakimi'], image_url: 'https://thepurestsolutions.com/cdn/shop/files/BrighteningSerum-1.jpg?v=1776667064&width=1100', image_aspect_ratio: 1.0, url: 'https://thepurestsolutions.com/products/leke-karsiti-aydinlatici-arbutin-cilt-bakim-serumu-30ml', is_available: true },
    { id: 'ac000008-ac08-ac08-ac08-ac0000000003', brand_id: B.purest, name: 'Glycolic Acid Blue Tonic 200ml', price: 300, original_price: null, is_on_sale: false, is_new: true, sizes: [], colors: [], master_category_id: catId['cilt-bakimi'], image_url: 'https://thepurestsolutions.com/cdn/shop/files/ExfoliatingandClarifyingToner200ml-2000x2000-1.jpg?v=1776667095&width=1100', image_aspect_ratio: 1.0, url: 'https://thepurestsolutions.com/products/glikolik-asit-mavi-tonik-gozenek-sikilasitirici-200ml', is_available: true },

    // ── VavRattan (Shopify · gerçek aspect: ~1.0-1.29) ───────────────────────
    { id: 'ad000009-ad09-ad09-ad09-ad0000000001', brand_id: B.vavrattan, name: 'Berlin 2+1+1 Yemek Takımı — Açık Gri', price: 31000, original_price: null, is_on_sale: false, is_new: false, sizes: [], colors: ['Açık Gri'], master_category_id: catId['ev-dekor'], image_url: 'https://vavrattan.com/cdn/shop/files/157.png?v=1704394993&width=533', image_aspect_ratio: 1.0, url: 'https://vavrattan.com/products/berlin-2-1-1-yemek-takimi-acik-gri', is_available: true },
    { id: 'ad000009-ad09-ad09-ad09-ad0000000002', brand_id: B.vavrattan, name: 'Berlin 2+2 Oturma Takımı — Taş Gri', price: 30000, original_price: 36000, is_on_sale: true, is_new: false, sizes: [], colors: ['Taş Gri','Kum','Bakır'], master_category_id: catId['ev-dekor'], image_url: 'https://vavrattan.com/cdn/shop/files/Berlin2_2OturmaTakimi-TasGri-1.png?v=1746903803&width=533', image_aspect_ratio: 1.29, url: 'https://vavrattan.com/products/berlin-2-2-tas-gri', is_available: true },
    { id: 'ad000009-ad09-ad09-ad09-ad0000000003', brand_id: B.vavrattan, name: 'Berlin Bistro Oturma Takımı — Kum', price: 27000, original_price: null, is_on_sale: false, is_new: true, sizes: [], colors: ['Kum'], master_category_id: catId['ev-dekor'], image_url: 'https://vavrattan.com/cdn/shop/files/152.png?v=1704395188&width=533', image_aspect_ratio: 1.0, url: 'https://vavrattan.com/products/berlin-bistro-oturma-takimi-kum', is_available: true },
  ];

  const { error } = await supabase
    .from('products')
    .upsert(products, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓  Seeded ${products.length} products across ${Object.keys(B).length} brands`);
}

async function seedUserBrands(userId) {
  // Demo kullanıcının koleksiyonu — kategori çeşitliliği için
  const pairs = [
    { brandId: 'bbbbbbbb-0001-0001-0001-000000000001' }, // Selma Çilek — giyim
    { brandId: 'bbbbbbbb-0001-0001-0001-000000000003' }, // Hof Silk — giyim
    { brandId: 'bbbbbbbb-0001-0001-0001-000000000006' }, // Sinem Kıvanç — giyim
    { brandId: 'bbbbbbbb-0001-0001-0001-000000000008' }, // Love on Friday — giyim
    { brandId: 'bbbbbbbb-0001-0001-0001-000000000009' }, // MyLouye — çanta
    { brandId: 'bbbbbbbb-0001-0001-0001-000000000010' }, // Manuel Atelier — çanta
    { brandId: 'bbbbbbbb-0001-0001-0001-000000000015' }, // Atelier Rebul — güzellik
    { brandId: 'bbbbbbbb-0001-0001-0001-000000000016' }, // The Purest Solutions — güzellik
    { brandId: 'bbbbbbbb-0001-0001-0001-000000000013' }, // VavRattan — ev
  ];

  const rows = pairs.map(p => ({
    user_id: userId,
    brand_id: p.brandId,
    is_favorite: true,
  }));

  const { error } = await supabase
    .from('user_brands')
    .upsert(rows, { onConflict: 'user_id,brand_id' });
  if (error) throw error;
  console.log(`✓  Demo user has ${rows.length} saved brands`);
}

// Shopify markalarından gerçek ürün çek (seed zamanında lokalde çalışır)
async function syncShopifyProducts() {
  const SIZE_NAMES  = ['size', 'beden', 'boyut', 'numara'];
  const COLOR_NAMES = ['color', 'colour', 'renk'];
  const CATEGORY_MAP = [
    { slug: 'giyim',       kw: ['elbise','bluz','pantolon','etek','ceket','tişört','gömlek','tulum','dress','top','shirt','pants','skirt','jacket','coat','bodysuit','babydoll','şort','sort','kıyafet'] },
    { slug: 'canta',       kw: ['çanta','bag','tote','clutch','purse','handbag','crossbody','backpack','wallet'] },
    { slug: 'ayakkabi',    kw: ['ayakkabı','bot','sandalet','sneaker','shoes','boots','heels'] },
    { slug: 'taki',        kw: ['takı','kolye','bileklik','yüzük','küpe','jewelry','necklace','ring','earring'] },
    { slug: 'kozmetik',    kw: ['makyaj','ruj','fondöten','makeup','lipstick','foundation'] },
    { slug: 'cilt-bakimi', kw: ['serum','krem','tonik','nemlendirici','skincare','moisturizer','toner','cleanser','acid','brightening','niacinamide'] },
    { slug: 'sac-bakimi',  kw: ['saç','şampuan','hair','shampoo','conditioner'] },
    { slug: 'parfum',      kw: ['parfüm','eau de parfum','edp','edt','cologne','fragrance','perfume'] },
    { slug: 'ev-tekstil',  kw: ['nevresim','yorgan','havlu','bedding','towel','curtain'] },
    { slug: 'ev-dekor',    kw: ['dekorasyon','vazo','mum','rattan','koltuk','sandalye','masa','oturma','home decor','furniture','mobilya'] },
    { slug: 'mutfak',      kw: ['mutfak','tabak','kase','bardak','kitchen','cookware','plate'] },
    { slug: 'bebek',       kw: ['bebek','çocuk','baby','kids'] },
    { slug: 'evcil',       kw: ['evcil','kedi','köpek','pet','cat','dog'] },
    { slug: 'gida',        kw: ['gıda','organik','zeytinyağı','ceviz','food','organic','wine','honey'] },
    { slug: 'aksesuar',    kw: ['aksesuar','şapka','bere','eşarp','kemer','gözlük','scarf','belt','sunglasses'] },
  ];

  function mapCat(raw) {
    if (!raw) return null;
    const lower = raw.toLowerCase();
    for (const { slug, kw } of CATEGORY_MAP) {
      if (kw.some(k => lower.includes(k))) return slug;
    }
    return null;
  }

  // Demo kullanıcının takip ettiği Shopify markalarını çek (hızlı seed için sadece bunlar)
  const DEMO_SHOPIFY_IDS = [
    'bbbbbbbb-0001-0001-0001-000000000001', // Selma Çilek
    'bbbbbbbb-0001-0001-0001-000000000003', // Hof Silk
    'bbbbbbbb-0001-0001-0001-000000000008', // Love on Friday
    'bbbbbbbb-0001-0001-0001-000000000009', // Mlouye
    'bbbbbbbb-0001-0001-0001-000000000010', // Manuel Atelier
    'bbbbbbbb-0001-0001-0001-000000000016', // The Purest Solutions
    'bbbbbbbb-0001-0001-0001-000000000013', // VavRattan
  ];
  const { data: shopifyBrands, error: brandsErr } = await supabase
    .from('brands').select('id, name, website')
    .in('id', DEMO_SHOPIFY_IDS);


  // Kategori ID cache
  const { data: cats } = await supabase.from('master_categories').select('id, slug');
  const catId = Object.fromEntries((cats ?? []).map(c => [c.slug, c.id]));

  let totalInserted = 0;

  for (const brand of (shopifyBrands ?? [])) {
    try {
      const base = brand.website.replace(/\/$/, '');
      let sinceId = 0;
      let brandCount = 0;

      while (true) {
        const url = `${base}/products.json?limit=50${sinceId ? `&since_id=${sinceId}` : ''}`; // seed için 50/sayfa
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Butika/1.0', 'Accept': 'application/json' },
          signal: AbortSignal.timeout(30000),
        });
        if (!res.ok) break;
        const { products } = await res.json();
        if (!products?.length) break;

        sinceId = products[products.length - 1].id;

        const rows = [];
        for (const p of products) {
          if (!p.images?.length || !p.variants?.length) continue;
          const avail = p.variants.filter(v => v.available);
          const pv = avail[0] ?? p.variants[0];
          const price = parseFloat(pv.price);
          if (price <= 0) continue;
          const cat = parseFloat(pv.compare_at_price ?? '0');
          const img = p.images[0];
          const ratio = img?.height > 0 ? parseFloat((img.height / img.width).toFixed(4)) : 0.75;
          const sizeOpt  = (p.options || []).find(o => SIZE_NAMES.some(s => o.name.toLowerCase().includes(s)));
          const colorOpt = (p.options || []).find(o => COLOR_NAMES.some(c => o.name.toLowerCase().includes(c)));
          const catSlug = mapCat(p.product_type || p.tags?.[0] || '');

          rows.push({
            brand_id: brand.id,
            external_product_id: p.handle,
            name: p.title,
            image_url: img.src,
            image_urls: p.images.map(i => i.src),
            image_aspect_ratio: ratio,
            price,
            original_price: cat > price ? cat : null,
            currency: 'TRY',
            url: `${base}/products/${p.handle}`,
            affiliate_url: `${base}/products/${p.handle}?utm_source=butika`,
            tags: p.tags || [],
            sizes: sizeOpt?.values || [],
            colors: colorOpt?.values || [],
            is_on_sale: cat > price,
            is_available: avail.length > 0,
            is_new: new Date(p.published_at) > new Date(Date.now() - 60 * 86400000),
            in_stock: avail.length > 0,
            master_category_id: catSlug ? (catId[catSlug] ?? null) : null,
            source: 'shopify_api',
            updated_at: new Date().toISOString(),
          });
        }

        if (rows.length) {
          const { error } = await supabase.from('products')
            .upsert(rows, { onConflict: 'brand_id,external_product_id' });
          if (!error) { brandCount += rows.length; totalInserted += rows.length; }
        }

        if (products.length < 50 || brandCount >= 100) break; // marka başına max 100 ürün
      }

      if (brandCount > 0) console.log(`  ✓  ${brand.name}: ${brandCount} ürün`);
    } catch (e) {
      console.log(`  ⚠  ${brand.name}: ${e.message}`);
    }
  }

  console.log(`✓  Shopify'dan ${totalInserted} ürün senkronize edildi`);
}

async function main() {
  console.log(`\n🌱  Seeding local Supabase at ${SUPABASE_URL}\n`);
  const userId = await ensureDemoUser();
  await seedBrands();
  await seedProducts();
  await syncShopifyProducts();
  await seedUserBrands(userId);
  await seedShipments(userId);
  console.log(`\n✅  Done. Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
}

main().catch((err) => {
  console.error('\n❌  Seed failed:', err.message || err);
  process.exit(1);
});
