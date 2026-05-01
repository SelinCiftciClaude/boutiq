import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

export const Fonts = {
  // Oregano — display, başlıklar, hero text
  display:        'Oregano_400Regular',
  displayBold:    'Oregano_400Regular',       // Oregano tek weightte gelir
  displayItalic:  'Oregano_400Regular_Italic',
  editorialBook:  'Oregano_400Regular',

  // Josefin Sans — Quiche Sans'ın en yakın Google Fonts karşılığı
  ui:        'JosefinSans_700Bold',
  uiMedium:  'JosefinSans_600SemiBold',
  uiRegular: 'JosefinSans_400Regular',
  uiLight:   'JosefinSans_300Light',
  uiThin:    'JosefinSans_100Thin',

  // Alias — mevcut kodla uyumluluk
  editorial:        'Oregano_400Regular',
  editorialMedium:  'Oregano_400Regular',
  editorialLight:   'Oregano_400Regular_Italic',
  editorialRegular: 'Oregano_400Regular',
} as const;

export const Typography = StyleSheet.create({
  displayXL: {
    fontFamily: Fonts.display,
    fontSize: 54,
    letterSpacing: 1,
    color: Colors.text1,
    lineHeight: 60,
  },
  displayL: {
    fontFamily: Fonts.display,
    fontSize: 42,
    letterSpacing: 0.5,
    color: Colors.text1,
    lineHeight: 48,
  },
  displayM: {
    fontFamily: Fonts.display,
    fontSize: 32,
    letterSpacing: 0.5,
    color: Colors.text1,
    lineHeight: 38,
  },
  h1: {
    fontFamily: Fonts.ui,
    fontSize: 22,
    letterSpacing: 1,
    color: Colors.text1,
    lineHeight: 28,
  },
  h2: {
    fontFamily: Fonts.uiMedium,
    fontSize: 18,
    letterSpacing: 0.5,
    color: Colors.text1,
    lineHeight: 24,
  },
  h3: {
    fontFamily: Fonts.uiMedium,
    fontSize: 15,
    letterSpacing: 0.3,
    color: Colors.text1,
    lineHeight: 20,
  },
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
  labelL: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    letterSpacing: 1,
    color: Colors.text2,
  },
  labelM: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    color: Colors.text3,
  },
  labelS: {
    fontFamily: Fonts.ui,
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: 'uppercase' as const,
    color: Colors.text4,
  },
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
    letterSpacing: 0.5,
    color: Colors.text1,
  },
  priceLarge: {
    fontFamily: Fonts.ui,
    fontSize: 22,
    letterSpacing: 0.5,
    color: Colors.text1,
  },
  caption: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    lineHeight: 15,
  },
});
