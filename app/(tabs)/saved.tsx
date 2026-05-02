import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { ProductCard } from '../../components/ProductCard';
import { Product } from '../../types';
import { useSavedProducts } from '@/hooks/useSavedProducts';
import { supabase } from '@/services/supabase';
import { fromDbProduct } from '@/services/mappers';
import { useAuth } from '@/context/AuthContext';

type Tab = 'favorites' | 'history' | 'sale';

const TABS: { id: Tab; label: string }[] = [
  { id: 'favorites', label: 'Favorilerim' },
  { id: 'history',   label: 'Önceden Gezdiklerim' },
  { id: 'sale',      label: 'Fiyatı Düşenler' },
];

function MasonryGrid({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <View style={styles.masonryGrid}>
      <View style={styles.col}>
        {products.filter((_, i) => i % 2 === 0).map((p, i) => (
          <ProductCard key={p.id} product={p} tall={i % 3 === 1} />
        ))}
      </View>
      <View style={[styles.col, styles.colOffset]}>
        {products.filter((_, i) => i % 2 === 1).map((p, i) => (
          <ProductCard key={p.id} product={p} tall={i % 3 === 0} />
        ))}
      </View>
    </View>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab]       = useState<Tab>('favorites');
  const [searchQuery, setSearchQuery]   = useState('');
  const [historyProducts, setHistory]   = useState<Product[]>([]);
  const [historyLoading, setHistLoad]   = useState(false);

  const { data: savedProducts = [] } = useSavedProducts();

  // Görüntüleme geçmişi
  useEffect(() => {
    if (activeTab !== 'history' || !user) return;
    setHistLoad(true);
    AsyncStorage.getItem('viewHistory')
      .then(async raw => {
        const ids: string[] = raw ? JSON.parse(raw) : [];
        if (!ids.length) { setHistory([]); return; }
        const { data } = await supabase
          .from('products')
          .select('*, brands(name, logo_url)')
          .in('id', ids.slice(0, 30));
        const ordered = ids
          .map(id => (data ?? []).find((p: any) => p.id === id))
          .filter(Boolean)
          .map((p: any) => fromDbProduct(p, p.brands));
        setHistory(ordered);
      })
      .catch(() => setHistory([]))
      .finally(() => setHistLoad(false));
  }, [activeTab, user]);

  const q = searchQuery.toLowerCase();

  const favProducts = savedProducts.filter(p =>
    !q || p.name.toLowerCase().includes(q) || p.brandName.toLowerCase().includes(q)
  );

  const histFiltered = historyProducts.filter(p =>
    !q || p.name.toLowerCase().includes(q) || p.brandName.toLowerCase().includes(q)
  );

  const saleProducts = savedProducts.filter(p => p.isOnSale || (p.originalPrice && p.price < p.originalPrice));

  const switchTab = (tab: Tab) => {
    Haptics.selectionAsync();
    setActiveTab(tab);
    setSearchQuery('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favoriler</Text>
      </View>

      {/* Arama barı — her zaman görünür, tam genişlik */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={17} color={Colors.text4} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ürün veya marka ara..."
          placeholderTextColor={Colors.text5}
          value={searchQuery}
          onChangeText={setSearchQuery}
          selectionColor={Colors.rose3}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={16} color={Colors.text4} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sekmeler */}
      <View style={styles.tabRow}>
        {TABS.map(tab => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => switchTab(tab.id)}
              style={[styles.tab, active && styles.tabActive]}
              activeOpacity={0.75}
            >
              {active && (
                <LinearGradient
                  colors={[Colors.rose2, Colors.rose3]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {tab.id === 'sale' && saleProducts.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{saleProducts.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* İçerik */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* FAVORİLERİM */}
        {activeTab === 'favorites' && (
          favProducts.length === 0
            ? <EmptyState icon="🤍" title="Henüz ürün kaydetmedin" subtitle="Beğendiğin ürünlere ❤️ basarak buraya ekle." />
            : <MasonryGrid products={favProducts} />
        )}

        {/* ÖNCEDEN GEZDİKLERİM */}
        {activeTab === 'history' && (
          historyLoading
            ? <ActivityIndicator color={Colors.rose3} style={{ marginTop: 48 }} />
            : histFiltered.length === 0
              ? <EmptyState icon="🕐" title="Geçmiş boş" subtitle="Ürünlere baktıkça burada görünür." />
              : <MasonryGrid products={histFiltered} />
        )}

        {/* FİYATI DÜŞENLER */}
        {activeTab === 'sale' && (
          saleProducts.length === 0
            ? <EmptyState icon="📉" title="Fiyatı düşen ürün yok" subtitle="Kayıtlı ürünlerin fiyatı düştüğünde burada görünür." />
            : <MasonryGrid products={saleProducts} />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: Fonts.editorial,
    fontSize: 34,
    color: Colors.text1,
  },

  // Arama barı
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: Colors.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text1,
  },

  // Sekmeler
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    backgroundColor: Colors.surface2,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    overflow: 'hidden',
    paddingHorizontal: 6,
  },
  tabActive: {
    borderColor: Colors.borderBurgund,
  },
  tabLabel: {
    fontFamily: Fonts.uiMedium,
    fontSize: 11,
    color: Colors.text3,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontFamily: Fonts.ui,
    fontSize: 9,
    color: '#fff',
  },

  // İçerik
  content: { paddingHorizontal: 16 },

  masonryGrid: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  colOffset: { paddingTop: 20 },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyIcon: { fontSize: 52, marginBottom: 8 },
  emptyTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.text2,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text4,
    textAlign: 'center',
    lineHeight: 20,
  },
});
