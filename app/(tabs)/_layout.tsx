import React, { useRef, useEffect } from 'react';
import { Tabs } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const TABS = [
  { name: 'index',    label: 'Keşfet',    icon: 'compass-outline',    iconFilled: 'compass' },
  { name: 'saved',    label: 'Favoriler', icon: 'heart-outline',       iconFilled: 'heart' },
  { name: 'brands',   label: 'Butikler',  icon: 'storefront-outline',  iconFilled: 'storefront' },
  { name: 'tracking', label: 'Kargo',     icon: 'bicycle-outline',     iconFilled: 'bicycle' },
  { name: 'profile',  label: 'Profil',    icon: 'person-outline',      iconFilled: 'person' },
];

const TAB_BAR_H = 64;
const PILL_W = 56;

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const TAB_W = (width - 32) / TABS.length;

  // Sliding pill x
  const pillX = useRef(new Animated.Value(0)).current;

  // Per-tab animated values
  const iconScales  = useRef(TABS.map(() => new Animated.Value(1))).current;
  const iconOpacity = useRef(TABS.map(() => new Animated.Value(0.45))).current;
  const labelOpacity= useRef(TABS.map(() => new Animated.Value(0.45))).current;
  const dotScale    = useRef(TABS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const targetX = TAB_W * state.index + TAB_W / 2 - PILL_W / 2;

    Animated.spring(pillX, {
      toValue: targetX,
      useNativeDriver: true,
      tension: 70,
      friction: 11,
    }).start();

    TABS.forEach((_, i) => {
      const active = i === state.index;
      Animated.parallel([
        Animated.spring(iconScales[i], {
          toValue: active ? 1.18 : 1,
          useNativeDriver: true,
          tension: 120, friction: 8,
        }),
        Animated.timing(iconOpacity[i], {
          toValue: active ? 1 : 0.45,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(labelOpacity[i], {
          toValue: active ? 1 : 0.40,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(dotScale[i], {
          toValue: active ? 1 : 0,
          useNativeDriver: true,
          tension: 140, friction: 8,
        }),
      ]).start();
    });
  }, [state.index]);

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || 16 }]}>
      {/* Outer glow */}
      <View style={styles.outerGlow} />

      <BlurView intensity={85} tint="dark" style={styles.blur}>
        {/* Top shimmer line */}
        <LinearGradient
          colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.04)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerLine}
        />

        {/* Sliding gold pill */}
        <Animated.View
          style={[styles.pill, { transform: [{ translateX: pillX }] }]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['rgba(212,168,67,0.22)', 'rgba(232,201,122,0.14)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pillGradient}
          />
          {/* pill top edge glow */}
          <View style={styles.pillTopEdge} />
        </Animated.View>

        {/* Tab items */}
        <View style={styles.row}>
          {TABS.map((tab, index) => {
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: state.routes[index].key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(tab.name);
              }
            };

            return (
              <TouchableOpacity
                key={tab.name}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={1}
              >
                {/* Icon */}
                <Animated.View
                  style={{
                    transform: [{ scale: iconScales[index] }],
                    opacity: iconOpacity[index],
                  }}
                >
                  <Ionicons
                    name={(isFocused ? tab.iconFilled : tab.icon) as any}
                    size={22}
                    color={isFocused ? Colors.gold4 : '#FFFFFF'}
                  />
                </Animated.View>

                {/* Label */}
                <Animated.Text
                  style={[
                    styles.label,
                    {
                      opacity: labelOpacity[index],
                      color: isFocused ? Colors.gold4 : '#FFFFFF',
                      fontWeight: isFocused ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Animated.Text>

                {/* Active dot */}
                <Animated.View
                  style={[
                    styles.dot,
                    { transform: [{ scale: dotScale[index] }] },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  outerGlow: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    height: TAB_BAR_H + 20,
    borderRadius: 32,
    backgroundColor: Colors.gold3,
    opacity: 0.07,
    // Soft spread
    shadowColor: Colors.gold3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
  },
  blur: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 24,
  },
  shimmerLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 10,
  },

  // Sliding pill
  pill: {
    position: 'absolute',
    top: 8,
    width: PILL_W,
    height: TAB_BAR_H - 16,
    borderRadius: 18,
    overflow: 'hidden',
    zIndex: 0,
    borderWidth: 1,
    borderColor: 'rgba(212,168,67,0.28)',
  },
  pillGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  pillTopEdge: {
    position: 'absolute',
    top: 0,
    left: 8,
    right: 8,
    height: 1,
    backgroundColor: 'rgba(232,201,122,0.60)',
    borderRadius: 1,
  },

  // Row & items
  row: {
    flexDirection: 'row',
    height: TAB_BAR_H,
    alignItems: 'center',
    zIndex: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  label: {
    fontSize: 9.5,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gold3,
    marginTop: 1,
    shadowColor: Colors.gold3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="saved" />
      <Tabs.Screen name="brands" />
      <Tabs.Screen name="tracking" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
