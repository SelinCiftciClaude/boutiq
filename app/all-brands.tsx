import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { CATEGORIES } from '@/constants/MockData';
import { BrandCard } from '@/components/BrandCard';
import { AddBrandSheet } from '@/components/AddBrandSheet';
import { useBrands } from '@/hooks/useBrands';
import { useSavedBrands } from '@/hooks/useSavedBrands';
import { Brand } from '@/types';

export default function AllBrandsScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [addSheet, setAddSheet] = useState<Brand | null>(null);

  const { data: brands = [] } = useBrands();
  const savedBrands = useSavedBrands();

  const filtered = brands.filter(b => {
    const matchCat = selectedCategory === 'all' || b.category === selectedCategory;
    const matchQ = !query || b.name.toLowerCase().includes(query.toLowerCase()) || b.tags.some(t => t.toLowerCase().includes(query.toLowerCase()));
    return matchCat && matchQ;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.surface3, Colors.bg]} style={StyleSheet.absoluteFill} locations={[0, 0.2]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text3} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerLabel}>TÜM BUTİKLER</Text>
          <Text style={styles.headerTitle}>{filtered.length} butik</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={16} color={Colors.text4} />
        <TextInput
          style={styles.searchInput}
          placeholder="Butik ara..."
          placeholderTextColor={Colors.text5}
          value={query}
          onChangeText={setQuery}
          selectionColor={Colors.gold3}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={16} color={Colors.text4} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
        {CATEGORIES.map(cat => {
          const active = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => { Haptics.selectionAsync(); setSelectedCategory(cat.id); }}
              style={[styles.chip, active && styles.chipActive]}
            >
              {active && <LinearGradient colors={[Colors.rose2, Colors.rose4]} style={StyleSheet.absoluteFill} />}
              <Text style={styles.chipIcon}>{cat.icon}</Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{cat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Grid */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyTitle}>Butik bulunamadı</Text>
          </View>
        ) : (
          <View style={styles.brandsGrid}>
            {filtered.map(b => (
              <BrandCard
                key={b.id} brand={b} variant="grid"
                onAdd={setAddSheet}
                onPress={brand => router.push(`/brand/${brand.id}` as any)}
                isSaved={savedBrands.isSaved(b.id)}
              />
            ))}
          </View>
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      <AddBrandSheet
        brand={addSheet} visible={!!addSheet}
        alreadySaved={addSheet ? savedBrands.isSaved(addSheet.id) : false}
        currentCategory={addSheet?.category}
        onSave={b => savedBrands.add.mutate({ brandId: b.id, isFavorite: true })}
        onRemove={id => savedBrands.remove.mutate(id)}
        onClose={() => setAddSheet(null)}
      />
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
  catScroll: { paddingHorizontal: 16, paddingRight: 16, gap: 8, marginBottom: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2, overflow: 'hidden' },
  chipActive: { borderColor: Colors.gold3 },
  chipIcon: { fontSize: 14 },
  chipLabel: { fontSize: 12, fontWeight: '600', color: Colors.text3 },
  chipLabelActive: { color: Colors.bg, fontWeight: '700' },
  grid: { paddingHorizontal: 16 },
  brandsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text2 },
});
