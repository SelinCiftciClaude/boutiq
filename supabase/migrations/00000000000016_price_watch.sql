-- ── Fiyat & Stok Takip Sistemi ────────────────────────────────────────────────

-- 1. product_price_history: stok sütunları ekle
ALTER TABLE product_price_history
  ADD COLUMN IF NOT EXISTS stock_status VARCHAR(20) DEFAULT 'in_stock'
    CHECK (stock_status IN ('in_stock','low_stock','out_of_stock')),
  ADD COLUMN IF NOT EXISTS stock_count INTEGER;

-- 2. product_watches: kullanıcının takibe aldığı ürünler
CREATE TABLE IF NOT EXISTS product_watches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  watch_price_drop    BOOLEAN NOT NULL DEFAULT TRUE,
  watch_low_stock     BOOLEAN NOT NULL DEFAULT TRUE,
  watch_back_in_stock BOOLEAN NOT NULL DEFAULT FALSE,
  target_price        NUMERIC(10,2),            -- nullable, kullanıcı isterse
  initial_price       NUMERIC(10,2) NOT NULL,   -- eklendiği andaki fiyat
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- 3. notification_preferences: kullanıcı bildirim tercihleri
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled              BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_start               TIME NOT NULL DEFAULT '22:00',
  quiet_end                 TIME NOT NULL DEFAULT '09:00',
  min_discount_pct          INTEGER NOT NULL DEFAULT 0,
  daily_limit               INTEGER NOT NULL DEFAULT 5,
  notifications_sent_today  INTEGER NOT NULL DEFAULT 0,
  last_reset_date           DATE NOT NULL DEFAULT CURRENT_DATE
);

-- 4. notifications: product_id + payload sütunu ekle (mevcut tabloya)
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payload JSONB;

-- 5. İndeksler (sorgu hızı için)
CREATE INDEX IF NOT EXISTS idx_product_watches_user      ON product_watches (user_id)       WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_product_watches_product   ON product_watches (product_id)    WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_price_history_product_ts  ON product_price_history (product_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);
