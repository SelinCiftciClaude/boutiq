import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Typography';

const { width } = Dimensions.get('window');

const STRIPE_COUNT = 12;
const SACAK_W = 20;
const SACAK_H = 12;
const SACAK_COUNT = Math.ceil(width / SACAK_W) + 2;

const CATEGORIES = ['Giyim', 'Home', 'Bebek', 'Mutfak', 'Teknoloji'];
const BRANDS     = ['Sinem Kıvanç', 'Love on Friday', 'Casa Naturale', 'Butik X'];

const BENEFITS = [
  {
    icon: 'add-circle-outline',
    title: 'Markalarını ekle',
    desc: 'Sevdiğin siteleri tek yerde topla.',
  },
  {
    icon: 'search-outline',
    title: 'Tek arama yap',
    desc: 'Farklı mağazalardaki ürünleri aynı ekranda gör.',
  },
  {
    icon: 'time-outline',
    title: 'Alışveriş geçmişini izle',
    desc: 'Sipariş, tarih ve kargo bilgilerin tek yerde.',
  },
];

export default function LandingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.surface2, Colors.bg, Colors.surface1]} style={StyleSheet.absoluteFill} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} bounces={false}>

        {/* ── TENTE HERO ───────────────────────────────── */}
        <Animated.View style={[styles.tenteBlock, { opacity: fadeAnim }]}>
          {/* Şeritler */}
          <View style={styles.tenteStripes}>
            {[...Array(STRIPE_COUNT)].map((_, i) => (
              <View key={i} style={[styles.tenteStripe, {
                backgroundColor: i % 2 === 0 ? Colors.stripeWarm : Colors.stripeCool,
              }]} />
            ))}
          </View>

          {/* Logo alanı */}
          <View style={styles.tenteLogoArea}>
            <Text style={styles.logo}>BUTİKA</Text>
          </View>

          {/* Burgund çizgi */}
          <View style={styles.tenteLine} />

          {/* Saçak */}
          <View style={styles.tenteSacak}>
            {[...Array(SACAK_COUNT)].map((_, i) => (
              <View key={i} style={{
                width: 0, height: 0,
                borderLeftWidth: SACAK_W / 2,
                borderRightWidth: SACAK_W / 2,
                borderTopWidth: SACAK_H,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: Colors.rose3,
              }} />
            ))}
          </View>
        </Animated.View>

        {/* ── SLOGAN + BAŞLIK ───────────────────────────── */}
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim }]}>
          <Text style={styles.slogan}>Kendi alışveriş evrenini kur</Text>
          <Text style={styles.headline}>Tüm favori mağazaların{'\n'}tek çatı altında.</Text>
          <Text style={styles.subtext}>
            Sevdiğin butik ve markaları ekle, kategorilere ayır, tek aramada tüm ürünleri karşılaştır.
          </Text>
        </Animated.View>

        {/* ── TELEFON MOCKUP ───────────────────────────── */}
        <View style={styles.mockupWrap}>
          <View style={styles.phone}>
            {/* Telefon çerçevesi */}
            <LinearGradient colors={[Colors.surface3, Colors.surface2]} style={StyleSheet.absoluteFill} />

            {/* Notch */}
            <View style={styles.notch} />

            {/* Arama barı */}
            <View style={styles.mockSearchBar}>
              <Ionicons name="search-outline" size={13} color={Colors.text4} />
              <Text style={styles.mockSearchText}>beyaz gömlek ara…</Text>
            </View>

            {/* Kategori kartları */}
            <View style={styles.mockCats}>
              {CATEGORIES.map((cat, i) => (
                <View key={i} style={[styles.mockCat, { backgroundColor: i === 0 ? Colors.rose3 : Colors.surface3 }]}>
                  <Text style={[styles.mockCatText, { color: i === 0 ? '#fff' : Colors.text3 }]}>{cat}</Text>
                </View>
              ))}
            </View>

            {/* Marka baloncukları */}
            <View style={styles.mockBrands}>
              {BRANDS.map((b, i) => (
                <View key={i} style={styles.mockBrandPill}>
                  <View style={styles.mockBrandDot} />
                  <Text style={styles.mockBrandText}>{b}</Text>
                </View>
              ))}
            </View>

            {/* Dekoratif çizgiler */}
            <View style={styles.mockLines}>
              {[70, 50, 60].map((w, i) => (
                <View key={i} style={[styles.mockLine, { width: `${w}%` as any }]} />
              ))}
            </View>
          </View>

          {/* Telefon gölgesi */}
          <View style={styles.phoneShadow} />
        </View>

        {/* ── FAYDA KARTLARI ───────────────────────────── */}
        <View style={styles.benefits}>
          {BENEFITS.map((b, i) => (
            <View key={i} style={styles.benefitCard}>
              <LinearGradient colors={[Colors.surface1, Colors.surface2]} style={StyleSheet.absoluteFill} />
              {/* Sol burgund çizgi */}
              <View style={styles.benefitAccent} />
              <View style={styles.benefitIconWrap}>
                <Ionicons name={b.icon as any} size={22} color={Colors.rose3} />
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDesc}>{b.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── CTA ──────────────────────────────────────── */}
        <View style={styles.ctaSection}>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleStart} activeOpacity={0.88}>
            <LinearGradient
              colors={[Colors.rose2, Colors.rose3, Colors.rose4]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.ctaText}>Alışveriş evrenimi kur</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Zaten hesabım var</Text>
          </TouchableOpacity>
        </View>

        {/* Alt boşluk */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1 },

  // ── Tente
  tenteBlock: { position: 'relative' },
  tenteStripes: {
    height: 100,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  tenteStripe: { flex: 1, opacity: 0.65 },
  tenteLogoArea: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontFamily: Fonts.display,
    fontSize: 44,
    letterSpacing: 3,
    color: Colors.rose3,
    textShadowColor: 'rgba(255,255,255,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tenteLine: { height: 4, backgroundColor: Colors.rose3 },
  tenteSacak: {
    flexDirection: 'row',
    height: SACAK_H,
    overflow: 'hidden',
  },

  // ── Hero
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 4,
    gap: 10,
  },
  slogan: {
    fontFamily: Fonts.uiMedium,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.teal2,
    textTransform: 'uppercase',
  },
  headline: {
    fontFamily: Fonts.display,
    fontSize: 34,
    color: Colors.text1,
    lineHeight: 40,
    letterSpacing: 0.5,
  },
  subtext: {
    fontFamily: Fonts.uiLight,
    fontSize: 15,
    color: Colors.text3,
    lineHeight: 22,
  },

  // ── Mockup
  mockupWrap: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  phone: {
    width: width * 0.62,
    height: width * 0.62 * 1.9,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.border3,
    padding: 14,
    gap: 10,
    position: 'relative',
  },
  notch: {
    width: 60,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border3,
    alignSelf: 'center',
    marginBottom: 4,
  },
  mockSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.surface3,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  mockSearchText: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
  },
  mockCats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  mockCat: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 5,
  },
  mockCatText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
  },
  mockBrands: { gap: 5 },
  mockBrandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface3,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  mockBrandDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.rose3,
  },
  mockBrandText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
    color: Colors.text2,
  },
  mockLines: { gap: 6, marginTop: 4 },
  mockLine: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surface3,
  },
  phoneShadow: {
    width: width * 0.55,
    height: 20,
    borderRadius: 50,
    backgroundColor: Colors.rose3,
    opacity: 0.12,
    marginTop: 8,
  },

  // ── Fayda kartları
  benefits: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 28,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    overflow: 'hidden',
    position: 'relative',
  },
  benefitAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: Colors.rose3,
    opacity: 0.7,
  },
  benefitIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.roseGlow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: Colors.borderBurgund,
  },
  benefitText: { flex: 1, gap: 3 },
  benefitTitle: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: Colors.text1,
    letterSpacing: 0.1,
  },
  benefitDesc: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text3,
    lineHeight: 17,
  },

  // ── CTA
  ctaSection: {
    paddingHorizontal: 20,
    gap: 14,
    alignItems: 'center',
  },
  ctaBtn: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  ctaText: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    letterSpacing: 1,
    color: '#fff',
  },
  loginLink: { paddingVertical: 6 },
  loginLinkText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.text3,
    letterSpacing: 0.3,
  },
});
