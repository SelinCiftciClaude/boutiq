-- ============================================================
-- Migration 12: RLS policy düzeltmeleri
-- Hedef tablolar: shipment_events, affiliate_clicks
-- ============================================================

-- ── shipment_events ──────────────────────────────────────────
-- Tablo RLS aktif ama hiç policy yoktu; tüm authenticated
-- kullanıcılar herkese ait kargo hareketlerini görebiliyordu.
-- shipment_id → shipments.user_id JOIN'iyle sadece kendi
-- kargosuna ait eventlere erişim sağlanıyor.

CREATE POLICY "Users can view own shipment events"
  ON shipment_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM shipments
      WHERE shipments.id = shipment_events.shipment_id
        AND shipments.user_id = auth.uid()
    )
  );

-- ── affiliate_clicks — UPDATE engeli ─────────────────────────
-- Hiçbir kullanıcı (kendi kaydı dahil) tıklama verisini
-- güncelleyemez. Analytics bütünlüğünü korur.

CREATE POLICY "Clicks cannot be updated"
  ON affiliate_clicks
  FOR UPDATE
  USING (false);

-- ── affiliate_clicks — DELETE kısıtlaması ────────────────────
-- Kullanıcı yalnızca kendi tıklamalarını silebilir (GDPR/KVKK
-- kişisel veri silme hakkı). Anonim (user_id IS NULL) kayıtlara
-- hiçbir kullanıcı dokunamaz; bunlar sadece servis rolüyle silinir.

CREATE POLICY "Users can delete own clicks"
  ON affiliate_clicks
  FOR DELETE
  USING (
    user_id IS NOT NULL
    AND auth.uid() = user_id
  );
