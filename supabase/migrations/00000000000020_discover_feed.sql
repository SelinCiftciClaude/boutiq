-- ── Keşfet Feed — Master Kategoriler + Ürün Genişlemeleri ──────────────────

-- Master kategori taksonomi (Butika sabit listesi)
CREATE TABLE IF NOT EXISTS master_categories (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         VARCHAR(50) UNIQUE NOT NULL,
  name_tr      VARCHAR(100) NOT NULL,
  emoji        VARCHAR(10),
  display_order INTEGER     DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO master_categories (slug, name_tr, emoji, display_order) VALUES
  ('giyim',       'Giyim',          '👗', 1),
  ('canta',       'Çanta',          '👜', 2),
  ('ayakkabi',    'Ayakkabı',       '👠', 3),
  ('taki',        'Takı',           '💍', 4),
  ('kozmetik',    'Kozmetik',       '💄', 5),
  ('cilt-bakimi', 'Cilt Bakımı',    '✨', 6),
  ('sac-bakimi',  'Saç Bakımı',     '💇', 7),
  ('parfum',      'Parfüm',         '🌸', 8),
  ('ev-tekstil',  'Ev Tekstili',    '🛏️', 9),
  ('ev-dekor',    'Ev & Dekor',     '🏠', 10),
  ('mutfak',      'Mutfak',         '🍽️', 11),
  ('bebek',       'Bebek & Çocuk',  '👶', 12),
  ('evcil',       'Pet',            '🐾', 13),
  ('gida',        'Gıda & Organik', '🌿', 14),
  ('aksesuar',    'Aksesuar',       '👒', 15)
ON CONFLICT (slug) DO NOTHING;

-- Products tablosuna yeni sütunlar
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS master_category_id   UUID       REFERENCES master_categories(id),
  ADD COLUMN IF NOT EXISTS image_aspect_ratio   DECIMAL(5,4) DEFAULT 0.7500,
  ADD COLUMN IF NOT EXISTS external_product_id  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS source               VARCHAR(30)  DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS is_new               BOOLEAN      DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_available         BOOLEAN      DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS popularity_score     INTEGER      DEFAULT 0;

-- Brands tablosuna platform sütunu
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'other';

-- Benzersiz index: aynı markada aynı external ürün iki kez girmesin
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_brand_external
  ON products(brand_id, external_product_id)
  WHERE external_product_id IS NOT NULL;

-- Sorgu hızı için
CREATE INDEX IF NOT EXISTS idx_products_master_cat
  ON products(master_category_id, is_available);
CREATE INDEX IF NOT EXISTS idx_products_brand_avail
  ON products(brand_id, is_available);
CREATE INDEX IF NOT EXISTS idx_products_created
  ON products(created_at DESC)
  WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_on_sale
  ON products(is_on_sale, is_available)
  WHERE is_on_sale = TRUE;

-- Kullanıcının gizlediği ürünler
CREATE TABLE IF NOT EXISTS user_hidden_products (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  hidden_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

ALTER TABLE user_hidden_products ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_hidden_products' AND policyname='users manage own hidden products') THEN
    CREATE POLICY "users manage own hidden products"
      ON user_hidden_products FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
