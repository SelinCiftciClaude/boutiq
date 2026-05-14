import React, { useState, useRef, useEffect, useCallback } from 'react';
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

// ── URL arama sonuç kartı ─────────────────────────────────────────────────────

interface UrlCheckResult {
  found: boolean;
  name?: string;
  website?: string;
  logoUrl?: string;
  platform?: string;
  shopifyVerified?: boolean;
}

function UrlResultCard({
  result, adding, onAdd,
}: {
  result: UrlCheckResult;
  adding: boolean;
  onAdd: () => void;
}) {
  const initial = (result.name || '?')[0].toUpperCase();
  return (
    <View style={ur.card}>
      <View style={ur.logo}>
        {result.logoUrl ? (
          <Image source={{ uri: result.logoUrl }} style={ur.logoImg} />
        ) : (
          <Text style={ur.initial}>{initial}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ur.name}>{result.name}</Text>
        <View style={ur.metaRow}>
          <Text style={ur.domain}>{result.website}</Text>
          {result.platform === 'shopify' && (
            <View style={[ur.badge, result.shopifyVerified && ur.badgeVerified]}>
              <Text style={ur.badgeText}>Shopify{result.shopifyVerified ? ' ✓' : ''}</Text>
            </View>
          )}
          {result.platform === 'ikas' && (
            <View style={ur.badge}>
              <Text style={ur.badgeText}>İkas</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[ur.addBtn, adding && ur.addBtnLoading]}
        onPress={onAdd}
        disabled={adding}
      >
        {adding
          ? <ActivityIndicator size="small" color="#fff" />
          : <Text style={ur.addBtnText}>+ Ekle</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const ur = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface1,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.borderBurgund,
    padding: 12, marginTop: 8,
  },
  logo: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: Colors.surface3, borderWidth: 1, borderColor: Colors.border2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
  },
  logoImg: { width: '100%', height: '100%' },
  initial: { fontFamily: Fonts.displayBold, fontSize: 18, color: Colors.rose3 },
  name: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  domain: { fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4 },
  badge: {
    backgroundColor: Colors.surface3, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 0.5, borderColor: Colors.border2,
  },
  badgeVerified: { backgroundColor: Colors.successGlow, borderColor: `${Colors.success}40` },
  badgeText: { fontFamily: Fonts.uiMedium, fontSize: 10, color: Colors.success },
  addBtn: {
    backgroundColor: Colors.rose3, borderRadius: 9,
    paddingHorizontal: 14, paddingVertical: 8, flexShrink: 0,
  },
  addBtnLoading: { opacity: 0.6 },
  addBtnText: { fontFamily: Fonts.uiMedium, fontSize: 13, color: '#FFF9EE' },
});

// ── URL Arama Bölümü ──────────────────────────────────────────────────────────

function UrlSearchSection({ onAdded }: { onAdded: () => void }) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [text,     setText]     = useState('');
  const [checking, setChecking] = useState(false);
  const [result,   setResult]   = useState<UrlCheckResult | null>(null);
  const [adding,   setAdding]   = useState(false);
  const [added,    setAdded]    = useState(false);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setResult(null); setAdded(false);

    if (!isUrlLike(text)) { setChecking(false); return; }

    setChecking(true);
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke('check-boutique-url', {
          body: { url: text.trim() },
        });
        setResult(data?.found ? data : { found: false });
      } catch {
        setResult({ found: false });
      } finally {
        setChecking(false);
      }
    }, 600);
  }, [text]);

  const handleAdd = useCallback(async () => {
    if (!session?.user || !result?.found || adding) return;
    setAdding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { data: brandId, error } = await supabase.rpc('add_manual_brand', {
        p_name: result.name!, p_website: result.website!, p_category: 'Giyim',
      });
      if (error || !brandId) throw error ?? new Error();

      qc.invalidateQueries({ queryKey: ['savedBrands'] });
      qc.invalidateQueries({ queryKey: ['discover-feed'] });

      supabase.functions.invoke('sync-brand-products', {
        body: { brand_id: brandId, website_url: `https://${result.website}` },
      }).catch(() => {});
      supabase.functions.invoke('extract-brand-assets', {
        body: { brand_id: brandId },
      }).catch(() => {});

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAdded(true);
      setAdding(false);
      onAdded();
      setTimeout(() => { setText(''); setResult(null); setAdded(false); }, 1800);
    } catch {
      setAdding(false);
    }
  }, [session, result, adding, qc, onAdded]);

  return (
    <View style={us.wrap}>
      {/* Input */}
      <View style={us.inputRow}>
        {checking
          ? <ActivityIndicator size="small" color={Colors.gold3} style={{ width: 20 }} />
          : <Ionicons
              name="globe-outline"
              size={17}
              color={isUrlLike(text) ? Colors.rose3 : Colors.text4}
            />
        }
        <TextInput
          style={us.input}
          placeholder="Site adresi ekle... (örn: casanaturale.com)"
          placeholderTextColor={Colors.text5}
          value={text}
          onChangeText={setText}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="done"
          selectionColor={Colors.rose3}
        />
        {text.length > 0 && (
          <TouchableOpacity
            onPress={() => { setText(''); setResult(null); setAdded(false); }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={Colors.text4} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sonuç */}
      {result?.found && !added && (
        <UrlResultCard result={result} adding={adding} onAdd={handleAdd} />
      )}
      {result && !result.found && (
        <Text style={us.notFound}>Siteye ulaşılamadı — URL'yi kontrol et</Text>
      )}
      {added && (
        <View style={us.addedRow}>
          <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
          <Text style={us.addedText}>Butik eklendi, ürünler yükleniyor...</Text>
        </View>
      )}
    </View>
  );
}

const us = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginBottom: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface2,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border2,
    paddingHorizontal: 14, height: 48,
  },
  input: {
    flex: 1, fontFamily: Fonts.uiLight, fontSize: 14,
    color: Colors.text1, height: '100%',
  },
  notFound: {
    fontFamily: Fonts.uiLight, fontSize: 12, color: Colors.text4,
    marginTop: 8, textAlign: 'center',
  },
  addedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 8,
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

  const renderItem = useCallback(({ item, index }: { item: Brand; index: number }) => (
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
  ), [savedBrands_]);

  const isEmpty = !isLoading && savedBrands.length === 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.surface1, Colors.bg]} locations={[0, 0.25]} style={StyleSheet.absoluteFill} />

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
                Yukarıdaki alana site adresi yazarak{'\n'}veya + butonuna basarak ekle
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
  title: {
    fontFamily: Fonts.displayBold, fontSize: 28,
    color: Colors.text1, letterSpacing: -0.5,
  },
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
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  listEmpty: { flex: 1 },
  columnWrap: { gap: 10, marginBottom: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40, gap: 12 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: Colors.roseGlow, borderWidth: 1, borderColor: Colors.borderBurgund,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontFamily: Fonts.displayBold, fontSize: 20, color: Colors.text1 },
  emptySub: {
    fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text4,
    textAlign: 'center', lineHeight: 21,
  },
  emptyBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  emptyBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 13,
  },
  emptyBtnText: { fontFamily: Fonts.ui, fontSize: 15, color: '#FFF9EE' },
});
