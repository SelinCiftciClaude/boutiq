import React, { useRef, useEffect } from 'react';
import { Tabs } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const TABS = [
  { name: 'index', label: 'Keşfet', icon: 'compass', iconFilled: 'compass' },
  { name: 'saved', label: 'Kaydedilen', icon: 'heart-outline', iconFilled: 'heart' },
  { name: 'brands', label: 'Butikler', icon: 'storefront-outline', iconFilled: 'storefront' },
  { name: 'tracking', label: 'Kargo', icon: 'bicycle-outline', iconFilled: 'bicycle' },
  { name: 'profile', label: 'Profil', icon: 'person-outline', iconFilled: 'person' },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const indicatorX = useRef(new Animated.Value(0)).current;
  const scales = TABS.map(() => useRef(new Animated.Value(1)).current);

  const TAB_WIDTH = (width - 32) / TABS.length;

  useEffect(() => {
    Animated.spring(indicatorX, {
      toValue: state.index * TAB_WIDTH + TAB_WIDTH / 2 - 20,
      useNativeDriver: true,
      tension: 68,
      friction: 10,
    }).start();

    scales.forEach((scale, i) => {
      Animated.spring(scale, {
        toValue: i === state.index ? 1.15 : 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();
    });
  }, [state.index]);

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: insets.bottom + 8 }]}>
      <BlurView intensity={60} tint="dark" style={styles.tabBar}>
        <View style={styles.tabBarInner}>
          {/* Gold indicator pill */}
          <Animated.View
            style={[
              styles.indicator,
              { transform: [{ translateX: indicatorX }] },
            ]}
          >
            <LinearGradient
              colors={[Colors.gold2, Colors.gold4]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.indicatorGradient}
            />
          </Animated.View>

          {TABS.map((tab, index) => {
            const isFocused = state.index === index;
            const route = state.routes[index];

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                Haptics.selectionAsync();
                navigation.navigate(route.name);
              }
            };

            return (
              <Animated.View
                key={tab.name}
                style={[styles.tabItem, { transform: [{ scale: scales[index] }] }]}
              >
                <TouchableOpacity
                  onPress={onPress}
                  style={styles.tabButton}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={(isFocused ? tab.iconFilled : tab.icon) as any}
                    size={22}
                    color={isFocused ? Colors.bg : Colors.text4}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: isFocused ? Colors.bg : Colors.text5 },
                    ]}
                    numberOfLines={1}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    zIndex: 100,
  },
  tabBar: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border2,
    shadowColor: Colors.gold3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  tabBarInner: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 4,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 8,
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    zIndex: 0,
  },
  indicatorGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    zIndex: 1,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minWidth: 50,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="saved" />
      <Tabs.Screen name="brands" />
      <Tabs.Screen name="tracking" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
