import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Modal, Pressable, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Dimensions, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { useCollections, useCreateCollection } from '@/hooks/useCollections';
import { useFavorites, useAddFavorite, useDeleteFavorite } from '@/hooks/useFavorites';
import { FavoriteCard } from '@/components/FavoriteCard';
import { FavoriteDetailModal } from '@/components/FavoriteDetailModal';
import type { Favorite, Collection } from '@/services/favoritesService';
import { updateFavorite } from '@/services/favoritesService';

const { height: SCREEN_H } = Dimensions.get('window');

// ── Bildirim Ayarla bottom sheet ─────────────────────────────────────────────

function AlertSettingsSheet({
  favorite,
  onClose,
  onSaved,
}: {
  favorite: Favorite | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const slideAnim    = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const insets       = useSafeAreaInsets();

  const [priceDrop,   setPriceDrop]   = useState(false);
  const [stockChange, setStockChange] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [saving,      setSaving]      = useState(false);

  const visible = !!favorite;
  const hasAnyAlert = favorite?.watchPriceDrop || favorite?.watchStockChange || !!favorite?.targetPrice;

  // Mevcut değerleri yükle
  useEffect(() => {
    if (!visible || !favorite) return;
    setPriceDrop(favorite.watchPriceDrop ?? false);
    setStockChange(favorite.watchStockChange ?? false);
    setTargetPrice(favorite.targetPrice ? String(favorite.targetPrice) : '');
  }, [visible, favorite?.id]);

  // Animasyon
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 240, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSave = async () => {
    if (!favorite || saving) return;
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await updateFavorite(favorite.id, {
        watchPriceDrop:  priceDrop,
        watchStockChange: stockChange,
        targetPrice: targetPrice ? parseFloat(targetPrice.replace(',', '.')) : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved?.();
      onClose();
    } catch { /* sessizce */ }
    setSaving(false);
  };

  const handleRemoveAll = async () => {
    if (!favorite || saving) return;
    setSaving(true);
    try {
      await updateFavorite(favorite.id, {
        watchPriceDrop:  false,
        watchStockChange: false,
        targetPrice: undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved?.();
      onClose();
    } catch { /* sessizce */ }
    setSaving(false);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[als.backdrop, { opacity: backdropAnim }]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[als.sheet, { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 16 }]}>
        <LinearGradient colors={[Colors.surface2, Colors.surface1]} style={StyleSheet.absoluteFill} />

        <View style={als.handle} />

        {/* Başlık */}
        <View style={als.header}>
          <View style={als.iconWrap}>
            <Ionicons name="notifications-outline" size={20} color={Colors.rose3} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={als.title}>Bildirim Ayarla</Text>
            <Text style={als.subtitle} numberOfLines={1}>{favorite?.productName}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={als.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={20} color={Colors.text3} />
          </TouchableOpacity>
        </View>

        {saving && !priceDrop && !stockChange ? (
          <ActivityIndicator color={Colors.rose3} style={{ marginVertical: 32 }} />
        ) : (
          <>
            {/* Toggle satırları */}
            <View style={als.group}>
              <View style={als.row}>
                <View style={als.rowLeft}>
                  <Ionicons name="trending-down-outline" size={18} color={Colors.success} />
                  <View>
                    <Text style={als.rowTitle}>Fiyat düşünce bildir</Text>
                    <Text style={als.rowSub}>Kaydettiğim fiyatın altına inerse</Text>
                  </View>
                </View>
                <Switch
                  value={priceDrop}
                  onValueChange={v => { Haptics.selectionAsync(); setPriceDrop(v); }}
                  trackColor={{ false: Colors.border2, true: Colors.rose3 }}
                  thumbColor="#fff"
                />
              </View>

              <View style={als.divider} />

              <View style={als.row}>
                <View style={als.rowLeft}>
                  <Ionicons name="alert-circle-outline" size={18} color={Colors.warning} />
                  <View>
                    <Text style={als.rowTitle}>Stok değişince bildir</Text>
                    <Text style={als.rowSub}>Tükenme veya geri gelince</Text>
                  </View>
                </View>
                <Switch
                  value={stockChange}
                  onValueChange={v => { Haptics.selectionAsync(); setStockChange(v); }}
                  trackColor={{ false: Colors.border2, true: Colors.rose3 }}
                  thumbColor="#fff"
                />
              </View>

              <View style={als.divider} />

              {/* Hedef fiyat */}
              <View style={als.targetRow}>
                <View style={als.rowLeft}>
                  <Ionicons name="pricetag-outline" size={18} color={Colors.gold2} />
                  <View>
                    <Text style={als.rowTitle}>Hedef fiyat</Text>
                    <Text style={als.rowSub}>Bu fiyata düşünce haber ver</Text>
                  </View>
                </View>
                <View style={als.targetInput}>
                  <TextInput
                    style={als.targetText}
                    value={targetPrice}
                    onChangeText={setTargetPrice}
                    placeholder="₺ —"
                    placeholderTextColor={Colors.text5}
                    keyboardType="numeric"
                    selectionColor={Colors.rose3}
                  />
                </View>
              </View>
            </View>

            {/* Kaydet */}
            <TouchableOpacity
              style={[als.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <LinearGradient
                colors={Colors.gradients.rose as unknown as [string, string]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={als.saveBtnGrad}
              >
                {saving
                  ? <ActivityIndicator size="small" color={Colors.bg} />
                  : <>
                      <Ionicons name="notifications" size={16} color={Colors.bg} />
                      <Text style={als.saveBtnText}>
                        {hasAnyAlert ? 'Bildirimi Güncelle' : 'Bildirimi Kur'}
                      </Text>
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Tüm bildirimleri kaldır */}
            {hasAnyAlert && (
              <TouchableOpacity style={als.removeBtn} onPress={handleRemoveAll} disabled={saving}>
                <Text style={als.removeBtnText}>Tüm Bildirimleri Kaldır</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

const als = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderWidth: 1, borderColor: Colors.border2, overflow: 'hidden', borderBottomWidth: 0,
  },
  handle: {
    width: 38, height: 4, backgroundColor: Colors.border3,
    borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, marginBottom: 16,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.roseGlow, borderWidth: 1, borderColor: Colors.borderBurgund,
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontFamily: Fonts.displayBold, fontSize: 18, color: Colors.text1, letterSpacing: -0.3 },
  subtitle: { fontFamily: Fonts.uiLight, fontSize: 12, color: Colors.text4, marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surface3, alignItems: 'center', justifyContent: 'center',
  },
  group: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface1,
    borderRadius: 14, borderWidth: 0.5, borderColor: Colors.border2,
    overflow: 'hidden', marginBottom: 14,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowTitle: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1 },
  rowSub:   { fontFamily: Fonts.uiLight,  fontSize: 11, color: Colors.text4, marginTop: 1 },
  divider:  { height: 0.5, backgroundColor: Colors.border1, marginHorizontal: 14 },
  targetRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  targetInput: {
    backgroundColor: Colors.surface3, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border2,
    paddingHorizontal: 12, height: 36, justifyContent: 'center',
    minWidth: 80,
  },
  targetText: {
    fontFamily: Fonts.uiMedium, fontSize: 14,
    color: Colors.text1, textAlign: 'right',
  },
  saveBtn: { marginHorizontal: 20, borderRadius: 14, overflow: 'hidden', marginBottom: 8 },
  saveBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  saveBtnText: { fontFamily: Fonts.ui, fontSize: 15, color: Colors.bg },
  removeBtn: { alignSelf: 'center', paddingVertical: 10 },
  removeBtnText: {
    fontFamily: Fonts.uiLight, fontSize: 13, color: Colors.rose4,
    textDecorationLine: 'underline',
  },
});

// ── Add by URL sheet ─────────────────────────────────────────────────────────

function AddByUrlSheet({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (url: string) => Promise<unknown>;
}) {
  const [url, setUrl]       = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await onAdd(trimmed);
      setUrl('');
      onClose();
    } catch (e: any) {
      Alert.alert(
        'Hata',
        e.message === 'DUPLICATE' ? 'Bu ürün zaten kaydedilmiş.' : 'Ürün eklenemedi. URL\'yi kontrol et.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={s.overlay} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.sheetOuter}
      >
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Ürün Ekle</Text>
          <Text style={s.sheetSub}>Bir ürün sayfasının adresini yapıştır</Text>
          <TextInput
            style={s.urlInput}
            placeholder="https://..."
            placeholderTextColor={Colors.text5}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            selectionColor={Colors.rose3}
          />
          <TouchableOpacity
            style={[s.primaryBtn, (!url.trim() || loading) && s.primaryBtnDisabled]}
            onPress={handleAdd}
            disabled={!url.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.primaryBtnText}>Ekle</Text>
            }
          </TouchableOpacity>
          <View style={{ height: 8 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Create Collection sheet ───────────────────────────────────────────────────

const EMOJIS = ['📂', '❤️', '👗', '👟', '💄', '🏠', '🎁', '⭐', '✨', '🛍️', '💍', '🌿', '☕', '🎀', '🌸'];

function CreateCollectionSheet({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (name: string, emoji: string) => Promise<void>;
}) {
  const [name, setName]   = useState('');
  const [emoji, setEmoji] = useState('📂');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onSave(trimmed, emoji);
      setName('');
      setEmoji('📂');
      onClose();
    } catch {
      Alert.alert('Hata', 'Koleksiyon oluşturulamadı.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={s.overlay} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.sheetOuter}
      >
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Yeni Koleksiyon</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.emojiRow}
          >
            {EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                style={[s.emojiBtn, emoji === e && s.emojiBtnActive]}
                onPress={() => { setEmoji(e); Haptics.selectionAsync(); }}
              >
                <Text style={s.emojiBtnText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            style={s.urlInput}
            placeholder="Koleksiyon adı"
            placeholderTextColor={Colors.text5}
            value={name}
            onChangeText={setName}
            maxLength={50}
            selectionColor={Colors.rose3}
          />

          <TouchableOpacity
            style={[s.primaryBtn, (!name.trim() || saving) && s.primaryBtnDisabled]}
            onPress={handleSave}
            disabled={!name.trim() || saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.primaryBtnText}>Oluştur</Text>
            }
          </TouchableOpacity>
          <View style={{ height: 8 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Collections tab bar ──────────────────────────────────────────────────────

function CollectionsBar({
  collections,
  activeId,
  onSelect,
  onAdd,
}: {
  collections: Collection[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.collectionsRow}
    >
      {/* "Tümü" chip */}
      <TouchableOpacity
        style={[s.collChip, activeId === null && s.collChipActive]}
        onPress={() => { Haptics.selectionAsync(); onSelect(null); }}
        activeOpacity={0.75}
      >
        <Text style={[s.collChipText, activeId === null && s.collChipTextActive]}>Tümü</Text>
      </TouchableOpacity>

      {collections.map(col => (
        <TouchableOpacity
          key={col.id}
          style={[s.collChip, activeId === col.id && s.collChipActive]}
          onPress={() => { Haptics.selectionAsync(); onSelect(col.id); }}
          activeOpacity={0.75}
        >
          <Text style={s.collChipEmoji}>{col.emoji}</Text>
          <Text style={[s.collChipText, activeId === col.id && s.collChipTextActive]}>
            {col.name}
          </Text>
          {(col.favoriteCount ?? 0) > 0 && (
            <Text style={[s.collChipCount, activeId === col.id && s.collChipCountActive]}>
              {col.favoriteCount}
            </Text>
          )}
        </TouchableOpacity>
      ))}

      {/* New collection button */}
      <TouchableOpacity style={s.addCollBtn} onPress={onAdd} activeOpacity={0.75}>
        <Ionicons name="add" size={16} color={Colors.rose3} />
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Masonry grid ─────────────────────────────────────────────────────────────

function CardWithAlert({
  fav, tall, onPress, onDelete, onAlert,
}: {
  fav: Favorite; tall?: boolean;
  onPress: (f: Favorite) => void;
  onDelete: (id: string) => void;
  onAlert: (f: Favorite) => void;
}) {
  return (
    <View style={{ position: 'relative' }}>
      <FavoriteCard item={fav} tall={tall} onPress={onPress} onDelete={onDelete} />
      {/* Çan butonu — sağ üst köşe */}
      <TouchableOpacity
        style={mg.bellBtn}
        onPress={() => { Haptics.selectionAsync(); onAlert(fav); }}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons
          name={fav.watchPriceDrop ? 'notifications' : 'notifications-outline'}
          size={14}
          color={fav.watchPriceDrop ? Colors.rose3 : '#fff'}
        />
      </TouchableOpacity>
    </View>
  );
}

const mg = StyleSheet.create({
  bellBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
});

function MasonryGrid({
  items,
  onPress,
  onDelete,
  onAlert,
}: {
  items: Favorite[];
  onPress: (f: Favorite) => void;
  onDelete: (id: string) => void;
  onAlert: (f: Favorite) => void;
}) {
  const left  = items.filter((_, i) => i % 2 === 0);
  const right = items.filter((_, i) => i % 2 === 1);

  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
      <View style={{ flex: 1 }}>
        {left.map((fav, i) => (
          <CardWithAlert
            key={fav.id} fav={fav} tall={i % 3 === 1}
            onPress={onPress} onDelete={onDelete} onAlert={onAlert}
          />
        ))}
      </View>
      <View style={{ flex: 1, paddingTop: 20 }}>
        {right.map((fav, i) => (
          <CardWithAlert
            key={fav.id} fav={fav} tall={i % 3 === 0}
            onPress={onPress} onDelete={onDelete} onAlert={onAlert}
          />
        ))}
      </View>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();

  const [activeCollId, setActiveCollId]   = useState<string | null>(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [showAddUrl, setShowAddUrl]       = useState(false);
  const [showCreateColl, setShowCreateColl] = useState(false);
  const [selectedFav, setSelectedFav]     = useState<Favorite | null>(null);
  const [alertFav,    setAlertFav]        = useState<Favorite | null>(null);

  const { data: collections = [] } = useCollections();
  const { data: favorites = [], isLoading, refetch } = useFavorites(activeCollId);
  const addMutation    = useAddFavorite();
  const deleteMutation = useDeleteFavorite();
  const createCollMut  = useCreateCollection();

  const q = searchQuery.toLowerCase();
  const displayed = favorites.filter(f =>
    !q ||
    f.productName.toLowerCase().includes(q) ||
    (f.merchantName ?? '').toLowerCase().includes(q)
  );

  const saleCount = favorites.filter(
    f => f.currentPrice != null && f.priceAtSave != null && f.currentPrice < f.priceAtSave
  ).length;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Favorilerim</Text>
        <View style={s.headerRight}>
          {saleCount > 0 && (
            <View style={s.saleChip}>
              <Ionicons name="trending-down" size={11} color="#2A7432" />
              <Text style={s.saleChipText}>{saleCount} indirimli</Text>
            </View>
          )}
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => setShowAddUrl(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="add" size={22} color={Colors.rose3} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Collections */}
      <CollectionsBar
        collections={collections}
        activeId={activeCollId}
        onSelect={setActiveCollId}
        onAdd={() => setShowCreateColl(true)}
      />

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search-outline" size={16} color={Colors.text4} />
        <TextInput
          style={s.searchInput}
          placeholder="Ürün veya marka ara..."
          placeholderTextColor={Colors.text5}
          value={searchQuery}
          onChangeText={setSearchQuery}
          selectionColor={Colors.rose3}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={Colors.text4} />
          </TouchableOpacity>
        )}
      </View>

      {/* Feed */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.rose3} />
        }
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {isLoading && favorites.length === 0 ? (
          <ActivityIndicator color={Colors.rose3} style={{ marginTop: 60 }} />
        ) : displayed.length === 0 ? (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🤍</Text>
            <Text style={s.emptyTitle}>
              {searchQuery ? 'Sonuç bulunamadı' : 'Henüz favori yok'}
            </Text>
            <Text style={s.emptySub}>
              {searchQuery
                ? 'Farklı bir kelime dene.'
                : 'Sağ üstteki + butonuna basarak\nbir ürünün linkini ekle.'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={s.emptyActionBtn} onPress={() => setShowAddUrl(true)}>
                <Text style={s.emptyActionText}>Ürün Ekle</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <MasonryGrid
            items={displayed}
            onPress={setSelectedFav}
            onDelete={(id) => deleteMutation.mutate(id)}
            onAlert={setAlertFav}
          />
        )}
      </ScrollView>

      {/* Modals */}
      <AddByUrlSheet
        visible={showAddUrl}
        onClose={() => setShowAddUrl(false)}
        onAdd={(url) => addMutation.mutateAsync({ url })}
      />

      <CreateCollectionSheet
        visible={showCreateColl}
        onClose={() => setShowCreateColl(false)}
        onSave={async (name, emoji) => {
          await createCollMut.mutateAsync({ name, emoji });
        }}
      />

      <FavoriteDetailModal
        favorite={selectedFav}
        onClose={() => setSelectedFav(null)}
      />

      <AlertSettingsSheet
        favorite={alertFav}
        onClose={() => setAlertFav(null)}
        onSaved={refetch}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: Fonts.editorial,
    fontSize: 34,
    color: Colors.text1,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(42,116,50,0.10)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  saleChipText: { fontFamily: Fonts.uiMedium, fontSize: 11, color: '#2A7432' },
  addBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface1,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Collections
  collectionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  collChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface1,
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  collChipActive: {
    backgroundColor: Colors.rose3,
    borderColor: Colors.rose3,
  },
  collChipEmoji: { fontSize: 13 },
  collChipText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.text3,
  },
  collChipTextActive: { color: '#fff' },
  collChipCount: {
    fontFamily: Fonts.ui,
    fontSize: 10,
    color: Colors.text4,
  },
  collChipCountActive: { color: 'rgba(255,255,255,0.7)' },
  addCollBtn: {
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface1,
    borderWidth: 0.5,
    borderColor: Colors.borderBurgund,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: Colors.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text1,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 8,
  },
  emptyIcon: { fontSize: 56, marginBottom: 8 },
  emptyTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.text2,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text4,
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyActionBtn: {
    marginTop: 12,
    backgroundColor: Colors.rose3,
    borderRadius: 22,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  emptyActionText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: '#fff',
  },

  // Bottom sheets
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetOuter: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
  },
  sheetHandle: {
    width: 40, height: 4,
    backgroundColor: Colors.border2,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 22,
    color: Colors.text1,
    marginBottom: 6,
  },
  sheetSub: {
    fontFamily: Fonts.uiLight,
    fontSize: 13,
    color: Colors.text4,
    marginBottom: 16,
  },

  urlInput: {
    backgroundColor: Colors.surface1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: 14,
    height: 50,
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text1,
    marginBottom: 14,
  },

  primaryBtn: {
    backgroundColor: Colors.rose3,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    fontFamily: Fonts.ui,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.4,
  },

  emojiRow: { flexDirection: 'row', gap: 8, paddingBottom: 16 },
  emojiBtn: {
    width: 44, height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface1,
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  emojiBtnActive: {
    borderColor: Colors.rose3,
    borderWidth: 1.5,
    backgroundColor: 'rgba(107,21,32,0.06)',
  },
  emojiBtnText: { fontSize: 22 },
});
