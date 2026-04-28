import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, ActivityIndicator, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { ProductCard } from '../../components/ProductCard';
import { BrandCard } from '../../components/BrandCard';
import { Product } from '../../types';
import { useSavedProducts } from '@/hooks/useSavedProducts';
import { useSavedBrands } from '@/hooks/useSavedBrands';
import { useShipments } from '@/hooks/useShipments';
import { supabase } from '@/services/supabase';
import { fromDbProduct } from '@/services/mappers';
import { useAuth } from '@/context/AuthContext';

// ─── Sekmeler ─────────────────────────────────────────────────────────────
type Tab = 'favorites' | 'history' | 'reorder' | 'collections';

const TABS: { id: Tab; label: string; emoji: string; color: string; bg: string }[] = [
  { id: 'favorites',    label: 'Favorilerim',         emoji: '❤️', color: Colors.rose3,   bg: Colors.roseGlow },
  { id: 'history',     label: 'Önceden Gezdiklerim', emoji: '🕐', color: Colors.gold3,   bg: Colors.glassGold },
  { id: 'reorder',     label: 'Tekrar Satın Al',      emoji: '🔄', color: Colors.purple3, bg: Colors.purpleGlow },
  { id: 'collections', label: 'Koleksiyonlar',        emoji: '⭐', color: Colors.info,    bg: 'rgba(59,130,246,0.12)' },
];

// ─── Boş durum ────────────────────────────────────────────────────────────
function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

