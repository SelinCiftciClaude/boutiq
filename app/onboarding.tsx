import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Modal, Dimensions, Animated, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useInterests } from '@/context/InterestsContext';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 4; // adım 1-4 (0 = welcome, 5 = tamamlama)

// ── Veri tanımları ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'giyim',   label: 'Giyim',           emoji: '👗' },
  { id: 'çanta',   label: 'Çanta',           emoji: '👜' },
  { id: 'takı',    label: 'Takı & Aksesuar', emoji: '💍' },
  { id: 'ev',      label: 'Ev & Yaşam',      emoji: '🏠' },
  { id: 'bebek',   label: 'Bebek & Çocuk',   emoji: '👶' },
  { id: 'güzellik',label: 'Kozmetik',        emoji: '💄' },
  { id: 'mutfak',  label: 'Mutfak & Sofra',  emoji: '🍽️' },
  { id: 'teknoloji', label: 'Teknoloji',     emoji: '📱' },
  { id: 'evcil',   label: 'Pet',             emoji: '🐶' },
  { id: 'gıda',    label: 'Gıda & Organik',  emoji: '🌿' },
];

const STYLES = [
  {
    id: 'minimal',
    label: 'Minimal',
    desc: 'Sade, temiz çizgiler',
    color: '#E8E4DF',
    textColor: '#2B2B2B',
  },
  {
    id: 'klasik',
    label: 'Klasik',
    desc: 'Zamansız ve şık',
    color: '#D4C5B0',
    textColor: '#2B0610',
  },
  {
    id: 'romantik',
    label: 'Romantik',
    desc: 'Pastel, kadınsı',
    color: '#E8C4C4',
    textColor: '#5C1A1A',
  },
  {
    id: 'bohem',
    label: 'Bohem',
    desc: 'Özgür, doğal tonlar',
    color: '#C9B99A',
    textColor: '#3D2B1A',
  },
  {
    id: 'streetwear',
    label: 'Streetwear',
    desc: 'Casual, genç',
    color: '#B8C4CC',
    textColor: '#1A2B3D',
  },
  {
    id: 'preppy',
    label: 'Preppy',
    desc: 'Düzenli, polished',
    color: '#C4D4B0',
    textColor: '#1A3D1A',
  },
];

const BRAND_TABS = [
  { id: 'foryou',   label: 'Senin İçin' },
  { id: 'popular',  label: 'Popüler' },
  { id: 'new',      label: 'Yeni' },
];

// ── Yardımcı bileşenler ───────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: current / total,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [current, total]);
  const w = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={pb.track}>
      <Animated.View style={[pb.fill, { width: w as any }]}>
        <LinearGradient colors={[Colors.rose2, Colors.rose3]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const pb = StyleSheet.create({
  track: { height: 3, backgroundColor: Colors.border2, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, overflow: 'hidden' },
});

function BrandRow({ brand, added, onToggle }: { brand: any; added: boolean; onToggle: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onToggle();
  };
  const initial = brand.name?.charAt(0)?.toUpperCase() ?? '?';
  return (
    <Animated.View style={[br.row, added && br.rowAdded, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[br.avatar, { backgroundColor: added ? Colors.rose3 : Colors.surface3 }]}>
        <Text style={[br.avatarText, { color: added ? '#fff' : Colors.text2 }]}>{initial}</Text>
      </View>
      <View style={br.info}>
        <Text style={br.name} numberOfLines={1}>{brand.name}</Text>
        <Text style={br.sub} numberOfLines={1}>{brand.category} · {(brand.website || '').replace(/^https?:\/\/(www\.)?/, '')}</Text>
      </View>
      <TouchableOpacity style={[br.btn, added && br.btnAdded]} onPress={handlePress} activeOpacity={0.8}>
        <Ionicons name={added ? 'checkmark' : 'add'} size={14} color={added ? '#fff' : Colors.rose3} />
        <Text style={[br.btnText, added && br.btnTextAdded]}>{added ? 'Eklendi' : 'Ekle'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const br = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: Colors.surface2, borderWidth: 0.5, borderColor: Colors.border2 },
  rowAdded: { borderColor: Colors.borderBurgund, backgroundColor: Colors.roseGlow },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.ui, fontSize: 18 },
  info: { flex: 1, gap: 2 },
  name: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1 },
  sub: { fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: Colors.borderBurgund },
  btnAdded: { backgroundColor: Colors.rose3, borderColor: Colors.rose3 },
  btnText: { fontFamily: Fonts.uiMedium, fontSize: 12, color: Colors.rose3 },
  btnTextAdded: { color: '#fff' },
});

