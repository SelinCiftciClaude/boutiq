import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/Colors';
import { Fonts } from '@/constants/Typography';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  borderColor?: string;
  noBlur?: boolean;
}

export function GlassCard({
  children,
  style,
  intensity = 20,
  tint = 'dark',
  borderColor = Colors.border2,
  noBlur = false,
}: GlassCardProps) {
  if (noBlur) {
    return (
      <View style={[styles.container, { borderColor }, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} tint={tint} style={[styles.container, { borderColor }, style]}>
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: Colors.glass2,
  },
});
