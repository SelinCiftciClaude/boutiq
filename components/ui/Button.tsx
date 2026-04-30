import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const heights: Record<string, number> = { sm: 38, md: 48, lg: 54, xl: 58 };
  const fontSizes: Record<string, number> = { sm: 11, md: 12, lg: 12, xl: 13 };
  const radii: Record<string, number>    = { sm: 8,  md: 10, lg: 12, xl: 14 };

  const h  = heights[size];
  const fs = fontSizes[size];
  const r  = radii[size];

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[{ height: h, borderRadius: r, overflow: 'hidden', opacity: isDisabled ? 0.45 : 1 }, style]}
      >
        <LinearGradient
          colors={[Colors.gold2, Colors.gold3, Colors.gold4]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.inner}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.bg} />
          ) : (
            <>
              {icon}
              <Text style={[styles.label, { fontSize: fs, letterSpacing: size === 'xl' ? 2.5 : 2 }]}>
                {label.toUpperCase()}
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[
          {
            height: h,
            borderRadius: r,
            borderWidth: 0.5,
            borderColor: Colors.borderGold,
            backgroundColor: Colors.glassGold,
            opacity: isDisabled ? 0.45 : 1,
          },
          style,
        ]}
      >
        <View style={styles.inner}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.gold3} />
          ) : (
            <>
              {icon}
              <Text style={[styles.labelSecondary, { fontSize: fs, letterSpacing: 2 }]}>
                {label.toUpperCase()}
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
        style={[{ height: h, opacity: isDisabled ? 0.4 : 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, style]}
      >
        {icon}
        <Text style={[styles.labelGhost, { fontSize: fs }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        {
          height: h,
          borderRadius: r,
          borderWidth: 0.5,
          borderColor: Colors.error + '55',
          backgroundColor: Colors.error + '14',
          opacity: isDisabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      <View style={styles.inner}>
        <Text style={[styles.labelDanger, { fontSize: fs, letterSpacing: 2 }]}>
          {label.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  label: {
    fontFamily: Fonts.ui,
    color: Colors.bg,
  },
  labelSecondary: {
    fontFamily: Fonts.uiMedium,
    color: Colors.gold4,
  },
  labelGhost: {
    fontFamily: Fonts.uiMedium,
    color: Colors.text2,
    letterSpacing: 0.3,
  },
  labelDanger: {
    fontFamily: Fonts.uiMedium,
    color: Colors.error,
  },
});
