import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useWatchList, useRemoveWatch } from '@/hooks/useWatchList';
import type { ProductWatch } from '@/services/priceWatchService';

type Filter = 'all' | 'price_drop' | 'low_stock' | 'back_in_stock';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',           label: 'Tümü' },
  { id: 'price_drop',    label: 'Fiyatı Düşenler' },
  { id: 'low_stock',     label: 'Stoğu Azalanlar' },
];

function StockBadge({ inStock, stockCount }: { inStock: boolean; stockCount?: number }) {
  if (!inStock) {
    return (
      <View style={[badge.wrap, { backgroundColor: '#FFE5E5' }]}>
        <View style={[badge.dot, { backgroundColor: Colors.error }]} />
        <Text style={[badge.text, { color: Colors.error }]}>Tükendi</Text>
      </View>
    );
  }
  if (stockCount !== undefined && stockCount <= 3) {
    return (
      <View style={[badge.wrap, { backgroundColor: '#FFF3E0' }]}>
        <View style={[badge.dot, { backgroundColor: '#E07800' }]} />
        <Text style={[badge.text, { color: '#E07800' }]}>Son {stockCount}!</Text>
      </View>
    );
  }
  return (
    <View style={[badge.wrap, { backgroundColor: '#E8F5E9' }]}>
      <View style={[badge.dot, { backgroundColor: Colors.success }]} />
      <Text style={[badge.text, { color: Colors.success }]}>Stokta</Text>
    </View>
  );
}

function PriceChangeBadge({ initial, current }: { initial: number; current: number }) {
  if (initial <= 0 || initial === current) return null;
  const pct = ((initial - current) / initial) * 100;
  const dropped = pct > 0;
  return (
    <View style={[badge.wrap, { backgroundColor: dropped ? '#E8F5E9' : '#FFE5E5' }]}>
      <Ionicons
        name={dropped ? 'trending-down' : 'trending-up'}
        size={11}
        color={dropped ? Colors.success : Colors.error}
      />
      <Text style={[badge.text, { color: dropped ? Colors.success : Colors.error }]}>
        {dropped ? '↓' : '↑'} %{Math.abs(pct).toFixed(0)} {dropped ? 'düştü' : 'arttı'}
      </Text>
    </View>
  );
}

function WatchCard({ watch, onRemove }: { watch: ProductWatch; onRemove: () => void }) {
  const p = watch.product;
  if (!p) return null;

  return (
    <View style={styles.card}>
      <LinearGradient colors={[Colors.surface1, Colors.bg]} style={StyleSheet.absoluteFill} />

      {/* Sol burgund çizgi */}
      <View style={styles.cardAccent} />

      <View style={styles.cardContent}>
        {/* Ürün görseli */}
        <Image source={{ uri: p.image }} style={styles.cardImage} />

        {/* Bilgi */}
        <View style={styles.cardInfo}>
          {/* Marka */}
          <View style={styles.brandRow}>
            <Image source={{ uri: p.brandLogo }} style={styles.brandLogo} />
            <Text style={styles.brandName} numberOfLines={1}>{p.brandName}</Text>
          </View>

          {/* Ürün adı */}
          <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>

          {/* Fiyat */}
          <View style={styles.priceRow}>
            <Text style={styles.currentPrice}>₺{p.price.toLocaleString('tr-TR')}</Text>
            {watch.initialPrice !== p.price && (
              <Text style={styles.initialPrice}>₺{watch.initialPrice.toLocaleString('tr-TR')}</Text>
            )}
          </View>

          {/* Badge'ler */}
          <View style={styles.badges}>
            <PriceChangeBadge initial={watch.initialPrice} current={p.price} />
            <StockBadge inStock={p.inStock} />
          </View>
        </View>

        {/* Sağ aksiyonlar */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.buyBtn}
            onPress={() => { Haptics.selectionAsync(); Linking.openURL(p.affiliateUrl); }}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[Colors.rose2, Colors.rose3]} style={StyleSheet.absoluteFill} />
            <Text style={styles.buyBtnText}>Al</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.removeBtn}
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="notifications-off-outline" size={14} color={Colors.text4} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function WatchListScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');

  const { data: watches = [], isLoading } = useWatchList(filter);
  const removeMutation = useRemoveWatch();

  const switchFilter = (f: Filter) => { Haptics.selectionAsync(); setFilter(f); };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Takip Listem</Text>
        <Text style={styles.headerCount}>
          {watches.length > 0 ? `${watches.length} ürün` : ''}
        </Text>
      </View>

      {/* Filtre chip'leri */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const active = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => switchFilter(f.id)}
              activeOpacity={0.75}
            >
              {active && <LinearGradient colors={[Colors.rose2, Colors.rose3]} style={StyleSheet.absoluteFill} />}
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* İçerik */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⏳</Text>
            <Text style={styles.emptyTitle}>Yükleniyor...</Text>
          </View>
        ) : watches.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>Henüz takipte ürün yok</Text>
            <Text style={styles.emptySubtitle}>
              Beğendiğin ürünlerin yanındaki çana dokun, fiyat düşünce ilk sen bil.
            </Text>
          </View>
        ) : (
          watches.map(watch => (
            <WatchCard
              key={watch.id}
              watch={watch}
              onRemove={() => removeMutation.mutate(watch.productId)}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontFamily: Fonts.uiMedium, fontSize: 10 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14,
  },
  headerTitle: { fontFamily: Fonts.editorial, fontSize: 34, color: Colors.text1 },
  headerCount: { fontFamily: Fonts.uiLight, fontSize: 13, color: Colors.text4 },

  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, marginBottom: 14,
  },
  filterChip: {
    flex: 1, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface2,
    borderWidth: 0.5, borderColor: Colors.border2,
    overflow: 'hidden',
  },
  filterChipActive: { borderColor: Colors.borderBurgund },
  filterLabel: { fontFamily: Fonts.uiMedium, fontSize: 11, color: Colors.text3 },
  filterLabelActive: { color: '#fff' },

  content: { paddingHorizontal: 16, gap: 10 },

  card: {
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 0.5, borderColor: Colors.border2,
    position: 'relative',
  },
  cardAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: Colors.rose3, opacity: 0.7,
  },
  cardContent: {
    flexDirection: 'row', gap: 10, padding: 12, paddingLeft: 15,
  },
  cardImage: {
    width: 76, height: 76, borderRadius: 10,
    backgroundColor: Colors.surface3,
  },
  cardInfo: { flex: 1, gap: 4 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  brandLogo: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.surface3 },
  brandName: { fontFamily: Fonts.uiMedium, fontSize: 10, color: Colors.text4, flex: 1 },
  productName: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.text1, lineHeight: 17 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currentPrice: { fontFamily: Fonts.ui, fontSize: 15, color: Colors.rose3 },
  initialPrice: { fontFamily: Fonts.uiLight, fontSize: 12, color: Colors.text4, textDecorationLine: 'line-through' },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cardActions: { justifyContent: 'space-between', alignItems: 'flex-end', paddingVertical: 2 },
  buyBtn: {
    width: 40, height: 40, borderRadius: 10,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  buyBtnText: { fontFamily: Fonts.ui, fontSize: 11, color: '#fff' },
  removeBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.surface3,
    alignItems: 'center', justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 64, paddingHorizontal: 40, gap: 10 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontFamily: Fonts.displayBold, fontSize: 18, color: Colors.text2, textAlign: 'center' },
  emptySubtitle: { fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text4, textAlign: 'center', lineHeight: 20 },
});
