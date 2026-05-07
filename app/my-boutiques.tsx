import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { BoutiqueCard, type ManagedBoutique } from '@/components/BoutiqueCard';
import { AddBoutiqueModal } from '@/components/AddBoutiqueModal';
import { useSavedBrands } from '@/hooks/useSavedBrands';
import type { Brand } from '@/types';

function brandToManaged(b: Brand): ManagedBoutique {
  const domain = b.website
    ? b.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
    : b.handle;
  return {
    id: b.id,
    name: b.name,
    handle: domain,
    logoUrl: b.logo || undefined,
    category: b.category,
    status: 'synced',
    productCount: b.productCount ?? 0,
    lastSync: b.lastActive,
    isManual: false,
  };
}

// ── Ekran ─────────────────────────────────────────────────────────────────────

export default function MyBoutiquesScreen() {
  const navigation = useNavigation();
  const goBack = () => navigation.canGoBack() ? navigation.goBack() : router.replace('/(tabs)/profile' as any);
  const insets = useSafeAreaInsets();
  const savedBrands = useSavedBrands();
  const [addModalVisible, setAddModalVisible] = useState(false);

  const boutiques: ManagedBoutique[] = (savedBrands.data ?? []).map(brandToManaged);

  const handleRemove = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Butiği Kaldır',
      'Bu butiği takip listenizden kaldırmak istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => savedBrands.remove.mutate(id),
        },
      ]
    );
  };

  const syncedCount = boutiques.length;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[Colors.surface1, Colors.bg]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => goBack()}
          style={s.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.text1} />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Butiklerim</Text>
        </View>

        <View style={s.headerRight}>
          <Text style={s.headerCount}>{boutiques.length}</Text>
        </View>
      </View>

      {/* Stat strip */}
      {boutiques.length > 0 && (
        <View style={s.statStrip}>
          <View style={s.statItem}>
            <Text style={s.statValue}>{syncedCount}</Text>
            <Text style={s.statLabel}>Takip</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>
              {boutiques.reduce((acc, b) => acc + b.productCount, 0)}
            </Text>
            <Text style={s.statLabel}>Toplam ürün</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statValue}>{(savedBrands.data ?? []).filter(b => b.isFavorite).length}</Text>
            <Text style={s.statLabel}>Favori</Text>
          </View>
        </View>
      )}

      <FlatList
        data={boutiques}
        keyExtractor={b => b.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <TouchableOpacity
            style={s.addCard}
            onPress={() => setAddModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={s.addIconWrap}>
              <LinearGradient
                colors={[Colors.rose2, Colors.rose4]}
                style={s.addIconGrad}
              >
                <Ionicons name="add" size={22} color={Colors.bg} />
              </LinearGradient>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.addTitle}>Yeni Butik Ekle</Text>
              <Text style={s.addSubtitle}>Favori butiğini bul ve takip et</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.text4} />
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <BoutiqueCard
            boutique={item}
            onPress={b => router.push({ pathname: '/brand/[id]', params: { id: b.id } } as any)}
            onRemove={handleRemove}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🏪</Text>
            <Text style={s.emptyTitle}>Henüz butik yok</Text>
            <Text style={s.emptyDesc}>
              Yukarıdaki butona basarak{'\n'}ilk butiğini ekleyebilirsin
            </Text>
          </View>
        }
      />

      <AddBoutiqueModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={() => {}}
      />
    </View>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    gap: 3,
  },
  headerTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 22,
    color: Colors.text1,
    letterSpacing: -0.4,
  },
  headerRight: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.roseGlow,
    borderWidth: 1,
    borderColor: Colors.borderBurgund,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCount: {
    fontFamily: Fonts.ui,
    fontSize: 15,
    color: Colors.rose3,
  },

  statStrip: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingVertical: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: Fonts.displayBold,
    fontSize: 18,
    color: Colors.text1,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: Fonts.uiLight,
    fontSize: 10,
    color: Colors.text4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border2,
    marginVertical: 4,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.borderBurgund,
    borderStyle: 'dashed',
  },
  addIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addIconGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTitle: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: Colors.rose3,
  },
  addSubtitle: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    marginTop: 2,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: Fonts.uiMedium,
    fontSize: 16,
    color: Colors.text2,
  },
  emptyDesc: {
    fontFamily: Fonts.uiLight,
    fontSize: 13,
    color: Colors.text4,
    textAlign: 'center',
    lineHeight: 20,
  },
});
