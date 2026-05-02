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
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000001',
      name: 'Selma Çilek',
      handle: '@selmacilek',
      website: 'https://www.selmacilek.com',
      category: 'giyim',
      cover_url: COVERS.giyim,
      description: 'Zarif ve kadınsı tasarımlarıyla öne çıkan Türk moda markası.',
      is_verified: true,
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000002',
      name: 'MyBestFriends',
      handle: '@mybestfriendstr',
      website: 'https://www.mybestfriends.com.tr',
      category: 'giyim',
      cover_url: COVERS.giyim,
      description: 'Günlük hayatın şıklığı için tasarlanmış koleksiyonlar.',
      is_verified: true,
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000003',
      name: 'Hof Silk',
      handle: '@hofsilk',
      website: 'https://www.hofsilk.com',
      category: 'giyim',
      cover_url: COVERS.giyim,
      description: 'İpek dokuların sadeliği ve lüksü.',
      is_verified: true,
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000004',
      name: 'Less & Romance',
      handle: '@lessandromance',
      website: 'https://www.lessandromance.com',
      category: 'giyim',
      cover_url: COVERS.giyim,
      description: 'Az ama öz romantizm; özgür ve akıcı silüetler.',
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000005',
      name: 'LOL Official',
      handle: '@lolofficial',
      website: 'https://www.lolofficial.com',
      category: 'giyim',
      cover_url: COVERS.giyim,
      description: 'Genç ve dinamik sokak modasının adresi.',
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000006',
      name: 'Sinem Kıvanç',
      handle: '@sinemkivanc',
      website: 'https://www.sinemkivanc.com',
      category: 'giyim',
      cover_url: COVERS.giyim,
      description: 'Sinem Kıvanç imzalı sofistike ve şık kadın giyim koleksiyonu.',
      is_verified: true,
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000007',
      name: 'Butik Merve Aksoy',
      handle: '@butikmerveaksoy',
      website: 'https://www.butikmerveaksoy.com',
      category: 'giyim',
      cover_url: COVERS.giyim,
      description: 'Merve Aksoy imzasıyla şık ve rafine kadın giyimi.',
      is_verified: true,
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000008',
      name: 'Love on Friday',
      handle: '@loveonfriday',
      website: 'https://www.love-onfriday.com',
      category: 'giyim',
      cover_url: COVERS.giyim,
      description: 'Her gün cuma gibi hissettiren akıcı ve özgür parçalar.',
      is_verified: true,
    },
    // ── Çanta & Aksesuar ──────────────────────────────────────────────────────
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000009',
      name: 'MyLouye',
      handle: '@mylouye',
      website: 'https://www.mylouye.com',
      category: 'çanta',
      cover_url: COVERS.canta,
      description: 'Özgün tasarımlı, el yapımı lüks çantalar.',
      is_verified: true,
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000010',
      name: 'Manuel Atelier',
      handle: '@manuatelier',
      website: 'https://www.manuatelier.com',
      category: 'çanta',
      cover_url: COVERS.canta,
      description: 'Türkiye\'nin en prestijli deri çanta markalarından.',
      is_verified: true,
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000011',
      name: 'Misela',
      handle: '@misela',
      website: 'https://www.misela.com',
      category: 'çanta',
      cover_url: COVERS.canta,
      description: 'Modern kadın için geometrik ve özgün deri çanta tasarımları.',
      is_verified: true,
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000012',
      name: 'MANC Official',
      handle: '@mancofficial',
      website: 'https://www.mancofficial.com',
      category: 'giyim',
      cover_url: COVERS.giyim,
      description: 'Unisex streetwear ve minimalist günlük giyim.',
    },
    // ── Ev & Yaşam ────────────────────────────────────────────────────────────
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000013',
      name: 'VavRattan',
      handle: '@vavrattan',
      website: 'https://www.vavrattan.com',
      category: 'ev',
      cover_url: COVERS.ev,
      description: 'Hasır ve rattan dokunuşlarıyla doğal ev dekorasyonu.',
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000014',
      name: 'GiquHome',
      handle: '@giquhome',
      website: 'https://www.giquhome.com.tr',
      category: 'ev',
      cover_url: COVERS.ev,
      description: 'Estetik ev tekstili ve yaşam ürünleri.',
    },
    // ── Güzellik & Kozmetik ───────────────────────────────────────────────────
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000015',
      name: 'Atelier Rebul',
      handle: '@atelierrebul',
      website: 'https://www.atelierrebul.com.tr',
      category: 'güzellik',
      cover_url: COVERS.guzellik,
      description: '1895\'ten bu yana lüks Türk parfüm ve kozmetik markası.',
      is_verified: true,
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000016',
      name: 'The Purest Solutions',
      handle: '@thepurestsolutions',
      website: 'https://www.thepurestsolutions.com',
      category: 'güzellik',
      cover_url: COVERS.guzellik,
      description: 'Temiz formüllü, bilim destekli cilt bakımı.',
      is_verified: true,
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000017',
      name: 'İno Beauty',
      handle: '@inobeauty',
      website: 'https://www.inobeauty.com.tr',
      category: 'güzellik',
      cover_url: COVERS.guzellik,
      description: 'Doğal içeriklerle hazırlanan el yapımı güzellik ürünleri.',
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000018',
      name: 'Gulsha',
      handle: '@gulsha',
      website: 'https://www.gulsha.com',
      category: 'güzellik',
      cover_url: COVERS.guzellik,
      description: 'Çiçek özlü, doğa ilhamlı cilt bakım ve parfüm koleksiyonu.',
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000019',
      name: 'Rosece',
      handle: '@rosece',
      website: 'https://www.rosece.com',
      category: 'güzellik',
      cover_url: COVERS.guzellik,
      description: 'Gül suyu ve botanik özlerle hassas cilt bakımı.',
    },
    // ── Gıda & Organik ────────────────────────────────────────────────────────
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000020',
      name: 'İyice Ceviz Bahçesi',
      handle: '@iyicevizbahcesi',
      website: 'https://www.iyicevizbahcesi.com.tr',
      category: 'gıda',
      cover_url: COVERS.gida,
      description: 'Ege\'nin bereketli topraklarından kuru ceviz ve yağ.',
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000021',
      name: 'İka Bağları',
      handle: '@ikabaglari',
      website: 'https://www.ikabaglari.com',
      category: 'gıda',
      cover_url: COVERS.gida,
      description: 'Küçük üreticiden doğrudan masa şarabı ve organik bağ ürünleri.',
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000022',
      name: 'Datça Murat Çiftliği',
      handle: '@datcamuratciftligi',
      website: 'https://www.datcamuratciftligi.com',
      category: 'gıda',
      cover_url: COVERS.gida,
      description: 'Datça yarımadasından sertifikalı organik badem ve zeytinyağı.',
    },
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000023',
      name: 'Anamur Bahçesi',
      handle: '@anamurbahcesi',
      website: 'https://www.anamurbahcesi.com',
      category: 'gıda',
      cover_url: COVERS.gida,
      description: 'Anamur\'un tropik iklimiyle yetişen muz ve tropikal meyveler.',
    },
    // ── Pet ───────────────────────────────────────────────────────────────────
    {
      id: 'bbbbbbbb-0001-0001-0001-000000000024',
      name: 'Veteriner Anne',
      handle: '@veterineranne',
      website: 'https://www.veterineranne.com',
      category: 'evcil',
      cover_url: COVERS.pet,
      description: 'Veteriner hekim önerisiyle hazırlanmış evcil hayvan ürünleri.',
    },
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

async function main() {
  console.log(`\n🌱  Seeding local Supabase at ${SUPABASE_URL}\n`);
  const userId = await ensureDemoUser();
  await seedBrands();
  await seedUserBrands(userId);
  await seedShipments(userId);
  console.log(`\n✅  Done. Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
}

main().catch((err) => {
  console.error('\n❌  Seed failed:', err.message || err);
  process.exit(1);
});
