import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useBrandDetail } from '@/hooks/useBrandDetail';
import { useSavedBrands } from '@/hooks/useSavedBrands';
import { useAuth } from '@/context/AuthContext';
import { trackAffiliateClick } from '@/services/queries';
import { ProductCard } from '@/components/ProductCard';
import { useReviews } from '@/hooks/useReviews';
import * as Clipboard from 'expo-clipboard';

export default function BrandDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { brand: brandQ, products: productsQ, campaigns: campaignsQ } = useBrandDetail(id);
  const savedBrands = useSavedBrands();
  const { query: reviewsQ, myReview, avgRating, submit: submitReview } = useReviews(id ?? '');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');

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

  const openReviewModal = () => {
    setDraftRating(myReview?.rating ?? 0);
    setDraftComment(myReview?.comment ?? '');
    setReviewModalVisible(true);
  };

  const handleSaveReview = () => {
    if (draftRating === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    submitReview.mutate({ rating: draftRating, comment: draftComment });
    setReviewModalVisible(false);
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
              <Text style={styles.statNum}>{avgRating != null ? avgRating.toFixed(1) : '—'}</Text>
              <Text style={styles.statLabel}>Puan</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{reviewsQ.data?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Yorum</Text>
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
              onPress={() => {
                const raw = brand.affiliateUrl || brand.website || '';
                const url = raw.startsWith('http') ? raw : `https://${raw}`;
                trackAffiliateClick(user?.id ?? null, brand.id, null, url);
                Linking.openURL(url);
              }}
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
                <TouchableOpacity
                  key={c.id}
                  style={styles.campaignCard}
                  activeOpacity={0.88}
                  onPress={() => {
                    const cRaw = c.affiliateUrl || c.url || '';
                    const cUrl = cRaw.startsWith('http') ? cRaw : `https://${cRaw}`;
                    trackAffiliateClick(user?.id ?? null, c.brandId, null, cUrl);
                    Linking.openURL(cUrl);
                  }}
                >
                  <LinearGradient colors={[Colors.surface1, Colors.surface2]} style={StyleSheet.absoluteFill} />
                  <View style={styles.campaignTop} />
                  {c.isSponsored && (
                    <View style={styles.sponsoredBadge}>
                      <Text style={styles.sponsoredText}>Sponsorlu</Text>
                    </View>
                  )}
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
                </TouchableOpacity>
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
                       />
                  ))}
                </View>
                <View style={[styles.col, styles.colOffset]}>
                  {right.map((p, i) => (
                    <ProductCard key={p.id} product={p} tall={i % 3 === 0}
                       />
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Yorumlar */}
          <View style={styles.section}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.sectionTitle}>Yorumlar</Text>
              {avgRating != null && (
                <View style={styles.avgBadge}>
                  <Ionicons name="star" size={13} color={Colors.gold3} />
                  <Text style={styles.avgText}>{avgRating.toFixed(1)}</Text>
                </View>
              )}
            </View>

            {/* Yorum yaz / düzenle butonu */}
            {user && (
              <TouchableOpacity style={styles.writeReviewBtn} onPress={openReviewModal}>
                <Ionicons name={myReview ? 'create-outline' : 'pencil-outline'} size={16} color={Colors.rose3} />
                <Text style={styles.writeReviewText}>
                  {myReview ? 'Yorumunu Düzenle' : 'Yorum Yaz'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Son 5 yorum */}
            {(reviewsQ.data ?? []).slice(0, 5).map(r => (
              <View key={r.id} style={styles.reviewCard}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Ionicons key={s} name="star" size={12}
                        color={s <= r.rating ? Colors.gold3 : Colors.surface4} />
                    ))}
                  </View>
                  <Text style={styles.reviewUser}>{r.userId.slice(0, 8)}</Text>
                  <Text style={styles.reviewDate}>
                    {new Date(r.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                {r.comment ? (
                  <Text style={styles.reviewComment}>{r.comment}</Text>
                ) : null}
              </View>
            ))}

            {(reviewsQ.data ?? []).length === 0 && !reviewsQ.isLoading && (
              <Text style={styles.noReviews}>Henüz yorum yok. İlk yorumu sen yaz!</Text>
            )}
          </View>

          <View style={{ height: 80 }} />

          {/* Yorum Modal */}
          <Modal
            visible={reviewModalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setReviewModalVisible(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalOverlay}
            >
              <View style={styles.modalSheet}>
                <View style={styles.modalHandle} />
                <Text style={styles.modalTitle}>
                  {myReview ? 'Yorumunu Güncelle' : 'Yorum Yaz'}
                </Text>
                <Text style={styles.modalBrandName}>{brand.name}</Text>

                {/* Yıldız seçimi */}
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <TouchableOpacity key={s} onPress={() => {
                      Haptics.selectionAsync();
                      setDraftRating(s);
                    }}>
                      <Ionicons
                        name={s <= draftRating ? 'star' : 'star-outline'}
                        size={36}
                        color={s <= draftRating ? Colors.gold3 : Colors.text5}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.commentInput}
                  placeholder="Yorumunu yaz... (isteğe bağlı)"
                  placeholderTextColor={Colors.text5}
                  multiline
                  numberOfLines={4}
                  value={draftComment}
                  onChangeText={setDraftComment}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setReviewModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn2, draftRating === 0 && styles.saveBtnDisabled]}
                    onPress={handleSaveReview}
                    disabled={draftRating === 0}
                  >
                    <LinearGradient
                      colors={draftRating > 0 ? [Colors.rose2, Colors.rose4] : [Colors.surface3, Colors.surface4]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={[styles.saveBtnText2, draftRating === 0 && styles.saveBtnTextDisabled]}>Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
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
  sponsoredBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: Colors.glassGold, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.borderGold,
  },
  sponsoredText: { fontSize: 9, fontWeight: '700', color: Colors.gold3, letterSpacing: 0.5 },
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
  colOffset: { paddingTop: 20 },
  // Reviews
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  avgBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.glassGold, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.borderGold,
  },
  avgText: { fontSize: 13, fontWeight: '700', color: Colors.gold2 },
  writeReviewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: Colors.glassRose, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.borderRose,
    marginBottom: 14, alignSelf: 'flex-start',
  },
  writeReviewText: { fontSize: 14, fontWeight: '700', color: Colors.rose3 },
  reviewCard: {
    backgroundColor: Colors.surface2, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border1,
    padding: 14, marginBottom: 10, gap: 6,
  },
  reviewTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewUser: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.text3 },
  reviewDate: { fontSize: 11, color: Colors.text5 },
  reviewComment: { fontSize: 14, color: Colors.text2, lineHeight: 20 },
  noReviews: { fontSize: 14, color: Colors.text4, textAlign: 'center', paddingVertical: 16 },
  // Modal
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(26,14,20,0.55)',
  },
  modalSheet: {
    backgroundColor: Colors.surface1, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, gap: 16,
    borderWidth: 1, borderColor: Colors.border1,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border3, alignSelf: 'center', marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  modalBrandName: { fontSize: 14, color: Colors.text3, marginTop: -10 },
  starRow: { flexDirection: 'row', gap: 12, justifyContent: 'center', paddingVertical: 8 },
  commentInput: {
    backgroundColor: Colors.surface3, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border2,
    padding: 14, fontSize: 14, color: Colors.text1,
    minHeight: 100, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 14,
    backgroundColor: Colors.surface3, borderWidth: 1, borderColor: Colors.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: Colors.text3 },
  saveBtn2: {
    flex: 2, height: 48, borderRadius: 14, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnDisabled: {},
  saveBtnText2: { fontSize: 15, fontWeight: '700', color: '#fff' },
  saveBtnTextDisabled: { color: Colors.text4 },
});
