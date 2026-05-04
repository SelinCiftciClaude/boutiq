-- search_products_feed: Kelime bazlı arama (tokenized multi-word search)
-- "beyaz pantolon" → ['beyaz', 'pantolon'] → her kelime bağımsız aranır (AND mantığı)
-- Türkçe büyük/küçük harf: lower() kullanılır (ı/İ dahil)

CREATE OR REPLACE FUNCTION search_products_feed(
  p_search      TEXT,
  p_brand_ids   UUID[]   DEFAULT NULL,
  p_category_id UUID     DEFAULT NULL,
  p_on_sale     BOOLEAN  DEFAULT FALSE,
  p_new_only    BOOLEAN  DEFAULT FALSE,
  p_page        INTEGER  DEFAULT 0,
  p_page_size   INTEGER  DEFAULT 20
)
RETURNS TABLE (
  id                  UUID,
  name                TEXT,
  image_url           TEXT,
  image_aspect_ratio  DECIMAL,
  price               NUMERIC,
  original_price      NUMERIC,
  is_on_sale          BOOLEAN,
  is_new              BOOLEAN,
  url                 TEXT,
  affiliate_url       TEXT,
  brand_id            UUID,
  brand_name          TEXT,
  brand_logo_url      TEXT,
  master_category_slug TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.name,
    p.image_url,
    p.image_aspect_ratio,
    p.price,
    p.original_price,
    p.is_on_sale,
    p.is_new,
    p.url,
    p.affiliate_url,
    p.brand_id,
    b.name          AS brand_name,
    b.logo_url      AS brand_logo_url,
    mc.slug         AS master_category_slug
  FROM products p
  LEFT JOIN brands b            ON b.id  = p.brand_id
  LEFT JOIN master_categories mc ON mc.id = p.master_category_id
  WHERE
    p.is_available = TRUE
    AND (p_brand_ids IS NULL OR array_length(p_brand_ids, 1) IS NULL
         OR p.brand_id = ANY(p_brand_ids))
    AND (p_category_id IS NULL OR p.master_category_id = p_category_id)
    AND (p_on_sale  = FALSE OR p.is_on_sale = TRUE)
    AND (p_new_only = FALSE OR p.is_new     = TRUE)
    AND (
      -- Boş arama → filtre yok
      p_search IS NULL OR trim(p_search) = ''
      OR (
        -- Kelime bazlı AND: hiçbir kelime başarısız olmamalı
        -- "beyaz pantolon" → her kelime bağımsız aranır
        NOT EXISTS (
          SELECT 1
          FROM unnest(
            regexp_split_to_array(trim(lower(p_search)), '\s+')
          ) AS word
          WHERE word <> ''
            AND NOT (
              -- Kelime şu alanlardan birinde geçiyor mu?
              lower(p.name)                       LIKE '%' || word || '%'
              OR lower(COALESCE(b.name, ''))       LIKE '%' || word || '%'
              OR lower(COALESCE(mc.name_tr, ''))   LIKE '%' || word || '%'
              OR lower(COALESCE(mc.slug, ''))      LIKE '%' || word || '%'
              OR lower(COALESCE(p.category, ''))   LIKE '%' || word || '%'
              OR EXISTS (
                SELECT 1 FROM unnest(p.tags) t
                WHERE lower(t) LIKE '%' || word || '%'
              )
            )
        )
      )
    )
  ORDER BY
    -- İsimde ilk kelime eşleşmesi öncelikli
    CASE WHEN lower(p.name) LIKE lower(split_part(trim(p_search), ' ', 1)) || '%' THEN 0 ELSE 1 END,
    p.is_on_sale DESC,
    p.created_at  DESC
  LIMIT  p_page_size
  OFFSET p_page * p_page_size;
$$;

GRANT EXECUTE ON FUNCTION search_products_feed TO anon, authenticated;
