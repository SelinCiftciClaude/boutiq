/**
 * AddBoutiqueModal — Hibrit butik arama.
 * İsim → anlık local + DB önerileri.
 * URL (casanaturale.com) → check-boutique-url edge function ile gerçek site bilgisi.
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  Image, Animated, Dimensions, TextInput, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { type ManagedBoutique } from './BoutiqueCard';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { addSavedBrand } from '@/services/queries';

const { height: SCREEN_H } = Dimensions.get('window');

// ── Anında filtrelenen local liste (sıfır gecikme) ────────────────────────────
// DB'deki gerçek markalar — kullanıcı ilk harfi yazar yazmaz görünür
const LOCAL_BRANDS: SuggestionItem[] = [
  { id: 'l01', name: 'Selma Çilek',          website: 'selmacilek.com',         category: 'Giyim'      },
  { id: 'l02', name: 'Hof Silk',             website: 'hofsilk.com',            category: 'Giyim'      },
  { id: 'l03', name: 'Love on Friday',       website: 'loveonfriday.com',       category: 'Giyim'      },
  { id: 'l04', name: 'Mlouye',               website: 'mlouye.com',             category: 'Çanta'      },
  { id: 'l05', name: 'Manuel Atelier',       website: 'manuelatelier.com',      category: 'Giyim'      },
  { id: 'l06', name: 'The Purest Solutions', website: 'thepurestsolutions.com', category: 'Cilt Bakımı' },
  { id: 'l07', name: 'VavRattan',            website: 'vavrattan.com',          category: 'Ev & Dekor'  },
  { id: 'l08', name: 'Muun',                 website: 'muun.com',               category: 'Giyim'      },
  { id: 'l09', name: 'Noire Studio',         website: 'noirestudio.com',        category: 'Giyim'      },
  { id: 'l10', name: 'Arce Leather',         website: 'arceleather.com',        category: 'Çanta'      },
  { id: 'l11', name: 'Kamela',               website: 'kamela.com.tr',          category: 'Giyim'      },
  { id: 'l12', name: 'Sia Moore',            website: 'siamoore.com',           category: 'Giyim'      },
  { id: 'l13', name: 'Müf Studio',           website: 'mufstudio.com',          category: 'Giyim'      },
  { id: 'l14', name: 'Baskı',               website: 'baski.com.tr',           category: 'Giyim'      },
  { id: 'l15', name: 'Trendyol',             website: 'trendyol.com',           category: 'Giyim'      },
  { id: 'l16', name: 'Zara',                 website: 'zara.com',               category: 'Giyim'      },
  { id: 'l17', name: 'Mango',                website: 'mango.com',              category: 'Giyim'      },
  { id: 'l18', name: 'Stradivarius',         website: 'stradivarius.com',       category: 'Giyim'      },
  { id: 'l19', name: 'Massimo Dutti',        website: 'massimodutti.com',       category: 'Giyim'      },
  { id: 'l20', name: 'H&M',                  website: 'hm.com',                 category: 'Giyim'      },
];

// ── URL yardımcıları ─────────────────────────────────────────────────────────

// Giriş URL benzeri mi? (casanaturale.com, www.shop.com gibi)
function isUrlLike(q: string): boolean {
  const t = q.trim();
  return t.includes('.') && !t.includes(' ') && t.length >= 4 &&
    /^[a-zA-Z0-9\-_.]+\.[a-zA-Z]{2,}/.test(t);
}

// "https://www.casanaturale.com/tr" → "casanaturale.com"
function extractDomain(q: string): string {
  return q.trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .toLowerCase();
}

// ── Tipler ────────────────────────────────────────────────────────────────────

interface SuggestionItem {
  id: string;
  name: string;
  website: string;
  category: string;
  logoUrl?: string;
  coverUrl?: string;
  productCount?: number;
  fromDb?: boolean;    // true → DB'den geldi
  fromUrl?: boolean;   // true → check-boutique-url'den geldi
  platform?: 'shopify' | 'ikas' | 'other';
  shopifyVerified?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd?: (boutique: ManagedBoutique) => void;
}

// ── Vurgulama bileşeni ────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <Text style={hl.base}>{text}</Text>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i === -1) return <Text style={hl.base}>{text}</Text>;
  return (
    <Text style={hl.base}>
      {text.slice(0, i)}
      <Text style={hl.mark}>{text.slice(i, i + query.length)}</Text>
      {text.slice(i + query.length)}
    </Text>
  );
}

const hl = StyleSheet.create({
  base: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1 },
  mark: {
    fontFamily: Fonts.ui,
    color: Colors.gold1,
    backgroundColor: 'rgba(200,154,40,0.18)',
  },
});

// ── Öneri satırı ─────────────────────────────────────────────────────────────

function SuggestionRow({
  item, query, isFirst, addingId, onAdd,
}: {
  item: SuggestionItem;
  query: string;
  isFirst: boolean;
  addingId: string | null;
  onAdd: (item: SuggestionItem) => void;
}) {
  const isAdding = addingId === item.id;
  const domain   = item.website.replace(/^https?:\/\//, '').replace(/^www\./, '');

  return (
    <TouchableOpacity
      style={sg.row}
      onPress={() => onAdd(item)}
      activeOpacity={0.75}
    >
      {/* Favicon benzeri logo */}
      <View style={sg.icon}>
        {item.logoUrl ? (
          <Image source={{ uri: item.logoUrl }} style={sg.iconImg} />
        ) : (
          <Text style={sg.iconLetter}>{item.name[0].toUpperCase()}</Text>
        )}
      </View>

      {/* İsim + URL */}
      <View style={sg.textWrap}>
        <Highlight text={item.name} query={query} />
        <Text style={sg.url} numberOfLines={1}>{domain}</Text>
      </View>

      {/* Ekle butonu */}
      <TouchableOpacity
        style={[sg.addBtn, isFirst && sg.addBtnFilled]}
        onPress={() => onAdd(item)}
        disabled={isAdding}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isAdding
          ? <ActivityIndicator size="small" color={isFirst ? '#fff' : Colors.rose3} />
          : <Text style={[sg.addBtnText, isFirst && sg.addBtnTextFilled]}>+ Ekle</Text>
        }
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const sg = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border1,
  },
  icon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.surface3,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  iconImg: { width: '100%', height: '100%' },
  iconLetter: { fontFamily: Fonts.displayBold, fontSize: 15, color: Colors.rose3 },
  textWrap: { flex: 1, gap: 1 },
  url: { fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4 },
  addBtn: {
    borderWidth: 1.5,
    borderColor: Colors.rose3,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 52,
    alignItems: 'center',
    flexShrink: 0,
  },
  addBtnFilled: {
    backgroundColor: Colors.rose3,
    borderColor: Colors.rose3,
  },
  addBtnText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.rose3,
  },
  addBtnTextFilled: { color: '#FFF9EE' },
});

