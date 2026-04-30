import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

// Font family constants — loaded via useFonts in _layout.tsx
export const Fonts = {
  // Cormorant Garamond: editorial serif, başlıklar ve hero text için
  editorial:        'CormorantGaramond_700Bold_Italic',
  editorialMedium:  'CormorantGaramond_600SemiBold_Italic',
  editorialLight:   'CormorantGaramond_300Light_Italic',
  editorialRegular: 'CormorantGaramond_400Regular_Italic',
  editorialBook:    'CormorantGaramond_500Medium',

  // DM Sans: UI, body ve label text için
  ui:         'DMSans_700Bold',
  uiMedium:   'DMSans_600SemiBold',
  uiRegular:  'DMSans_500Medium',
  uiLight:    'DMSans_400Regular',
  uiThin:     'DMSans_300Light',
} as const;

export const Typography = StyleSheet.create({
  // ── Display — editorial serif (moda dergi hissi)
  displayXL: {
    fontFamily: Fonts.editorial,
    fontSize: 56,
    letterSpacing: -1,
    color: Colors.text1,
    lineHeight: 58,
  },
  displayL: {
    fontFamily: Fonts.editorial,
    fontSize: 44,
    letterSpacing: -0.5,
    color: Colors.text1,
    lineHeight: 46,
  },
  displayM: {
    fontFamily: Fonts.editorial,
    fontSize: 34,
    letterSpacing: 0,
    color: Colors.text1,
    lineHeight: 36,
  },

  // ── Headlines — DM Sans bold
  h1: {
    fontFamily: Fonts.ui,
    fontSize: 24,
    letterSpacing: -0.5,
    color: Colors.text1,
    lineHeight: 28,
  },
  h2: {
    fontFamily: Fonts.uiMedium,
    fontSize: 20,
    letterSpacing: -0.3,
    color: Colors.text1,
    lineHeight: 24,
  },
  h3: {
    fontFamily: Fonts.uiMedium,
    fontSize: 17,
    letterSpacing: -0.2,
    color: Colors.text1,
    lineHeight: 22,
  },

  // ── Body — DM Sans
  bodyL: {
    fontFamily: Fonts.uiLight,
    fontSize: 16,
    letterSpacing: 0,
    color: Colors.text2,
    lineHeight: 25,
  },
  bodyM: {
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    letterSpacing: 0,
    color: Colors.text2,
    lineHeight: 21,
  },
  bodyS: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    letterSpacing: 0,
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
    color: Colors.gold3,
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
    letterSpacing: 0,
    color: Colors.text4,
    lineHeight: 15,
  },
});
