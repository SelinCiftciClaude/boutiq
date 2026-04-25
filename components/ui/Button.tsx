import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  iconPosition = 'left',
}: ButtonProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const sizeStyle = sizes[size];
  const textSizeStyle = textSizes[size];

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={[styles.base, style, (disabled || loading) && styles.disabled]}
      >
        <LinearGradient
          colors={disabled ? [Colors.surface3, Colors.surface4] : [Colors.rose2, Colors.rose4]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyle]}
        >
          {loading ? (
            <ActivityIndicator color={Colors.bg} size="small" />
          ) : (
            <>
              {icon && iconPosition === 'left' && icon}
              <Text style={[styles.primaryText, textSizeStyle, textStyle]}>{label}</Text>
              {icon && iconPosition === 'right' && icon}
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        sizeStyle,
        variantStyles[variant],
        style,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.gold3} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text
            style={[
              styles.text,
              textSizeStyle,
              variantTextStyles[variant],
              textStyle,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});

const sizes: Record<ButtonSize, ViewStyle> = {
  sm: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10 },
  md: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14 },
  lg: { paddingVertical: 16, paddingHorizontal: 28, borderRadius: 16 },
  xl: { paddingVertical: 18, paddingHorizontal: 32, borderRadius: 18 },
};

const textSizes: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: 13, fontWeight: '600' },
  md: { fontSize: 15, fontWeight: '700' },
  lg: { fontSize: 16, fontWeight: '700' },
  xl: { fontSize: 18, fontWeight: '800' },
};

const variantStyles: Record<Exclude<ButtonVariant, 'primary'>, ViewStyle> = {
  secondary: {
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ghost: {
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  danger: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
};

const variantTextStyles: Record<Exclude<ButtonVariant, 'primary'>, TextStyle> = {
  secondary: { color: Colors.text1 },
  ghost: { color: Colors.gold3 },
  danger: { color: Colors.error },
};
