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
import { Brand } from '../types';
import { Badge } from './ui/Badge';

const { width } = Dimensions.get('window');

interface BrandCardProps {
  brand: Brand;
  variant?: 'horizontal' | 'grid' | 'featured';
  onPress?: (brand: Brand) => void;
  onAdd?: (brand: Brand) => void;
  isSaved?: boolean;
}

export function BrandCard({ brand, variant = 'horizontal', onPress, onAdd, isSaved }: BrandCardProps) {
  const handlePress = () => {
    Haptics.selectionAsync();
    if (onPress) {
      onPress(brand);
    } else {
      Linking.openURL(brand.affiliateUrl);
    }
  };

  if (variant === 'featured') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.90}
        style={styles.featured}
      >
        <Image
          source={{ uri: brand.coverImage }}
          style={styles.featuredImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(7,7,15,0.95)']}
          style={styles.featuredGradient}
        />
        <View style={styles.featuredContent}>
          <View style={styles.featuredHeader}>
            <Image source={{ uri: brand.logo }} style={styles.featuredLogo} />
            <View style={styles.featuredInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.featuredName}>{brand.name}</Text>
                {brand.isVerified && (
                  <Ionicons name="checkmark-circle" size={14} color={Colors.gold3} />
                )}
              </View>
              <Text style={styles.handle}>{brand.handle}</Text>
            </View>
          </View>
          <Text style={styles.featuredDesc} numberOfLines={2}>
            {brand.description}
          </Text>
          <View style={styles.featuredMeta}>
            <Badge label={brand.category} variant="gold" />
            {brand.rating && (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={12} color={Colors.gold3} />
                <Text style={styles.rating}>{brand.rating}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (variant === 'grid') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.88}
        style={styles.grid}
      >
        <Image source={{ uri: brand.coverImage }} style={styles.gridCover} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(7,7,15,0.90)']}
          style={styles.gridGradient}
        />
        <View style={styles.gridContent}>
          <Image source={{ uri: brand.logo }} style={styles.gridLogo} />
          <Text style={styles.gridName} numberOfLines={1}>{brand.name}</Text>
          <Badge label={brand.category} variant="neutral" size="sm" />
        </View>

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
              <Ionicons name="checkmark" size={14} color={Colors.gold4} />
            ) : (
              <Ionicons name="add" size={16} color={Colors.text1} />
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  // Horizontal (default)
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.88}
      style={styles.horizontal}
    >
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
        <Ionicons name="chevron-forward" size={16} color={Colors.text4} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Featured
  featured: {
    width: width - 32,
    height: 240,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
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
  featuredContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    gap: 10,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featuredLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.gold3,
  },
  featuredInfo: {
    flex: 1,
    gap: 2,
  },
  featuredName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text1,
    letterSpacing: -0.5,
  },
  featuredDesc: {
    fontSize: 13,
    color: Colors.text3,
    lineHeight: 18,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Grid
  grid: {
    width: (width - 48) / 2,
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
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
    height: '60%',
  },
  gridContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    gap: 4,
  },
  gridLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border2,
    marginBottom: 2,
  },
  gridName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text1,
    letterSpacing: -0.2,
  },
  addBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(7,7,15,0.72)',
    borderWidth: 1,
    borderColor: Colors.border3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnSaved: {
    backgroundColor: Colors.glassGold,
    borderColor: Colors.borderGold,
  },

  // Horizontal
  horizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border1,
    gap: 14,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  hInfo: {
    flex: 1,
    gap: 4,
  },
  hRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text1,
    letterSpacing: -0.3,
  },
  handle: {
    fontSize: 12,
    color: Colors.text4,
    fontWeight: '400',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  lastActive: {
    fontSize: 11,
    color: Colors.text4,
  },
  productCount: {
    fontSize: 12,
    color: Colors.text3,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 12,
    color: Colors.gold3,
    fontWeight: '600',
  },
});
