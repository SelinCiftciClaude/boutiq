import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Image, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useSavedBrands } from '@/hooks/useSavedBrands';
import { useAuth } from '@/context/AuthContext';
import { BrandVisualCard } from '@/components/BrandVisualCard';
import { AddBoutiqueModal } from '@/components/AddBoutiqueModal';
import { supabase } from '@/services/supabase';
import { addSavedBrand } from '@/services/queries';
import type { Brand } from '@/types';

const { width } = Dimensions.get('window');
const CARD_W = (width - 16 * 2 - 10) / 2;

// ── URL yardımcısı ────────────────────────────────────────────────────────────

function isUrlLike(q: string) {
  const t = q.trim();
  return t.includes('.') && !t.includes(' ') && t.length >= 4 &&
    /^[a-zA-Z0-9\-_.]+\.[a-zA-Z]{2,}/.test(t);
}

// ── Tente çizimi ─────────────────────────────────────────────────────────────

function TentIllustration() {
  const STRIPES  = ['#6B1520', '#FFF9EE', '#6B1520', '#FFF9EE', '#6B1520', '#FFF9EE', '#6B1520'];
  const SCALLOPS = ['#6B1520', '#FFF9EE', '#6B1520', '#FFF9EE', '#6B1520', '#FFF9EE', '#6B1520'];
  return (
    <View style={ti.root}>
      <View style={ti.rod} />
      <View style={ti.strings}>
        <View style={ti.string} />
        <View style={ti.string} />
        <View style={ti.string} />
      </View>
      <View style={ti.body}>
        {STRIPES.map((color, i) => (
          <View key={i} style={[ti.stripe, { backgroundColor: color }]} />
        ))}
      </View>
      <View style={ti.fringe}>
        {SCALLOPS.map((color, i) => (
          <View key={i} style={[ti.scallop, { backgroundColor: color }]} />
        ))}
      </View>
    </View>
  );
}

