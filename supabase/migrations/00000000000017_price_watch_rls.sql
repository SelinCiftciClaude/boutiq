-- ── RLS: product_watches ──────────────────────────────────────────────────────
ALTER TABLE product_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watch_select_own" ON product_watches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "watch_insert_own" ON product_watches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watch_update_own" ON product_watches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "watch_delete_own" ON product_watches
  FOR DELETE USING (auth.uid() = user_id);

-- ── RLS: notification_preferences ────────────────────────────────────────────
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_prefs_select_own" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notif_prefs_insert_own" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notif_prefs_update_own" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- ── Mevcut notifications tablosu: kullanıcı kendi bildirimlerini okuyabilir ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_select_own'
  ) THEN
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "notif_select_own" ON notifications
      FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "notif_update_own" ON notifications
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── Supabase Realtime: notifications kanalını aç ──────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE product_watches;