// ── Ana modal ─────────────────────────────────────────────────────────────────

export function AddBoutiqueModal({ visible, onClose, onAdd }: Props) {
  const { session } = useAuth();
  const qc          = useQueryClient();
  const inputRef    = useRef<TextInput>(null);
  const dbTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query,      setQuery]      = useState('');
  const [dbResults,  setDbResults]  = useState<SuggestionItem[]>([]);
  const [dbLoading,  setDbLoading]  = useState(false);
  const [addingId,   setAddingId]   = useState<string | null>(null);
  const [addedId,    setAddedId]    = useState<string | null>(null);
  // Web arama (simülasyon)
  const [webLoading, setWebLoading] = useState(false);
  const [webResult,  setWebResult]  = useState<SuggestionItem | null>(null);
  const [webAdding,  setWebAdding]  = useState(false);
  const [webAdded,   setWebAdded]   = useState(false);
  // URL kontrol (gerçek)
  const [urlState,   setUrlState]   = useState<'idle' | 'checking' | 'found' | 'notFound'>('idle');
  const [urlResult,  setUrlResult]  = useState<SuggestionItem | null>(null);
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animasyonlar
  const slideAnim    = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const listAnim     = useRef(new Animated.Value(0)).current;
  const webBlink     = useRef(new Animated.Value(1)).current;

  // ── Modal açılış/kapanış ──────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
      setTimeout(() => inputRef.current?.focus(), 320);
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 240, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      setTimeout(reset, 280);
    }
  }, [visible]);

  // Web loading blink
  useEffect(() => {
    if (webLoading) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(webBlink, { toValue: 0.35, duration: 550, useNativeDriver: true }),
        Animated.timing(webBlink, { toValue: 1,    duration: 550, useNativeDriver: true }),
      ]));
      loop.start();
      return () => loop.stop();
    }
    webBlink.setValue(1);
  }, [webLoading]);

  // Liste fade-in
  useEffect(() => {
    if (localFiltered.length > 0 || dbResults.length > 0) {
      listAnim.setValue(0);
      Animated.timing(listAnim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    }
  }, [query]);

  const reset = () => {
    setQuery(''); setDbResults([]); setDbLoading(false);
    setAddingId(null); setAddedId(null);
    setWebLoading(false); setWebResult(null);
    setWebAdding(false); setWebAdded(false);
    setUrlState('idle'); setUrlResult(null);
    listAnim.setValue(0);
  };

  // ── Anlık local filtre ────────────────────────────────────────────────────
  const localFiltered = useMemo((): SuggestionItem[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return LOCAL_BRANDS.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.website.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [query]);

  // ── DB araması (arka planda, 150ms debounce) ──────────────────────────────
  useEffect(() => {
    if (dbTimer.current) clearTimeout(dbTimer.current);
    const q = query.trim();
    if (!q || q.length < 2) { setDbResults([]); setDbLoading(false); return; }

    setDbLoading(true);
    dbTimer.current = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from('brands')
          .select('id, name, logo_url, category, website')
          .ilike('name', `%${q}%`)
          .order('name')
          .limit(6);

        if (data?.length) {
          setDbResults(data.map((b: any) => ({
            id: b.id, name: b.name, website: b.website ?? '',
            category: b.category ?? 'Giyim',
            logoUrl: b.logo_url ?? undefined,
            fromDb: true,
          })));
        }
      } catch { /* sessizce geç */ }
      setDbLoading(false);
    }, 150);
  }, [query]);

  // ── URL kontrolü: DB + local boş gelince gerçek siteyi fetch et ─────────────
  useEffect(() => {
    if (urlTimer.current) clearTimeout(urlTimer.current);
    const q = query.trim();

    if (!isUrlLike(q)) {
      setUrlState('idle');
      setUrlResult(null);
      return;
    }

    // Zaten DB'de bulunduysa URL kontrole gerek yok
    if (dbResults.length > 0) {
      setUrlState('idle');
      setUrlResult(null);
      return;
    }

    setUrlState('checking');
    setUrlResult(null);

    urlTimer.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-boutique-url', {
          body: { url: q },
        });

        if (error || !data?.found) {
          setUrlState('notFound');
          return;
        }

        setUrlResult({
          id:              `url-${data.website}`,
          name:            data.name,
          website:         data.website,
          category:        'Giyim',
          logoUrl:         data.logoUrl ?? undefined,
          coverUrl:        data.coverUrl ?? undefined,
          platform:        data.platform,
          shopifyVerified: data.shopifyVerified,
          fromUrl:         true,
          fromDb:          false,
        });
        setUrlState('found');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        setUrlState('notFound');
      }
    }, 600);
  }, [query, dbResults.length]);

  // DB sonuçlarını local listeyle birleştir, local önce gelsin, DB'dekiler günceller
  const suggestions = useMemo((): SuggestionItem[] => {
    if (dbResults.length > 0) {
      // DB sonuçları varsa onları kullan (daha doğru, ID'leri gerçek)
      return dbResults.slice(0, 6);
    }
    return localFiltered;
  }, [dbResults, localFiltered]);

  // ── Web araması (tıklanınca simüle et) ───────────────────────────────────
  const handleWebSearch = useCallback(() => {
    if (webLoading || webResult || !query.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWebLoading(true);
    setWebResult(null);

    if (webTimer.current) clearTimeout(webTimer.current);
    webTimer.current = setTimeout(() => {
      const q    = query.trim();
      const slug = q.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
      setWebResult({
        id: `web-${slug}`, name: q.charAt(0).toUpperCase() + q.slice(1),
        website: `${slug}.com`, category: 'Giyim', fromDb: false,
      });
      setWebLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  }, [query, webLoading, webResult]);

  // ── Ortak ekleme yardımcısı — hem local/web hem de doğrudan çağrı için ─────
  const addViaRpc = useCallback(async (
    item: SuggestionItem,
    opts?: { isWeb?: boolean },
  ) => {
    if (!session?.user || addingId) return;
    if (opts?.isWeb) setWebAdding(true); else setAddingId(item.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data: brandId, error } = await supabase.rpc('add_manual_brand', {
        p_name: item.name, p_website: item.website, p_category: item.category,
      });
      if (error || !brandId) throw error ?? new Error('Ekleme başarısız');

      qc.invalidateQueries({ queryKey: ['savedBrands'] });
      qc.invalidateQueries({ queryKey: ['discover-feed'] });
      qc.invalidateQueries({ queryKey: ['discover-categories'] });

      const syncUrl = item.website.startsWith('http')
        ? item.website
        : `https://${item.website}`;
      supabase.functions
        .invoke('sync-brand-products', { body: { brand_id: brandId, website_url: syncUrl } })
        .catch(() => {});
      supabase.functions
        .invoke('extract-brand-assets', { body: { brand_id: brandId } })
        .catch(() => {});

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (opts?.isWeb) {
        setWebAdded(true);
        setWebAdding(false);
      } else {
        setAddedId(item.id);
      }

      onAdd?.({
        id: brandId, name: item.name,
        handle: item.website.replace(/^https?:\/\//, '').replace(/^www\./, ''),
        logoUrl: item.logoUrl, category: item.category,
        status: 'pending', productCount: item.productCount ?? 0,
        isManual: opts?.isWeb ?? false,
      });

      setTimeout(() => { onClose(); router.push(`/brand/${brandId}` as any); }, 900);
    } catch {
      if (opts?.isWeb) setWebAdding(false); else setAddingId(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [session, addingId, qc, onAdd, onClose]);

  // ── DB markası ekleme (gerçek UUID, addSavedBrand daha hızlı) ────────────
  const handleAddDb = useCallback(async (item: SuggestionItem) => {
    if (!session?.user || addingId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAddingId(item.id);
    try {
      await addSavedBrand(session.user.id, item.id);
      qc.invalidateQueries({ queryKey: ['savedBrands'] });
      qc.invalidateQueries({ queryKey: ['discover-feed'] });
      qc.invalidateQueries({ queryKey: ['discover-categories'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAddedId(item.id);
      onAdd?.({
        id: item.id, name: item.name,
        handle: item.website.replace(/^https?:\/\//, '').replace(/^www\./, ''),
        logoUrl: item.logoUrl, category: item.category,
        status: 'pending', productCount: item.productCount ?? 0, isManual: false,
      });
      setTimeout(() => { onClose(); router.push(`/brand/${item.id}` as any); }, 900);
    } catch {
      setAddingId(null);
    }
  }, [session, addingId, qc, onAdd, onClose]);

  // ── Web satırındaki "+ Ekle" butonu ───────────────────────────────────────
  const handleAddWeb = useCallback(() => {
    if (!webResult || webAdding || webAdded) return;
    addViaRpc(webResult, { isWeb: true });
  }, [webResult, webAdding, webAdded, addViaRpc]);

  // ── Öneri listesindeki "+ Ekle" butonu ────────────────────────────────────
  // fromDb=true → gerçek UUID var, addSavedBrand kullan
  // fromDb=false/undefined → local veya web sonucu, RPC ile bul/oluştur
  const handleAdd = useCallback((item: SuggestionItem) => {
    if (item.fromDb) handleAddDb(item);
    else addViaRpc(item);
  }, [handleAddDb, addViaRpc]);

  const hasContent = suggestions.length > 0 || webLoading || webResult;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[s.backdrop, { opacity: backdropAnim }]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.kav}
        pointerEvents="box-none"
      >
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={[Colors.surface2, Colors.surface1]} style={StyleSheet.absoluteFill} />

          {/* Tutma çubuğu */}
          <View style={s.handle} />

          {/* ── URL BAR ── */}
          <View style={s.urlBar}>
            {/* Sol: arama ikonu */}
            <View style={s.urlLeft}>
              {dbLoading
                ? <ActivityIndicator size="small" color={Colors.gold3} style={{ width: 18 }} />
                : <Ionicons name="search-outline" size={16}
                    color={query.length ? Colors.rose3 : Colors.text4} />
              }
            </View>

            <TextInput
              ref={inputRef}
              style={s.urlInput}
              placeholder="Butik ara... (örn: muun, selma, zara)"
              placeholderTextColor={Colors.text5}
              value={query}
              onChangeText={t => { setQuery(t); setWebResult(null); setWebLoading(false); setWebAdded(false); }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              selectionColor={Colors.rose3}
            />

            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => { setQuery(''); setDbResults([]); setWebResult(null); inputRef.current?.focus(); }}
                style={s.urlClear}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={16} color={Colors.text4} />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={onClose} style={s.urlCancel}>
              <Text style={s.urlCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>

          {/* ── ÖNERI LİSTESİ ── */}
          {!query && (
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>200+ butik adı veya site adresi yaz</Text>
            </View>
          )}

          {query.trim().length >= 1 && (
            <Animated.View style={[s.listWrap, { opacity: listAnim }]}>

              {/* DB / Local önerileri */}
              {suggestions.map((item, i) => (
                <SuggestionRow
                  key={item.id}
                  item={item}
                  query={query}
                  isFirst={i === 0}
                  addingId={addingId}
                  onAdd={handleAdd}
                />
              ))}

              {/* Eklendi mesajı */}
              {addedId && (
                <View style={s.successRow}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={s.successText}>Butik eklendi, feed yenileniyor...</Text>
                </View>
              )}

              {/* ── URL kontrol sonucu ── */}
              {isUrlLike(query) && (
                <>
                  {/* Ayraç (DB sonucu varsa) */}
                  {suggestions.length > 0 && (
                    <View style={s.dividerRow}>
                      <View style={s.dividerLine} />
                      <Text style={s.dividerText}>site adresi</Text>
                      <View style={s.dividerLine} />
                    </View>
                  )}

                  {/* Kontrol ediliyor */}
                  {urlState === 'checking' && (
                    <View style={s.urlCheckRow}>
                      <ActivityIndicator size="small" color={Colors.gold3} />
                      <Text style={s.urlCheckText}>
                        {extractDomain(query)} kontrol ediliyor...
                      </Text>
                    </View>
                  )}

                  {/* Bulunamadı */}
                  {urlState === 'notFound' && (
                    <View style={s.urlCheckRow}>
                      <Ionicons name="close-circle-outline" size={16} color={Colors.text4} />
                      <Text style={s.urlCheckText}>Siteye ulaşılamadı</Text>
                    </View>
                  )}

                  {/* Bulundu — gerçek site kartı */}
                  {urlState === 'found' && urlResult && !webAdded && (
                    <View style={s.urlFoundCard}>
                      {/* Logo */}
                      <View style={s.urlLogo}>
                        {urlResult.logoUrl ? (
                          <Image source={{ uri: urlResult.logoUrl }} style={s.urlLogoImg} />
                        ) : (
                          <Text style={s.urlLogoLetter}>{urlResult.name[0]?.toUpperCase()}</Text>
                        )}
                      </View>
                      {/* Bilgi */}
                      <View style={{ flex: 1 }}>
                        <Text style={s.urlFoundName}>{urlResult.name}</Text>
                        <View style={s.urlMeta}>
                          <Text style={s.urlFoundDomain}>{urlResult.website}</Text>
                          {urlResult.platform && urlResult.platform !== 'other' && (
                            <View style={[s.platformBadge, urlResult.shopifyVerified && s.platformBadgeVerified]}>
                              <Text style={s.platformBadgeText}>
                                {urlResult.platform === 'shopify' ? 'Shopify' : 'İkas'}
                                {urlResult.shopifyVerified ? ' ✓' : ''}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {/* Ekle butonu */}
                      <TouchableOpacity
                        style={[s.urlAddBtn, (addingId === urlResult.id || webAdding) && { opacity: 0.5 }]}
                        onPress={() => addViaRpc(urlResult, { isWeb: true })}
                        disabled={addingId === urlResult.id || webAdding}
                      >
                        {(addingId === urlResult.id || webAdding)
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={s.urlAddBtnText}>+ Ekle</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* URL eklendi */}
                  {webAdded && (
                    <View style={s.successRow}>
                      <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                      <Text style={s.successText}>Başarıyla eklendi! Yönlendiriliyorsun...</Text>
                    </View>
                  )}
                </>
              )}

              {/* İsim araması — DB'de yok ve URL de değil */}
              {suggestions.length === 0 && !dbLoading && !isUrlLike(query) && query.trim().length >= 2 && (
                <View style={s.emptyWrap}>
                  <Text style={s.emptyText}>
                    "{query}" bulunamadı{'\n'}
                    <Text style={{ color: Colors.gold2 }}>Site adresini yaz: örn. marka.com</Text>
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          <View style={{ height: 32 }} />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border2,
    overflow: 'hidden',
    borderBottomWidth: 0,
    maxHeight: SCREEN_H * 0.82,
  },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.border3,
    borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 12,
  },

  // URL Bar
  urlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 6,
    backgroundColor: Colors.surface3,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border3,
    paddingLeft: 12,
    paddingRight: 4,
    height: 48,
    gap: 8,
  },
  urlLeft: { width: 20, alignItems: 'center' },
  urlInput: {
    flex: 1,
    fontFamily: Fonts.uiLight,
    fontSize: 15,
    color: Colors.text1,
    height: '100%',
  },
  urlClear: { padding: 4 },
  urlCancel: { paddingHorizontal: 10, paddingVertical: 8 },
  urlCancelText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: Colors.rose3,
  },

  // Öneri listesi
  listWrap: {
    paddingHorizontal: 18,
    paddingTop: 4,
  },

  // Başarı
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  successText: {
    fontFamily: Fonts.uiLight,
    fontSize: 13,
    color: Colors.success,
  },

  // Ayraç
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: Colors.border2,
  },
  dividerText: {
    fontFamily: Fonts.uiLight,
    fontSize: 10,
    color: Colors.text5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Web satırı
  webRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 4,
  },
  webIcon: {
    width: 32, height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(200,154,40,0.10)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  webLabel: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.text2,
  },
  webSub: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    marginTop: 1,
  },
  webResultName: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.text1,
  },
  webResultUrl: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    marginTop: 1,
  },
  webAddBtn: {
    borderWidth: 1.5,
    borderColor: Colors.rose3,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  webAddBtnText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.rose3,
  },

  // Boş durum
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontFamily: Fonts.uiLight,
    fontSize: 13,
    color: Colors.text5,
    textAlign: 'center',
    lineHeight: 20,
  },

  // URL kontrol
  urlCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  urlCheckText: {
    fontFamily: Fonts.uiLight,
    fontSize: 13,
    color: Colors.text4,
  },

  // URL bulundu kartı
  urlFoundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderBurgund,
    padding: 12,
    marginVertical: 4,
  },
  urlLogo: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: Colors.surface3,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
    borderWidth: 1, borderColor: Colors.border2,
  },
  urlLogoImg: { width: '100%', height: '100%' },
  urlLogoLetter: { fontFamily: Fonts.displayBold, fontSize: 18, color: Colors.rose3 },
  urlFoundName: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: Colors.text1,
    letterSpacing: -0.1,
  },
  urlMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  urlFoundDomain: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
  },
  platformBadge: {
    backgroundColor: Colors.surface3,
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 0.5, borderColor: Colors.border2,
  },
  platformBadgeVerified: {
    backgroundColor: Colors.successGlow,
    borderColor: `${Colors.success}40`,
  },
  platformBadgeText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
    color: Colors.success,
  },
  urlAddBtn: {
    backgroundColor: Colors.rose3,
    borderRadius: 9,
    paddingHorizontal: 14, paddingVertical: 8,
    flexShrink: 0,
  },
  urlAddBtnText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: '#FFF9EE',
  },
});
