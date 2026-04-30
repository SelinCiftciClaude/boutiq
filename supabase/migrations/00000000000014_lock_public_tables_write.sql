-- ============================================================
-- Migration 14: Public tablolarda yazma kapıları kilitlendi
--
-- brands, products, campaigns, product_price_history tabloları
-- yalnızca okunabilir (public SELECT) olmalıdır.
-- anon ve authenticated rolleri hiçbir şekilde veri
-- ekleyemez, güncelleyemez veya silemez.
--
-- NOT: service_role RLS'yi bypass eder — seed, cron ve admin
-- işlemleri bu politikalardan etkilenmez.
-- ============================================================

-- ── BRANDS ───────────────────────────────────────────────────
CREATE POLICY "Brands are insert-locked"
  ON brands FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Brands are update-locked"
  ON brands FOR UPDATE TO anon, authenticated
  USING (false);

CREATE POLICY "Brands are delete-locked"
  ON brands FOR DELETE TO anon, authenticated
  USING (false);

-- ── PRODUCTS ─────────────────────────────────────────────────
CREATE POLICY "Products are insert-locked"
  ON products FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Products are update-locked"
  ON products FOR UPDATE TO anon, authenticated
  USING (false);

CREATE POLICY "Products are delete-locked"
  ON products FOR DELETE TO anon, authenticated
  USING (false);

-- ── CAMPAIGNS ────────────────────────────────────────────────
CREATE POLICY "Campaigns are insert-locked"
  ON campaigns FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Campaigns are update-locked"
  ON campaigns FOR UPDATE TO anon, authenticated
  USING (false);

CREATE POLICY "Campaigns are delete-locked"
  ON campaigns FOR DELETE TO anon, authenticated
  USING (false);

-- ── PRODUCT_PRICE_HISTORY ────────────────────────────────────
CREATE POLICY "Price history is insert-locked"
  ON product_price_history FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Price history is update-locked"
  ON product_price_history FOR UPDATE TO anon, authenticated
  USING (false);

CREATE POLICY "Price history is delete-locked"
  ON product_price_history FOR DELETE TO anon, authenticated
  USING (false);
