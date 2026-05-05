import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { type ManagedBoutique } from './BoutiqueCard';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { addSavedBrand } from '@/services/queries';

const { height } = Dimensions.get('window');
const DEBOUNCE_MS = 350;

// ── Tipler ───────────────────────────────────────────────────────────────────

interface BrandSuggestion {
  id: string;
  name: string;
  logoUrl?: string;
  category: string;
  website: string;
  productCount: number;
}

type SearchState = 'idle' | 'searching' | 'hasResults' | 'noResults';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd?: (boutique: ManagedBoutique) => void;
}

// ── Öneri satırı ─────────────────────────────────────────────────────────────

function SuggestionRow({
  brand,
  selected,
  onPress,
}: {
  brand: BrandSuggestion;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[sr.row, selected && sr.rowSelected]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Logo */}
      <View style={[sr.logoWrap, selected && sr.logoWrapSelected]}>
        {brand.logoUrl ? (
          <Image source={{ uri: brand.logoUrl }} style={sr.logo} />
        ) : (
          <View style={[sr.logoPlaceholder, selected && sr.logoPlaceholderSelected]}>
            <Text style={[sr.initial, selected && sr.initialSelected]}>
              {brand.name[0]}
            </Text>
          </View>
        )}
      </View>

      {/* Bilgi */}
      <View style={{ flex: 1 }}>
        <Text style={[sr.name, selected && sr.nameSelected]}>{brand.name}</Text>
        <Text style={sr.meta}>
          {brand.category}
          {brand.productCount > 0 ? ` · ${brand.productCount} ürün` : ''}
          {brand.website ? ` · ${brand.website.replace(/^https?:\/\//, '').replace(/^www\./, '')}` : ''}
        </Text>
      </View>

      {/* Seçim göstergesi */}
      {selected ? (
        <View style={sr.checkCircle}>
          <Ionicons name="checkmark" size={13} color="#fff" />
        </View>
      ) : (
        <Ionicons name="add-circle-outline" size={20} color={Colors.text4} />
      )}
    </TouchableOpacity>
  );
}

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    marginBottom: 8,
  },
  rowSelected: {
    backgroundColor: Colors.roseGlow,
    borderColor: Colors.borderBurgund,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  logoWrapSelected: {
    borderColor: Colors.borderBurgund,
  },
  logo: { width: '100%', height: '100%' },
  logoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface3,
  },
  logoPlaceholderSelected: {
    backgroundColor: 'rgba(107,21,32,0.12)',
  },
  initial: {
    fontFamily: Fonts.displayBold,
    fontSize: 18,
    color: Colors.text3,
  },
  initialSelected: {
    color: Colors.rose3,
  },
  name: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: Colors.text1,
    letterSpacing: -0.1,
  },
  nameSelected: {
    color: Colors.rose2,
  },
  meta: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.rose3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ── Modal ─────────────────────────────────────────────────────────────────────

