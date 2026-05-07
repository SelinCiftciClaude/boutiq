import React, { useRef } from 'react';
import {
  View, Text, Image, StyleSheet, Pressable, Animated, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import type { Favorite } from '@/services/favoritesService';

interface Props {
  item: Favorite;
  onPress: (fav: Favorite) => void;
  onDelete?: (id: string) => void;
  tall?: boolean;
}

export function FavoriteCard({ item, onPress, onDelete, tall }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const displayPrice = item.currentPrice ?? item.priceAtSave;
  const priceDrop = displayPrice != null && item.priceAtSave != null && displayPrice < item.priceAtSave;
  const priceUp   = displayPrice != null && item.priceAtSave != null && displayPrice > item.priceAtSave;
  const pct = item.priceAtSave && item.priceAtSave > 0
    ? Math.abs(((displayPrice ?? item.priceAtSave) - item.priceAtSave) / item.priceAtSave * 100)
    : 0;
  const isOOS = item.currentStockStatus === 'out_of_stock';

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Pressable
      onPress={() => onPress(item)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLongPress={() => {
        if (!onDelete) return;
        Alert.alert(
          item.productName,
          'Bu favoriyi kaldır?',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Kaldır', style: 'destructive', onPress: () => onDelete(item.id) },
          ]
        );
      }}
      style={{ flex: 1 }}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        {/* Image */}
        <View style={[styles.imgWrap, tall && styles.imgWrapTall]}>
          {item.primaryImageUrl ? (
            <Image source={{ uri: item.primaryImageUrl }} style={styles.img} resizeMode="cover" />
          ) : (
            <View style={styles.imgPlaceholder}>
              <Text style={styles.placeholderEmoji}>{item.collection?.emoji ?? '🛍️'}</Text>
            </View>
          )}

          {isOOS && (
            <View style={styles.oosOverlay}>
              <Text style={styles.oosText}>TÜKENDİ</Text>
            </View>
          )}

          {item.watchPriceDrop && (
            <View style={styles.bellBadge}>
              <Ionicons name="notifications" size={10} color="#5A6B2A" />
            </View>
          )}

          {priceDrop && pct >= 1 && (
            <View style={styles.changeBadge}>
              <Ionicons name="trending-down" size={9} color="#fff" />
              <Text style={styles.changeBadgeText}>%{pct.toFixed(0)}</Text>
            </View>
          )}
          {priceUp && pct >= 1 && (
            <View style={[styles.changeBadge, styles.changeBadgeUp]}>
              <Ionicons name="trending-up" size={9} color="#fff" />
              <Text style={styles.changeBadgeText}>%{pct.toFixed(0)}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          {item.merchantName ? (
            <Text style={styles.merchant} numberOfLines={1}>{item.merchantName}</Text>
          ) : null}
          <Text style={styles.name} numberOfLines={2}>{item.productName}</Text>
          {displayPrice != null && displayPrice > 0 && (
            <View style={styles.priceRow}>
              <Text style={[styles.price, priceDrop && styles.priceGreen]}>
                ₺{displayPrice.toLocaleString('tr')}
              </Text>
              {priceDrop && item.priceAtSave && (
                <Text style={styles.strikePrice}>₺{item.priceAtSave.toLocaleString('tr')}</Text>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },

  imgWrap: { height: 170, backgroundColor: Colors.surface2, position: 'relative' },
  imgWrapTall: { height: 220 },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 32 },

  oosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  oosText: {
    fontFamily: Fonts.ui,
    fontSize: 10,
    color: '#fff',
    letterSpacing: 2,
  },

  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(250,246,232,0.96)',
    borderRadius: 12,
    padding: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(90,107,42,0.35)',
  },

  changeBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#2A7432',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  changeBadgeUp: { backgroundColor: '#A32D2D' },
  changeBadgeText: {
    fontFamily: Fonts.ui,
    fontSize: 9,
    color: '#fff',
  },

  info: { padding: 10 },
  merchant: {
    fontFamily: Fonts.uiRegular,
    fontSize: 9.5,
    color: Colors.text4,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  name: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.text1,
    lineHeight: 17,
    marginBottom: 6,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  price: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: Colors.text1,
  },
  priceGreen: { color: '#2A7432' },
  strikePrice: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    textDecorationLine: 'line-through',
  },
});
