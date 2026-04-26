import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { CATEGORIES } from '../../constants/MockData';
import { BrandCard } from '../../components/BrandCard';
import { Button } from '../../components/ui/Button';
import { BrandCategory } from '../../types';
import { router } from 'expo-router';
import { useBrands } from '@/hooks/useBrands';
import { useSavedBrands } from '@/hooks/useSavedBrands';
import { supabase } from '@/services/supabase';
import { useQueryClient } from '@tanstack/react-query';

const { width } = Dimensions.get('window');

function AddBrandModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (url: string, category: BrandCategory) => void;
}) {
  const [url, setUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BrandCategory>('giyim');
  const [focused, setFocused] = useState(false);

  const handleAdd = () => {
    if (!url.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAdd(url.trim(), selectedCategory);
    setUrl('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={modalStyles.sheet}>
          <LinearGradient
            colors={[Colors.surface2, Colors.surface1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Handle */}
          <View style={modalStyles.handle} />

          <Text style={modalStyles.title}>Butik Ekle</Text>
          <Text style={modalStyles.subtitle}>
            Instagram hesabı, website veya ürün linki ekle.
          </Text>

          {/* URL Input */}
          <View style={[modalStyles.inputWrapper, focused && modalStyles.inputFocused]}>
            <Ionicons name="link-outline" size={18} color={focused ? Colors.gold3 : Colors.text4} style={modalStyles.icon} />
            <TextInput
              style={modalStyles.input}
              placeholder="instagram.com/... veya website linki"
              placeholderTextColor={Colors.text5}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              selectionColor={Colors.gold3}
            />
          </View>

          {/* Category */}
          <Text style={modalStyles.categoryTitle}>Kategori Seç</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={modalStyles.categoryScroll}
          >
            {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedCategory(cat.id as BrandCategory);
                  }}
                  style={[modalStyles.categoryChip, active && modalStyles.categoryChipActive]}
                >
                  {active && (
                    <LinearGradient
                      colors={[Colors.gold2, Colors.gold4]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Text style={modalStyles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[modalStyles.categoryLabel, active && modalStyles.categoryLabelActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Instagram import hint */}
          <View style={modalStyles.hintBox}>
            <Ionicons name="logo-instagram" size={16} color={Colors.purple3} />
            <Text style={modalStyles.hintText}>
              Instagram profilinden eklemek için @kullaniciadi yaz veya profil linkini yapıştır.
            </Text>
          </View>

          <View style={modalStyles.actions}>
            <Button label="İptal" onPress={onClose} variant="ghost" size="lg" style={modalStyles.cancelBtn} />
            <Button
              label="Butik Ekle"
              onPress={handleAdd}
              variant="primary"
              size="lg"
              disabled={!url.trim()}
              style={modalStyles.addBtn}
              icon={<Ionicons name="add-circle" size={18} color={Colors.bg} />}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 48,
    borderWidth: 1,
    borderColor: Colors.border2,
    overflow: 'hidden',
    position: 'relative',
    borderBottomWidth: 0,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border3,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text1,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text3,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 20,
  },
  inputFocused: { borderColor: Colors.gold3 },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.text1 },
  categoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text3,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  categoryScroll: {
    gap: 8,
    paddingRight: 8,
    marginBottom: 20,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border2,
    overflow: 'hidden',
  },
  categoryChipActive: { borderColor: Colors.gold3 },
  categoryIcon: { fontSize: 14 },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: Colors.text3 },
  categoryLabelActive: { color: Colors.bg, fontWeight: '700' },
  hintBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.purpleGlow,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.purpleGlow,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  hintText: { flex: 1, fontSize: 12, color: Colors.purple4, lineHeight: 17 },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: { flex: 1 },
  addBtn: { flex: 2 },
});

export default function BrandsScreen() {
  const insets = useSafeAreaInsets();
  const { data: brands = [] } = useBrands();
  const savedBrands = useSavedBrands();
  const qc = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const annotated = brands.map((b) => ({
    ...b,
    isFavorite: savedBrands.isSaved(b.id),
  }));

  const filtered = annotated.filter((b) => {
    const matchCat = selectedCategory === 'all' || b.category === selectedCategory;
    const matchSearch =
      !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const favorites = filtered.filter((b) => b.isFavorite);
  const others = filtered.filter((b) => !b.isFavorite);

  const handleAdd = async (url: string, category: BrandCategory) => {
    const cleanedUrl = url.startsWith('http') ? url : `https://${url.replace(/^@/, '')}`;
    const name = cleanedUrl.replace(/^https?:\/\//, '').split('/')[0];
    const { data, error } = await supabase
      .from('brands')
      .insert({
        name,
        handle: `@${name.split('.')[0]}`,
        category,
        website: cleanedUrl,
        affiliate_url: cleanedUrl,
        tags: [],
      })
      .select('id')
      .single();
    if (error) {
      Alert.alert('Butik eklenemedi', error.message);
      return;
    }
    if (data?.id) {
      await savedBrands.add.mutateAsync({ brandId: data.id, isFavorite: false });
    }
    qc.invalidateQueries({ queryKey: ['brands'] });
  };

  const toggleFavorite = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (savedBrands.isSaved(id)) {
      savedBrands.remove.mutate(id);
    } else {
      savedBrands.add.mutate({ brandId: id, isFavorite: true });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bgGlow} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>KOLEKSİYON</Text>
          <Text style={styles.headerTitle}>Butiklerim</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setShowSearch((s) => !s)}
            style={styles.iconBtn}
          >
            <Ionicons name={showSearch ? 'close' : 'search'} size={20} color={Colors.text2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowAddModal(true);
            }}
            style={styles.addBtn}
          >
            <LinearGradient
              colors={[Colors.gold2, Colors.gold4]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addBtnGradient}
            >
              <Ionicons name="add" size={22} color={Colors.bg} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      {showSearch && (
        <View style={styles.searchWrapper}>
          <Ionicons name="search" size={16} color={Colors.text4} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Butik ara..."
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
          <Text style={styles.statNum}>
            {brands.reduce((acc, b) => acc + (b.productCount ?? 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Ürün</Text>
        </View>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          const count =
            cat.id === 'all'
              ? brands.length
              : brands.filter((b) => b.category === cat.id).length;
          if (cat.id !== 'all' && count === 0) return null;
          return (
            <TouchableOpacity
              key={cat.id}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedCategory(cat.id);
              }}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              {active && (
                <LinearGradient
                  colors={[Colors.gold2, Colors.gold4]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {cat.icon} {cat.label}
              </Text>
              <View style={[styles.filterCount, active && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Favorites section */}
        {favorites.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={14} color="#F43F5E" />
              <Text style={styles.sectionTitle}>Favoriler</Text>
            </View>
            {favorites.map((brand) => (
              <BrandCard key={brand.id} brand={brand} variant="horizontal"
                onPress={b => router.push(`/brand/${b.id}` as any)} />
            ))}
          </View>
        )}

        {/* Other brands */}
        {others.length > 0 && (
          <View style={styles.section}>
            {favorites.length > 0 && (
              <View style={styles.sectionHeader}>
                <Ionicons name="storefront-outline" size={14} color={Colors.text4} />
                <Text style={styles.sectionTitle}>Diğer Butikler</Text>
              </View>
            )}
            {others.map((brand) => (
              <BrandCard key={brand.id} brand={brand} variant="horizontal"
                onPress={b => router.push(`/brand/${b.id}` as any)} />
            ))}
          </View>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏪</Text>
            <Text style={styles.emptyTitle}>Henüz butik yok</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? `"${searchQuery}" ile eşleşen butik bulunamadı.`
                : 'Favori butiğini ekle ve kampanyaları kaçırma.'}
            </Text>
            {!searchQuery && (
              <Button
                label="Butik Ekle"
                onPress={() => setShowAddModal(true)}
                variant="primary"
                size="md"
                style={{ marginTop: 16 }}
                icon={<Ionicons name="add" size={18} color={Colors.bg} />}
              />
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <AddBrandModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  bgGlow: {
    position: 'absolute',
    top: 50,
    left: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: Colors.goldGlow,
    opacity: 0.3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gold3,
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text1,
    letterSpacing: -1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  addBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  addBtnGradient: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: Colors.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 14,
    gap: 10,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text1,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: Colors.surface2,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border1,
    marginBottom: 14,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text1,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border2,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    paddingRight: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    overflow: 'hidden',
  },
  filterChipActive: { borderColor: Colors.gold3 },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text3,
  },
  filterLabelActive: {
    color: Colors.bg,
    fontWeight: '700',
  },
  filterCount: {
    backgroundColor: Colors.surface4,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterCountActive: {
    backgroundColor: 'rgba(7,7,15,0.30)',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text4,
  },
  filterCountTextActive: {
    color: Colors.bg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  section: {
    gap: 10,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text3,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyIcon: { fontSize: 52, marginBottom: 8 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text2,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text4,
    textAlign: 'center',
    lineHeight: 20,
  },
});
