-- ── Favorilerim Sistemi ──────────────────────────────────────────────────────

-- 1. Koleksiyonlar
CREATE TABLE IF NOT EXISTS favorite_collections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  emoji        VARCHAR(10) DEFAULT '❤️',
  cover_image_url TEXT,
  description  TEXT,
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  is_private   BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_user
  ON favorite_collections (user_id, display_order);

-- 2. Favoriler
CREATE TABLE IF NOT EXISTS favorites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES favorite_collections(id) ON DELETE CASCADE,

  -- Kaynak
  source_url   TEXT NOT NULL,
  url_hash     VARCHAR(64) NOT NULL,

  -- Ürün bilgisi (snapshot)
  product_name TEXT NOT NULL,
  product_description TEXT,
  primary_image_url TEXT,
  image_urls   TEXT[] DEFAULT '{}',

  -- Fiyat (kaydetme anındaki)
  price_at_save     NUMERIC(10,2),
  original_price_at_save NUMERIC(10,2),
  currency     VARCHAR(3) DEFAULT 'TRY',

  -- Güncel fiyat (background worker günceller)
  current_price      NUMERIC(10,2),
  current_stock_status VARCHAR(20) DEFAULT 'unknown'
    CHECK (current_stock_status IN ('in_stock','low_stock','out_of_stock','unavailable','unknown')),
  current_stock_count INTEGER,
  last_price_check_at TIMESTAMPTZ,
  next_price_check_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 hours'),

  -- Butik
  merchant_name VARCHAR(100),

  -- Kullanıcı
  note         TEXT,
  tags         TEXT[] DEFAULT '{}',

  -- Takip
  watch_price_drop   BOOLEAN NOT NULL DEFAULT FALSE,
  watch_stock_change BOOLEAN NOT NULL DEFAULT FALSE,
  target_price       NUMERIC(10,2),

  -- Meta
  parser_used  VARCHAR(30) DEFAULT 'unknown',
  needs_manual_review BOOLEAN NOT NULL DEFAULT FALSE,
  share_source VARCHAR(30) DEFAULT 'in_app',

  saved_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, url_hash)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user
  ON favorites (user_id, saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_collection
  ON favorites (collection_id, saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_price_check
  ON favorites (next_price_check_at)
  WHERE watch_price_drop = TRUE OR watch_stock_change = TRUE;
CREATE INDEX IF NOT EXISTS idx_favorites_tags
  ON favorites USING GIN (tags);

-- 3. Fiyat geçmişi
CREATE TABLE IF NOT EXISTS favorite_price_history (
  id           BIGSERIAL PRIMARY KEY,
  favorite_id  UUID NOT NULL REFERENCES favorites(id) ON DELETE CASCADE,
  price        NUMERIC(10,2) NOT NULL,
  stock_status VARCHAR(20),
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fav_price_history
  ON favorite_price_history (favorite_id, recorded_at DESC);

-- 4. Unfurl cache (24 saat)
CREATE TABLE IF NOT EXISTS link_unfurl_cache (
  url_hash     VARCHAR(64) PRIMARY KEY,
  url          TEXT NOT NULL,
  product_info JSONB NOT NULL,
  parser_used  VARCHAR(30),
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_unfurl_expires
  ON link_unfurl_cache (expires_at);

-- 5. RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE favorite_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites             ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coll_own" ON favorite_collections USING (auth.uid() = user_id);
CREATE POLICY "coll_insert_own" ON favorite_collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coll_update_own" ON favorite_collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "coll_delete_own" ON favorite_collections FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "fav_own" ON favorites USING (auth.uid() = user_id);
CREATE POLICY "fav_insert_own" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_update_own" ON favorites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "fav_delete_own" ON favorites FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "fav_price_own" ON favorite_price_history
  USING (
    EXISTS (SELECT 1 FROM favorites f WHERE f.id = favorite_id AND f.user_id = auth.uid())
  );

-- 6. Helper function: varsayılan koleksiyonu al ya da oluştur
CREATE OR REPLACE FUNCTION get_or_create_default_collection(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  col_id UUID;
BEGIN
  SELECT id INTO col_id
  FROM favorite_collections
  WHERE user_id = p_user_id AND is_default = TRUE
  LIMIT 1;

  IF col_id IS NULL THEN
    INSERT INTO favorite_collections (user_id, name, emoji, is_default, display_order)
    VALUES (p_user_id, 'Favorilerim', '❤️', TRUE, 0)
    RETURNING id INTO col_id;
  END IF;

  RETURN col_id;
END;
$$;
