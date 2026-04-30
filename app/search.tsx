import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Image, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { searchBrandsAndProducts } from '@/services/queries';
import { useAuth } from '@/context/AuthContext';
import { Brand, Product } from '@/types';

const RECENT_KEY = 'boutiq_recent_searches_v1';
const MAX_RECENT = 6;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
    AsyncStorage.getItem(RECENT_KEY)
      .then(v => { if (v) setRecent(JSON.parse(v)); })
      .catch(() => {});
  }, []);

  const saveRecent = async (q: string) => {
    const updated = [q, ...recent.filter(r => r !== q)].slice(0, MAX_RECENT);
    setRecent(updated);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    const res = await searchBrandsAndProducts(q, user?.id);
    setBrands(res.brands);
    setProducts(res.products);
    setLoading(false);
    saveRecent(q.trim());
  };

  const clearRecent = async () => {
    setRecent([]);
    await AsyncStorage.removeItem(RECENT_KEY);
  };

  const totalResults = brands.length + products.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.surface3, Colors.bg]} style={StyleSheet.absoluteFill} locations={[0, 0.3]} />

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={18} color={Colors.text4} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Butik veya ürün ara..."
            placeholderTextColor={Colors.text5}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => doSearch(query)}
            selectionColor={Colors.gold3}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSearched(false); setBrands([]); setProducts([]); }}>
              <Ionicons name="close-circle" size={18} color={Colors.text4} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>İptal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {/* Loading */}
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={Colors.gold3} />
          </View>
        )}

        {/* Recent searches */}
        {!loading && !searched && recent.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Son Aramalar</Text>
              <TouchableOpacity onPress={clearRecent}>
                <Text style={styles.clearText}>Temizle</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.recentList}>
              {recent.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.recentItem}
                  onPress={() => { setQuery(r); doSearch(r); }}
                >
                  <Ionicons name="time-outline" size={16} color={Colors.text4} />
                  <Text style={styles.recentText}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* No results */}
        {!loading && searched && totalResults === 0 && (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
            <Text style={styles.emptySubtitle}>"{query}" için herhangi bir butik veya ürün bulunamadı.</Text>
          </View>
        )}

        {/* Brand results */}
        {!loading && brands.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Butikler ({brands.length})</Text>
            {brands.map(b => (
              <TouchableOpacity key={b.id} style={styles.brandRow} activeOpacity={0.8}>
                <Image source={{ uri: b.logo }} style={styles.brandLogo} />
                <View style={styles.brandInfo}>
                  <View style={styles.brandNameRow}>
                    <Text style={styles.brandName}>{b.name}</Text>
                    {b.isVerified && <Ionicons name="checkmark-circle" size={14} color={Colors.gold3} />}
                  </View>
                  <Text style={styles.brandMeta}>{b.category} · {b.productCount ?? 0} ürün</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.text5} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Product results */}
        {!loading && products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ürünler ({products.length})</Text>
            {products.map(p => (
              <TouchableOpacity key={p.id} style={styles.productRow} activeOpacity={0.8}>
                <Image source={{ uri: p.image }} style={styles.productImg} />
                <View style={styles.productInfo}>
                  <Text style={styles.productBrand}>{p.brandName}</Text>
                  <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>₺{p.price.toLocaleString('tr-TR')}</Text>
                    {p.originalPrice && (
                      <Text style={styles.originalPrice}>₺{p.originalPrice.toLocaleString('tr-TR')}</Text>
                    )}
                    {p.isOnSale && <Text style={styles.saleBadge}>İndirimli</Text>}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.text5} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 },
  inputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface2, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border2, paddingHorizontal: 14, height: 48,
  },
  searchIcon: {},
  input: { flex: 1, fontSize: 15, color: Colors.text1 },
  cancelBtn: { paddingVertical: 8 },
  cancelText: { fontSize: 15, color: Colors.gold3, fontWeight: '600' },
  scroll: { paddingHorizontal: 16 },
  center: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text2 },
  emptySubtitle: { fontSize: 14, color: Colors.text4, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },
  clearText: { fontSize: 13, color: Colors.gold3, fontWeight: '600' },
  recentList: { gap: 2 },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  recentText: { fontSize: 15, color: Colors.text2 },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: Colors.surface2, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border1, marginBottom: 8,
  },
  brandLogo: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface3 },
  brandInfo: { flex: 1 },
  brandNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brandName: { fontSize: 15, fontWeight: '700', color: Colors.text1 },
  brandMeta: { fontSize: 12, color: Colors.text4, marginTop: 2 },
  productRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: Colors.surface2, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border1, marginBottom: 8,
  },
  productImg: { width: 56, height: 64, borderRadius: 10, backgroundColor: Colors.surface3 },
  productInfo: { flex: 1, gap: 2 },
  productBrand: { fontSize: 11, color: Colors.text4, fontWeight: '600' },
  productName: { fontSize: 14, fontWeight: '600', color: Colors.text1 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  price: { fontSize: 14, fontWeight: '700', color: Colors.gold4 },
  originalPrice: { fontSize: 11, color: Colors.text5, textDecorationLine: 'line-through' },
  saleBadge: { fontSize: 10, fontWeight: '700', color: Colors.rose3, backgroundColor: Colors.roseGlow, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
});
