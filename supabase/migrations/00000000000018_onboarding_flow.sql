-- ── Onboarding Flow ─────────────────────────────────────────────────────────

-- profiles: tarz ve onboarding durum alanları
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS style_preferences  JSONB    DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_step    INTEGER  DEFAULT 0;

-- brands: onboarding önerileri için etiketler ve öncelik
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS style_tags         TEXT[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_priority INTEGER  DEFAULT 0;

-- onboarding_progress: adım bazlı analytics (drop-off analizi)
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id           UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID      NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  step_number  INTEGER   NOT NULL,
  status       TEXT      NOT NULL CHECK (status IN ('started','completed','skipped')),
  data         JSONB     DEFAULT '{}',
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, step_number)
);

ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own onboarding progress"
  ON onboarding_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user
  ON onboarding_progress(user_id);