export function AddBoutiqueModal({ visible, onClose, onAdd }: Props) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [nameInput, setNameInput] = useState('');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [suggestions, setSuggestions] = useState<BrandSuggestion[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<BrandSuggestion | null>(null);
  const [adding, setAdding] = useState(false);

  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  // ── Animasyon ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      // Modal açılınca input'a odaklan
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(reset, 300);
    }
  }, [visible]);

  const reset = () => {
    setNameInput('');
    setSearchState('idle');
    setSuggestions([]);
    setSelectedBrand(null);
    setAdding(false);
  };

  // ── Arama ──────────────────────────────────────────────────────────────────
  const handleInputChange = useCallback((text: string) => {
    setNameInput(text);
    setSelectedBrand(null); // seçimi sıfırla

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim() || text.trim().length < 2) {
      setSearchState('idle');
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchState('searching');
      try {
        const { data } = await supabase
          .from('brands')
          .select('id, name, logo_url, category, website')
          .ilike('name', `%${text.trim()}%`)
          .order('name')
          .limit(6);

        if (!data || data.length === 0) {
          setSuggestions([]);
          setSearchState('noResults');
          return;
        }

        // Ürün sayısını toplu çek
        const ids = data.map((b: any) => b.id);
        const { data: counts } = await supabase
          .from('products')
          .select('brand_id')
          .in('brand_id', ids)
          .eq('is_available', true);

        const countMap: Record<string, number> = {};
        for (const r of counts ?? []) {
          countMap[r.brand_id] = (countMap[r.brand_id] ?? 0) + 1;
        }

        setSuggestions(
          data.map((b: any) => ({
            id: b.id,
            name: b.name,
            logoUrl: b.logo_url ?? undefined,
            category: b.category ?? 'Giyim',
            website: b.website ?? '',
            productCount: countMap[b.id] ?? 0,
          }))
        );
        setSearchState('hasResults');
      } catch {
        setSuggestions([]);
        setSearchState('noResults');
      }
    }, DEBOUNCE_MS);
  }, []);

  const handleSelectBrand = useCallback((brand: BrandSuggestion) => {
    Haptics.selectionAsync();
    setSelectedBrand(prev => (prev?.id === brand.id ? null : brand));
  }, []);

  // ── Ekleme ─────────────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!session?.user || !selectedBrand || adding) return;
    setAdding(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await addSavedBrand(session.user.id, selectedBrand.id);

      qc.invalidateQueries({ queryKey: ['savedBrands'] });
      qc.invalidateQueries({ queryKey: ['discover-feed'] });
      qc.invalidateQueries({ queryKey: ['discover-categories'] });

      const boutique: ManagedBoutique = {
        id: selectedBrand.id,
        name: selectedBrand.name,
        handle: selectedBrand.website
          .replace(/^https?:\/\//, '')
          .replace(/^www\./, ''),
        logoUrl: selectedBrand.logoUrl,
        category: selectedBrand.category,
        status: 'pending',
        productCount: selectedBrand.productCount,
        isManual: false,
      };
      onAdd?.(boutique);
      onClose();
    } catch {
      setAdding(false);
    }
  };

  const canAdd = !!selectedBrand && !adding;
  const isSingleResult = suggestions.length === 1;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[s.backdrop, { opacity: backdropAnim }]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.kvWrap}
        pointerEvents="box-none"
      >
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={[Colors.surface2, Colors.surface1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Tutma çubuğu */}
          <View style={s.handle} />

          {/* Başlık */}
          <View style={s.header}>
            <View style={s.iconBadge}>
              <Ionicons name="storefront-outline" size={20} color={Colors.rose3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Yeni Butik Ekle</Text>
              <Text style={s.subtitle}>Marka adını yaz, hemen bul</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={s.closeBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={20} color={Colors.text3} />
            </TouchableOpacity>
          </View>

          {/* Arama kutusu */}
          <View style={s.inputRow}>
            {searchState === 'searching' ? (
              <ActivityIndicator size="small" color={Colors.gold3} />
            ) : (
              <Ionicons
                name="search-outline"
                size={17}
                color={nameInput.length > 0 ? Colors.rose3 : Colors.text4}
              />
            )}
            <TextInput
              ref={inputRef}
              style={s.input}
              placeholder="Butik adı yaz... (örn: Muun, Selma...)"
              placeholderTextColor={Colors.text5}
              value={nameInput}
              onChangeText={handleInputChange}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              selectionColor={Colors.rose3}
            />
            {nameInput.length > 0 && (
              <TouchableOpacity
                onPress={() => { setNameInput(''); setSearchState('idle'); setSuggestions([]); setSelectedBrand(null); inputRef.current?.focus(); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={17} color={Colors.text4} />
              </TouchableOpacity>
            )}
          </View>

          {/* İçerik alanı */}
          <ScrollView
            style={s.resultsScroll}
            contentContainerStyle={s.resultsContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Boş başlangıç */}
            {searchState === 'idle' && (
              <Text style={s.hintText}>
                Veritabanımızdaki 200+ butiği adıyla arayabilirsin
              </Text>
            )}

            {/* Tek sonuç → "Bunu mu demek istediniz?" */}
            {searchState === 'hasResults' && isSingleResult && (
              <View style={s.singleHintRow}>
                <Ionicons name="help-circle-outline" size={14} color={Colors.text4} />
                <Text style={s.singleHintText}>Bunu mu demek istediniz?</Text>
              </View>
            )}

            {/* Çok sonuç → üst etiket */}
            {searchState === 'hasResults' && !isSingleResult && (
              <Text style={s.resultsLabel}>
                {suggestions.length} butik bulundu
              </Text>
            )}

            {/* Öneri listesi */}
            {searchState === 'hasResults' && suggestions.map(brand => (
              <SuggestionRow
                key={brand.id}
                brand={brand}
                selected={selectedBrand?.id === brand.id}
                onPress={() => handleSelectBrand(brand)}
              />
            ))}

            {/* Sonuç yok */}
            {searchState === 'noResults' && (
              <View style={s.noResultsWrap}>
                <View style={s.noResultsIcon}>
                  <Ionicons name="search-outline" size={26} color={Colors.text5} />
                </View>
                <Text style={s.noResultsTitle}>"{nameInput}" bulunamadı</Text>
                <Text style={s.noResultsDesc}>
                  Farklı bir yazım dene ya da butik URL'sini doğrudan gir
                </Text>
              </View>
            )}
          </ScrollView>

          {/* CTA butonu */}
          <TouchableOpacity
            style={[s.addBtn, !canAdd && s.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!canAdd}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={canAdd
                ? (Colors.gradients.rose as unknown as [string, string])
                : [Colors.surface4, Colors.surface3]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.addBtnGradient}
            >
              {adding ? (
                <ActivityIndicator size="small" color={Colors.bg} />
              ) : (
                <>
                  {canAdd && selectedBrand?.logoUrl ? (
                    <Image source={{ uri: selectedBrand.logoUrl }} style={s.addBtnLogo} />
                  ) : (
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={canAdd ? Colors.bg : Colors.text5}
                    />
                  )}
                  <Text style={[s.addBtnText, !canAdd && s.addBtnTextDisabled]}>
                    {canAdd && selectedBrand
                      ? `${selectedBrand.name}'i Ekle`
                      : 'Bu Butiği Ekle'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.60)',
  },
  kvWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: Colors.border2,
    overflow: 'hidden',
    borderBottomWidth: 0,
    maxHeight: height * 0.82,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border3,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.roseGlow,
    borderWidth: 1,
    borderColor: Colors.borderBurgund,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 20,
    color: Colors.text1,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text4,
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    backgroundColor: Colors.surface3,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border3,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 4,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.uiLight,
    fontSize: 15,
    color: Colors.text1,
    height: '100%',
  },
  resultsScroll: {
    maxHeight: height * 0.38,
    marginTop: 6,
  },
  resultsContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  hintText: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text5,
    textAlign: 'center',
    paddingVertical: 20,
  },
  singleHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  singleHintText: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text4,
    fontStyle: 'italic',
  },
  resultsLabel: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  noResultsWrap: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  noResultsIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noResultsTitle: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: Colors.text2,
  },
  noResultsDesc: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text4,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  addBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 16,
  },
  addBtnLogo: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: Colors.surface3,
  },
  addBtnText: {
    fontFamily: Fonts.ui,
    fontSize: 16,
    color: Colors.bg,
    letterSpacing: -0.2,
  },
  addBtnTextDisabled: {
    color: Colors.text5,
  },
});
