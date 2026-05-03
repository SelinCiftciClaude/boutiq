-- referral_codes tablosunda INSERT ve DELETE policy eksikti
-- Kullanıcılar kendi kodlarını oluşturabilmeli

CREATE POLICY "Users create own referral code"
  ON referral_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_user_id);

-- referral_uses için INSERT policy de eksikti
CREATE POLICY "Users create referral use"
  ON referral_uses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referred_user_id);
