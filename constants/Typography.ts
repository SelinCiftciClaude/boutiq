import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

// Font ailesi sabitleri
// Playfair Display: logo ile aynı yüksek-kontrast serif → başlıklar, marka isimleri, hero
// DM Sans: temiz geometric sans-serif → UI, body, label
export const Fonts = {
  // Playfair Display — tente logosuyla aynı ruhun taşıyıcısı
  display:        'PlayfairDisplay_800ExtraBold',
  displayBold:    'PlayfairDisplay_700Bold',
  displayMedium:  'PlayfairDisplay_600SemiBold',
  displayRegular: 'PlayfairDisplay_400Regular',
  displayItalic:  'PlayfairDisplay_400Regular_Italic',
  displayBoldItalic: 'PlayfairDisplay_700Bold_Italic',

  // DM Sans — UI dili
  ui:        'DMSans_700Bold',
  uiMedium:  'DMSans_600SemiBold',
  uiRegular: 'DMSans_500Medium',
  uiLight:   'DMSans_400Regular',
  uiThin:    'DMSans_300Light',

  // Alias — logodaki görselle aynı: düz bold Playfair
  editorial:        'PlayfairDisplay_700Bold',
  editorialMedium:  'PlayfairDisplay_600SemiBold',
  editorialLight:   'PlayfairDisplay_400Regular',
  editorialRegular: 'PlayfairDisplay_400Regular',
  editorialBook:    'PlayfairDisplay_500Medium',
} as const;

export const Typography = StyleSheet.create({
  // ── Display — Playfair (logo ruhu)
  displayXL: {
    fontFamily: Fonts.display,
    fontSize: 54,
    letterSpacing: -0.5,
    color: Colors.text1,
    lineHeight: 58,
  },
  displayL: {
    fontFamily: Fonts.displayBold,
    fontSize: 42,
    letterSpacing: -0.3,
    color: Colors.text1,
    lineHeight: 46,
  },
  displayM: {
    fontFamily: Fonts.displayBold,
    fontSize: 32,
    letterSpacing: 0,
    color: Colors.text1,
    lineHeight: 36,
  },

  // ── Headlines — DM Sans
  h1: {
    fontFamily: Fonts.ui,
    fontSize: 24,
    letterSpacing: -0.4,
    color: Colors.text1,
    lineHeight: 28,
  },
  h2: {
    fontFamily: Fonts.uiMedium,
    fontSize: 20,
    letterSpacing: -0.2,
    color: Colors.text1,
    lineHeight: 24,
  },
  h3: {
    fontFamily: Fonts.uiMedium,
    fontSize: 17,
    letterSpacing: -0.1,
    color: Colors.text1,
    lineHeight: 22,
  },

  // ── Body
  bodyL: {
    fontFamily: Fonts.uiLight,
    fontSize: 16,
    color: Colors.text2,
    lineHeight: 25,
  },
  bodyM: {
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text2,
    lineHeight: 21,
  },
  bodyS: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text3,
    lineHeight: 17,
  },

  // ── Labels
  labelL: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    letterSpacing: 0.3,
    color: Colors.text2,
  },
  labelM: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
    color: Colors.text3,
  },
  labelS: {
    fontFamily: Fonts.ui,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    color: Colors.text4,
  },

  // ── Özel
  editorial: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase' as const,
    color: Colors.rose3,
  },
  price: {
    fontFamily: Fonts.ui,
    fontSize: 16,
    letterSpacing: -0.3,
    color: Colors.text1,
  },
  priceLarge: {
    fontFamily: Fonts.ui,
    fontSize: 22,
    letterSpacing: -0.8,
    color: Colors.text1,
  },
  caption: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    lineHeight: 15,
  },
});
