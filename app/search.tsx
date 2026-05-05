import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Image, ActivityIndicator, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { searchBrandsAndProducts } from '@/services/queries';
import { useAuth } from '@/context/AuthContext';
import { Brand, Product } from '@/types';

const RECENT_KEY = 'butika_recent_searches_v1';
const MAX_RECENT = 6;
const DEBOUNCE_MS = 350;

function buildAffiliateUrl(url: string): string {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}utm_source=butika&utm_medium=search`;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const saveRecent = useCallback(async (q: string) => {
    const updated = [q, ...recent.filter(r => r !== q)].slice(0, MAX_RECENT);
    setRecent(updated);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated)).catch(() => {});
  }, [recent]);

  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setBrands([]);
      setProducts([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchBrandsAndProducts(trimmed, user?.id);
      setBrands(res.brands);
      setProducts(res.products);
    } catch {
      setBrands([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
    saveRecent(trimmed);
  }, [user?.id, saveRecent]);

  // Yazarken otomatik debounced arama
  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), DEBOUNCE_MS);
  }, [doSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    setBrands([]);
    setProducts([]);
    setSearched(false);
    inputRef.current?.focus();
  }, []);

  const clearRecent = async () => {
    setRecent([]);
    await AsyncStorage.removeItem(RECENT_KEY);
  };

  const handleBrandPress = useCallback((brand: Brand) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/brand/${brand.id}` as any);
  }, []);

  const handleProductPress = useCallback((product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = buildAffiliateUrl(product.affiliateUrl || product.url);
    if (url) Linking.openURL(url);
  }, []);

  const totalResults = brands.length + products.length;
  const showEmpty = !loading && searched && totalResults === 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[Colors.surface3, Colors.bg]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.3]}
      />

      {/* ── Search bar ── */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={18} color={loading ? Colors.gold3 : Colors.text4} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Butik veya ürün ara..."
            placeholderTextColor={Colors.text5}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            onSubmitEditing={() => doSearch(query)}
            selectionColor={Colors.gold3}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {loading && <ActivityIndicator size="small" color={Colors.gold3} />}
          {!loading && query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={Colors.text4} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelBtn} activeOpacity={0.7}>
          <Text style={styles.cancelText}>İptal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        {/* ── Son aramalar ── */}
        {!searched && recent.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Son Aramalar</Text>
              <TouchableOpacity onPress={clearRecent} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.clearText}>Temizle</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.recentList}>
              {recent.map(r => (
                <TouchableOpacity
                  key={r}
                  style={styles.recentItem}
                  onPress={() => { setQuery(r); doSearch(r); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={16} color={Colors.text4} />
                  <Text style={styles.recentText}>{r}</Text>
                  <Ionicons name="arrow-back-outline" size={14} color={Colors.text5} style={{ marginLeft: 'auto', transform: [{ rotate: '45deg' }] }} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Boş durum ── */}
        {showEmpty && (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="search-outline" size={28} color={Colors.rose3} />
            </View>
            <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
            <Text style={styles.emptySubtitle}>
              "{query}" için herhangi bir butik veya ürün bulunamadı.{'\n'}
              Farklı bir kelime dene.
            </Text>
          </View>
        )}

        {/* ── Butik sonuçları ── */}
        {!loading && brands.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Butikler ({brands.length})</Text>
            {brands.map(b => (
              <TouchableOpacity
                key={b.id}
                style={styles.brandRow}
                onPress={() => handleBrandPress(b)}
                activeOpacity={0.8}
              >
                {b.logo ? (
                  <Image source={{ uri: b.logo }} style={styles.brandLogo} />
                ) : (
                  <View style={[styles.brandLogo, styles.brandLogoPlaceholder]}>
                    <Text style={styles.brandInitial}>{b.name[0]}</Text>
                  </View>
                )}
                <View style={styles.brandInfo}>
                  <View style={styles.brandNameRow}>
                    <Text style={styles.brandName}>{b.name}</Text>
                    {b.isVerified && (
                      <Ionicons name="checkmark-circle" size={14} color={Colors.gold3} />
                    )}
                  </View>
                  <Text style={styles.brandMeta}>
                    {b.category}
                    {(b.productCount ?? 0) > 0 ? ` · ${b.productCount} ürün` : ''}
                  </Text>
                </View>
                <View style={styles.chevronWrap}>
                  <Ionicons name="chevron-forward" size={15} color={Colors.text4} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Ürün sonuçları ── */}
        {!loading && products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ürünler ({products.length})</Text>
            {products.map(p => (
              <TouchableOpacity
                key={p.id}
                style={styles.productRow}
                onPress={() => handleProductPress(p)}
                activeOpacity={0.8}
              >
                {p.image ? (
                  <Image source={{ uri: p.image }} style={styles.productImg} />
                ) : (
                  <View style={[styles.productImg, styles.productImgPlaceholder]}>
                    <Ionicons name="image-outline" size={22} color={Colors.text4} />
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productBrand} numberOfLines={1}>{p.brandName}</Text>
                  <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>₺{p.price.toLocaleString('tr-TR')}</Text>
                    {p.originalPrice != null && p.originalPrice > p.price && (
                      <Text style={styles.originalPrice}>
                        ₺{p.originalPrice.toLocaleString('tr-TR')}
                      </Text>
                    )}
                    {p.isOnSale && <Text style={styles.saleBadge}>İndirimli</Text>}
                  </View>
                </View>
                <View style={styles.chevronWrap}>
                  <Ionicons name="open-outline" size={15} color={Colors.text4} />
                </View>
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
  root: { flex: 1, backgroundColor: Colors.bg },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: 14,
    height: 48,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.uiLight,
    fontSize: 15,
    color: Colors.text1,
    height: '100%',
  },
  cancelBtn: { paddingVertical: 8 },
  cancelText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 15,
    color: Colors.gold3,
  },

  scroll: { paddingHorizontal: 16 },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: 56,
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.roseGlow,
    borderWidth: 1,
    borderColor: Colors.borderBurgund,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 18,
    color: Colors.text1,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text4,
    textAlign: 'center',
    lineHeight: 21,
  },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: Fonts.uiMedium,
    fontSize: 11,
    color: Colors.text3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  clearText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.gold3,
  },

  recentList: { gap: 2 },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border1,
  },
  recentText: {
    fontFamily: Fonts.uiLight,
    fontSize: 15,
    color: Colors.text2,
    flex: 1,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border2,
    marginBottom: 8,
  },
  brandLogo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.surface3,
  },
  brandLogoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface3,
  },
  brandInitial: {
    fontFamily: Fonts.displayBold,
    fontSize: 18,
    color: Colors.rose3,
  },
  brandInfo: { flex: 1 },
  brandNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  brandName: {
    fontFamily: Fonts.uiMedium,
    fontSize: 15,
    color: Colors.text1,
  },
  brandMeta: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text4,
    marginTop: 2,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border2,
    marginBottom: 8,
  },
  productImg: {
    width: 56,
    height: 64,
    borderRadius: 10,
    backgroundColor: Colors.surface3,
  },
  productImgPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: { flex: 1, gap: 2 },
  productBrand: {
    fontFamily: Fonts.uiMedium,
    fontSize: 11,
    color: Colors.text4,
    letterSpacing: 0.3,
  },
  productName: {
    fontFamily: Fonts.uiRegular,
    fontSize: 14,
    color: Colors.text1,
    lineHeight: 19,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  price: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: Colors.text1,
  },
  originalPrice: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text5,
    textDecorationLine: 'line-through',
  },
  saleBadge: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
    color: Colors.rose3,
    backgroundColor: Colors.roseGlow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: Colors.borderBurgund,
  },

  chevronWrap: {
    width: 28,
    alignItems: 'center',
  },
});
