import { StyleSheet } from 'react-native';
import { Colors } from './Colors';

export const Typography = StyleSheet.create({
  // Display
  displayXL: {
    fontSize: 48,
    fontWeight: '800' as const,
    letterSpacing: -2,
    color: Colors.text1,
    lineHeight: 52,
  },
  displayL: {
    fontSize: 36,
    fontWeight: '700' as const,
    letterSpacing: -1.5,
    color: Colors.text1,
    lineHeight: 40,
  },
  displayM: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -1,
    color: Colors.text1,
    lineHeight: 32,
  },

  // Headlines
  h1: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.8,
    color: Colors.text1,
    lineHeight: 28,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.5,
    color: Colors.text1,
    lineHeight: 24,
  },
  h3: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    color: Colors.text1,
    lineHeight: 22,
  },

  // Body
  bodyL: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0,
    color: Colors.text2,
    lineHeight: 24,
  },
  bodyM: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0,
    color: Colors.text2,
    lineHeight: 20,
  },
  bodyS: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0,
    color: Colors.text3,
    lineHeight: 16,
  },

  // Labels
  labelL: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    color: Colors.text2,
  },
  labelM: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: Colors.text3,
  },
  labelS: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: Colors.text4,
  },

  // Special
  editorial: {
    fontSize: 13,
    fontWeight: '500' as const,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    color: Colors.gold3,
  },
  price: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    color: Colors.text1,
  },
  priceLarge: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.8,
    color: Colors.text1,
  },
  caption: {
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0,
    color: Colors.text4,
    lineHeight: 15,
  },
});
