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
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: Fonts.uiMedium,
    fontSize: 9,
    letterSpacing: 1.0,
  },
  textMd: {
    fontSize: 11,
    letterSpacing: 0.7,
  },
});

const sizeStyles = {
  sm: { paddingHorizontal: 7, paddingVertical: 3 },
  md: { paddingHorizontal: 10, paddingVertical: 5 },
};

const variantStyles: Record<BadgeVariant, ViewStyle> = {
  gold:    { backgroundColor: Colors.glassGold, borderWidth: 0.5, borderColor: Colors.borderGold },
  purple:  { backgroundColor: Colors.surface3,  borderWidth: 0.5, borderColor: Colors.border2 },
  success: { backgroundColor: Colors.successGlow, borderWidth: 0.5, borderColor: 'rgba(45,122,90,0.25)' },
  error:   { backgroundColor: 'rgba(158,48,48,0.08)', borderWidth: 0.5, borderColor: 'rgba(158,48,48,0.22)' },
  neutral: { backgroundColor: Colors.surface3, borderWidth: 0.5, borderColor: Colors.border2 },
  sale:    { backgroundColor: Colors.surface3, borderWidth: 0.5, borderColor: Colors.border3 },
};

const textStyles: Record<BadgeVariant, object> = {
  gold:    { color: Colors.gold2 },
  purple:  { color: Colors.text3 },
  success: { color: Colors.success },
  error:   { color: Colors.error },
  neutral: { color: Colors.text4 },
  sale:    { color: Colors.text3 },
};