const ti = StyleSheet.create({
  root:    { width: 50, alignItems: 'center' },
  rod:     { width: 54, height: 4, backgroundColor: Colors.gold3, borderRadius: 2, marginBottom: 1 },
  strings: { flexDirection: 'row', justifyContent: 'space-between', width: 40, height: 5 },
  string:  { width: 1, height: '100%', backgroundColor: Colors.gold3, opacity: 0.7 },
  body:    { flexDirection: 'row', width: 50, height: 22, borderRadius: 3, overflow: 'hidden' },
  stripe:  { flex: 1, height: '100%' },
  fringe:  { flexDirection: 'row', width: 50, height: 10, marginTop: -1 },
  scallop: { flex: 1, height: 10, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
});

// ── Anlık local tohum listesi ─────────────────────────────────────────────────

const SEED_BRANDS = [
  { id: 's01', name: 'Selma Çilek',          website: 'selmacilek.com'         },
  { id: 's02', name: 'Hof Silk',             website: 'hofsilk.com'            },
  { id: 's03', name: 'Love on Friday',       website: 'love-onfriday.com'      },
  { id: 's04', name: 'Mlouye',               website: 'mlouye.com'             },
  { id: 's05', name: 'Manuel Atelier',       website: 'manuelatelier.com'      },
  { id: 's06', name: 'The Purest Solutions', website: 'thepurestsolutions.com' },
  { id: 's07', name: 'VavRattan',            website: 'vavrattan.com'          },
  { id: 's08', name: 'Noire Studio',         website: 'noirestudio.com'        },
  { id: 's09', name: 'Arce Leather',         website: 'arceleather.com'        },
  { id: 's10', name: 'Sia Moore',            website: 'siamoore.com'           },
  { id: 's11', name: 'Misela',               website: 'misela.com'             },
  { id: 's12', name: 'Atelier Rebul',        website: 'atelierrebul.com.tr'    },
  { id: 's13', name: 'Gulsha',               website: 'gulsha.com'             },
  { id: 's14', name: 'Rosece',               website: 'rosece.com'             },
  { id: 's15', name: 'Bensu Buyruk',         website: 'bensubuyrukbutik.com'   },
  { id: 's16', name: 'Zara',                 website: 'zara.com'               },
  { id: 's17', name: 'Mango',                website: 'mango.com'              },
  { id: 's18', name: 'H&M',                  website: 'hm.com'                 },
  { id: 's19', name: 'Massimo Dutti',        website: 'massimodutti.com'       },
  { id: 's20', name: 'Stradivarius',         website: 'stradivarius.com'       },
];

// ── Suggestion tipi ───────────────────────────────────────────────────────────

interface Suggestion {
  id: string;
  name: string;
  website: string;
  logoUrl?: string;
  fromDb?: boolean;
  platform?: string;
  shopifyVerified?: boolean;
}

// ── Eşleşen kısmı kalın göster ────────────────────────────────────────────────

function HighlightName({ name, query }: { name: string; query: string }) {
  if (!query.trim()) return <Text style={sg.name}>{name}</Text>;
  const i = name.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return <Text style={sg.name}>{name}</Text>;
  return (
    <Text style={sg.name}>
      {name.slice(0, i)}
      <Text style={sg.nameMatch}>{name.slice(i, i + query.length)}</Text>
      {name.slice(i + query.length)}
    </Text>
  );
}

// ── Tek öneri satırı — Google Suggest hissi ───────────────────────────────────

function SuggRow({
  item, query, onPress, adding,
}: {
  item: Suggestion; query: string; onPress: () => void; adding: boolean;
}) {
  return (
    <TouchableOpacity style={sg.row} onPress={onPress} activeOpacity={0.72}>
      <Ionicons name="search-outline" size={16} color={Colors.text4} style={{ flexShrink: 0 }} />
      <View style={{ flex: 1 }}>
        <HighlightName name={item.name} query={query} />
        {!!item.website && (
          <Text style={sg.domain} numberOfLines={1}>{item.website}</Text>
        )}
      </View>
      {item.platform === 'shopify' && (
        <View style={[sg.badge, item.shopifyVerified ? sg.badgeOk : null]}>
          <Text style={sg.badgeTxt}>Shopify{item.shopifyVerified ? ' ✓' : ''}</Text>
        </View>
      )}
      {item.platform === 'ikas' && (
        <View style={sg.badge}><Text style={sg.badgeTxt}>İkas</Text></View>
      )}
      {adding
        ? <ActivityIndicator size="small" color={Colors.rose3} style={{ marginLeft: 8, flexShrink: 0 }} />
        : <Ionicons name="add-circle-outline" size={20} color={Colors.rose3} style={{ marginLeft: 8, flexShrink: 0 }} />
      }
    </TouchableOpacity>
  );
}

const sg = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 14,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border1,
    backgroundColor: Colors.surface1,
  },
  name:      { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1 },
  nameMatch: { fontFamily: Fonts.ui, color: Colors.text1 },
  domain:    { fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4, marginTop: 1 },
  badge: {
    backgroundColor: Colors.surface3, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 0.5, borderColor: Colors.border2, flexShrink: 0,
  },
  badgeOk:  { backgroundColor: Colors.successGlow, borderColor: 'rgba(26,106,64,0.25)' },
  badgeTxt: { fontFamily: Fonts.uiMedium, fontSize: 10, color: Colors.success },
});

// ── URL Arama + Google Suggest Dropdown ───────────────────────────────────────

