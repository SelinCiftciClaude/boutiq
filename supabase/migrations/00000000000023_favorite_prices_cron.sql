-- Favori fiyat takibi için cron job (6 saatte bir)
-- pg_cron yoksa sessizce atlanır (local geliştirme ortamında güvenlidir)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'check-favorite-prices',
      '0 */6 * * *',
      $cron$
        SELECT net.http_post(
          url     := current_setting('app.settings.supabase_url', true) || '/functions/v1/check-favorite-prices',
          headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization',
                       'Bearer ' || current_setting('app.settings.cron_secret', true)),
          body    := '{}'::jsonb
        );
      $cron$
    );
  END IF;
END;
$$;
