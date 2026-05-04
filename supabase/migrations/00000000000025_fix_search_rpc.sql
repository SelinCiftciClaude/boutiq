-- search_products_feed düzeltmesi:
-- Eski sürüm p.category (boş TEXT) arıyordu.
-- Yeni sürüm master_categories.name_tr + slug üzerinden de arar.

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
      p_search IS NULL OR p_search = ''
      OR p.name               ILIKE '%' || p_search || '%'
      OR b.name               ILIKE '%' || p_search || '%'
      OR mc.name_tr           ILIKE '%' || p_search || '%'
      OR mc.slug              ILIKE '%' || p_search || '%'
      OR p.category           ILIKE '%' || p_search || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(p.tags) t
        WHERE t ILIKE '%' || p_search || '%'
      )
    )
  ORDER BY p.is_on_sale DESC, p.created_at DESC
  LIMIT  p_page_size
  OFFSET p_page * p_page_size;
$$;

GRANT EXECUTE ON FUNCTION search_products_feed TO anon, authenticated;
