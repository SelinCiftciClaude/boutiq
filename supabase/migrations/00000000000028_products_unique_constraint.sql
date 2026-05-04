-- products tablosuna (brand_id, external_product_id) için UNIQUE CONSTRAINT ekle
-- PostgREST'in ON CONFLICT ile çalışabilmesi için index değil constraint gerekiyor

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_products_brand_external'
    AND conrelid = 'products'::regclass
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT uq_products_brand_external
      UNIQUE (brand_id, external_product_id);
  END IF;
END;
$$;
