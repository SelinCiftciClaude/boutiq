import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  View,
} from 'react-native';
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

  const heights: Record<string, number>   = { sm: 38, md: 48, lg: 54, xl: 58 };
  const fontSizes: Record<string, number> = { sm: 10, md: 11, lg: 11, xl: 12 };
  const radii: Record<string, number>     = { sm: 6,  md: 8,  lg: 10, xl: 12 };

  const h  = heights[size];
  const fs = fontSizes[size];
  const r  = radii[size];

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.82}
        style={[
          {
            height: h,
            borderRadius: r,
            backgroundColor: Colors.rose3,   // antrasit solid
            opacity: isDisabled ? 0.40 : 1,
          },
          style,
        ]}
      >
        <View style={styles.inner}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.surface1} />
          ) : (
            <>
              {icon}
              <Text style={[styles.label, { fontSize: fs, letterSpacing: size === 'xl' ? 2.0 : 1.5 }]}>
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
        activeOpacity={0.78}
        style={[
          {
            height: h,
            borderRadius: r,
            borderWidth: 1,
            borderColor: Colors.border3,
            backgroundColor: Colors.surface1,
            opacity: isDisabled ? 0.40 : 1,
          },
          style,
        ]}
      >
        <View style={styles.inner}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.text2} />
          ) : (
            <>
              {icon}
              <Text style={[styles.labelSecondary, { fontSize: fs, letterSpacing: 1.5 }]}>
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
        activeOpacity={0.65}
        style={[{ height: h, opacity: isDisabled ? 0.4 : 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, style]}
      >
        {icon}
        <Text style={[styles.labelGhost, { fontSize: fs }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  // danger
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.78}
      style={[
        {
          height: h,
          borderRadius: r,
          borderWidth: 0.5,
          borderColor: 'rgba(158,48,48,0.30)',
          backgroundColor: 'rgba(158,48,48,0.07)',
          opacity: isDisabled ? 0.40 : 1,
        },
        style,
      ]}
    >
      <View style={styles.inner}>
        <Text style={[styles.labelDanger, { fontSize: fs, letterSpacing: 1.5 }]}>
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
    fontFamily: Fonts.uiMedium,
    color: Colors.surface1,   // krem beyaz üzerine
  },
  labelSecondary: {
    fontFamily: Fonts.uiMedium,
    color: Colors.text2,
  },
  labelGhost: {
    fontFamily: Fonts.uiMedium,
    color: Colors.text3,
    letterSpacing: 0.2,
  },
  labelDanger: {
    fontFamily: Fonts.uiMedium,
    color: Colors.error,
  },
});
