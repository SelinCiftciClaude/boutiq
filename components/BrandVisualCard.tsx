import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';

// ── Tipler ────────────────────────────────────────────────────────────────────

export interface BrandVisualData {
  id: string;
  name: string;
  logo?: string;         // logo_url
  coverImage?: string;   // cover_url  (og:image)
  brandColor?: string;   // hex #xxxxxx
  cardStyle?: 'hero' | 'logo_centered' | 'initials';
  category?: string;
  productCount?: number;
  isVerified?: boolean;
}

interface Props {
  brand: BrandVisualData;
  width: number;         // kart genişliği — dışarıdan verilir
  onPress?: () => void;
  onLongPress?: () => void;
}

const CARD_IMAGE_RATIO = 0.68; // görsel alanı toplam yüksekliğin %68'i
const INFO_H           = 52;   // alt bilgi çubuğu sabir yükseklik

// Baş harf üret (2 kelime → her birinin ilk harfi, tek kelime → ilk 2 harf)
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

// brandColor'dan iki tonlu gradient üret
function toGradient(hex: string): [string, string] {
  return [hex, hex + 'CC'];  // %80 opak → koyu
}

// ── Alt bilgi çubuğu ──────────────────────────────────────────────────────────

function InfoBar({ brand, dark }: { brand: BrandVisualData; dark?: boolean }) {
  const textColor = dark ? '#fff' : Colors.text1;
  const metaColor = dark ? 'rgba(255,255,255,0.65)' : Colors.text4;
  return (
    <View style={[ib.wrap, dark && ib.wrapDark]}>
      <View style={{ flex: 1 }}>
        <View style={ib.nameRow}>
          <Text style={[ib.name, { color: textColor }]} numberOfLines={1}>
            {brand.name}
          </Text>
          {brand.isVerified && (
            <Ionicons name="checkmark-circle" size={12} color={dark ? Colors.gold4 : Colors.gold3} />
          )}
        </View>
        {(brand.category || (brand.productCount ?? 0) > 0) && (
          <Text style={[ib.meta, { color: metaColor }]} numberOfLines={1}>
            {[brand.category, brand.productCount ? `${brand.productCount} ürün` : '']
              .filter(Boolean).join(' · ')}
          </Text>
        )}
      </View>
    </View>
  );
}

const ib = StyleSheet.create({
  wrap: {
    height: INFO_H,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    backgroundColor: Colors.surface1,
  },
  wrapDark: {
    backgroundColor: 'transparent',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    letterSpacing: -0.1,
    flex: 1,
  },
  meta: {
    fontFamily: Fonts.uiLight,
    fontSize: 10,
    marginTop: 1,
  },
});

// ── Stil 1 — Hero (og:image tam kart, logo overlay) ──────────────────────────

function HeroStyle({ brand, imageH, cardW }: { brand: BrandVisualData; imageH: number; cardW: number }) {
  const [imgError, setImgError] = useState(false);

  if (!brand.coverImage || imgError) {
    return <InitialsStyle brand={brand} imageH={imageH} cardW={cardW} />;
  }

  return (
    <View style={{ width: cardW, height: imageH }}>
      <Image
        source={{ uri: brand.coverImage }}
        style={{ width: '100%', height: '100%' }}
        resizeMode="cover"
        onError={() => setImgError(true)}
      />
      {/* Alt gradient overlay — okunabilirlik */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.70)']}
        locations={[0.35, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Alt-sol: logo + marka adı */}
      <View style={h.overlay}>
        {brand.logo ? (
          <View style={h.logoCircle}>
            <Image source={{ uri: brand.logo }} style={h.logoImg} resizeMode="contain" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const h = StyleSheet.create({
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  logoCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  logoImg: { width: '100%', height: '100%' },
});

// ── Stil 2 — Logo Centered (brand color bg, logo ortada) ──────────────────────

function LogoCenteredStyle({ brand, imageH, cardW }: { brand: BrandVisualData; imageH: number; cardW: number }) {
  const [logoError, setLogoError] = useState(false);
  const color = brand.brandColor || Colors.rose3;

  if (!brand.logo || logoError) {
    return <InitialsStyle brand={brand} imageH={imageH} cardW={cardW} />;
  }

  return (
    <View style={[lc.wrap, { width: cardW, height: imageH, backgroundColor: color }]}>
      <LinearGradient
        colors={[`${color}EE`, `${color}AA`]}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={{ uri: brand.logo }}
        style={[lc.logo, { maxWidth: cardW * 0.62 }]}
        resizeMode="contain"
        onError={() => setLogoError(true)}
      />
    </View>
  );
}

const lc = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    overflow: 'hidden',
  },
  logo: {
    height: 70,
    width: '100%',
  },
});

// ── Stil 3 — Initials + Gradient (fallback) ────────────────────────────────────

function InitialsStyle({ brand, imageH, cardW }: { brand: BrandVisualData; imageH: number; cardW: number }) {
  const color  = brand.brandColor || Colors.rose3;
  const [from, to] = toGradient(color);
  const initials   = getInitials(brand.name);

  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ width: cardW, height: imageH, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={ini.text}>{initials}</Text>
    </LinearGradient>
  );
}

const ini = StyleSheet.create({
  text: {
    fontFamily: Fonts.displayBold,
    fontSize: 44,
    color: 'rgba(250,246,232,0.92)',
    letterSpacing: -0.5,
  },
});

// ── Ana kart ──────────────────────────────────────────────────────────────────

export function BrandVisualCard({ brand, width, onPress, onLongPress }: Props) {
  const imageH  = Math.round(width * CARD_IMAGE_RATIO * 1.4); // portrait hissi
  const totalH  = imageH + INFO_H;
  const style   = brand.cardStyle ?? 'initials';
  const isDark  = style === 'hero';

  return (
    <TouchableOpacity
      style={[s.card, { width, height: totalH }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.88}
    >
      {/* Görsel alan */}
      {style === 'hero'         && <HeroStyle         brand={brand} imageH={imageH} cardW={width} />}
      {style === 'logo_centered' && <LogoCenteredStyle brand={brand} imageH={imageH} cardW={width} />}
      {style === 'initials'     && <InitialsStyle      brand={brand} imageH={imageH} cardW={width} />}

      {/* Alt bilgi */}
      <InfoBar brand={brand} dark={isDark} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface2,
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
});