// ── Favicon bileşeni (öneri kartları için) ────────────────────────────────────

function SuggestionFavicon({ domain }: { domain: string }) {
  const [error, setError] = useState(false);
  const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  return (
    <View style={sf.wrap}>
      {!error ? (
        <Image source={{ uri: faviconUrl }} style={sf.img} onError={() => setError(true)} />
      ) : (
        <Ionicons name="globe-outline" size={20} color={Colors.text3} />
      )}
    </View>
  );
}

const sf = StyleSheet.create({
  wrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.surface3, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: Colors.border2 },
  img: { width: 24, height: 24, borderRadius: 4 },
});

// ── Konfeti animasyonu (Step 5) ───────────────────────────────────────────────

function Confetti() {
  const particles = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      op: new Animated.Value(0),
      color: [Colors.rose3, Colors.gold3, Colors.teal2, '#F4A261'][i % 4],
      size: 6 + (i % 4) * 2,
      startX: (Math.random() - 0.5) * width * 0.8,
    }))
  ).current;

  useEffect(() => {
    const anims = particles.map((p, i) =>
      Animated.sequence([
        Animated.delay(i * 40),
        Animated.parallel([
          Animated.timing(p.op, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: -(120 + Math.random() * 160), duration: 900, useNativeDriver: true }),
          Animated.timing(p.x, { toValue: p.startX, duration: 900, useNativeDriver: true }),
        ]),
        Animated.timing(p.op, { toValue: 0, duration: 300, useNativeDriver: true }),
      ])
    );
    Animated.stagger(30, anims).start();
  }, []);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: '40%', left: '50%' }}>
      {particles.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute',
          width: p.size, height: p.size,
          borderRadius: p.size / 2,
          backgroundColor: p.color,
          opacity: p.op,
          transform: [{ translateX: p.x }, { translateY: p.y }],
        }} />
      ))}
    </View>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { markDone } = useInterests();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [brandTab, setBrandTab] = useState<'foryou' | 'popular' | 'new'>('foryou');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [debouncedManualUrl, setDebouncedManualUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Debounce: 400ms sonra arama tetikle
  useEffect(() => {
    const t = setTimeout(() => setDebouncedManualUrl(manualUrl), 400);
    return () => clearTimeout(t);
  }, [manualUrl]);

  // Domain tahmini (lutvelizade → lutvelizade.com)
  const inferredDomain = useMemo(() => {
    const q = debouncedManualUrl.trim().toLowerCase();
    if (q.length < 2) return null;
    const cleaned = q.replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (cleaned.includes('.')) return cleaned.split('/')[0];
    return `${cleaned}.com`;
  }, [debouncedManualUrl]);

  // DB'deki mevcut markalar arasında arama
  const { data: brandSuggestions = [] } = useQuery({
    queryKey: ['manual-brand-search', debouncedManualUrl],
    queryFn: async () => {
      const q = debouncedManualUrl.trim();
      if (q.length < 2) return [];
      const { data } = await supabase
        .from('brands')
        .select('id, name, website')
        .or(`website.ilike.%${q}%,name.ilike.%${q}%`)
        .limit(3);
      return data ?? [];
    },
    enabled: debouncedManualUrl.length >= 2 && showManualModal,
  });

  const slideAnim = useRef(new Animated.Value(0)).current;

  const goTo = (next: number) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -20, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    setStep(next);
  };

  const goNext = () => goTo(step + 1);
  const goBack = () => goTo(step - 1);

  // Brands query
  const { data: allBrands = [], isLoading: brandsLoading } = useQuery({
    queryKey: ['onboarding-brands'],
    queryFn: async () => {
      const { data } = await supabase
        .from('brands')
        .select('id, name, category, website, style_tags, onboarding_priority, created_at')
        .order('onboarding_priority', { ascending: false });
      return data ?? [];
    },
    enabled: step === 3,
  });

  const filteredBrands = useMemo(() => {
    if (brandTab === 'new') return [...allBrands].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (brandTab === 'popular') return allBrands;
    // foryou: seçilen kategoriler + tarz eşleşmesi
    return allBrands.filter(b => {
      const catMatch = selectedCategories.length === 0 || selectedCategories.includes(b.category);
      const styleMatch = selectedStyles.length === 0 || (b.style_tags ?? []).some((t: string) => selectedStyles.includes(t));
      return catMatch || styleMatch;
    });
  }, [allBrands, brandTab, selectedCategories, selectedStyles]);

  const toggleCategory = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategories(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const toggleStyle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStyles(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const toggleBrand = (id: string) => {
    setSelectedBrands(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const handleAddManual = async (urlOverride?: string) => {
    const raw = (urlOverride ?? manualUrl).trim();
    if (!raw) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let url = raw.startsWith('http') ? raw : 'https://' + raw;
    const domain = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    const name = domain.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const { data: existing } = await supabase.from('brands').select('id').ilike('website', `%${domain}%`).maybeSingle();
    if (existing) {
      setSelectedBrands(prev => prev.includes(existing.id) ? prev : [...prev, existing.id]);
    } else {
      const { data: created } = await supabase.from('brands').insert({
        name, website: `https://${domain}`, category: 'giyim', onboarding_priority: 0,
      }).select('id').single();
      if (created) setSelectedBrands(prev => [...prev, created.id]);
    }
    setManualUrl('');
    setDebouncedManualUrl('');
    setShowManualModal(false);
  };

  const handleAddSuggestion = async (brand: { id: string; name: string; website: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedBrands(prev => prev.includes(brand.id) ? prev : [...prev, brand.id]);
    setManualUrl('');
    setDebouncedManualUrl('');
    setShowManualModal(false);
  };

  const handleSkip = async () => {
    Haptics.selectionAsync();
    await markDone(selectedCategories, selectedStyles);
  };

  const handleFinish = async () => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Seçilen butikleri user_brands'e ekle + her biri için ürün sync'i tetikle
    if (user && selectedBrands.length > 0) {
      const rows = selectedBrands.map(brand_id => ({ user_id: user.id, brand_id, is_favorite: false }));
      await supabase.from('user_brands').upsert(rows, { onConflict: 'user_id,brand_id' });

      // Her butik için arka planda ürün senkronizasyonu (non-blocking)
      const { data: brands } = await supabase
        .from('brands').select('id, website, platform').in('id', selectedBrands);
      for (const brand of (brands ?? [])) {
        if (brand.website) {
          supabase.functions
            .invoke('sync-brand-products', { body: { brand_id: brand.id, website_url: brand.website } })
            .catch(() => {});
        }
      }

      // Cache'i temizle — keşfet feed'i yeni markalarla yeniden yüklensin
      qc.invalidateQueries({ queryKey: ['savedBrands'] });
      qc.invalidateQueries({ queryKey: ['discover-feed'] });
      qc.invalidateQueries({ queryKey: ['discover-categories'] });
    }

    // Push notification izni
    if (notifEnabled) {
      await Notifications.requestPermissionsAsync().catch(() => {});
    }

    await markDone(selectedCategories, selectedStyles);
  };

  // Adım 5 konfeti
  useEffect(() => {
    if (step === 4) {
      setShowConfetti(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [step]);

  const stepContent = (() => {
    switch (step) {
      // ── Adım 0: Hoş geldin ───────────────────────────────────────────────
      case 0: return (
        <View style={styles.stepWrap}>
          <View style={styles.welcomeLogoArea}>
            <Text style={styles.welcomeLogo}>BUTİKA</Text>
            <View style={styles.welcomeLogoDivider} />
          </View>
          <Text style={styles.welcomeHeadline}>Sevdiğin tüm butikleri{'\n'}tek yerde topla.</Text>
          <Text style={styles.welcomeSub}>Aşağıdaki 4 adımda Butika'yı sana özel hale getireceğiz. Yaklaşık 1 dakika sürer.</Text>
        </View>
      );

      // ── Adım 1: Kategori ─────────────────────────────────────────────────
      case 1: return (
        <View style={styles.stepWrap}>
          <Text style={styles.stepTitle}>Hangi kategorilerde{'\n'}alışveriş yapıyorsun?</Text>
          <Text style={styles.stepSub}>En az 1 seç, istediğin kadar ekleyebilirsin.</Text>
          <View style={styles.chipGrid}>
            {CATEGORIES.map(cat => {
              const sel = selectedCategories.includes(cat.id);
              return (
                <TouchableOpacity key={cat.id} style={[styles.chip, sel && styles.chipSelected]} onPress={() => toggleCategory(cat.id)} activeOpacity={0.75}>
                  {sel && <LinearGradient colors={[Colors.rose3, Colors.rose4]} style={StyleSheet.absoluteFill} />}
                  <Text style={styles.chipEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.chipLabel, sel && styles.chipLabelSelected]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );

      // ── Adım 2: Tarz ─────────────────────────────────────────────────────
      case 2: return (
        <View style={styles.stepWrap}>
          <Text style={styles.stepTitle}>Tarzına en yakın{'\n'}stilleri seç.</Text>
          <Text style={styles.stepSub}>En fazla 3 tane seçebilirsin — butik önerilerin buna göre şekillenir.</Text>
          <View style={styles.styleGrid}>
            {STYLES.map(s => {
              const sel = selectedStyles.includes(s.id);
              const disabled = !sel && selectedStyles.length >= 3;
              return (
                <TouchableOpacity key={s.id} style={[styles.styleCard, { backgroundColor: s.color, opacity: disabled ? 0.4 : 1 }, sel && styles.styleCardSelected]} onPress={() => !disabled && toggleStyle(s.id)} activeOpacity={0.8}>
                  {sel && <View style={styles.styleCheck}><Ionicons name="checkmark" size={14} color="#fff" /></View>}
                  <Text style={[styles.styleLabel, { color: s.textColor }]}>{s.label}</Text>
                  <Text style={[styles.styleDesc, { color: s.textColor, opacity: 0.65 }]}>{s.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );

      // ── Adım 3: Butikler ─────────────────────────────────────────────────
      case 3: return (
        <View style={styles.stepWrap}>
          <Text style={styles.stepTitle}>Sevdiğin butikleri seç.</Text>
          <Text style={styles.stepSub}>Tarzına uygun butikler listelendi. En az 3 tane seç.</Text>

          {/* Sekme bar */}
          <View style={styles.brandTabs}>
            {BRAND_TABS.map(t => (
              <TouchableOpacity key={t.id} style={[styles.brandTab, brandTab === t.id && styles.brandTabActive]} onPress={() => { Haptics.selectionAsync(); setBrandTab(t.id as any); }} activeOpacity={0.75}>
                <Text style={[styles.brandTabText, brandTab === t.id && styles.brandTabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Seçim sayacı */}
          <View style={styles.brandCounter}>
            <Text style={styles.brandCounterText}>
              {selectedBrands.length < 3
                ? `${3 - selectedBrands.length} tane daha seç`
                : `${selectedBrands.length} butik seçildi ✓`}
            </Text>
          </View>

          {brandsLoading ? (
            <ActivityIndicator color={Colors.rose3} style={{ marginTop: 32 }} />
          ) : filteredBrands.length === 0 ? (
            <View style={styles.emptyBrands}>
              <Text style={styles.emptyBrandsText}>Bu filtreye uygun butik bulunamadı.</Text>
              <TouchableOpacity onPress={() => setBrandTab('popular')} style={styles.emptyBrandsLink}>
                <Text style={styles.emptyBrandsLinkText}>Tüm butikleri gör →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.brandList}>
              {filteredBrands.map(brand => (
                <BrandRow key={brand.id} brand={brand} added={selectedBrands.includes(brand.id)} onToggle={() => toggleBrand(brand.id)} />
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.manualLink} onPress={() => setShowManualModal(true)}>
            <Ionicons name="add-circle-outline" size={14} color={Colors.text3} />
            <Text style={styles.manualLinkText}>Butiğim listede yok — manuel ekle</Text>
          </TouchableOpacity>
        </View>
      );

      // ── Adım 4: Tamamlama + Bildirim ─────────────────────────────────────
      case 4: return (
        <View style={styles.stepWrap}>
          {showConfetti && <Confetti />}
          <View style={styles.celebHeader}>
            <Text style={styles.celebEmoji}>🎉</Text>
            <Text style={styles.celebTitle}>Hazırsın!</Text>
            <Text style={styles.celebSub}>
              {selectedBrands.length} butik eklendi. Butika artık sana özel.
            </Text>
          </View>

          <View style={styles.notifCard}>
            <LinearGradient colors={[Colors.surface1, Colors.surface2]} style={StyleSheet.absoluteFill} />
            <View style={styles.notifCardAccent} />
            <Text style={styles.notifCardTitle}>Fiyat düştüğünde anında haber alalım mı?</Text>
            <Text style={styles.notifCardPreview}>"🎉 Manuel Atelier çantası %20 indirimde!"</Text>

            <View style={styles.notifRow}>
              <View style={styles.notifRowLeft}>
                <Ionicons name="notifications-outline" size={18} color={Colors.rose3} />
                <Text style={styles.notifRowLabel}>Push bildirimleri</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, notifEnabled && styles.toggleOn]}
                onPress={() => { Haptics.selectionAsync(); setNotifEnabled(v => !v); }}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, notifEnabled && styles.toggleThumbOn]} />
              </TouchableOpacity>
            </View>

            <View style={[styles.notifRow, { borderTopWidth: 0.5, borderTopColor: Colors.border1, marginTop: 8, paddingTop: 12 }]}>
              <View style={styles.notifRowLeft}>
                <Ionicons name="mail-outline" size={18} color={Colors.text3} />
                <Text style={styles.notifRowLabel}>Haftalık e-posta özeti</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, emailEnabled && styles.toggleOn]}
                onPress={() => { Haptics.selectionAsync(); setEmailEnabled(v => !v); }}
                activeOpacity={0.8}
              >
                <View style={[styles.toggleThumb, emailEnabled && styles.toggleThumbOn]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );

      default: return null;
    }
  })();

  // ── CTA & alt buton mantığı ───────────────────────────────────────────────

  const ctaDisabled = (() => {
    if (step === 1) return selectedCategories.length === 0;
    if (step === 3) return selectedBrands.length < 3;
    return false;
  })();

  const ctaLabel = step === 4 ? 'Butika\'ya başla →' : 'Devam et →';
  const ctaAction = step === 4 ? handleFinish : goNext;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.surface2, Colors.bg]} style={StyleSheet.absoluteFill} />

      {/* Başlık bar */}
      <View style={styles.topBar}>
        {step > 0 && step < 4 ? (
          <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="arrow-back" size={20} color={Colors.text2} />
          </TouchableOpacity>
        ) : <View style={{ width: 36 }} />}

        {step > 0 && step < 4 && (
          <View style={styles.progressArea}>
            <Text style={styles.progressLabel}>{step} / {TOTAL_STEPS}</Text>
            <ProgressBar current={step} total={TOTAL_STEPS} />
          </View>
        )}

        {step === 0 ? (
          <View style={{ width: 36 }} />
        ) : step < 4 ? (
          <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.skipTopText}>Atla</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 36 }} />}
      </View>

      {/* İçerik */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {stepContent}
        </Animated.View>
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky CTA */}
      {step < 5 && (
        <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <TouchableOpacity
            style={[styles.ctaBtn, ctaDisabled && styles.ctaBtnDisabled]}
            onPress={ctaAction}
            disabled={ctaDisabled || saving}
            activeOpacity={0.85}
          >
            {!ctaDisabled && !saving && (
              <LinearGradient colors={[Colors.rose2, Colors.rose3, Colors.rose4]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            )}
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.ctaBtnText, ctaDisabled && styles.ctaBtnTextDisabled]}>{ctaLabel}</Text>
            )}
          </TouchableOpacity>

          {step === 3 && selectedBrands.length > 0 && selectedBrands.length < 3 && (
            <TouchableOpacity onPress={goNext} style={styles.skipCta}>
              <Text style={styles.skipCtaText}>Az seçimle devam et</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Manuel butik modal */}
      <Modal visible={showManualModal} transparent animationType="slide" onRequestClose={() => setShowManualModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowManualModal(false)} />
          <View style={styles.modalSheet}>
            <LinearGradient colors={[Colors.surface1, Colors.surface2]} style={StyleSheet.absoluteFill} />
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Butik ekle</Text>
            <Text style={styles.modalSub}>Site adı veya URL yaz</Text>

            {/* Input */}
            <View style={[styles.modalInputRow, debouncedManualUrl.length > 1 && styles.modalInputRowActive]}>
              <Ionicons name="globe-outline" size={18} color={Colors.text3} style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.modalInput}
                placeholder="örn. lutvelizade"
                placeholderTextColor={Colors.text4}
                value={manualUrl}
                onChangeText={setManualUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                autoFocus
              />
              {manualUrl.length > 0 && (
                <TouchableOpacity onPress={() => { setManualUrl(''); setDebouncedManualUrl(''); }} style={{ paddingRight: 12 }}>
                  <Ionicons name="close-circle" size={18} color={Colors.text4} />
                </TouchableOpacity>
              )}
            </View>

            {/* Öneri listesi */}
            {debouncedManualUrl.length >= 2 && (
              <View style={styles.suggestionsWrap}>
                {/* DB'de bulunan markalar */}
                {brandSuggestions.map(brand => {
                  const domain = (brand.website || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
                  return (
                    <TouchableOpacity key={brand.id} style={styles.suggestionRow} onPress={() => handleAddSuggestion(brand)} activeOpacity={0.75}>
                      <SuggestionFavicon domain={domain} />
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionName}>{brand.name}</Text>
                        <Text style={styles.suggestionDomain}>{domain}</Text>
                      </View>
                      <View style={styles.suggestionCta}>
                        <Text style={styles.suggestionCtaText}>Ekle</Text>
                        <Ionicons name="add" size={14} color={Colors.rose3} />
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Domain tahmini — DB'de tam eşleşme yoksa göster */}
                {inferredDomain && !brandSuggestions.some(b => (b.website || '').toLowerCase().includes(inferredDomain)) && (
                  <TouchableOpacity style={[styles.suggestionRow, styles.suggestionRowInferred]} onPress={() => handleAddManual(inferredDomain)} activeOpacity={0.75}>
                    <SuggestionFavicon domain={inferredDomain} />
                    <View style={styles.suggestionInfo}>
                      <Text style={styles.suggestionName}>
                        {inferredDomain.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                      </Text>
                      <Text style={styles.suggestionDomain}>{inferredDomain}</Text>
                    </View>
                    <View style={styles.suggestionCta}>
                      <Text style={styles.suggestionCtaText}>Bu mu?</Text>
                      <Ionicons name="arrow-forward" size={14} color={Colors.rose3} />
                    </View>
                  </TouchableOpacity>
                )}

                {brandSuggestions.length === 0 && !inferredDomain && (
                  <Text style={styles.suggestionEmpty}>Sonuç bulunamadı</Text>
                )}
              </View>
            )}

            {/* Manuel ekle butonu (tahmin yoksa veya elle girmek isteyenler için) */}
            {debouncedManualUrl.length < 2 && (
              <TouchableOpacity style={[styles.modalBtn, !manualUrl.trim() && styles.modalBtnDisabled]} onPress={() => handleAddManual()} disabled={!manualUrl.trim()} activeOpacity={0.85}>
                {!!manualUrl.trim() && <LinearGradient colors={[Colors.rose2, Colors.rose3]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />}
                <Text style={[styles.modalBtnText, !manualUrl.trim() && styles.modalBtnTextDisabled]}>Ekle</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: 22, paddingTop: 8 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: Colors.border2,
  },
  progressArea: { flex: 1, gap: 6 },
  progressLabel: { fontFamily: Fonts.uiMedium, fontSize: 9, color: Colors.text4, letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center' },
  skipTopBtn: { width: 36 },
  skipTopText: { fontFamily: Fonts.uiLight, fontSize: 13, color: Colors.text4, textAlign: 'right' },

  stepWrap: { paddingTop: 12, gap: 4 },

  // Welcome
  welcomeLogoArea: { alignItems: 'center', marginBottom: 24 },
  welcomeLogo: { fontFamily: Fonts.display, fontSize: 38, color: Colors.rose3, letterSpacing: 3 },
  welcomeLogoDivider: { width: 40, height: 2, backgroundColor: Colors.rose3, marginTop: 6, opacity: 0.5 },
  welcomeCards: { alignItems: 'center', height: 120, marginBottom: 32 },
  welcomeCard: {
    position: 'absolute', width: width * 0.72, padding: 14,
    borderRadius: 14, borderWidth: 0.5, borderColor: Colors.border2,
    flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden',
  },
  welcomeCardDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.rose3 },
  welcomeCardName: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1 },
  welcomeHeadline: { fontFamily: Fonts.display, fontSize: 32, color: Colors.text1, lineHeight: 40, letterSpacing: 0.3, textAlign: 'center', marginBottom: 12 },
  welcomeSub: { fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text3, lineHeight: 21, textAlign: 'center', paddingHorizontal: 8 },

  // Steps
  stepTitle: { fontFamily: Fonts.display, fontSize: 28, color: Colors.text1, lineHeight: 34, letterSpacing: 0.2, marginBottom: 6 },
  stepSub: { fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text3, lineHeight: 20, marginBottom: 24 },

  // Chip grid (kategoriler)
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8,
    backgroundColor: Colors.surface2, borderWidth: 0.5, borderColor: Colors.border2,
    overflow: 'hidden',
  },
  chipSelected: { borderColor: Colors.rose3 },
  chipEmoji: { fontSize: 15 },
  chipLabel: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.text2 },
  chipLabelSelected: { color: '#fff' },

  // Style grid
  styleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  styleCard: {
    width: (width - 44 - 10) / 2, padding: 16, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'transparent', overflow: 'hidden', gap: 4,
  },
  styleCardSelected: { borderColor: Colors.rose3 },
  styleCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.rose3, alignItems: 'center', justifyContent: 'center',
  },
  styleLabel: { fontFamily: Fonts.ui, fontSize: 16, letterSpacing: -0.2 },
  styleDesc: { fontFamily: Fonts.uiLight, fontSize: 12 },

  // Brand tabs
  brandTabs: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  brandTab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
    backgroundColor: Colors.surface2, borderWidth: 0.5, borderColor: Colors.border2,
  },
  brandTabActive: { backgroundColor: Colors.roseGlow, borderColor: Colors.borderBurgund },
  brandTabText: { fontFamily: Fonts.uiMedium, fontSize: 12, color: Colors.text3 },
  brandTabTextActive: { color: Colors.rose3 },
  brandCounter: { marginBottom: 12 },
  brandCounterText: { fontFamily: Fonts.uiMedium, fontSize: 10, color: Colors.text4, letterSpacing: 1.5, textTransform: 'uppercase' },
  brandList: { gap: 8 },
  emptyBrands: { alignItems: 'center', paddingTop: 32, gap: 12 },
  emptyBrandsText: { fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text3, textAlign: 'center' },
  emptyBrandsLink: { paddingVertical: 6 },
  emptyBrandsLinkText: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.rose3 },
  manualLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingVertical: 6 },
  manualLinkText: { fontFamily: Fonts.uiLight, fontSize: 13, color: Colors.text3 },

  // Celebration
  celebHeader: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  celebEmoji: { fontSize: 56 },
  celebTitle: { fontFamily: Fonts.display, fontSize: 40, color: Colors.text1, letterSpacing: -0.5 },
  celebSub: { fontFamily: Fonts.uiLight, fontSize: 15, color: Colors.text3, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },

  // Notification card
  notifCard: {
    borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: Colors.border2,
    overflow: 'hidden', gap: 14, position: 'relative', marginTop: 8,
  },
  notifCardAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: Colors.rose3, opacity: 0.5 },
  notifCardTitle: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1, lineHeight: 20 },
  notifCardPreview: { fontFamily: Fonts.uiLight, fontSize: 12, color: Colors.text3, backgroundColor: Colors.surface3, padding: 10, borderRadius: 8 },
  notifRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifRowLabel: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1 },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: Colors.surface3, borderWidth: 0.5, borderColor: Colors.border2, justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: Colors.rose3, borderColor: Colors.rose3 },
  toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.text4 },
  toggleThumbOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },

  // CTA bar
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 22, paddingTop: 12, gap: 8, backgroundColor: 'transparent' },
  ctaBtn: { height: 54, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface3 },
  ctaBtnDisabled: { opacity: 0.5 },
  ctaBtnText: { fontFamily: Fonts.ui, fontSize: 15, letterSpacing: 0.5, color: '#fff' },
  ctaBtnTextDisabled: { color: Colors.text4 },
  skipCta: { alignItems: 'center', paddingVertical: 4 },
  skipCtaText: { fontFamily: Fonts.uiLight, fontSize: 12, color: Colors.text4 },

  // Modal
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40, gap: 12, overflow: 'hidden',
    borderWidth: 0.5, borderColor: Colors.border2,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border3, alignSelf: 'center', marginBottom: 8 },
  modalTitle: { fontFamily: Fonts.display, fontSize: 24, color: Colors.text1 },
  modalSub: { fontFamily: Fonts.uiLight, fontSize: 13, color: Colors.text3, marginBottom: 4 },
  modalInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface3, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border2,
  },
  modalInputRowActive: { borderColor: Colors.borderGold },
  modalInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontFamily: Fonts.uiLight, fontSize: 15, color: Colors.text1 },
  modalBtn: { height: 50, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface3, marginTop: 4 },
  modalBtnDisabled: { opacity: 0.5 },
  modalBtnText: { fontFamily: Fonts.ui, fontSize: 14, color: '#fff', letterSpacing: 0.5 },
  modalBtnTextDisabled: { color: Colors.text4 },

  // Öneri listesi
  suggestionsWrap: {
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 0.5, borderColor: Colors.border2,
    backgroundColor: Colors.surface2,
  },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.border1,
  },
  suggestionRowInferred: { backgroundColor: Colors.roseGlow },
  suggestionInfo: { flex: 1, gap: 2 },
  suggestionName: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1 },
  suggestionDomain: { fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4 },
  suggestionCta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  suggestionCtaText: { fontFamily: Fonts.uiMedium, fontSize: 12, color: Colors.rose3 },
  suggestionEmpty: { fontFamily: Fonts.uiLight, fontSize: 13, color: Colors.text4, textAlign: 'center', padding: 16 },
});
