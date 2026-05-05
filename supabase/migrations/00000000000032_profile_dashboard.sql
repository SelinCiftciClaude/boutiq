-- ── Aylık insight cache ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_monthly_insights (
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year_month      VARCHAR(7)  NOT NULL,            -- '2026-05'
  total_savings   NUMERIC(10,2) DEFAULT 0,
  discount_count  INT         DEFAULT 0,
  notif_count     INT         DEFAULT 0,
  new_brands      INT         DEFAULT 0,
  new_favorites   INT         DEFAULT 0,
  computed_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour'),
  PRIMARY KEY (user_id, year_month)
);

ALTER TABLE user_monthly_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insights" ON user_monthly_insights FOR ALL USING (user_id = auth.uid());

-- ── get_profile_dashboard RPC ─────────────────────────────────────────────────
-- Profil sayfasının ihtiyacı olan tüm veriyi tek çağrıda döndürür.
-- Identity + Bu Ay insight + Live event + Shortcut sayıları

CREATE OR REPLACE FUNCTION get_profile_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           UUID        := auth.uid();
  v_ym            VARCHAR(7)  := TO_CHAR(NOW(), 'YYYY-MM');
  v_month_start   TIMESTAMPTZ := DATE_TRUNC('month', NOW());

  -- identity
  v_name          TEXT;
  v_email         TEXT;
  v_avatar        TEXT;
  v_created       TIMESTAMPTZ;
  v_prefs         JSONB;
  v_months        INT;

  -- insights
  v_savings       NUMERIC := 0;
  v_discounts     INT     := 0;
  v_notifs        INT     := 0;
  v_new_brands    INT     := 0;
  v_new_favs      INT     := 0;
  v_headline      TEXT;
  v_headline_type TEXT;
  r_cache         RECORD;

  -- shortcuts
  v_brand_cnt     INT;
  v_fav_cnt       INT;
  v_active_ship   INT;
  v_tracking_cnt  INT;
  v_unread_cnt    INT;

  -- live event
  v_evt_id        UUID;
  v_evt_type      TEXT;
  v_evt_title     TEXT;
  v_evt_body      TEXT;
  v_evt_data      JSONB;
  v_evt_at        TIMESTAMPTZ;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- ── Kimlik ──────────────────────────────────────────────────────────────────
  SELECT name, email, avatar_url, created_at, COALESCE(preferences, '{}'::JSONB)
  INTO   v_name, v_email, v_avatar, v_created, v_prefs
  FROM   profiles WHERE id = v_uid;

  v_months := GREATEST(1, (
    EXTRACT(YEAR FROM AGE(NOW(), v_created))  * 12 +
    EXTRACT(MONTH FROM AGE(NOW(), v_created))
  )::INT);

  -- ── Insight cache hit/miss ───────────────────────────────────────────────────
  SELECT * INTO r_cache
  FROM user_monthly_insights
  WHERE user_id = v_uid AND year_month = v_ym AND expires_at > NOW();

  IF r_cache IS NULL THEN
    -- Tasarruf: bu ay favorilenmiş & indirimde olan ürünlerin fiyat farkı toplamı
    SELECT COALESCE(SUM(GREATEST(p.original_price::NUMERIC - p.price::NUMERIC, 0)), 0)
    INTO   v_savings
    FROM   saved_products sp
    JOIN   products p ON p.id = sp.product_id
    WHERE  sp.user_id = v_uid
      AND  sp.saved_at >= v_month_start
      AND  p.is_on_sale = TRUE
      AND  p.original_price IS NOT NULL
      AND  p.original_price::NUMERIC > p.price::NUMERIC;

    SELECT COUNT(*) INTO v_discounts FROM notifications
      WHERE user_id = v_uid AND type = 'priceDrop' AND created_at >= v_month_start;

    SELECT COUNT(*) INTO v_notifs FROM notifications
      WHERE user_id = v_uid AND created_at >= v_month_start;

    SELECT COUNT(*) INTO v_new_brands FROM user_brands
      WHERE user_id = v_uid AND created_at >= v_month_start;

    SELECT COUNT(*) INTO v_new_favs FROM saved_products
      WHERE user_id = v_uid AND saved_at >= v_month_start;

    INSERT INTO user_monthly_insights
      (user_id, year_month, total_savings, discount_count, notif_count, new_brands, new_favorites, expires_at)
    VALUES
      (v_uid, v_ym, v_savings, v_discounts, v_notifs, v_new_brands, v_new_favs, NOW() + INTERVAL '1 hour')
    ON CONFLICT (user_id, year_month) DO UPDATE SET
      total_savings  = EXCLUDED.total_savings,
      discount_count = EXCLUDED.discount_count,
      notif_count    = EXCLUDED.notif_count,
      new_brands     = EXCLUDED.new_brands,
      new_favorites  = EXCLUDED.new_favorites,
      computed_at    = NOW(),
      expires_at     = NOW() + INTERVAL '1 hour';
  ELSE
    v_savings    := r_cache.total_savings;
    v_discounts  := r_cache.discount_count;
    v_notifs     := r_cache.notif_count;
    v_new_brands := r_cache.new_brands;
    v_new_favs   := r_cache.new_favorites;
  END IF;

  -- Headline seçimi (öncelik sırasıyla)
  IF v_savings >= 100 THEN
    v_headline      := 'Bu ay ' || TRIM(TO_CHAR(v_savings, 'FM999G999')) || ' ₺ tasarruf ettin';
    v_headline_type := 'savings';
  ELSIF v_new_brands >= 3 THEN
    v_headline      := v_new_brands::TEXT || ' yeni butik keşfettin';
    v_headline_type := 'brands';
  ELSIF v_new_favs >= 5 THEN
    v_headline      := v_new_favs::TEXT || ' favori ekledin, tarzın belirginleşiyor';
    v_headline_type := 'favorites';
  ELSIF v_notifs > 0 THEN
    v_headline      := 'Butika'|| chr(39) || 'dan ' || v_notifs::TEXT || ' güncelleme aldın';
    v_headline_type := 'engagement';
  ELSE
    v_headline      := 'Butika'|| chr(39) || 'da yeni bir aysın 🌱';
    v_headline_type := 'new_user';
  END IF;

  -- ── Kısayol sayıları ─────────────────────────────────────────────────────────
  SELECT COUNT(*) INTO v_brand_cnt    FROM user_brands    WHERE user_id = v_uid;
  SELECT COUNT(*) INTO v_fav_cnt      FROM saved_products WHERE user_id = v_uid;
  SELECT COUNT(*) INTO v_tracking_cnt FROM stock_alerts   WHERE user_id = v_uid;
  SELECT COUNT(*) INTO v_unread_cnt   FROM notifications  WHERE user_id = v_uid AND is_read = FALSE;

  SELECT COUNT(*) INTO v_active_ship
  FROM shipments
  WHERE user_id = v_uid AND status NOT IN ('delivered', 'cancelled', 'returned');

  -- ── Canlı bildirim (en son okunmamış) ────────────────────────────────────────
  SELECT id, type, title, body, data, created_at
  INTO   v_evt_id, v_evt_type, v_evt_title, v_evt_body, v_evt_data, v_evt_at
  FROM   notifications
  WHERE  user_id = v_uid AND is_read = FALSE
  ORDER  BY created_at DESC
  LIMIT  1;

  RETURN JSONB_BUILD_OBJECT(
    'identity', JSONB_BUILD_OBJECT(
      'name',          v_name,
      'email',         v_email,
      'avatarUrl',     v_avatar,
      'city',          v_prefs->>'city',
      'styleTags',     COALESCE(v_prefs->'style_tags', '[]'::JSONB),
      'monthsOnButika',v_months
    ),
    'insights', JSONB_BUILD_OBJECT(
      'yearMonth',      v_ym,
      'totalSavings',   v_savings,
      'discountCount',  v_discounts,
      'notifCount',     v_notifs,
      'newBrandsCount', v_new_brands,
      'newFavsCount',   v_new_favs,
      'headline',       v_headline,
      'headlineType',   v_headline_type
    ),
    'shortcuts', JSONB_BUILD_OBJECT(
      'brandCount',       v_brand_cnt,
      'favoriteCount',    v_fav_cnt,
      'activeShipments',  v_active_ship,
      'trackingCount',    v_tracking_cnt,
      'unreadCount',      v_unread_cnt
    ),
    'liveEvent', CASE WHEN v_evt_id IS NOT NULL THEN
      JSONB_BUILD_OBJECT(
        'id',        v_evt_id,
        'type',      v_evt_type,
        'title',     v_evt_title,
        'body',      v_evt_body,
        'createdAt', v_evt_at
      )
    ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_profile_dashboard TO authenticated;

-- ── Ay başı cache sıfırlama (pg_cron) ────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'reset-monthly-insights',
      '0 0 1 * *',
      'DELETE FROM user_monthly_insights WHERE year_month < to_char(NOW() - INTERVAL ''1 month'', ''YYYY-MM'')'
    );
  END IF;
END;
$$;
