-- ── Kargolarım: shipments tablosu genişletme + yeni tablolar ─────────────────

-- 1. Shipments: polling ve arşivleme sütunları
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS brand_logo        TEXT,
  ADD COLUMN IF NOT EXISTS next_check_at     TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS check_failure_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_archived       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS archived_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_checked_at   TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS raw_carrier_data  JSONB;

-- 2. Carrier kodunu normalize et (yeni check constraint)
-- Mevcut veriye dokunmamak için sadece index ekle
CREATE INDEX IF NOT EXISTS idx_shipments_user_status
  ON shipments (user_id, status, updated_at DESC)
  WHERE is_archived = FALSE;

CREATE INDEX IF NOT EXISTS idx_shipments_next_check
  ON shipments (next_check_at)
  WHERE is_archived = FALSE
    AND status NOT IN ('delivered', 'returned', 'failed');

-- 3. Shipment reminders (hatırlatmalar)
CREATE TABLE IF NOT EXISTS shipment_reminders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id   UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type VARCHAR(30) NOT NULL
    CHECK (reminder_type IN ('when_arrives', 'check_tomorrow', 'custom_date')),
  remind_at     TIMESTAMPTZ NOT NULL,
  is_sent       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_due
  ON shipment_reminders (remind_at, is_sent)
  WHERE is_sent = FALSE;

-- 4. RLS: reminders
ALTER TABLE shipment_reminders ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shipment_reminders' AND policyname='reminder_own') THEN
    CREATE POLICY "reminder_own" ON shipment_reminders USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shipment_reminders' AND policyname='reminder_insert_own') THEN
    CREATE POLICY "reminder_insert_own" ON shipment_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='shipment_reminders' AND policyname='reminder_delete_own') THEN
    CREATE POLICY "reminder_delete_own" ON shipment_reminders FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. Shipment count function (badge ve sayaç kutucukları için)
CREATE OR REPLACE FUNCTION get_shipment_summary(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'preparing',  COUNT(*) FILTER (WHERE status IN ('ordered','processing')),
    'in_transit', COUNT(*) FILTER (WHERE status IN ('shipped','in_transit','out_for_delivery')),
    'delivered',  COUNT(*) FILTER (WHERE status = 'delivered' AND updated_at > NOW() - INTERVAL '30 days'),
    'total_active', COUNT(*) FILTER (WHERE status NOT IN ('delivered','returned') AND is_archived = FALSE)
  )
  INTO result
  FROM shipments
  WHERE user_id = p_user_id
    AND is_archived = FALSE;

  RETURN result;
END;
$$;
