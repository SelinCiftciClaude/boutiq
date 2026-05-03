import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Modal, Pressable, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { useCollections, useCreateCollection } from '@/hooks/useCollections';
import { useFavorites, useAddFavorite, useDeleteFavorite } from '@/hooks/useFavorites';
import { FavoriteCard } from '@/components/FavoriteCard';
import { FavoriteDetailModal } from '@/components/FavoriteDetailModal';
import type { Favorite, Collection } from '@/services/favoritesService';

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

function MasonryGrid({
  items,
  onPress,
  onDelete,
}: {
  items: Favorite[];
  onPress: (f: Favorite) => void;
  onDelete: (id: string) => void;
}) {
  const left  = items.filter((_, i) => i % 2 === 0);
  const right = items.filter((_, i) => i % 2 === 1);

  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
      <View style={{ flex: 1 }}>
        {left.map((fav, i) => (
          <FavoriteCard
            key={fav.id}
            item={fav}
            tall={i % 3 === 1}
            onPress={onPress}
            onDelete={onDelete}
          />
        ))}
      </View>
      <View style={{ flex: 1, paddingTop: 20 }}>
        {right.map((fav, i) => (
          <FavoriteCard
            key={fav.id}
            item={fav}
            tall={i % 3 === 0}
            onPress={onPress}
            onDelete={onDelete}
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
