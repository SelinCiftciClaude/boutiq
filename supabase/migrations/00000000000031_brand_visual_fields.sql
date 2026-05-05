-- Marka görsel kimliği için yeni kolonlar
-- brand_color : sitenin theme-color'ından veya logo dominant color'dan çıkarılan hex
-- card_style  : 'hero' | 'logo_centered' | 'initials'  (frontend hangi template kullanacağını bilir)

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS brand_color  VARCHAR(7),
  ADD COLUMN IF NOT EXISTS card_style   VARCHAR(20) DEFAULT 'initials';

-- Mevcut tüm kayıtları 'initials' yap; seed güncellediğinde doğru değer yazılır
UPDATE brands SET card_style = 'initials' WHERE card_style IS NULL;
