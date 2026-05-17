import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

// Font ailesi sabitleri
// Playfair Display: zarif ince serif → başlıklar, marka isimleri, hero
// DM Sans: temiz geometric sans-serif → UI, body, label
export const Fonts = {
  // Playfair Display — editoryal ruh
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

  // Alias
  editorial:        'PlayfairDisplay_700Bold',
  editorialMedium:  'PlayfairDisplay_600SemiBold',
  editorialLight:   'PlayfairDisplay_400Regular',
  editorialRegular: 'PlayfairDisplay_400Regular',
  editorialBook:    'PlayfairDisplay_500Medium',
} as const;

export const Typography = StyleSheet.create({
  // ── Display — Playfair (editoryal, zarif serif)
  displayXL: {
    fontFamily: Fonts.display,
    fontSize: 54,
    letterSpacing: 0.5,
    color: Colors.text1,
    lineHeight: 60,
  },
  displayL: {
    fontFamily: Fonts.displayBold,
    fontSize: 42,
    letterSpacing: 0.3,
    color: Colors.text1,
    lineHeight: 48,
  },
  displayM: {
    fontFamily: Fonts.displayBold,
    fontSize: 32,
    letterSpacing: 0.2,
    color: Colors.text1,
    lineHeight: 38,
  },

  // ── Headlines — DM Sans
  h1: {
    fontFamily: Fonts.ui,
    fontSize: 24,
    letterSpacing: -0.2,
    color: Colors.text1,
    lineHeight: 30,
  },
  h2: {
    fontFamily: Fonts.uiMedium,
    fontSize: 20,
    letterSpacing: -0.1,
    color: Colors.text1,
    lineHeight: 26,
  },
  h3: {
    fontFamily: Fonts.uiMedium,
    fontSize: 17,
    letterSpacing: 0,
    color: Colors.text1,
    lineHeight: 23,
  },

  // ── Body
  bodyL: {
    fontFamily: Fonts.uiLight,
    fontSize: 16,
    color: Colors.text2,
    lineHeight: 26,
  },
  bodyM: {
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text2,
    lineHeight: 22,
  },
  bodyS: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text3,
    lineHeight: 18,
  },

  // ── Labels
  labelL: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    letterSpacing: 0.2,
    color: Colors.text2,
  },
  labelM: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: Colors.text3,
  },
  labelS: {
    fontFamily: Fonts.ui,
    fontSize: 9,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
    color: Colors.text4,
  },

  // ── Özel
  editorial: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
    letterSpacing: 2.0,
    textTransform: 'uppercase' as const,
    color: Colors.text3,   // artık antrasit ton, bordo değil
  },
  price: {
    fontFamily: Fonts.ui,
    fontSize: 16,
    letterSpacing: -0.2,
    color: Colors.text1,
  },
  priceLarge: {
    fontFamily: Fonts.ui,
    fontSize: 22,
    letterSpacing: -0.5,
    color: Colors.text1,
  },
  caption: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    lineHeight: 16,
  },
});
