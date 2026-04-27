import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  FlatList,
  Keyboard,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { CATEGORIES } from '../../constants/MockData';
import { BrandCard } from '../../components/BrandCard';
import { Button } from '../../components/ui/Button';
import { BrandCategory, Brand } from '../../types';
import { router } from 'expo-router';
import { useBrands } from '@/hooks/useBrands';
import { useSavedBrands } from '@/hooks/useSavedBrands';
import { supabase } from '@/services/supabase';
import { useQueryClient } from '@tanstack/react-query';

const { height } = Dimensions.get('window');

// ─── Clearbit öneri tipi ──────────────────────────────────────────────────
interface ClearbitSuggestion {
  name: string;
  domain: string;
  logo: string;
}

// ─── Sonuç kartı ─────────────────────────────────────────────────────────
interface SuggestionItem {
  id: string;           // domain veya DB brand id
  name: string;
  domain: string;
  logo: string;
  isInDb: boolean;      // mevcut DB'deyse
  dbBrand?: Brand;      // DB'den geldiyse tam obje
}

// ─── Debounce hook ───────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Butik Ekle Modal ────────────────────────────────────────────────────
function AddBrandModal({
  visible,
  onClose,
  localBrands,
  savedBrandIds,
  onAddExisting,
  onAddNew,
}: {
  visible: boolean;
  onClose: () => void;
  localBrands: Brand[];
  savedBrandIds: Set<string>;
  onAddExisting: (brand: Brand, category: BrandCategory) => Promise<void>;
  onAddNew: (name: string, domain: string, logo: string, category: BrandCategory) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<BrandCategory>('giyim');
  const [adding, setAdding] = useState(false);
  const debouncedQuery = useDebounce(query, 400);
  const inputRef = useRef<TextInput>(null);

  // Temizle
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setSuggestions([]);
      setSelectedId(null);
      setSelectedCategory('giyim');
    } else {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [visible]);

  // Arama
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const q = debouncedQuery.toLowerCase().trim();
    setLoading(true);

    // 1) Yerel DB'de eşleşen markalar
    const dbMatches: SuggestionItem[] = localBrands
      .filter(b => b.name.toLowerCase().includes(q) || b.handle?.toLowerCase().includes(q))
      .slice(0, 3)
      .map(b => ({
        id: b.id,
        name: b.name,
        domain: b.website?.replace(/^https?:\/\//, '').split('/')[0] ?? '',
        logo: b.logo,
        isInDb: true,
        dbBrand: b,
      }));

    // 2) Clearbit autocomplete
    fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then((data: ClearbitSuggestion[]) => {
        const dbDomains = new Set(dbMatches.map(d => d.domain));
        const external: SuggestionItem[] = (data ?? [])
          .filter((s: ClearbitSuggestion) => !dbDomains.has(s.domain))
          .slice(0, 5)
          .map((s: ClearbitSuggestion) => ({
            id: s.domain,
            name: s.name,
            domain: s.domain,
            logo: s.logo ?? `https://logo.clearbit.com/${s.domain}`,
            isInDb: false,
          }));
        setSuggestions([...dbMatches, ...external]);
      })
      .catch(() => {
        setSuggestions(dbMatches);
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const handleSelect = (item: SuggestionItem) => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    setSelectedId(item.id === selectedId ? null : item.id);
    setSelectedCategory('giyim');
  };

  const handleAdd = async (item: SuggestionItem) => {
    setAdding(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      if (item.isInDb && item.dbBrand) {
        await onAddExisting(item.dbBrand, selectedCategory);
      } else {
        await onAddNew(item.name, item.domain, item.logo, selectedCategory);
      }
      onClose();
    } catch (e: any) {
      Alert.alert('Hata', e.message ?? 'Butik eklenemedi.');
    } finally {
      setAdding(false);
    }
  };

  const renderItem = ({ item }: { item: SuggestionItem }) => {
    const isSelected = selectedId === item.id;
    const alreadySaved = item.isInDb && item.dbBrand && savedBrandIds.has(item.dbBrand.id);

    return (
      <View style={s.resultItem}>
        <TouchableOpacity
          style={[s.resultRow, isSelected && s.resultRowSelected]}
          onPress={() => handleSelect(item)}
          activeOpacity={0.75}
        >
          {/* Logo */}
          <View style={s.logoWrap}>
            <Image
              source={{ uri: item.logo }}
              style={s.logo}
              defaultSource={{ uri: 'https://via.placeholder.com/40' }}
            />
          </View>

          {/* İsim + domain */}
          <View style={s.resultText}>
            <Text style={s.resultName} numberOfLines={1}>{item.name}</Text>
            <Text style={s.resultDomain} numberOfLines={1}>{item.domain}</Text>
          </View>

          {/* Sağ: zaten kayıtlı / ekle oku */}
          {alreadySaved ? (
            <View style={s.savedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={s.savedBadgeText}>Eklendi</Text>
            </View>
          ) : (
            <Ionicons
              name={isSelected ? 'chevron-up' : 'add-circle-outline'}
              size={22}
              color={isSelected ? Colors.gold3 : Colors.text4}
            />
          )}
        </TouchableOpacity>

        {/* Kategori seçici — sadece seçiliyse ve henüz eklenmemişse */}
        {isSelected && !alreadySaved && (
          <View style={s.categoryPanel}>
            <Text style={s.categoryPanelLabel}>Kategori seç</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.categoryScroll}
            >
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                const active = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.catChip, active && s.catChipActive]}
                    onPress={() => { Haptics.selectionAsync(); setSelectedCategory(cat.id as BrandCategory); }}
                  >
                    {active && (
                      <LinearGradient
                        colors={[Colors.gold2, Colors.gold4]}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <Text style={s.catIcon}>{cat.icon}</Text>
                    <Text style={[s.catLabel, active && s.catLabelActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={s.addConfirmBtn}
              onPress={() => handleAdd(item)}
              disabled={adding}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.gold2, Colors.gold4]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {adding
                ? <ActivityIndicator color={Colors.bg} size="small" />
                : <>
                    <Ionicons name="add-circle" size={18} color={Colors.bg} />
                    <Text style={s.addConfirmText}>Koleksiyona Ekle</Text>
                  </>}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={s.sheet}>
          <LinearGradient colors={[Colors.surface2, Colors.surface1]} style={StyleSheet.absoluteFill} />

          <View style={s.handle} />

          {/* Başlık */}
          <View style={s.titleRow}>
            <View>
              <Text style={s.title}>Butik Ekle</Text>
              <Text style={s.subtitle}>İsim yaz, aşağıdan seç</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.text3} />
            </TouchableOpacity>
          </View>

          {/* Arama kutusu */}
          <View style={s.searchBox}>
            <Ionicons name="search" size={18} color={Colors.gold3} style={{ marginRight: 10 }} />
            <TextInput
              ref={inputRef}
              style={s.searchInput}
              placeholder="Butik veya marka adı yaz..."
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
                <Ionicons name="close-circle" size={18} color={Colors.text4} />
              </TouchableOpacity>
            )}
          </View>

          {/* Sonuçlar */}
          {loading && (
            <View style={s.loadingRow}>
              <ActivityIndicator color={Colors.gold3} size="small" />
              <Text style={s.loadingText}>Aranıyor...</Text>
            </View>
          )}

          {!loading && query.length >= 2 && suggestions.length === 0 && (
            <View style={s.emptyRow}>
              <Text style={s.emptyText}>Sonuç bulunamadı. Farklı bir isim dene.</Text>
            </View>
          )}

          {!loading && suggestions.length > 0 && (
            <FlatList
              data={suggestions}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              style={s.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )}

          {query.length < 2 && (
            <View style={s.hintBox}>
              <Ionicons name="bulb-outline" size={18} color={Colors.gold3} />
              <Text style={s.hintText}>
                En az 2 harf yaz — butik adı, marka veya website gir. Listeden seçip kategorisini belirle.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Brands Ekranı ────────────────────────────────────────────────────────
export default function BrandsScreen() {
  const insets = useSafeAreaInsets();
  const { data: brands = [] } = useBrands();
  const savedBrands = useSavedBrands();
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const annotated = brands.map(b => ({ ...b, isFavorite: savedBrands.isSaved(b.id) }));
  const filtered = annotated.filter(b => {
    const matchCat = selectedCategory === 'all' || b.category === selectedCategory;
    const matchSearch = !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });
  const favorites = filtered.filter(b => b.isFavorite);
  const others = filtered.filter(b => !b.isFavorite);
  const savedBrandIds = new Set(savedBrands.data?.map(b => b.id) ?? []);

  // Mevcut DB markasını koleksiyona ekle
  const handleAddExisting = useCallback(async (brand: Brand, category: BrandCategory) => {
    await savedBrands.add.mutateAsync({ brandId: brand.id, isFavorite: false });
    qc.invalidateQueries({ queryKey: ['brands'] });
  }, [savedBrands, qc]);

  // Yeni marka oluşturup ekle
  const handleAddNew = useCallback(async (name: string, domain: string, logo: string, category: BrandCategory) => {
    const website = `https://${domain}`;
    const { data, error } = await supabase
      .from('brands')
      .insert({
        name,
        handle: `@${domain.split('.')[0]}`,
        category,
        website,
        affiliate_url: website,
        logo_url: logo,
        tags: [],
        is_verified: false,
      })
      .select('id')
      .single();
    if (error) throw error;
    if (data?.id) {
      await savedBrands.add.mutateAsync({ brandId: data.id, isFavorite: false });
    }
    qc.invalidateQueries({ queryKey: ['brands'] });
  }, [savedBrands, qc]);

  const toggleFavorite = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (savedBrands.isSaved(id)) savedBrands.remove.mutate(id);
    else savedBrands.add.mutate({ brandId: id, isFavorite: true });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.inner, { paddingTop: insets.top }]}>
        <View style={styles.bgGlow} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>KOLEKSİYON</Text>
            <Text style={styles.headerTitle}>Butiklerim</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setShowSearch(v => !v)} style={styles.iconBtn}>
              <Ionicons name={showSearch ? 'close' : 'search'} size={20} color={Colors.text2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddModal(true); }}
              style={styles.addBtn}
            >
              <LinearGradient colors={[Colors.gold2, Colors.gold4]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtnGradient}>
                <Ionicons name="add" size={22} color={Colors.bg} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Koleksiyon içi arama */}
        {showSearch && (
          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={16} color={Colors.text4} />
            <TextInput
              style={styles.searchInput}
              placeholder="Koleksiyonda ara..."
              placeholderTextColor={Colors.text5}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              selectionColor={Colors.gold3}
            />
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{brands.length}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{favorites.length}</Text>
            <Text style={styles.statLabel}>Favori</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{brands.reduce((acc, b) => acc + (b.productCount ?? 0), 0)}</Text>
            <Text style={styles.statLabel}>Ürün</Text>
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

        {/* Liste */}
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
          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏪</Text>
              <Text style={styles.emptyTitle}>Henüz butik yok</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? `"${searchQuery}" ile eşleşen butik bulunamadı.` : 'Favori butiğini ekle ve kampanyaları kaçırma.'}
              </Text>
              {!searchQuery && (
                <Button label="Butik Ekle" onPress={() => setShowAddModal(true)} variant="primary" size="md"
                  style={{ marginTop: 16 }} icon={<Ionicons name="add" size={18} color={Colors.bg} />} />
              )}
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      <AddBrandModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        localBrands={brands}
        savedBrandIds={savedBrandIds}
        onAddExisting={handleAddExisting}
        onAddNew={handleAddNew}
      />
    </View>
  );
}

// ─── Stil: Modal ─────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet: {
    maxHeight: height * 0.88,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 0,
    borderWidth: 1, borderColor: Colors.border2, borderBottomWidth: 0,
    overflow: 'hidden',
  },
  handle: { width: 40, height: 4, backgroundColor: Colors.border3, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text1, letterSpacing: -0.7 },
  subtitle: { fontSize: 13, color: Colors.text4, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface3, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border2,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface3, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.gold3,
    paddingHorizontal: 14, height: 52, marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 16, color: Colors.text1, fontWeight: '500' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16 },
  loadingText: { fontSize: 14, color: Colors.text4 },
  emptyRow: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.text4, textAlign: 'center' },
  hintBox: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: Colors.glassGold, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: Colors.borderGold, marginTop: 8,
  },
  hintText: { flex: 1, fontSize: 13, color: Colors.text3, lineHeight: 18 },
  list: { maxHeight: height * 0.52 },
  resultItem: { marginBottom: 8 },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface3, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border2,
  },
  resultRowSelected: { borderColor: Colors.gold3, backgroundColor: Colors.glassGold },
  logoWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.surface4, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border2,
  },
  logo: { width: 44, height: 44, resizeMode: 'contain' },
  resultText: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '700', color: Colors.text1 },
  resultDomain: { fontSize: 12, color: Colors.text4, marginTop: 2 },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.success },
  categoryPanel: {
    backgroundColor: Colors.surface2, borderRadius: 14, borderWidth: 1,
    borderColor: Colors.borderGold, padding: 14, marginTop: 4,
  },
  categoryPanelLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.text4,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  categoryScroll: { gap: 8, paddingRight: 4, marginBottom: 14 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50,
    backgroundColor: Colors.surface3, borderWidth: 1, borderColor: Colors.border2,
    overflow: 'hidden',
  },
  catChipActive: { borderColor: Colors.gold3 },
  catIcon: { fontSize: 13 },
  catLabel: { fontSize: 12, fontWeight: '600', color: Colors.text3 },
  catLabelActive: { color: Colors.bg, fontWeight: '700' },
  addConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 48, borderRadius: 14, overflow: 'hidden',
  },
  addConfirmText: { fontSize: 15, fontWeight: '800', color: Colors.bg },
});

