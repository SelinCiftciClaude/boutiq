import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { ProductCard } from '../../components/ProductCard';
import { Badge } from '../../components/ui/Badge';
import { Product } from '../../types';
import { useSavedProducts } from '@/hooks/useSavedProducts';

const { width } = Dimensions.get('window');

const SORT_OPTIONS = ['Son Kaydedilen', 'Fiyat (Az→Çok)', 'Fiyat (Çok→Az)', 'İndirimli'];

type ViewMode = 'masonry' | 'list';

function SavedProductListItem({ product, onUnsave }: { product: Product; onUnsave: (id: string) => void }) {
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <View style={listStyles.card}>
      <Image source={{ uri: product.image }} style={listStyles.image} resizeMode="cover" />
      <View style={listStyles.info}>
        <View style={listStyles.brandRow}>
          <Image source={{ uri: product.brandLogo }} style={listStyles.brandLogo} />
          <Text style={listStyles.brandName}>{product.brandName}</Text>
          {!product.inStock && <Badge label="Tükendi" variant="neutral" />}
        </View>
        <Text style={listStyles.name} numberOfLines={2}>{product.name}</Text>
        <View style={listStyles.priceRow}>
          <Text style={listStyles.price}>₺{product.price.toLocaleString('tr-TR')}</Text>
          {product.originalPrice && (
            <>
              <Text style={listStyles.originalPrice}>
                ₺{product.originalPrice.toLocaleString('tr-TR')}
              </Text>
              <Badge label={`-%${discount}`} variant="sale" />
            </>
          )}
        </View>
        <Text style={listStyles.savedDate}>
          {product.savedAt ? `${product.savedAt} kaydedildi` : ''}
        </Text>
      </View>
      <View style={listStyles.actions}>
        <TouchableOpacity
          style={listStyles.actionBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onUnsave(product.id);
          }}
        >
          <Ionicons name="heart" size={18} color="#F43F5E" />
        </TouchableOpacity>
        <TouchableOpacity style={listStyles.actionBtn}>
          <Ionicons name="open-outline" size={16} color={Colors.text3} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const listStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface2,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border1,
    marginBottom: 12,
  },
  image: {
    width: 100,
    height: 120,
    backgroundColor: Colors.surface3,
  },
  info: {
    flex: 1,
    padding: 12,
    gap: 4,
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandLogo: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.surface3,
  },
  brandName: {
    fontSize: 11,
    color: Colors.text4,
    fontWeight: '600',
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text1,
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.gold4,
    letterSpacing: -0.3,
  },
  originalPrice: {
    fontSize: 12,
    color: Colors.text5,
    textDecorationLine: 'line-through',
  },
  savedDate: {
    fontSize: 10,
    color: Colors.text5,
  },
  actions: {
    paddingVertical: 12,
    paddingRight: 12,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border1,
  },
});

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>('masonry');
  const [sortIndex, setSortIndex] = useState(0);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [filterOnSale, setFilterOnSale] = useState(false);
  const { data: products = [], remove: unsaveMutation } = useSavedProducts();

  const displayProducts = filterOnSale
    ? products.filter((p) => p.isOnSale)
    : products;

  const handleUnsave = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    unsaveMutation.mutate(id);
  };

  const toggleViewMode = () => {
    Haptics.selectionAsync();
    setViewMode((v) => (v === 'masonry' ? 'list' : 'masonry'));
  };

  const savedBrands = [...new Set(displayProducts.map((p) => p.brandName))];
  const onSaleCount = displayProducts.filter((p) => p.isOnSale).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Background */}
      <View style={styles.bgGlow} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>KAYDEDİLENLER</Text>
          <Text style={styles.headerTitle}>Favori Ürünler</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleViewMode}
            style={styles.iconBtn}
          >
            <Ionicons
              name={viewMode === 'masonry' ? 'list-outline' : 'grid-outline'}
              size={20}
              color={Colors.text2}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowSortMenu((s) => !s)}
            style={styles.iconBtn}
          >
            <Ionicons name="funnel-outline" size={18} color={Colors.text2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{displayProducts.length}</Text>
          <Text style={styles.statLabel}>ürün</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{savedBrands.length}</Text>
          <Text style={styles.statLabel}>butik</Text>
        </View>
        <View style={styles.statDivider} />
        <TouchableOpacity
          style={[styles.statItem, filterOnSale && styles.statItemActive]}
          onPress={() => {
            Haptics.selectionAsync();
            setFilterOnSale((f) => !f);
          }}
        >
          <Text style={[styles.statValue, filterOnSale && { color: Colors.gold3 }]}>
            {onSaleCount}
          </Text>
          <Text style={[styles.statLabel, filterOnSale && { color: Colors.gold4 }]}>
            indirimli
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort menu dropdown */}
      {showSortMenu && (
        <View style={styles.sortMenu}>
          <LinearGradient
            colors={[Colors.surface2, Colors.surface3]}
            style={StyleSheet.absoluteFill}
          />
          {SORT_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                Haptics.selectionAsync();
                setSortIndex(i);
                setShowSortMenu(false);
              }}
              style={[styles.sortOption, i === sortIndex && styles.sortOptionActive]}
            >
              <Text style={[styles.sortText, i === sortIndex && styles.sortTextActive]}>
                {opt}
              </Text>
              {i === sortIndex && (
                <Ionicons name="checkmark" size={14} color={Colors.gold3} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Empty state */}
      {displayProducts.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🤍</Text>
          <Text style={styles.emptyTitle}>
            {filterOnSale ? 'İndirimli ürün yok' : 'Henüz ürün kaydetmedin'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {filterOnSale
              ? 'Filreyi kaldır veya başka ürünler keşfet.'
              : 'Instagram\'dan ya da Keşfet\'ten beğendiğin ürünleri buraya kaydet.'}
          </Text>
        </View>
      )}

      {/* Products */}
      {displayProducts.length > 0 && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {viewMode === 'list' ? (
            displayProducts.map((p) => (
              <SavedProductListItem key={p.id} product={p} onUnsave={handleUnsave} />
            ))
          ) : (
            <View style={styles.masonryGrid}>
              <View style={styles.productCol}>
                {displayProducts.filter((_, i) => i % 2 === 0).map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onUnsave={handleUnsave}
                    tall={i % 3 === 1}
                  />
                ))}
              </View>
              <View style={[styles.productCol, styles.productColOffset]}>
                {displayProducts.filter((_, i) => i % 2 === 1).map((p, i) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onUnsave={handleUnsave}
                    tall={i % 3 === 0}
                  />
                ))}
              </View>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  bgGlow: {
    position: 'absolute',
    top: 100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.roseGlow,
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gold3,
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text1,
    letterSpacing: -1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: Colors.surface2,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border1,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statItemActive: {},
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text1,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border2,
  },
  sortMenu: {
    position: 'absolute',
    top: 130,
    right: 20,
    zIndex: 100,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border2,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border1,
  },
  sortOptionActive: {
    backgroundColor: Colors.glassGold,
  },
  sortText: {
    fontSize: 14,
    color: Colors.text2,
    fontWeight: '500',
  },
  sortTextActive: {
    color: Colors.gold4,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text2,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text4,
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  masonryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  productCol: {
    flex: 1,
  },
  productColOffset: {
    marginTop: 40,
  },
});
