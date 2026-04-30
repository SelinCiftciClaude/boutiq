import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { CATEGORIES } from '@/constants/MockData';
import { ProductCard } from '@/components/ProductCard';
import { useProducts } from '@/hooks/useProducts';
import { useSavedProducts } from '@/hooks/useSavedProducts';

const PRICE_FILTERS = [
  { label: 'Tümü', min: 0, max: Infinity },
  { label: '0–500 ₺', min: 0, max: 500 },
  { label: '500–2K ₺', min: 500, max: 2000 },
  { label: '2K–5K ₺', min: 2000, max: 5000 },
  { label: '5K+ ₺', min: 5000, max: Infinity },
];

export default function AllProductsScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceIdx, setPriceIdx] = useState(0);

  const { data: products = [] } = useProducts();
  const { remove: unsave } = useSavedProducts();

  const priceFilter = PRICE_FILTERS[priceIdx];

  const filtered = products.filter(p => {
    const matchQ = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.brandName.toLowerCase().includes(query.toLowerCase());
    const matchPrice = p.price >= priceFilter.min && p.price < priceFilter.max;
    // category chip matches brand category via brandId — approximation
    const matchCat = selectedCategory === 'all' || p.category.toLowerCase().includes(selectedCategory) || p.brandName.toLowerCase().includes(selectedCategory);
    return matchQ && matchPrice && matchCat;
  });

  const left = filtered.filter((_, i) => i % 2 === 0);
  const right = filtered.filter((_, i) => i % 2 === 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.surface3, Colors.bg]} style={StyleSheet.absoluteFill} locations={[0, 0.2]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text3} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerLabel}>TÜM ÜRÜNLER</Text>
          <Text style={styles.headerTitle}>{filtered.length} ürün</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={16} color={Colors.text4} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ürün veya butik ara..."
          placeholderTextColor={Colors.text5}
          value={query}
          onChangeText={setQuery}
          selectionColor={Colors.gold3}
        />
        {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={16} color={Colors.text4} /></TouchableOpacity>}
      </View>

      {/* Price filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        {PRICE_FILTERS.map((f, i) => (
          <TouchableOpacity
            key={f.label}
            onPress={() => { Haptics.selectionAsync(); setPriceIdx(i); }}
            style={[styles.chip, priceIdx === i && styles.chipActive]}
          >
            {priceIdx === i && <LinearGradient colors={[Colors.gold2, Colors.gold4]} style={StyleSheet.absoluteFill} />}
            <Text style={[styles.chipLabel, priceIdx === i && styles.chipLabelActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛍️</Text>
          <Text style={styles.emptyTitle}>Ürün bulunamadı</Text>
          <Text style={styles.emptySub}>Filtreleri değiştirmeyi dene.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.masonry}>
          <View style={styles.grid}>
            <View style={styles.col}>
              {left.map((p, i) => (
                <ProductCard key={p.id} product={p} tall={i % 3 === 1}
                  onUnsave={() => unsave.mutate(p.id)} />
              ))}
            </View>
            <View style={[styles.col, styles.colOffset]}>
              {right.map((p, i) => (
                <ProductCard key={p.id} product={p} tall={i % 3 === 0}
                  onUnsave={() => unsave.mutate(p.id)} />
              ))}
            </View>
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border2 },
  headerText: { gap: 1 },
  headerLabel: { fontSize: 10, fontWeight: '700', color: Colors.gold3, letterSpacing: 2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, backgroundColor: Colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: Colors.border2, paddingHorizontal: 14, height: 44, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text1 },
  filterScroll: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2, overflow: 'hidden' },
  chipActive: { borderColor: Colors.gold3 },
  chipLabel: { fontSize: 12, fontWeight: '600', color: Colors.text3 },
  chipLabelActive: { color: Colors.bg, fontWeight: '700' },
  masonry: { paddingHorizontal: 16 },
  grid: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  colOffset: { marginTop: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text2 },
  emptySub: { fontSize: 14, color: Colors.text4 },
});