// ─── Masonry grid ──────────────────────────────────────────────────────────
function MasonryGrid({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  const left  = products.filter((_, i) => i % 2 === 0);
  const right = products.filter((_, i) => i % 2 === 1);
  return (
    <View style={styles.masonryGrid}>
      <View style={styles.productCol}>
        {left.map((p, i) => <ProductCard key={p.id} product={p} tall={i % 3 === 1} />)}
      </View>
      <View style={[styles.productCol, styles.productColOffset]}>
        {right.map((p, i) => <ProductCard key={p.id} product={p} tall={i % 3 === 0} />)}
      </View>
    </View>
  );
}

// ─── Ana ekran ─────────────────────────────────────────────────────────────
export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('favorites');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterSale, setFilterSale] = useState(false);
  const [filterFlash, setFilterFlash] = useState(false);
  const [sortIndex, setSortIndex] = useState(0);
  const [showSort, setShowSort] = useState(false);
  const [viewMode, setViewMode] = useState<'masonry' | 'list'>('masonry');

  // Veri kaynakları
  const { data: savedProducts = [] } = useSavedProducts();
  const { data: savedBrands = [] } = useSavedBrands();
  const { data: shipments = [] } = useShipments();

  // Görüntüleme geçmişi
  const [historyProducts, setHistoryProducts] = useState<Product[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'history' || !user) return;
    setHistoryLoading(true);
    AsyncStorage.getItem('viewHistory').then(async raw => {
      const ids: string[] = raw ? JSON.parse(raw) : [];
      if (ids.length === 0) { setHistoryProducts([]); setHistoryLoading(false); return; }
      const { data } = await supabase
        .from('products')
        .select('*, brands(name, logo_url)')
        .in('id', ids.slice(0, 30));
      const ordered = ids
        .map(id => (data ?? []).find((p: any) => p.id === id))
        .filter(Boolean)
        .map((p: any) => fromDbProduct(p, p.brands));
      setHistoryProducts(ordered);
    }).finally(() => setHistoryLoading(false));
  }, [activeTab, user]);

  // Tekrar satın al: kargo ürünleri
  const reorderItems = shipments.flatMap(s =>
    (s.products ?? []).map((p, i) => ({ ...p, id: `${s.id}-${i}`, brandName: s.brandName, brandLogo: s.brandLogo }))
  );

  // Favorilerim için filtre + sıralama
  const baseProducts = savedProducts
    .filter(p => !filterSale || p.isOnSale)
    .filter(p => !filterFlash || (p.originalPrice && p.price < p.originalPrice * 0.7))
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brandName.toLowerCase().includes(searchQuery.toLowerCase()));

  const displayProducts = [...baseProducts].sort((a, b) => {
    if (sortIndex === 1) return a.price - b.price;
    if (sortIndex === 2) return b.price - a.price;
    return 0;
  });

  const onSaleCount = savedProducts.filter(p => p.isOnSale).length;
  const flashCount  = savedProducts.filter(p => p.originalPrice && p.price < p.originalPrice * 0.7).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bgGlow} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favoriler</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => { setViewMode(v => v === 'masonry' ? 'list' : 'masonry'); Haptics.selectionAsync(); }}
            style={styles.iconBtn}
          >
            <Ionicons name={viewMode === 'masonry' ? 'list-outline' : 'grid-outline'} size={18} color={Colors.text2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowSort(s => !s); Haptics.selectionAsync(); }} style={styles.iconBtn}>
            <Ionicons name="funnel-outline" size={17} color={Colors.text2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Sekme kartları ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => { Haptics.selectionAsync(); setActiveTab(tab.id); setShowSearch(false); setSearchQuery(''); }}
              style={[styles.tabCard, active && { backgroundColor: tab.color }]}
              activeOpacity={0.8}
            >
              {active && <LinearGradient colors={[tab.color, tab.color + 'CC']} style={StyleSheet.absoluteFill} />}
              <View style={[styles.tabIconWrap, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : tab.bg }]}>
                <Text style={styles.tabEmoji}>{tab.emoji}</Text>
              </View>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Filtre çipleri (sadece Favorilerim sekmesinde) ── */}
      {activeTab === 'favorites' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Ara */}
          <TouchableOpacity
            onPress={() => { setShowSearch(s => !s); Haptics.selectionAsync(); }}
            style={[styles.filterChip, showSearch && styles.filterChipActive]}
          >
            {showSearch && <LinearGradient colors={[Colors.rose2, Colors.rose4]} style={StyleSheet.absoluteFill} />}
            <Ionicons name="search" size={14} color={showSearch ? '#fff' : Colors.text3} />
            <Text style={[styles.filterLabel, showSearch && styles.filterLabelActive]}>Ara</Text>
          </TouchableOpacity>

          {/* Fiyatı Düşenler */}
          <TouchableOpacity
            onPress={() => { setFilterSale(s => !s); setFilterFlash(false); Haptics.selectionAsync(); }}
            style={[styles.filterChip, filterSale && styles.filterChipActive]}
          >
            {filterSale && <LinearGradient colors={[Colors.rose2, Colors.rose4]} style={StyleSheet.absoluteFill} />}
            <Text style={styles.filterEmoji}>📉</Text>
            <Text style={[styles.filterLabel, filterSale && styles.filterLabelActive]}>
              Fiyatı Düşenler {onSaleCount > 0 ? `(${onSaleCount})` : ''}
            </Text>
          </TouchableOpacity>

          {/* Flaş Ürünler */}
          <TouchableOpacity
            onPress={() => { setFilterFlash(s => !s); setFilterSale(false); Haptics.selectionAsync(); }}
            style={[styles.filterChip, filterFlash && styles.filterChipActive]}
          >
            {filterFlash && <LinearGradient colors={[Colors.rose2, Colors.rose4]} style={StyleSheet.absoluteFill} />}
            <Text style={styles.filterEmoji}>⚡</Text>
            <Text style={[styles.filterLabel, filterFlash && styles.filterLabelActive]}>
              Flaş Ürünler {flashCount > 0 ? `(${flashCount})` : ''}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Arama kutusu */}
      {showSearch && activeTab === 'favorites' && (
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={Colors.text4} />
          <TextInput
            style={styles.searchInput}
            placeholder="Ürün veya marka adı..."
            placeholderTextColor={Colors.text5}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            selectionColor={Colors.gold3}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={Colors.text4} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Sıralama menüsü */}
      {showSort && (
        <View style={styles.sortMenu}>
          <LinearGradient colors={[Colors.surface2, Colors.surface3]} style={StyleSheet.absoluteFill} />
          {['Son Kaydedilen', 'Fiyat Az→Çok', 'Fiyat Çok→Az'].map((opt, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => { setSortIndex(i); setShowSort(false); Haptics.selectionAsync(); }}
              style={[styles.sortOption, i === sortIndex && styles.sortOptionActive]}
            >
              <Text style={[styles.sortText, i === sortIndex && styles.sortTextActive]}>{opt}</Text>
              {i === sortIndex && <Ionicons name="checkmark" size={14} color={Colors.gold3} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── İçerik ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* FAVORİLERİM */}
        {activeTab === 'favorites' && (
          displayProducts.length === 0
            ? <EmptyState icon="🤍" title="Henüz ürün kaydetmedin" subtitle="Beğendiğin ürünlere ❤️ basarak buraya ekle." />
            : viewMode === 'masonry'
              ? <MasonryGrid products={displayProducts} />
              : displayProducts.map(p => <ProductListRow key={p.id} product={p} />)
        )}

        {/* ÖNCEDEN GEZDİKLERİM */}
        {activeTab === 'history' && (
          historyLoading
            ? <ActivityIndicator color={Colors.gold3} style={{ marginTop: 48 }} />
            : historyProducts.length === 0
              ? <EmptyState icon="🕐" title="Geçmiş boş" subtitle="Ürünlere baktıkça burada görünür." />
              : <MasonryGrid products={historyProducts} />
        )}

        {/* TEKRAR SATIN AL */}
        {activeTab === 'reorder' && (
          reorderItems.length === 0
            ? <EmptyState icon="🔄" title="Sipariş geçmişi yok" subtitle="Kargo takibine sipariş ekledikçe burada görünür." />
            : <View style={styles.reorderList}>
                {reorderItems.map((item, i) => (
                  <View key={i} style={styles.reorderCard}>
                    <LinearGradient colors={[Colors.surface2, Colors.surface1]} style={StyleSheet.absoluteFill} />
                    {item.image
                      ? <Image source={{ uri: item.image }} style={styles.reorderImg} />
                      : <View style={[styles.reorderImg, { backgroundColor: Colors.surface3, alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="image-outline" size={20} color={Colors.text5} />
                        </View>}
                    <View style={styles.reorderInfo}>
                      <Text style={styles.reorderName} numberOfLines={2}>{item.name}</Text>
                      <View style={styles.reorderBrand}>
                        {item.brandLogo ? <Image source={{ uri: item.brandLogo }} style={styles.reorderLogo} /> : null}
                        <Text style={styles.reorderBrandName}>{item.brandName}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
        )}

        {/* KOLEKSİYONLAR */}
        {activeTab === 'collections' && (
          savedBrands.length === 0
            ? <EmptyState icon="⭐" title="Koleksiyon boş" subtitle="Butikler sekmesinden marka ekle." />
            : <View style={styles.collectionList}>
                {savedBrands.map(brand => (
                  <BrandCard
                    key={brand.id}
                    brand={brand}
                    variant="horizontal"
                    onPress={b => router.push(`/brand/${b.id}` as any)}
                  />
                ))}
              </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ─── Liste satırı (list view) ─────────────────────────────────────────────
function ProductListRow({ product }: { product: Product }) {
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  return (
    <TouchableOpacity style={listRow.card} onPress={() => router.push(`/product/${product.id}` as any)} activeOpacity={0.85}>
      <Image source={{ uri: product.image }} style={listRow.img} />
      <View style={listRow.info}>
        <Text style={listRow.brand}>{product.brandName}</Text>
        <Text style={listRow.name} numberOfLines={2}>{product.name}</Text>
        <View style={listRow.priceRow}>
          <Text style={listRow.price}>₺{product.price.toLocaleString('tr-TR')}</Text>
          {product.originalPrice && (
            <Text style={listRow.orig}>₺{product.originalPrice.toLocaleString('tr-TR')}</Text>
          )}
          {discount > 0 && (
            <View style={listRow.badge}><Text style={listRow.badgeText}>-%{discount}</Text></View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
const listRow = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, backgroundColor: Colors.surface2, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: Colors.border1, marginBottom: 10 },
  img: { width: 80, height: 80, borderRadius: 12, backgroundColor: Colors.surface3 },
  info: { flex: 1, gap: 4 },
  brand: { fontSize: 11, fontWeight: '600', color: Colors.text4 },
  name: { fontSize: 14, fontWeight: '600', color: Colors.text1, lineHeight: 18 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  price: { fontSize: 15, fontWeight: '800', color: Colors.gold3 },
  orig: { fontSize: 12, color: Colors.text5, textDecorationLine: 'line-through' },
  badge: { backgroundColor: Colors.roseGlow, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.rose3 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  bgGlow: { position: 'absolute', top: 100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: Colors.roseGlow, opacity: 0.35 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.text1, letterSpacing: -1 },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border2 },

  // Sekme kartları
  tabsScroll: { paddingHorizontal: 20, gap: 10, marginBottom: 14 },
  tabCard: {
    alignItems: 'center', gap: 8, padding: 14, paddingHorizontal: 16,
    borderRadius: 20, backgroundColor: Colors.surface2,
    borderWidth: 1, borderColor: Colors.border2,
    minWidth: 110, overflow: 'hidden',
  },
  tabIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tabEmoji: { fontSize: 22 },
  tabLabel: { fontSize: 11, fontWeight: '600', color: Colors.text3, textAlign: 'center' },
  tabLabelActive: { color: '#fff', fontWeight: '700' },

  // Filtre çipleri
  filterScroll: { paddingHorizontal: 20, gap: 8, marginBottom: 12 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2, overflow: 'hidden' },
  filterChipActive: { borderColor: Colors.rose3 },
  filterEmoji: { fontSize: 13 },
  filterLabel: { fontSize: 13, fontWeight: '600', color: Colors.text3 },
  filterLabelActive: { color: '#fff', fontWeight: '700' },

  // Arama
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, backgroundColor: Colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: Colors.border2, paddingHorizontal: 14, height: 46, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text1 },

  // Sıralama
  sortMenu: { position: 'absolute', top: 130, right: 20, zIndex: 100, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border2, minWidth: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 20 },
  sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border1 },
  sortOptionActive: { backgroundColor: Colors.glassGold },
  sortText: { fontSize: 14, color: Colors.text2, fontWeight: '500' },
  sortTextActive: { color: Colors.gold4, fontWeight: '700' },

  // İçerik
  content: { paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyIcon: { fontSize: 52, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text2, textAlign: 'center', letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 14, color: Colors.text4, textAlign: 'center', lineHeight: 20 },

  masonryGrid: { flexDirection: 'row', gap: 12 },
  productCol: { flex: 1 },
  productColOffset: { marginTop: 40 },

  // Tekrar satın al
  reorderList: { gap: 10 },
  reorderCard: { flexDirection: 'row', gap: 12, borderRadius: 16, padding: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border1 },
  reorderImg: { width: 70, height: 70, borderRadius: 12, backgroundColor: Colors.surface3 },
  reorderInfo: { flex: 1, gap: 6, justifyContent: 'center' },
  reorderName: { fontSize: 14, fontWeight: '600', color: Colors.text1, lineHeight: 18 },
  reorderBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reorderLogo: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.surface3 },
  reorderBrandName: { fontSize: 12, color: Colors.text4 },

  // Koleksiyonlar
  collectionList: { gap: 10 },
});
