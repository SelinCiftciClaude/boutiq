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
import { Fonts } from '../../constants/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const TABS = [
  { name: 'index',    label: 'KEŞFET',          icon: 'compass-outline',    iconFilled: 'compass' },
  { name: 'saved',    label: 'KOLEKSİYON',      icon: 'heart-outline',       iconFilled: 'heart' },
  { name: 'brands',   label: 'BUTİKLER',        icon: 'storefront-outline',  iconFilled: 'storefront' },
  { name: 'tracking', label: 'GEÇMİŞ SİPARİŞ', icon: 'receipt-outline',     iconFilled: 'receipt' },
  { name: 'profile',  label: 'PROFİL',           icon: 'person-outline',      iconFilled: 'person' },
];

const LABELS = ['KEŞFET', 'KOLEKSİYON', 'BUTİKLER', 'GEÇMİŞ SİPARİŞ', 'PROFİL'];

const BAR_H   = 62;
const BAR_MX  = 20;

function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const TAB_W  = (width - BAR_MX * 2) / TABS.length;

  const iconScales   = useRef(TABS.map((_, i) => new Animated.Value(i === 0 ? 1.1 : 1))).current;
  const iconOpacity  = useRef(TABS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.38))).current;
  const labelOpacity = useRef(TABS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;
  const dotScale     = useRef(TABS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  useEffect(() => {
    TABS.forEach((_, i) => {
      const active = i === state.index;
      Animated.parallel([
        Animated.spring(iconScales[i], {
          toValue: active ? 1.15 : 1,
          useNativeDriver: true,
          tension: 100,
          friction: 9,
        }),
        Animated.timing(iconOpacity[i], {
          toValue: active ? 1 : 0.35,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(labelOpacity[i], {
          toValue: active ? 1 : 0.55,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(dotScale[i], {
          toValue: active ? 1 : 0,
          useNativeDriver: true,
          tension: 160,
          friction: 8,
        }),
      ]).start();
    });
  }, [state.index]);

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <BlurView intensity={80} tint="light" style={styles.blur}>
        {/* Üst hairline — altın */}
        <View style={styles.topLine} />

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
                style={[styles.tabItem, { width: TAB_W }]}
                activeOpacity={1}
              >
                <Animated.View
                  style={{
                    transform: [{ scale: iconScales[index] }],
                    opacity: iconOpacity[index],
                    alignItems: 'center',
                  }}
                >
                  <Ionicons
                    name={(isFocused ? tab.iconFilled : tab.icon) as any}
                    size={21}
                    color={isFocused ? Colors.rose3 : Colors.text3}
                  />
                </Animated.View>

                <Animated.Text
                  style={[styles.label, { opacity: labelOpacity[index] }]}
                  numberOfLines={1}
                >
                  {LABELS[index]}
                </Animated.Text>

                {/* Active dot indicator */}
                <Animated.View
                  style={[styles.dot, { transform: [{ scaleX: dotScale[index] }] }]}
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
    left: BAR_MX,
    right: BAR_MX,
    zIndex: 100,
  },
  blur: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 30,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 0.5,
    backgroundColor: Colors.borderGold,
    zIndex: 10,
  },
  row: {
    flexDirection: 'row',
    height: BAR_H,
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 10,
  },
  label: {
    fontFamily: Fonts.uiMedium,
    fontSize: 8,
    letterSpacing: 1.2,
    color: Colors.rose3,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(107,21,32,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dot: {
    position: 'absolute',
    bottom: 6,
    width: 16,
    height: 1.5,
    backgroundColor: Colors.rose3,
    borderRadius: 1,
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
