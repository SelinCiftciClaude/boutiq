-- favorites tablosuna kategori kolonu ekleniyor
-- Favoriye eklenen ürünlerin hangi master kategori olduğunu saklıyoruz

ALTER TABLE favorites
  ADD COLUMN IF NOT EXISTS master_category_id UUID
    REFERENCES master_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_favorites_category
  ON favorites (user_id, master_category_id);
