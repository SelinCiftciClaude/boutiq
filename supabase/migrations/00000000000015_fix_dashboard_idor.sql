-- ============================================================
-- Migration 15: IDOR güvenlik açığı giderildi — get_user_dashboard
--
-- Sorun: fonksiyon SECURITY DEFINER idi ve dışarıdan sağlanan
-- p_user_id parametresini auth.uid() ile kıyaslamadan kullanıyordu.
-- Herhangi bir oturum açmış kullanıcı başka birinin UUID'ini
-- göndererek o kullanıcının saved brands, shipments ve campaign
-- verilerini çekebiliyordu.
--
-- Düzeltme: parametre tamamen kaldırıldı; fonksiyon artık
-- auth.uid() üzerinden çalışıyor — çağıran kim ise
-- yalnızca kendi verisini görebilir.
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_dashboard()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT jsonb_build_object(
    'saved_brands', (
      SELECT jsonb_agg(row_to_json(b.*)::JSONB || jsonb_build_object('is_favorite', ub.is_favorite))
      FROM user_brands ub
      JOIN brands b ON b.id = ub.brand_id
      WHERE ub.user_id = current_user_id
    ),
    'saved_products', (
      SELECT COUNT(*) FROM saved_products WHERE user_id = current_user_id
    ),
    'active_shipments', (
      SELECT COUNT(*) FROM shipments
      WHERE user_id = current_user_id AND status NOT IN ('delivered', 'returned')
    ),
    'unread_campaigns', (
      SELECT COUNT(*) FROM campaigns c
      JOIN user_brands ub ON ub.brand_id = c.brand_id
      LEFT JOIN user_campaign_reads ucr
        ON ucr.campaign_id = c.id AND ucr.user_id = current_user_id
      WHERE ub.user_id = current_user_id
        AND ucr.campaign_id IS NULL
        AND c.is_active = true
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
