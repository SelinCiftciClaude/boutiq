import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Button } from '../components/ui/Button';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    eyebrow: 'Keşfet',
    title: 'Binlerce\nBağımsız\nButik',
    subtitle: 'Instagram\'da gördüğün, kalbin çarpan o markalar artık tek bir yerde.',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=1200&fit=crop',
    accent: Colors.gold3,
    gradient: ['#0A0610', '#1A0830', '#07070F'] as const,
  },
  {
    id: '2',
    eyebrow: 'Kaydet',
    title: 'Beğendiğin\nHer Ürünü\nUnut Gitmesin',
    subtitle: 'Instagram\'dan beğenip unuttuğun ürünleri BOUTIQ\'e kaydet. Hepsi seni bekliyor.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=1200&fit=crop',
    accent: Colors.purple3,
    gradient: ['#0A0610', '#1A0A30', '#07070F'] as const,
  },
  {
    id: '3',
    eyebrow: 'Takip Et',
    title: 'Kargonu\nTek Ekranda\nGör',
    subtitle: 'Tüm siparişlerin, e-postanı bağla ve kargo takibini otomatik al. Hiçbir şey kaçmasın.',
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&h=1200&fit=crop',
    accent: Colors.success,
    gradient: ['#050A0A', '#051A10', '#07070F'] as const,
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goToNext = () => {
    Haptics.selectionAsync();
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      router.replace('/(auth)/login');
    }
  };

  const goToLogin = () => {
    Haptics.selectionAsync();
    router.replace('/(auth)/login');
  };

  const renderSlide = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const imageScale = scrollX.interpolate({
      inputRange,
      outputRange: [1.1, 1, 1.1],
      extrapolate: 'clamp',
    });
    const textOpacity = scrollX.interpolate({
      inputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });
    const textTranslateY = scrollX.interpolate({
      inputRange,
      outputRange: [30, 0, 30],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        {/* Background image */}
        <Animated.Image
          source={{ uri: item.image }}
          style={[styles.bgImage, { transform: [{ scale: imageScale }] }]}
          resizeMode="cover"
        />

        {/* Gradient overlay */}
        <LinearGradient
          colors={item.gradient}
          style={styles.gradient}
          locations={[0, 0.5, 1]}
        />

        {/* Accent glow */}
        <View style={[styles.accentGlow, { backgroundColor: item.accent }]} />

        {/* Content */}
        <Animated.View
          style={[
            styles.content,
            { opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
          ]}
        >
          <Text style={[styles.eyebrow, { color: item.accent }]}>{item.eyebrow}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </Animated.View>
      </View>
    );
  };

  const inputRange = SLIDES.map((_, i) => i * width);
  const dotColor = scrollX.interpolate({
    inputRange,
    outputRange: SLIDES.map((s) => s.accent),
  });

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>BOUTIQ</Text>
        <Text style={styles.logoTagline}>bağımsız butikler, bir arada</Text>
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(idx);
        }}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        style={styles.flatList}
      />

      {/* Bottom controls */}
      <View style={styles.controls}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [8, 28, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity: dotOpacity, backgroundColor: SLIDES[i].accent },
                ]}
              />
            );
          })}
        </View>

        {/* CTA */}
        <View style={styles.ctaGroup}>
          <Button
            label={currentIndex === SLIDES.length - 1 ? 'Hemen Başla' : 'Devam'}
            onPress={goToNext}
            variant="primary"
            size="xl"
            style={styles.ctaButton}
            icon={
              <Ionicons
                name={currentIndex === SLIDES.length - 1 ? 'sparkles' : 'arrow-forward'}
                size={18}
                color={Colors.bg}
              />
            }
            iconPosition="right"
          />

          <TouchableOpacity onPress={goToLogin} style={styles.skipBtn}>
            <Text style={styles.skipText}>Zaten hesabım var</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  logoContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text1,
    letterSpacing: 8,
  },
  logoTagline: {
    fontSize: 11,
    color: Colors.gold3,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
    fontWeight: '500',
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width,
    height,
    justifyContent: 'flex-end',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height: height * 0.65,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  accentGlow: {
    position: 'absolute',
    top: height * 0.35,
    left: -100,
    right: -100,
    height: 300,
    opacity: 0.06,
    borderRadius: 200,
    transform: [{ scaleX: 2 }],
  },
  content: {
    paddingHorizontal: 32,
    paddingBottom: 220,
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.text1,
    letterSpacing: -2,
    lineHeight: 46,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text3,
    lineHeight: 22,
    maxWidth: 320,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 20,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 4,
    borderRadius: 4,
  },
  ctaGroup: {
    width: '100%',
    gap: 14,
    alignItems: 'center',
  },
  ctaButton: {
    width: '100%',
  },
  skipBtn: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    color: Colors.text4,
    fontWeight: '500',
  },
});
