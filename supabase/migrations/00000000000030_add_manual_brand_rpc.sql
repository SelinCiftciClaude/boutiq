-- add_manual_brand: Kullanıcının web'de bulduğu butiği anında sisteme ekler.
-- SECURITY DEFINER → RLS bypass eder, authenticated kullanıcı güvenle çalıştırabilir.
-- Mantık:
--   1. Website veya isimle eşleşen brand var mı kontrol et
--   2. Yoksa brands tablosuna ekle
--   3. user_brands'a bağla (idempotent)
--   4. Yeni brand UUID'sini döndür

CREATE OR REPLACE FUNCTION add_manual_brand(
  p_name     TEXT,
  p_website  TEXT,
  p_category TEXT DEFAULT 'Giyim'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id UUID;
  v_user_id  UUID;
  v_domain   TEXT;
BEGIN
  -- Kimlik doğrulama
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Kimlik doğrulama gerekli';
  END IF;

  -- Domain normalleştir: "https://www.muun.com/tr" → "muun.com"
  v_domain := lower(trim(p_website));
  v_domain := regexp_replace(v_domain, '^https?://', '');
  v_domain := regexp_replace(v_domain, '^www\.', '');
  v_domain := regexp_replace(v_domain, '/.*$', '');

  -- Mevcut brand var mı? (website domain veya isim eşleşmesi)
  SELECT id INTO v_brand_id
  FROM brands
  WHERE lower(website) LIKE '%' || v_domain || '%'
     OR lower(name) = lower(trim(p_name))
  LIMIT 1;

  -- Yoksa yeni brand oluştur
  IF v_brand_id IS NULL THEN
    INSERT INTO brands (name, website, handle, category)
    VALUES (
      trim(p_name),
      v_domain,
      lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g')),
      p_category
    )
    RETURNING id INTO v_brand_id;
  END IF;

  -- Kullanıcıya bağla (zaten bağlıysa sessizce geç)
  INSERT INTO user_brands (user_id, brand_id)
  VALUES (v_user_id, v_brand_id)
  ON CONFLICT (user_id, brand_id) DO NOTHING;

  RETURN v_brand_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_manual_brand TO authenticated;
