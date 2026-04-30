import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Typography';
import { Product } from '../types';
import { Badge } from './ui/Badge';
import { useSavedProducts } from '@/hooks/useSavedProducts';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface ProductCardProps {
  product: Product;
  onUnsave?: (id: string) => void;
  tall?: boolean;
}

export function ProductCard({ product, onUnsave, tall = false }: ProductCardProps) {
  const { add, remove, isSaved } = useSavedProducts();
  const [imgError, setImgError] = useState(false);

  const saved = isSaved(product.id);

  const handleSaveToggle = (e: GestureResponderEvent) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (saved) {
      remove.mutate(product.id);
      onUnsave?.(product.id);
    } else {
      add.mutate(product.id);
    }
  };

  const handleOpen = () => {
    Haptics.selectionAsync();
    router.push(`/product/${product.id}` as any);
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
      {/* Görsel */}
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: imgError ? 'https://via.placeholder.com/400x500' : product.image }}
          style={[styles.image, tall && styles.imageTall]}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
        <LinearGradient
          colors={['transparent', 'rgba(7,7,12,0.80)']}
          style={styles.imageGradient}
        />

        {/* Üst etiketler */}
        <View style={styles.topBadges}>
          {product.isOnSale && discount > 0 && (
            <Badge label={`–%${discount}`} variant="sale" />
          )}
          {!product.inStock && (
            <Badge label="Tükendi" variant="neutral" />
          )}
        </View>

        {/* Kaydet butonu */}
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnActive]}
          onPress={handleSaveToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={16}
            color={saved ? '#E8504A' : Colors.text2}
          />
        </TouchableOpacity>
      </View>

      {/* Bilgi alanı */}
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
    borderRadius: 14,
    backgroundColor: Colors.surface2,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border1,
    marginBottom: 10,
  },
  cardTall: {},
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 210,
    backgroundColor: Colors.surface3,
  },
  imageTall: {
    height: 255,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  topBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    gap: 4,
  },
  saveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(7,7,12,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  saveBtnActive: {
    backgroundColor: 'rgba(232,80,74,0.15)',
    borderColor: 'rgba(232,80,74,0.35)',
  },
  info: {
    padding: 11,
    gap: 5,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  brandLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.surface3,
  },
  brandName: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
    color: Colors.text4,
    letterSpacing: 0.5,
    flex: 1,
  },
  productName: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.text1,
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: Colors.gold4,
    letterSpacing: -0.2,
  },
  originalPrice: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text5,
    textDecorationLine: 'line-through',
  },
});
