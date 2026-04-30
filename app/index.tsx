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
    title: 'Bağımsız\nButikler\nBir Arada',
    subtitle: 'Instagram\'da kalbini çarpan o markalar artık tek bir yerde seni bekliyor.',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&h=1200&fit=crop',
    accent: Colors.rose3,
    gradient: ['#FFF4EE', '#FFEDE0', '#FDF8F5'] as const,
    bgGlow: Colors.roseGlow,
  },
  {
    id: '2',
    eyebrow: 'Kaydet',
    title: 'Gördün,\nBeğendin,\nKaydet.',
    subtitle: 'Geçip gitmesin. Instagram\'da dikkatini çeken ürünü hemen BOUTIQ\'e ekle.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=1200&fit=crop',
    accent: Colors.gold3,
    gradient: ['#FFFAF0', '#FFF5E0', '#FDF8F5'] as const,
    bgGlow: Colors.goldGlow,
  },
  {
    id: '3',
    eyebrow: 'Takip Et',
    title: 'Siparişlerin\nHep Gözünün\nÖnünde',
    subtitle: 'E-postanı bağla, tüm kargolarını tek yerden otomatik olarak takip et.',
    image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=800&h=1200&fit=crop',
    accent: Colors.teal2,
    gradient: ['#F0FBF9', '#E8F7F5', '#FDF8F5'] as const,
    bgGlow: Colors.tealGlow,
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goToNext = () => {
    Haptics.selectionAsync();
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      router.replace('/(auth)/login');
    }
  };

  const renderSlide = ({ item, index }: { item: typeof SLIDES[0]; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const imageScale = scrollX.interpolate({
      inputRange, outputRange: [1.08, 1, 1.08], extrapolate: 'clamp',
    });
    const textOpacity = scrollX.interpolate({
      inputRange, outputRange: [0, 1, 0], extrapolate: 'clamp',
    });
    const textTranslateY = scrollX.interpolate({
      inputRange, outputRange: [24, 0, 24], extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        {/* Warm gradient background */}
        <LinearGradient colors={item.gradient} style={StyleSheet.absoluteFill} />

        {/* Ambient glow */}
        <View style={[styles.ambientGlow, { backgroundColor: item.bgGlow }]} />

        {/* Image — top half, masked */}
        <View style={styles.imageWrap}>
          <Animated.Image
            source={{ uri: item.image }}
            style={[styles.image, { transform: [{ scale: imageScale }] }]}
            resizeMode="cover"
          />
          {/* Fade image into background */}
          <LinearGradient
            colors={['transparent', item.gradient[0]]}
            style={styles.imageFade}
          />
        </View>

        {/* Text content */}
        <Animated.View
          style={[
            styles.content,
            { opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
          ]}
        >
          <View style={[styles.eyebrowPill, { backgroundColor: `${item.accent}18`, borderColor: `${item.accent}35` }]}>
            <Text style={[styles.eyebrow, { color: item.accent }]}>{item.eyebrow}</Text>
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <LinearGradient colors={[Colors.rose3, Colors.gold3]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoDot} />
        <Text style={styles.logoText}>BOUTIQ</Text>
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
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        style={styles.flatList}
      />

      {/* Bottom controls */}
      <View style={styles.controls}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((s, i) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [(i - 1) * width, i * width, (i + 1) * width],
              outputRange: [6, 22, 6],
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
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity, backgroundColor: SLIDES[i].accent }]}
              />
            );
          })}
        </View>

        <Button
          label={currentIndex === SLIDES.length - 1 ? 'Hemen Başla' : 'Devam'}
          onPress={goToNext}
          variant="primary"
          size="xl"
          style={styles.ctaButton}
          icon={<Ionicons name={currentIndex === SLIDES.length - 1 ? 'sparkles' : 'arrow-forward'} size={18} color="#fff" />}
        />

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Zaten hesabım var</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  logoContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 10,
  },
  logoDot: {
    width: 28, height: 28, borderRadius: 8,
  },
  logoText: {
    fontSize: 22, fontWeight: '800',
    color: Colors.text1, letterSpacing: 5,
  },
  flatList: { flex: 1 },
  slide: {
    width, height,
    justifyContent: 'flex-end',
  },
  ambientGlow: {
    position: 'absolute',
    top: height * 0.15,
    left: -80,
    right: -80,
    height: 300,
    borderRadius: 200,
    opacity: 0.6,
  },
  imageWrap: {
    position: 'absolute',
    top: 80,
    left: 24,
    right: 24,
    height: height * 0.46,
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 20,
  },
  image: { width: '100%', height: '100%' },
  imageFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
  },
  content: {
    paddingHorizontal: 32,
    paddingBottom: 210,
    gap: 12,
  },
  eyebrowPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 2,
  },
  eyebrow: {
    fontSize: 11, fontWeight: '700',
    letterSpacing: 2, textTransform: 'uppercase',
  },
  title: {
    fontSize: 40, fontWeight: '800',
    color: Colors.text1, letterSpacing: -1.5,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 15, color: Colors.text3,
    lineHeight: 22, maxWidth: 320,
  },
  controls: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: 52,
    gap: 16, alignItems: 'center',
  },
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { height: 4, borderRadius: 4 },
  ctaButton: { width: '100%' },
  skipBtn: { paddingVertical: 8 },
  skipText: { fontSize: 14, color: Colors.text4, fontWeight: '500' },
});
