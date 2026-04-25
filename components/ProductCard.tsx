import React, { useState } from 'react';
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
import { Product } from '../types';
import { Badge } from './ui/Badge';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface ProductCardProps {
  product: Product;
  onUnsave?: (id: string) => void;
  tall?: boolean;
}

export function ProductCard({ product, onUnsave, tall = false }: ProductCardProps) {
  const [saved, setSaved] = useState(product.isSaved);
  const [imgError, setImgError] = useState(false);

  const handleSaveToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaved((prev) => {
      if (prev && onUnsave) onUnsave(product.id);
      return !prev;
    });
  };

  const handleOpen = () => {
    Haptics.selectionAsync();
    Linking.openURL(product.affiliateUrl);
  };

  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <TouchableOpacity
      onPress={handleOpen}
      activeOpacity={0.92}
      style={[styles.card, tall && styles.cardTall]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imgError ? 'https://via.placeholder.com/400x500' : product.image }}
          style={[styles.image, tall && styles.imageTall]}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
        <LinearGradient
          colors={['transparent', 'rgba(7,7,15,0.85)']}
          style={styles.imageGradient}
        />

        {/* Badges */}
        <View style={styles.topBadges}>
          {product.isOnSale && discount > 0 && (
            <Badge label={`-%${discount}`} variant="sale" />
          )}
          {!product.inStock && (
            <Badge label="Tükendi" variant="neutral" />
          )}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSaveToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={18}
            color={saved ? '#F43F5E' : Colors.text2}
          />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.brandRow}>
          <Image source={{ uri: product.brandLogo }} style={styles.brandLogo} />
          <Text style={styles.brandName} numberOfLines={1}>{product.brandName}</Text>
        </View>

        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            ₺{product.price.toLocaleString('tr-TR')}
          </Text>
          {product.originalPrice && (
            <Text style={styles.originalPrice}>
              ₺{product.originalPrice.toLocaleString('tr-TR')}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    backgroundColor: Colors.surface2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border1,
    marginBottom: 12,
  },
  cardTall: {
    // Staggered grid: alternate heights
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.surface3,
  },
  imageTall: {
    height: 260,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  topBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    gap: 4,
  },
  saveBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(7,7,15,0.70)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  info: {
    padding: 12,
    gap: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandLogo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.surface3,
  },
  brandName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text3,
    letterSpacing: 0.3,
    flex: 1,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text1,
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gold4,
    letterSpacing: -0.3,
  },
  originalPrice: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.text4,
    textDecorationLine: 'line-through',
  },
});
