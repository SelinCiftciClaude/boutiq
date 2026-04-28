import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Image, Keyboard, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { CATEGORIES } from '../../constants/MockData';
import { BrandCard } from '../../components/BrandCard';
import { BrandCategory, Brand } from '../../types';
import { router } from 'expo-router';
import { useBrands } from '@/hooks/useBrands';
import { useSavedBrands } from '@/hooks/useSavedBrands';
import { supabase } from '@/services/supabase';
import { useQueryClient } from '@tanstack/react-query';

// ─── Debounce hook ────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

// ─── Öneri tipi ───────────────────────────────────────────────────────────
interface SuggestionItem {
  id: string;
  name: string;
  domain: string;
  logo: string;
  isInDb: boolean;
  dbBrand?: Brand;
}

// ─── Inline arama sonuç satırı ────────────────────────────────────────────
function SuggestionRow({
  item,
  savedBrandIds,
  onAdd,
}: {
  item: SuggestionItem;
  savedBrandIds: Set<string>;
  onAdd: (item: SuggestionItem, category: BrandCategory) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BrandCategory>('giyim');
  const [adding, setAdding] = useState(false);

  const alreadySaved = item.isInDb && item.dbBrand && savedBrandIds.has(item.dbBrand.id);

  const handleAdd = async () => {
    setAdding(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await onAdd(item, selectedCategory);
      setExpanded(false);
    } catch (e: any) {
      Alert.alert('Hata', e.message ?? 'Eklenemedi.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={sr.wrap}>
      {/* Ana satır */}
      <TouchableOpacity
        style={[sr.row, expanded && sr.rowExpanded]}
        onPress={() => { if (!alreadySaved) { Haptics.selectionAsync(); setExpanded(v => !v); } }}
        activeOpacity={0.75}
      >
        <View style={sr.logoWrap}>
          <Image source={{ uri: item.logo }} style={sr.logo} />
        </View>
        <View style={sr.info}>
          <Text style={sr.name} numberOfLines={1}>{item.name}</Text>
          <Text style={sr.domain} numberOfLines={1}>{item.domain}</Text>
        </View>
        {alreadySaved ? (
          <View style={sr.savedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={sr.savedText}>Eklendi</Text>
          </View>
        ) : (
          <View style={[sr.plusBtn, expanded && sr.plusBtnActive]}>
            <Ionicons name={expanded ? 'chevron-up' : 'add'} size={18} color={expanded ? Colors.gold3 : Colors.text3} />
          </View>
        )}
      </TouchableOpacity>

      {/* Kategori seçici */}
      {expanded && !alreadySaved && (
        <View style={sr.panel}>
          <Text style={sr.panelLabel}>Kategori seç</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sr.catScroll}>
            {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[sr.chip, active && sr.chipActive]}
                  onPress={() => { Haptics.selectionAsync(); setSelectedCategory(cat.id as BrandCategory); }}
                >
                  {active && <LinearGradient colors={[Colors.gold2, Colors.gold4]} style={StyleSheet.absoluteFill} />}
                  <Text style={sr.chipIcon}>{cat.icon}</Text>
                  <Text style={[sr.chipLabel, active && sr.chipLabelActive]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={sr.addBtn} onPress={handleAdd} disabled={adding} activeOpacity={0.85}>
            <LinearGradient colors={[Colors.gold2, Colors.gold4]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            {adding
              ? <ActivityIndicator color={Colors.bg} size="small" />
              : <><Ionicons name="add-circle" size={17} color={Colors.bg} /><Text style={sr.addBtnText}>Koleksiyona Ekle</Text></>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const sr = StyleSheet.create({
  wrap: { marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface2, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border2,
  },
  rowExpanded: { borderColor: Colors.gold3, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0 },
  logoWrap: { width: 42, height: 42, borderRadius: 10, backgroundColor: Colors.surface3, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border2 },
  logo: { width: 42, height: 42, resizeMode: 'contain' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.text1 },
  domain: { fontSize: 12, color: Colors.text4, marginTop: 2 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedText: { fontSize: 12, fontWeight: '600', color: Colors.success },
  plusBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.surface3, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border2,
  },
  plusBtnActive: { borderColor: Colors.gold3, backgroundColor: Colors.glassGold },
  panel: {
    backgroundColor: Colors.surface2, borderWidth: 1, borderTopWidth: 0,
    borderColor: Colors.gold3, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: 14,
  },
  panelLabel: { fontSize: 11, fontWeight: '700', color: Colors.text4, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  catScroll: { gap: 8, marginBottom: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50,
    backgroundColor: Colors.surface3, borderWidth: 1, borderColor: Colors.border2, overflow: 'hidden',
  },
  chipActive: { borderColor: Colors.gold3 },
  chipIcon: { fontSize: 13 },
  chipLabel: { fontSize: 12, fontWeight: '600', color: Colors.text3 },
  chipLabelActive: { color: Colors.bg, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 46, borderRadius: 14, overflow: 'hidden',
  },
  addBtnText: { fontSize: 14, fontWeight: '800', color: Colors.bg },
});

// ─── Ana Ekran ────────────────────────────────────────────────────────────
export default function BrandsScreen() {
  const insets = useSafeAreaInsets();
  const { data: brands = [] } = useBrands();
  const savedBrands = useSavedBrands();
  const qc = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [collectionSearch, setCollectionSearch] = useState('');
  const [showCollectionSearch, setShowCollectionSearch] = useState(false);

  // URL arama state
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 400);

  const savedBrandIds = new Set(savedBrands.data?.map(b => b.id) ?? []);

  const annotated = brands.map(b => ({ ...b, isFavorite: savedBrands.isSaved(b.id) }));
  const filtered = annotated.filter(b => {
    const matchCat = selectedCategory === 'all' || b.category === selectedCategory;
    const matchSearch = !collectionSearch || b.name.toLowerCase().includes(collectionSearch.toLowerCase());
    return matchCat && matchSearch;
  });
  const favorites = filtered.filter(b => b.isFavorite);
  const others = filtered.filter(b => !b.isFavorite);

  // Akıllı arama: Clearbit + domain tahmini + Google favicon
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setSuggestions([]); return;
    }
    const q = debouncedQuery.toLowerCase().trim();
    setSearchLoading(true);

    // Google favicon ile logo URL üret (domain yoksa globe ikonu döner — yine de gösteririz)
    const favicon = (domain: string) =>
      `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

    // Yerel koleksiyondan eşleşmeler
    const dbMatches: SuggestionItem[] = brands
      .filter(b => b.name.toLowerCase().includes(q) || b.handle?.toLowerCase().includes(q))
      .slice(0, 2)
      .map(b => ({
        id: b.id, name: b.name,
        domain: b.website?.replace(/^https?:\/\//, '').split('/')[0] ?? '',
        logo: b.logo || favicon(b.website?.replace(/^https?:\/\//, '').split('/')[0] ?? ''),
        isInDb: true, dbBrand: b,
      }));

    // Kullanıcı direkt domain yazdıysa (nokta var)
    if (q.includes('.')) {
      const domain = q.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      const name = domain.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const direct: SuggestionItem = { id: domain, name, domain, logo: favicon(domain), isInDb: false };
      const dbDomains = new Set(dbMatches.map(d => d.domain));
      if (!dbDomains.has(domain)) setSuggestions([direct, ...dbMatches]);
      else setSuggestions(dbMatches);
      setSearchLoading(false);
      return;
    }

    // Marka adından olası domain'ler üret
    const slug = q.replace(/\s+/g, '');
    const domainCandidates = [
      `${slug}.com`,
      `${slug}.com.tr`,
      `${slug}.net`,
      `${slug}.net.tr`,
      `${slug}.store`,
    ];

    const namePretty = q.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const guessed: SuggestionItem[] = domainCandidates.map(domain => ({
      id: domain, name: namePretty, domain, logo: favicon(domain), isInDb: false,
    }));

    // Clearbit paralelde dene (büyük markalar için)
    fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then((data: any[]) => {
        const clearbit: SuggestionItem[] = (data ?? []).slice(0, 3).map(s => ({
          id: s.domain, name: s.name, domain: s.domain,
          logo: s.logo ?? favicon(s.domain),
          isInDb: false,
        }));
        const allDomains = new Set([...dbMatches.map(d => d.domain), ...clearbit.map(d => d.domain)]);
        const extra = guessed.filter(g => !allDomains.has(g.domain));
        setSuggestions([...dbMatches, ...clearbit, ...extra].slice(0, 8));
      })
      .catch(() => {
        const dbDomains = new Set(dbMatches.map(d => d.domain));
        setSuggestions([...dbMatches, ...guessed.filter(g => !dbDomains.has(g.domain))].slice(0, 7));
      })
      .finally(() => setSearchLoading(false));
  }, [debouncedQuery, brands]);

  const handleAddExisting = useCallback(async (brand: Brand, category: BrandCategory) => {
    await savedBrands.add.mutateAsync({ brandId: brand.id, isFavorite: false });
    qc.invalidateQueries({ queryKey: ['brands'] });
  }, [savedBrands, qc]);

  const handleAddNew = useCallback(async (item: SuggestionItem, category: BrandCategory) => {
    const website = `https://${item.domain}`;

    // Microlink ile gerçek logo, kapak ve açıklamayı çek
    let logoUrl  = item.logo;
    let coverUrl = '';
    let description = '';
    let brandName = item.name;
    try {
      const meta = await fetch(
        `https://api.microlink.io/?url=${encodeURIComponent(website)}&screenshot=false`
      ).then(r => r.json());
      if (meta.status === 'success') {
        brandName   = meta.data.title?.split('|')[0]?.trim() || item.name;
        description = meta.data.description ?? '';
        logoUrl     = meta.data.logo?.url   || item.logo;
        coverUrl    = meta.data.image?.url  || '';
      }
    } catch { /* metadata alınamazsa Google favicon'la devam */ }

    const { data, error } = await supabase.from('brands').insert({
      name: brandName,
      handle: `@${item.domain.split('.')[0]}`,
      category,
      website,
      affiliate_url: website,
      logo_url: logoUrl,
      cover_url: coverUrl,
      description,
      tags: [],
      is_verified: false,
    }).select('id').single();
    if (error) throw error;
    if (data?.id) await savedBrands.add.mutateAsync({ brandId: data.id, isFavorite: false });
    qc.invalidateQueries({ queryKey: ['brands'] });
    setQuery('');
    setSuggestions([]);
    Keyboard.dismiss();
  }, [savedBrands, qc]);

  const handleAdd = async (item: SuggestionItem, category: BrandCategory) => {
    if (item.isInDb && item.dbBrand) await handleAddExisting(item.dbBrand, category);
    else await handleAddNew(item, category);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inner, { paddingTop: insets.top }]}>
        <View style={styles.bgGlow} />

        {/* Header — sadece başlık + koleksiyon arama */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Butiklerim</Text>
          <TouchableOpacity
            onPress={() => { setShowCollectionSearch(v => !v); setCollectionSearch(''); }}
            style={styles.searchIconBtn}
          >
            <Ionicons name={showCollectionSearch ? 'close' : 'search'} size={20} color={Colors.text2} />
          </TouchableOpacity>
        </View>

        {/* Koleksiyon içi arama */}
        {showCollectionSearch && (
          <View style={styles.collectionSearch}>
            <Ionicons name="search" size={15} color={Colors.text4} />
            <TextInput
              style={styles.collectionInput}
              placeholder="Koleksiyonda ara..."
              placeholderTextColor={Colors.text5}
              value={collectionSearch}
              onChangeText={setCollectionSearch}
              autoFocus
              selectionColor={Colors.gold3}
            />
          </View>
        )}

        {/* ── URL/Marka arama çubuğu ── */}
        <View style={styles.urlBarWrap}>
          <View style={styles.urlBar}>
            <Ionicons name="globe-outline" size={18} color={query.length > 0 ? Colors.gold3 : Colors.text4} />
            <TextInput
              style={styles.urlInput}
              placeholder="Butik veya site adı yaz... (ör. lessandromance)"
              placeholderTextColor={Colors.text5}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={Colors.gold3}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setSuggestions([]); }}>
                <Ionicons name="close-circle" size={17} color={Colors.text4} />
              </TouchableOpacity>
            )}
          </View>

          {/* Sonuçlar */}
          {searchLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={Colors.gold3} size="small" />
              <Text style={styles.loadingText}>Aranıyor...</Text>
            </View>
          )}
          {!searchLoading && query.length >= 2 && suggestions.length === 0 && (
            <Text style={styles.noResult}>Sonuç bulunamadı, farklı bir isim dene.</Text>
          )}
          {suggestions.map(item => (
            <SuggestionRow
              key={item.id}
              item={item}
              savedBrandIds={savedBrandIds}
              onAdd={handleAdd}
            />
          ))}
        </View>

        {/* Stats — sadece Toplam */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{brands.length}</Text>
            <Text style={styles.statLabel}>Toplam Butik</Text>
          </View>
        </View>

        {/* Kategori filtresi */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORIES.map(cat => {
            const active = selectedCategory === cat.id;
            const count = cat.id === 'all' ? brands.length : brands.filter(b => b.category === cat.id).length;
            if (cat.id !== 'all' && count === 0) return null;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => { Haptics.selectionAsync(); setSelectedCategory(cat.id); }}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                {active && <LinearGradient colors={[Colors.gold2, Colors.gold4]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />}
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{cat.icon} {cat.label}</Text>
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Butik listesi */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {favorites.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="heart" size={14} color="#F43F5E" />
                <Text style={styles.sectionTitle}>Favoriler</Text>
              </View>
              {favorites.map(brand => (
                <BrandCard key={brand.id} brand={brand} variant="horizontal"
                  onPress={b => router.push(`/brand/${b.id}` as any)} />
              ))}
            </View>
          )}
          {others.length > 0 && (
            <View style={styles.section}>
              {favorites.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Ionicons name="storefront-outline" size={14} color={Colors.text4} />
                  <Text style={styles.sectionTitle}>Diğer Butikler</Text>
                </View>
              )}
              {others.map(brand => (
                <BrandCard key={brand.id} brand={brand} variant="horizontal"
                  onPress={b => router.push(`/brand/${b.id}` as any)} />
              ))}
            </View>
          )}
          {filtered.length === 0 && !collectionSearch && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏪</Text>
              <Text style={styles.emptyTitle}>Koleksiyon boş</Text>
              <Text style={styles.emptySubtitle}>Yukarıdaki arama çubuğundan butik ekle.</Text>
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { flex: 1 },
  bgGlow: { position: 'absolute', top: 50, left: -150, width: 350, height: 350, borderRadius: 175, backgroundColor: Colors.goldGlow, opacity: 0.3 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.text1, letterSpacing: -1 },
  searchIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border2 },

  // Koleksiyon arama
  collectionSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, backgroundColor: Colors.surface2, borderRadius: 14, borderWidth: 1, borderColor: Colors.border2, paddingHorizontal: 14, height: 44, marginBottom: 10 },
  collectionInput: { flex: 1, fontSize: 14, color: Colors.text1 },

  // URL arama çubuğu
  urlBarWrap: { marginHorizontal: 20, marginBottom: 14 },
  urlBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface2, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.borderGold,
    paddingHorizontal: 14, height: 52,
  },
  urlInput: { flex: 1, fontSize: 14, color: Colors.text1, fontWeight: '500' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  loadingText: { fontSize: 13, color: Colors.text4 },
  noResult: { fontSize: 13, color: Colors.text4, paddingVertical: 10, textAlign: 'center' },

  // Stats
  statsRow: { marginHorizontal: 20, backgroundColor: Colors.surface2, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20, borderWidth: 1, borderColor: Colors.border1, marginBottom: 14, alignItems: 'center' },
  stat: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 24, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '600', color: Colors.text4, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Kategori
  categoryScroll: { paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2, overflow: 'hidden' },
  filterChipActive: { borderColor: Colors.gold3 },
  filterLabel: { fontSize: 13, fontWeight: '600', color: Colors.text3 },
  filterLabelActive: { color: Colors.bg, fontWeight: '700' },
  filterCount: { backgroundColor: Colors.surface4, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  filterCountActive: { backgroundColor: 'rgba(7,7,15,0.30)' },
  filterCountText: { fontSize: 10, fontWeight: '700', color: Colors.text4 },
  filterCountTextActive: { color: Colors.bg },

  // Liste
  scrollContent: { paddingHorizontal: 16, gap: 10 },
  section: { gap: 10, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text3, letterSpacing: 0.3, textTransform: 'uppercase' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text2, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: Colors.text4, textAlign: 'center', lineHeight: 20 },
});