function UrlSearchSection({ onAdded }: { onAdded: () => void }) {
  const { session } = useAuth();
  const qc          = useQueryClient();
  const inputRef    = useRef<TextInput>(null);
  const dbTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [text,       setText]       = useState('');
  const [focused,    setFocused]    = useState(false);
  const [dbResults,  setDbResults]  = useState<Suggestion[]>([]);
  const [dbLoading,  setDbLoading]  = useState(false);
  const [urlResult,  setUrlResult]  = useState<Suggestion | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [addingId,   setAddingId]   = useState<string | null>(null);
  const [addedId,    setAddedId]    = useState<string | null>(null);

  // Anlık local filtre
  const localSuggestions = useMemo((): Suggestion[] => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return SEED_BRANDS
      .filter(b => b.name.toLowerCase().includes(q) || b.website.includes(q))
      .slice(0, 5)
      .map(b => ({ id: b.id, name: b.name, website: b.website }));
  }, [text]);

  // DB araması — 150ms debounce
  useEffect(() => {
    if (dbTimer.current) clearTimeout(dbTimer.current);
    const q = text.trim();
    if (!q || q.length < 2) { setDbResults([]); setDbLoading(false); return; }
    setDbLoading(true);
    dbTimer.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('brands')
          .select('id, name, logo_url, website')
          .ilike('name', `%${q}%`)
          .order('name').limit(6);
        setDbResults((data ?? []).map((b: any) => ({
          id: b.id, name: b.name,
          website: (b.website ?? '').replace(/^https?:\/\//, '').replace(/^www\./, ''),
          logoUrl: b.logo_url ?? undefined,
          fromDb: true,
        })));
      } catch { setDbResults([]); }
      setDbLoading(false);
    }, 150);
  }, [text]);

  // URL kontrolü — 600ms debounce (sadece domain girilmişse ve DB boşsa)
  useEffect(() => {
    if (urlTimer.current) clearTimeout(urlTimer.current);
    setUrlResult(null);
    if (!isUrlLike(text) || dbResults.length > 0) { setUrlLoading(false); return; }
    setUrlLoading(true);
    urlTimer.current = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke('check-boutique-url', {
          body: { url: text.trim() },
        });
        if (data?.found) {
          setUrlResult({
            id: `url-${data.website}`,
            name: data.name,
            website: data.website,
            platform: data.platform,
            shopifyVerified: data.shopifyVerified,
          });
        }
      } catch { /* sessizce */ }
      setUrlLoading(false);
    }, 600);
  }, [text, dbResults.length]);

  // DB veya local: hangisi doluysa onu göster
  const suggestions = useMemo((): Suggestion[] =>
    dbResults.length > 0 ? dbResults : localSuggestions,
  [dbResults, localSuggestions]);

  const showDropdown = focused && text.trim().length >= 1 &&
    (suggestions.length > 0 || !!urlResult || urlLoading || dbLoading);

  // Ekleme
  const handleSelect = useCallback(async (item: Suggestion) => {
    if (!session?.user || addingId) return;
    setAddingId(item.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      let brandId: string = item.id;
      if (item.fromDb) {
        await addSavedBrand(session.user.id, item.id);
      } else {
        const { data, error } = await supabase.rpc('add_manual_brand', {
          p_name: item.name, p_website: item.website, p_category: 'Giyim',
        });
        if (error || !data) throw error ?? new Error('RPC failed');
        brandId = data;
        supabase.functions.invoke('sync-brand-products', {
          body: { brand_id: brandId, website_url: `https://${item.website}` },
        }).catch(() => {});
        supabase.functions.invoke('extract-brand-assets', {
          body: { brand_id: brandId },
        }).catch(() => {});
      }
      qc.invalidateQueries({ queryKey: ['savedBrands'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddedId(item.id);
      onAdded();
      setTimeout(() => {
        setText(''); setDbResults([]); setUrlResult(null);
        setAddingId(null); setAddedId(null); setFocused(false);
      }, 1200);
    } catch { setAddingId(null); }
  }, [session, addingId, qc, onAdded]);

  const clearInput = useCallback(() => {
    setText(''); setDbResults([]); setUrlResult(null); setAddedId(null);
    inputRef.current?.focus();
  }, []);

  return (
    <View style={us.wrap}>
      {/* Başlık */}
      <View style={us.titleRow}>
        <TentIllustration />
        <Text style={us.sectionTitle}>Butik Ekle</Text>
      </View>

      {/* Input */}
      <View style={[
        us.inputRow,
        focused  && us.inputFocused,
        showDropdown && us.inputOpen,
      ]}>
        {(dbLoading || urlLoading)
          ? <ActivityIndicator size="small" color={Colors.gold3} style={{ width: 18 }} />
          : <Ionicons name="search-outline" size={18}
              color={focused ? Colors.rose3 : Colors.text4} />
        }
        <TextInput
          ref={inputRef}
          style={us.input}
          placeholder="Butik adı veya site adresi..."
          placeholderTextColor={Colors.text5}
          value={text}
          onChangeText={v => { setText(v); setAddedId(null); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 180)}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          selectionColor={Colors.rose3}
        />
        {text.length > 0 && (
          <TouchableOpacity onPress={clearInput} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={17} color={Colors.text4} />
          </TouchableOpacity>
        )}
      </View>

      {/* Google Suggest dropdown */}
      {showDropdown && (
        <View style={us.dropdown}>
          {suggestions.map(item => (
            <SuggRow
              key={item.id} item={item} query={text}
              onPress={() => handleSelect(item)}
              adding={addingId === item.id}
            />
          ))}
          {urlLoading && (
            <View style={us.loadRow}>
              <ActivityIndicator size="small" color={Colors.gold3} />
              <Text style={us.loadText}>{text} kontrol ediliyor...</Text>
            </View>
          )}
          {urlResult && !urlLoading && (
            <SuggRow
              item={urlResult} query={text}
              onPress={() => handleSelect(urlResult)}
              adding={addingId === urlResult.id}
            />
          )}
          {addedId && (
            <View style={us.addedRow}>
              <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
              <Text style={us.addedText}>Butik eklendi!</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const us = StyleSheet.create({
  wrap:         { paddingHorizontal: 16, marginBottom: 16 },
  titleRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sectionTitle: { fontFamily: Fonts.displayBold, fontSize: 20, color: Colors.text1, letterSpacing: -0.3 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface1,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border2,
    paddingHorizontal: 14, height: 50,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  inputFocused: { borderColor: Colors.rose3 },
  inputOpen: {
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 0,
  },
  input: { flex: 1, fontFamily: Fonts.uiLight, fontSize: 15, color: Colors.text1, height: '100%' },
  dropdown: {
    backgroundColor: Colors.surface1,
    borderWidth: 1, borderTopWidth: 0, borderColor: Colors.rose3,
    borderBottomLeftRadius: 14, borderBottomRightRadius: 14,
    overflow: 'hidden',
    shadowColor: Colors.rose1, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  loadRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: Colors.surface1,
  },
  loadText:  { fontFamily: Fonts.uiLight, fontSize: 13, color: Colors.text4 },
  addedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 11, paddingHorizontal: 14,
    backgroundColor: Colors.successGlow,
  },
  addedText: { fontFamily: Fonts.uiLight, fontSize: 13, color: Colors.success },
});

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export default function BoutiquesScreen() {
  const insets = useSafeAreaInsets();
  const { data: savedBrands = [], isLoading, refetch, isRefetching } = useSavedBrands();
  const savedBrands_ = useSavedBrands();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const qc = useQueryClient();

  const handleRemove = (brandId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Butiği Kaldır', 'Bu butiği takip listenden kaldırmak istiyor musun?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Kaldır', style: 'destructive', onPress: () => savedBrands_.remove.mutate(brandId) },
    ]);
  };

  const renderItem = useCallback(({ item }: { item: Brand }) => (
    <BrandVisualCard
      brand={{
        id: item.id, name: item.name,
        logo: item.logo, coverImage: item.coverImage,
        brandColor: item.brandColor, cardStyle: item.cardStyle,
        category: item.category, productCount: item.productCount,
        isVerified: item.isVerified,
      }}
      width={CARD_W}
      onPress={() => router.push(`/brand/${item.id}` as any)}
      onLongPress={() => handleRemove(item.id)}
    />
  ), []);

  const isEmpty = !isLoading && savedBrands.length === 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[Colors.surface1, Colors.bg]}
        locations={[0, 0.25]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Butiklerim</Text>
        <View style={s.headerRight}>
          {savedBrands.length > 0 && (
            <View style={s.countBadge}>
              <Text style={s.countText}>{savedBrands.length}</Text>
            </View>
          )}
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => setAddModalVisible(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={22} color={Colors.rose3} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={savedBrands as Brand[]}
        keyExtractor={b => b.id}
        numColumns={2}
        columnWrapperStyle={s.columnWrap}
        contentContainerStyle={[s.list, isEmpty && s.listEmpty]}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={refetch}
        ListHeaderComponent={
          <UrlSearchSection onAdded={() => qc.invalidateQueries({ queryKey: ['savedBrands'] })} />
        }
        renderItem={renderItem}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="storefront-outline" size={36} color={Colors.rose4} />
              </View>
              <Text style={s.emptyTitle}>Henüz butik eklemedin</Text>
              <Text style={s.emptySub}>
                Yukarıdaki alana yazarak{'\n'}veya + butonuna basarak ekle
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => setAddModalVisible(true)}
              >
                <LinearGradient
                  colors={Colors.gradients.rose as unknown as [string, string]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.emptyBtnGrad}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFF9EE" />
                  <Text style={s.emptyBtnText}>İlk Butiğini Ekle</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )
        }
      />

      <AddBoutiqueModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={() => qc.invalidateQueries({ queryKey: ['savedBrands'] })}
      />
    </View>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14,
  },
  title: { fontFamily: Fonts.displayBold, fontSize: 28, color: Colors.text1, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  countBadge: {
    backgroundColor: Colors.roseGlow, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 0.5, borderColor: Colors.borderBurgund,
  },
  countText: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.rose3 },
  addBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  list:       { paddingHorizontal: 16, paddingBottom: 100 },
  listEmpty:  { flex: 1 },
  columnWrap: { gap: 10, marginBottom: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 12 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: Colors.roseGlow, borderWidth: 1, borderColor: Colors.borderBurgund,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle:   { fontFamily: Fonts.displayBold, fontSize: 20, color: Colors.text1 },
  emptySub:     { fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text4, textAlign: 'center', lineHeight: 21 },
  emptyBtn:     { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  emptyBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 13 },
  emptyBtnText: { fontFamily: Fonts.ui, fontSize: 15, color: '#FFF9EE' },
});
