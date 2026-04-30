-- ============================================================
-- Migration 13: Public tablolarda RLS aktif edildi
-- brands, products, campaigns, product_price_history
-- Mevcut SELECT policies zaten doğru tanımlıydı;
-- bu migration sadece enforce'u devreye alır.
-- ============================================================

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;

-- product_price_history için public read policy yoktu, ekleniyor.
-- Fiyat geçmişi herkese açık ürün verisi sayılır.
CREATE POLICY "Price history is publicly readable"
  ON product_price_history
  FOR SELECT
  TO anon, authenticated
  USING (true);
