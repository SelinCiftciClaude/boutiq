import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';

type BadgeVariant = 'gold' | 'purple' | 'success' | 'error' | 'neutral' | 'sale';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({ label, variant = 'neutral', size = 'sm', style }: BadgeProps) {
  return (
    <View style={[styles.base, variantStyles[variant], sizeStyles[size], style]}>
      <Text style={[styles.text, textStyles[variant], size === 'md' && styles.textMd]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: Fonts.uiMedium,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  textMd: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
});

const sizeStyles = {
  sm: { paddingHorizontal: 7, paddingVertical: 3 },
  md: { paddingHorizontal: 10, paddingVertical: 5 },
};

const variantStyles: Record<BadgeVariant, ViewStyle> = {
  gold:    { backgroundColor: Colors.glassGold, borderWidth: 0.5, borderColor: Colors.borderGold },
  purple:  { backgroundColor: 'rgba(110,72,216,0.15)', borderWidth: 0.5, borderColor: 'rgba(110,72,216,0.35)' },
  success: { backgroundColor: 'rgba(54,138,108,0.15)', borderWidth: 0.5, borderColor: 'rgba(54,138,108,0.35)' },
  error:   { backgroundColor: 'rgba(188,60,60,0.15)', borderWidth: 0.5, borderColor: 'rgba(188,60,60,0.35)' },
  neutral: { backgroundColor: Colors.surface3, borderWidth: 0.5, borderColor: Colors.border2 },
  sale:    { backgroundColor: Colors.glassRose, borderWidth: 0.5, borderColor: Colors.borderRose },
};

const textStyles: Record<BadgeVariant, object> = {
  gold:    { color: Colors.gold4 },
  purple:  { color: Colors.purple3 },
  success: { color: Colors.success },
  error:   { color: Colors.error },
  neutral: { color: Colors.text3 },
  sale:    { color: Colors.rose4 },
};
