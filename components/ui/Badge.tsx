import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/Colors';

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
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  textMd: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

const sizeStyles = {
  sm: { paddingHorizontal: 7, paddingVertical: 3 },
  md: { paddingHorizontal: 10, paddingVertical: 5 },
};

const variantStyles: Record<BadgeVariant, ViewStyle> = {
  gold: { backgroundColor: 'rgba(212,168,67,0.20)', borderWidth: 1, borderColor: 'rgba(212,168,67,0.40)' },
  purple: { backgroundColor: 'rgba(139,92,246,0.20)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)' },
  success: { backgroundColor: 'rgba(16,185,129,0.20)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)' },
  error: { backgroundColor: 'rgba(239,68,68,0.20)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)' },
  neutral: { backgroundColor: Colors.surface3, borderWidth: 1, borderColor: Colors.border2 },
  sale: { backgroundColor: 'rgba(244,63,94,0.20)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.35)' },
};

const textStyles: Record<BadgeVariant, object> = {
  gold: { color: Colors.gold4 },
  purple: { color: Colors.purple4 },
  success: { color: Colors.success },
  error: { color: Colors.error },
  neutral: { color: Colors.text3 },
  sale: { color: '#FB7185' },
};
