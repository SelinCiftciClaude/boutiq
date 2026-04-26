import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Colors } from '@/constants/Colors';
import { useBrandDetail } from '@/hooks/useBrandDetail';
import { useSavedBrands } from '@/hooks/useSavedBrands';
import { ProductCard } from '@/components/ProductCard';
import { useSavedProducts } from '@/hooks/useSavedProducts';
import * as Clipboard from 'expo-clipboard';

export default function BrandDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { brand: brandQ, products: productsQ, campaigns: campaignsQ } = useBrandDetail(id);
  const savedBrands = useSavedBrands();
  const { remove: unsaveProduct } = useSavedProducts();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const brand = brandQ.data;
  const products = productsQ.data ?? [];
  const campaigns = campaignsQ.data ?? [];
  const isSaved = brand ? savedBrands.isSaved(brand.id) : false;

  const handleSaveToggle = () => {
    if (!brand) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSaved) savedBrands.remove.mutate(brand.id);
    else savedBrands.add.mutate({ brandId: brand.id, isFavorite: false });
  };

  const handleCopyCode = async (code: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (brandQ.isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.gold3} size="large" />
      </View>
    );
  }

  if (!brand) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Butik bulunamadı.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Geri dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const left = products.filter((_, i) => i % 2 === 0);
  const right = products.filter((_, i) => i % 2 === 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Kopyalandı toast */}
      {copiedCode && (
        <View style={styles.toast} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.toastText}>"{copiedCode}" kopyalandı</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Kapak fotoğrafı */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: brand.coverImage }} style={styles.cover} resizeMode="cover" />
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />

          {/* Geri butonu */}
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { top: 16 }]}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Butik bilgisi kapak üzerinde */}
          <View style={styles.coverInfo}>
            <Image source={{ uri: brand.logo }} style={styles.logo} />
            <View style={styles.coverText}>
              <View style={styles.nameRow}>
                <Text style={styles.brandName}>{brand.name}</Text>
                {brand.isVerified && <Ionicons name="checkmark-circle" size={18} color={Colors.gold3} />}
              </View>
              <Text style={styles.handle}>{brand.handle}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Özet bar */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{brand.productCount ?? products.length}</Text>
              <Text style={styles.statLabel}>Ürün</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{brand.rating?.toFixed(1) ?? '—'}</Text>
              <Text style={styles.statLabel}>Puan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{campaigns.length}</Text>
              <Text style={styles.statLabel}>Kampanya</Text>
            </View>
          </View>

          {/* Açıklama */}
          {brand.description && (
            <Text style={styles.description}>{brand.description}</Text>
          )}

          {/* Aksiyon butonları */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.saveBtn, isSaved && styles.saveBtnActive]}
              onPress={handleSaveToggle}
            >
              {isSaved
                ? <LinearGradient colors={[Colors.rose2, Colors.rose4]} style={StyleSheet.absoluteFill} />
                : null}
              <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={18} color={isSaved ? '#fff' : Colors.text2} />
              <Text style={[styles.saveBtnText, isSaved && styles.saveBtnTextActive]}>
                {isSaved ? 'Kaydedildi' : 'Koleksiyona Ekle'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.visitBtn}
              onPress={() => Linking.openURL(brand.affiliateUrl || brand.website)}
            >
              <Ionicons name="open-outline" size={16} color={Colors.text2} />
              <Text style={styles.visitBtnText}>Siteye Git</Text>
            </TouchableOpacity>
          </View>

          {/* Aktif kampanyalar */}
          {campaigns.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kampanyalar</Text>
              {campaigns.map(c => (
                <View key={c.id} style={styles.campaignCard}>
                  <LinearGradient colors={[Colors.surface1, Colors.surface2]} style={StyleSheet.absoluteFill} />
                  <View style={styles.campaignTop} />
                  <View style={styles.campaignBody}>
                    <Text style={styles.campaignTitle}>{c.title}</Text>
                    {c.discount && (
                      <Text style={styles.campaignDiscount}>
                        {c.discountType === 'percent' ? `%${c.discount} indirim` : `₺${c.discount} indirim`}
                      </Text>
                    )}
                    {c.code && (
                      <TouchableOpacity style={styles.codeBox} onPress={() => handleCopyCode(c.code!)}>
                        <Text style={styles.codeText}>{c.code}</Text>
                        <Ionicons name="copy-outline" size={11} color={Colors.rose3} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Ürünler */}
          {products.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tüm Ürünler ({products.length})</Text>
              <View style={styles.grid}>
                <View style={styles.col}>
                  {left.map((p, i) => (
                    <ProductCard key={p.id} product={p} tall={i % 3 === 1}
                      onUnsave={() => unsaveProduct.mutate(p.id)} />
                  ))}
                </View>
                <View style={[styles.col, styles.colOffset]}>
                  {right.map((p, i) => (
                    <ProductCard key={p.id} product={p} tall={i % 3 === 0}
                      onUnsave={() => unsaveProduct.mutate(p.id)} />
                  ))}
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 80 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 16, color: Colors.text3 },
  backLink: { paddingVertical: 8 },
  backLinkText: { fontSize: 15, color: Colors.gold3, fontWeight: '600' },
  toast: {
    position: 'absolute', top: 60, alignSelf: 'center', zIndex: 100,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface1, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  toastText: { fontSize: 13, fontWeight: '600', color: Colors.text1 },
  coverContainer: { height: 260, position: 'relative' },
  cover: { width: '100%', height: '100%', backgroundColor: Colors.surface3 },
  backBtn: {
    position: 'absolute', left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  coverInfo: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  logo: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: '#fff', backgroundColor: Colors.surface3 },
  coverText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandName: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  handle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  body: { paddingHorizontal: 16, paddingTop: 20 },
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.surface2,
    borderRadius: 18, padding: 16, borderWidth: 1,
    borderColor: Colors.border1, marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statNum: { fontSize: 20, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '600', color: Colors.text4, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.border2 },
  description: { fontSize: 14, color: Colors.text3, lineHeight: 21, marginBottom: 20 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 48, borderRadius: 14, overflow: 'hidden',
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2,
  },
  saveBtnActive: { borderColor: Colors.rose3 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: Colors.text2 },
  saveBtnTextActive: { color: '#fff' },
  visitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 48, paddingHorizontal: 20, borderRadius: 14,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2,
  },
  visitBtnText: { fontSize: 14, fontWeight: '600', color: Colors.text2 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5, marginBottom: 14 },
  campaignCard: {
    borderRadius: 16, overflow: 'hidden', borderWidth: 1,
    borderColor: Colors.borderGold, marginBottom: 10,
  },
  campaignTop: { height: 3, backgroundColor: Colors.gold3 },
  campaignBody: { padding: 14, gap: 6 },
  campaignTitle: { fontSize: 15, fontWeight: '700', color: Colors.text1 },
  campaignDiscount: { fontSize: 13, color: Colors.rose3, fontWeight: '700' },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: Colors.glassGold, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.borderGold,
  },
  codeText: { fontSize: 12, fontWeight: '800', color: Colors.rose3, letterSpacing: 1.5 },
  grid: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  colOffset: { marginTop: 40 },
});