// ─── Stil: Ekran ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { flex: 1 },
  bgGlow: {
    position: 'absolute', top: 50, left: -150,
    width: 350, height: 350, borderRadius: 175,
    backgroundColor: Colors.goldGlow, opacity: 0.3,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12,
  },
  headerLabel: { fontSize: 10, fontWeight: '700', color: Colors.gold3, letterSpacing: 2, marginBottom: 2 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.text1, letterSpacing: -1 },
  headerRight: { flexDirection: 'row', gap: 10, marginTop: 4 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border2,
  },
  addBtn: { borderRadius: 20, overflow: 'hidden' },
  addBtnGradient: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, backgroundColor: Colors.surface2,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border2,
    paddingHorizontal: 14, height: 46, marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text1 },
  statsRow: {
    flexDirection: 'row', marginHorizontal: 20,
    backgroundColor: Colors.surface2, borderRadius: 16,
    padding: 12, borderWidth: 1, borderColor: Colors.border1, marginBottom: 14,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '600', color: Colors.text4, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border2 },
  categoryScroll: { paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2, overflow: 'hidden',
  },
  filterChipActive: { borderColor: Colors.gold3 },
  filterLabel: { fontSize: 13, fontWeight: '600', color: Colors.text3 },
  filterLabelActive: { color: Colors.bg, fontWeight: '700' },
  filterCount: { backgroundColor: Colors.surface4, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  filterCountActive: { backgroundColor: 'rgba(7,7,15,0.30)' },
  filterCountText: { fontSize: 10, fontWeight: '700', color: Colors.text4 },
  filterCountTextActive: { color: Colors.bg },
  scrollContent: { paddingHorizontal: 16, gap: 10 },
  section: { gap: 10, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text3, letterSpacing: 0.3, textTransform: 'uppercase' },
  emptyState: { flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 10 },
  emptyIcon: { fontSize: 52, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text2, textAlign: 'center', letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 14, color: Colors.text4, textAlign: 'center', lineHeight: 20 },
});
