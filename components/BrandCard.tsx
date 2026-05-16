import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Typography';
import { Brand } from '../types';
import { Badge } from './ui/Badge';

const { width } = Dimensions.get('window');

interface BrandCardProps {
  brand: Brand;
  variant?: 'horizontal' | 'grid' | 'featured' | 'compact';
  cardWidth?: number; // grid/compact için dışarıdan geçilir
  onPress?: (brand: Brand) => void;
  onAdd?: (brand: Brand) => void;
  isSaved?: boolean;
}

export function BrandCard({ brand, variant = 'horizontal', cardWidth, onPress, onAdd, isSaved }: BrandCardProps) {
  const handlePress = () => {
    Haptics.selectionAsync();
    if (onPress) onPress(brand);
    else Linking.openURL(brand.affiliateUrl);
  };

  if (variant === 'featured') {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.92} style={styles.featured}>
        <Image
          source={{ uri: brand.coverImage }}
          style={styles.featuredImage}
          resizeMode="cover"
        />
        {/* Deep editorial gradient */}
        <LinearGradient
          colors={['rgba(7,7,12,0)', 'rgba(7,7,12,0.55)', 'rgba(7,7,12,0.97)']}
          locations={[0.2, 0.55, 1]}
          style={styles.featuredGradient}
        />

        {/* Üst köşe — kategori etiketi */}
        <View style={styles.featuredTopLeft}>
          <Text style={styles.featuredCategory}>{brand.category.toUpperCase()}</Text>
        </View>

        {/* Add button */}
        {onAdd && (
          <TouchableOpacity
            style={[styles.featuredAddBtn, isSaved && styles.featuredAddBtnSaved]}
            onPress={(e) => {
              e.stopPropagation?.();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onAdd(brand);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isSaved ? (
              <Ionicons name="checkmark" size={14} color={Colors.gold3} />
            ) : (
              <Ionicons name="add" size={16} color={Colors.text1} />
            )}
          </TouchableOpacity>
        )}

        {/* İçerik — alt kısım */}
        <View style={styles.featuredContent}>
          {/* Logo + isim satırı */}
          <View style={styles.featuredTop}>
            <Image source={{ uri: brand.logo }} style={styles.featuredLogo} />
            {brand.isVerified && (
              <View style={styles.verifiedDot}>
                <Ionicons name="checkmark" size={9} color={Colors.bg} />
              </View>
            )}
          </View>

          {/* İsim — Cormorant Garamond */}
          <Text style={styles.featuredName} numberOfLines={1}>{brand.name}</Text>

          {/* Alt bilgi satırı */}
          <View style={styles.featuredMeta}>
            <Text style={styles.featuredHandle}>{brand.handle}</Text>
            {brand.rating && (
              <View style={styles.ratingRow}>
                <View style={styles.ratingDot} />
                <Text style={styles.rating}>{brand.rating}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'grid') {
    const gw = cardWidth ?? (width - 48) / 2;
    const gh = Math.round(gw * 1.3);
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.88}
        style={[styles.grid, { width: gw, height: gh }]}>
        <Image source={{ uri: brand.coverImage }} style={styles.gridCover} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(7,7,12,0)', 'rgba(7,7,12,0.92)']}
          locations={[0.3, 1]}
          style={styles.gridGradient}
        />

        {/* Add button */}
        {onAdd && (
          <TouchableOpacity
            style={[styles.addBtn, isSaved && styles.addBtnSaved]}
            onPress={(e) => {
              e.stopPropagation?.();
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onAdd(brand);
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            {isSaved ? (
              <Ionicons name="checkmark" size={13} color={Colors.gold3} />
            ) : (
              <Ionicons name="add" size={15} color={Colors.text1} />
            )}
          </TouchableOpacity>
        )}

        <View style={styles.gridContent}>
          <Image source={{ uri: brand.logo }} style={styles.gridLogo} />
          <Text style={styles.gridName} numberOfLines={1}>{brand.name}</Text>
          <Text style={styles.gridCategory}>{brand.category.toUpperCase()}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Compact — 3 kolon küçük kart
  if (variant === 'compact') {
    const cw = cardWidth ?? (width - 52) / 3;
    const ch = cw * 1.25;
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.88}
        style={[styles.compact, { width: cw, height: ch }]}>
        <Image source={{ uri: brand.coverImage }} style={styles.compactCover} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(7,7,12,0)', 'rgba(7,7,12,0.95)']}
          locations={[0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.compactContent}>
          <Image source={{ uri: brand.logo }} style={styles.compactLogo} />
          <Text style={styles.compactName} numberOfLines={2}>{brand.name}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Horizontal (default)
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={styles.horizontal}>
      <Image source={{ uri: brand.logo }} style={styles.logo} />
      <View style={styles.hInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{brand.name}</Text>
          {brand.isVerified && (
            <Ionicons name="checkmark-circle" size={13} color={Colors.gold3} />
          )}
        </View>
        <Text style={styles.handle}>{brand.handle}</Text>
        <View style={styles.metaRow}>
          <Badge label={brand.category} variant="neutral" size="sm" />
          {brand.lastActive && (
            <Text style={styles.lastActive}>{brand.lastActive}</Text>
          )}
        </View>
      </View>
      <View style={styles.hRight}>
        {brand.productCount !== undefined && (
          <Text style={styles.productCount}>{brand.productCount} ürün</Text>
        )}
        <Ionicons name="chevron-forward" size={14} color={Colors.text5} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── Featured
  featured: {
    width: width - 32,
    height: 300,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
  },
  featuredTopLeft: {
    position: 'absolute',
    top: 14,
    left: 14,
  },
  featuredCategory: {
    fontFamily: Fonts.uiMedium,
    fontSize: 8,
    letterSpacing: 2,
    color: Colors.text2,
    backgroundColor: Colors.glass2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 3,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    overflow: 'hidden',
  },
  featuredAddBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.glass2,
    borderWidth: 0.5,
    borderColor: Colors.border3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredAddBtnSaved: {
    backgroundColor: Colors.glassGold,
    borderColor: Colors.borderGold,
  },
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    gap: 5,
  },
  featuredTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginBottom: 6,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  featuredLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.borderGold,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.gold3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },
  featuredName: {
    fontFamily: Fonts.editorial,
    fontSize: 32,
    color: Colors.text1,
    letterSpacing: 0.5,
    lineHeight: 34,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featuredHandle: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ratingDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.text5,
  },
  rating: {
    fontFamily: Fonts.uiMedium,
    fontSize: 11,
    color: Colors.gold3,
  },

  // ── Grid
  grid: {
    width: (width - 48) / 2,
    height: 195,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border1,
  },
  gridCover: {
    width: '100%',
    height: '100%',
  },
  gridGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
  },
  gridContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    gap: 3,
  },
  gridLogo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderGold,
    marginBottom: 2,
  },
  gridName: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.text1,
    letterSpacing: -0.1,
  },
  gridCategory: {
    fontFamily: Fonts.uiMedium,
    fontSize: 8,
    color: Colors.text4,
    letterSpacing: 1.5,
  },
  addBtn: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(7,7,12,0.70)',
    borderWidth: 0.5,
    borderColor: Colors.border3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnSaved: {
    backgroundColor: Colors.glassGold,
    borderColor: Colors.borderGold,
  },

  // ── Horizontal
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border1,
    gap: 14,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surface3,
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  hInfo: {
    flex: 1,
    gap: 4,
  },
  hRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    fontFamily: Fonts.uiMedium,
    fontSize: 15,
    color: Colors.text1,
    letterSpacing: -0.2,
  },
  handle: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  lastActive: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
  },
  productCount: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text3,
  },

  // Compact (3 kolon)
  compact: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border1,
  },
  compactCover: {
    width: '100%',
    height: '100%',
  },
  compactContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 7,
    alignItems: 'center',
    gap: 3,
  },
  compactLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: Colors.surface3,
  },
  compactName: {
    fontFamily: Fonts.uiMedium,
    fontSize: 9,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 12,
  },
});
