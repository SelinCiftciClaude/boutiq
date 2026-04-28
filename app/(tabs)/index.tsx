import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { CATEGORIES } from '../../constants/MockData';
import { BrandCard } from '../../components/BrandCard';
import { ProductCard } from '../../components/ProductCard';
import { Badge } from '../../components/ui/Badge';
import { AddBrandSheet } from '../../components/AddBrandSheet';
import { useBrands } from '@/hooks/useBrands';
import { useSavedBrands } from '@/hooks/useSavedBrands';
import { useProducts } from '@/hooks/useProducts';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useInterests, INTEREST_TO_CATEGORY } from '@/context/InterestsContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/context/AuthContext';
import { useTrending } from '@/hooks/useTrending';
import { trackAffiliateClick } from '@/services/queries';
import { Brand, Campaign } from '../../types';

function CampaignBanner({ campaign, onCopyCode, userId }: { campaign: Campaign; onCopyCode: (code: string) => void; userId?: string }) {
  const code = campaign.code ?? 'BOUTIQ10';
  const handlePress = () => {
    trackAffiliateClick(userId ?? null, campaign.brandId, null, campaign.affiliateUrl || campaign.url);
    Linking.openURL(campaign.affiliateUrl || campaign.url);
  };
  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.campaignCard} onPress={handlePress}>
      <LinearGradient
        colors={[Colors.surface1, Colors.surface2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.campaignAccent} />
      {campaign.isSponsored && (
        <View style={styles.sponsoredBadge}>
          <Text style={styles.sponsoredText}>Sponsorlu</Text>
        </View>
      )}
      <View style={styles.campaignContent}>
        <View style={styles.campaignLeft}>
          <Image source={{ uri: campaign.brandLogo }} style={styles.campaignLogo} />
          <View>
            <Text style={styles.campaignBrand}>{campaign.brandName}</Text>
            <Text style={styles.campaignTitle} numberOfLines={1}>{campaign.title}</Text>
            {campaign.discount && (
              <Text style={styles.campaignDiscount}>
                {campaign.discountType === 'percent'
                  ? `%${campaign.discount} indirim`
                  : `₺${campaign.discount} indirim`}
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.codeBox}
          onPress={(e) => { e.stopPropagation?.(); onCopyCode(code); }}
          activeOpacity={0.7}
        >
          <Text style={styles.codeText}>{code}</Text>
          <Ionicons name="copy-outline" size={11} color={Colors.rose3} style={{ marginTop: 1 }} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [feedTab, setFeedTab] = useState<'discover' | 'foryou'>('discover');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [addSheetBrand, setAddSheetBrand] = useState<Brand | null>(null);

  const { user } = useAuth();
  const { data: brands = [] } = useBrands();
  const { data: products = [] } = useProducts();
  const { data: campaigns = [] } = useCampaigns();
  const savedBrands = useSavedBrands();
  const { interests } = useInterests();
  const { unreadCount } = useNotifications();
  const { brands: trendingBrandsQ } = useTrending();
  const trendingBrands = trendingBrandsQ.data ?? [];

  // İlgi alanlarına göre sıralama: seçilen kategoriler önce
  const interestCategories = interests
    .map(id => INTEREST_TO_CATEGORY[id])
    .filter(Boolean);

  const sortedBrands = [...brands].sort((a, b) => {
    const aIdx = interestCategories.indexOf(a.category);
    const bIdx = interestCategories.indexOf(b.category);
    const aScore = aIdx === -1 ? 999 : aIdx;
    const bScore = bIdx === -1 ? 999 : bIdx;
    return aScore - bScore;
  });

  // Kategori filtresi
  const filteredBrands = selectedCategory === 'all'
    ? sortedBrands
    : sortedBrands.filter(b => b.category === selectedCategory);

  const filteredBrandIds = new Set(filteredBrands.map(b => b.id));

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => filteredBrandIds.has(p.brandId));

  // "Senin İçin" feed: interest + saved brand kategorilerinden ürünler
  const savedBrandCategories = savedBrands.data?.map(b => b.category) ?? [];
  const interestCats = interests.map(id => INTEREST_TO_CATEGORY[id]).filter(Boolean);
  const forYouCategories = [...new Set([...interestCats, ...savedBrandCategories])];

  const forYouBrands = forYouCategories.length > 0
    ? sortedBrands.filter(b => forYouCategories.includes(b.category))
    : sortedBrands.slice(0, 4);

  // "Beğenebileceğin Ürünler": kullanıcının koleksiyonunda OLMAYAN markalardan,
  // ilgi alanlarıyla eşleşen kategorilerdeki ürünler
  const savedBrandIds = new Set(savedBrands.data?.map(b => b.id) ?? []);
  const discoverCategories = forYouCategories.length > 0 ? forYouCategories : null;

  const discoverProducts = products
    .filter(p => !savedBrandIds.has(p.brandId)) // koleksiyonda olmayan markalar
    .filter(p => !discoverCategories || discoverCategories.includes(p.category as any))
    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
    .slice(0, 20);

  const forYouProducts = forYouCategories.length > 0
    ? products.filter(p => forYouBrands.some(b => b.id === p.brandId))
    : products.slice(0, 6);

  const handleAddBrand = (brand: Brand) => setAddSheetBrand(brand);

  const handleCopyCode = async (code: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const activeCampaigns = campaigns.filter((c) => !c.isRead);
  const featuredBrand = filteredBrands[0] ?? brands[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={[Colors.bg, 'rgba(7,7,15,0)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />

      {/* Kopyalandı toast */}
      {copiedCode && (
        <View style={styles.toast} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.toastText}>"{copiedCode}" kopyalandı</Text>
        </View>
      )}

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Merhaba 👋</Text>
            <Text style={styles.headerTitle}>BOUTIQ</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.searchBtn} onPress={() => router.push('/search' as any)}>
              <Ionicons name="search" size={20} color={Colors.text2} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/notifications' as any)}>
              <Ionicons name="notifications-outline" size={20} color={Colors.text2} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifCount}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Feed sekme geçişi */}
        <View style={styles.feedTabs}>
          {(['discover', 'foryou'] as const).map(tab => {
            const active = feedTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => { Haptics.selectionAsync(); setFeedTab(tab); }}
                style={[styles.feedTab, active && styles.feedTabActive]}
              >
                {active && <LinearGradient colors={[Colors.gold2, Colors.gold4]} style={StyleSheet.absoluteFill} />}
                <Text style={[styles.feedTabText, active && styles.feedTabTextActive]}>
                  {tab === 'discover' ? 'Keşfet' : 'Senin İçin'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Senin İçin feed */}
        {feedTab === 'foryou' && (
          <>
            {forYouCategories.length === 0 ? (
              <View style={styles.forYouEmpty}>
                <Text style={styles.forYouEmptyIcon}>✨</Text>
                <Text style={styles.forYouEmptyTitle}>Feed'in henüz boş</Text>
                <Text style={styles.forYouEmptySubtitle}>
                  İlgi alanı ekle veya butik kaydet, sana özel içerikler gösterelim.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Senin için butikler</Text>
                  <View style={styles.brandsGrid}>
                    {forYouBrands.map(brand => (
                      <BrandCard
                        key={brand.id} brand={brand} variant="grid"
                        onAdd={handleAddBrand}
                        onPress={b => router.push(`/brand/${b.id}` as any)}
                        isSaved={savedBrands.isSaved(brand.id)}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Senin için ürünler</Text>
                  <View style={styles.productsGrid}>
                    <View style={styles.productCol}>
                      {forYouProducts.filter((_, i) => i % 2 === 0).map((p, i) => (
                        <ProductCard key={p.id} product={p} tall={i % 3 === 1} />
                      ))}
                    </View>
                    <View style={[styles.productCol, styles.productColOffset]}>
                      {forYouProducts.filter((_, i) => i % 2 === 1).map((p, i) => (
                        <ProductCard key={p.id} product={p} tall={i % 3 === 0} />
                      ))}
                    </View>
                  </View>
                </View>
              </>
            )}
            <View style={{ height: 100 }} />
          </>
        )}

        {feedTab === 'discover' && <>
        {/* Aktif Kampanyalar */}
        {activeCampaigns.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.liveDot} />
                <Text style={styles.sectionTitle}>Aktif Kampanyalar</Text>
              </View>
              <Badge label={`${activeCampaigns.length} yeni`} variant="gold" />
            </View>
            <FlatList
              data={activeCampaigns}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <CampaignBanner campaign={item} onCopyCode={handleCopyCode} userId={user?.id} />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Bu Hafta Trend */}
        {trendingBrands.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bu Hafta Trend 🔥</Text>
            </View>
            <FlatList
              data={trendingBrands}
              keyExtractor={b => b.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingList}
              renderItem={({ item }) => (
                <BrandCard
                  brand={item}
                  variant="grid"
                  onAdd={handleAddBrand}
                  onPress={b => router.push(`/brand/${b.id}` as any)}
                  isSaved={savedBrands.isSaved(item.id)}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          </View>
        )}

        {/* Öne Çıkan Butik */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>HAFTANIN</Text>
            <Text style={styles.sectionTitle}>Öne Çıkan Butik</Text>
          </View>
          {featuredBrand && (
            <BrandCard
              brand={featuredBrand}
              variant="featured"
              onPress={b => router.push(`/brand/${b.id}` as any)}
            />
          )}
        </View>

        {/* Kategori Filtresi */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedCategory(cat.id);
                }}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
              >
                {active && (
                  <LinearGradient
                    colors={[Colors.rose2, Colors.rose4]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Markalar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory === 'all' ? 'Tüm Butikler' : `${CATEGORIES.find(c => c.id === selectedCategory)?.label ?? ''} Butikleri`}
            </Text>
            <TouchableOpacity onPress={() => router.push('/all-brands' as any)}>
              <Text style={styles.seeAll}>Tümünü gör</Text>
            </TouchableOpacity>
          </View>
          {filteredBrands.length === 0 ? (
            <Text style={styles.emptyFilter}>Bu kategoride henüz butik yok.</Text>
          ) : (
            <View style={styles.brandsGrid}>
              {filteredBrands.map((brand) => (
                <BrandCard
                  key={brand.id}
                  brand={brand}
                  variant="grid"
                  onAdd={handleAddBrand}
                  onPress={b => router.push(`/brand/${b.id}` as any)}
                  isSaved={savedBrands.isSaved(brand.id)}
                />
              ))}
            </View>
          )}
        </View>

        {/* Beğenebileceğin Ürünler */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>KİŞİSEL ÖNERİ</Text>
              <Text style={styles.sectionTitle}>Beğenebileceğin Ürünler</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/all-products' as any)}>
              <Text style={styles.seeAll}>Tümünü gör</Text>
            </TouchableOpacity>
          </View>
          {discoverProducts.length === 0 ? (
            <Text style={styles.emptyFilter}>
              {savedBrandIds.size === 0
                ? 'Butik ekledikçe kişisel öneriler burada görünür.'
                : 'Tüm mevcut butikleri koleksiyonuna ekledin! Yeni butikler eklenince burada görünür.'}
            </Text>
          ) : (
            <View style={styles.productsGrid}>
              <View style={styles.productCol}>
                {discoverProducts.filter((_, i) => i % 2 === 0).map((p, i) => (
                  <ProductCard key={p.id} product={p} tall={i % 3 === 1} />
                ))}
              </View>
              <View style={[styles.productCol, styles.productColOffset]}>
                {discoverProducts.filter((_, i) => i % 2 === 1).map((p, i) => (
                  <ProductCard key={p.id} product={p} tall={i % 3 === 0} />
                ))}
              </View>
            </View>
          )}
        </View>

        </> /* end feedTab === 'discover' */}

        {/* Affiliate notu */}
        {feedTab === 'discover' && <View style={styles.affiliateNote}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.text5} />
          <Text style={styles.affiliateText}>
            BOUTIQ, marka linklerinden komisyon kazanabilir. Bu sana ekstra ücret yansımaz.
          </Text>
        </View>}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      <AddBrandSheet
        brand={addSheetBrand}
        visible={!!addSheetBrand}
        alreadySaved={addSheetBrand ? savedBrands.isSaved(addSheetBrand.id) : false}
        currentCategory={addSheetBrand?.category}
        onSave={(brand) => savedBrands.add.mutate({ brandId: brand.id, isFavorite: true })}
        onRemove={(id) => savedBrands.remove.mutate(id)}
        onClose={() => setAddSheetBrand(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  floatingHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 100, zIndex: 50, pointerEvents: 'none',
  },
  bgGlow1: {
    position: 'absolute', top: -100, right: -150,
    width: 400, height: 400, borderRadius: 200,
    backgroundColor: Colors.goldGlow, opacity: 0.35,
  },
  bgGlow2: {
    position: 'absolute', top: 300, left: -200,
    width: 450, height: 450, borderRadius: 225,
    backgroundColor: Colors.purpleGlow, opacity: 0.25,
  },
  toast: {
    position: 'absolute', top: 100, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface1, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 100,
  },
  toastText: { fontSize: 13, fontWeight: '600', color: Colors.text1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', paddingTop: 8, paddingBottom: 20,
  },
  greeting: { fontSize: 13, color: Colors.text4, fontWeight: '500', marginBottom: 2 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: Colors.text1, letterSpacing: 4 },
  headerActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  searchBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border2,
  },
  notifBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border2, position: 'relative',
  },
  notifBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#F43F5E', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.bg,
  },
  notifCount: { fontSize: 8, fontWeight: '800', color: '#fff' },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#F43F5E',
    shadowColor: '#F43F5E', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 4, elevation: 4,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: Colors.gold3,
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.text1, letterSpacing: -0.5 },
  seeAll: { fontSize: 13, color: Colors.gold3, fontWeight: '600' },
  emptyFilter: { fontSize: 14, color: Colors.text4, textAlign: 'center', paddingVertical: 24 },
  // Campaign
  campaignCard: {
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.borderGold, position: 'relative',
  },
  campaignAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    backgroundColor: Colors.gold3, opacity: 0.8,
  },
  sponsoredBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: Colors.glassGold, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.borderGold,
  },
  sponsoredText: { fontSize: 9, fontWeight: '700', color: Colors.gold3, letterSpacing: 0.5 },
  campaignContent: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 16, gap: 12,
  },
  campaignLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  campaignLogo: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surface3, borderWidth: 1, borderColor: Colors.borderGold,
  },
  campaignBrand: { fontSize: 11, color: Colors.text3, fontWeight: '500' },
  campaignTitle: {
    fontSize: 14, fontWeight: '700', color: Colors.text1,
    letterSpacing: -0.2, marginVertical: 2,
  },
  campaignDiscount: { fontSize: 13, color: Colors.rose3, fontWeight: '700' },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.glassGold, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.borderGold,
  },
  codeText: { fontSize: 12, fontWeight: '800', color: Colors.rose3, letterSpacing: 1.5 },
  // Category
  categoryScroll: { paddingRight: 16, gap: 8, marginBottom: 24 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2, overflow: 'hidden',
  },
  categoryChipActive: { borderColor: Colors.gold3 },
  categoryIcon: { fontSize: 15 },
  categoryLabel: { fontSize: 13, fontWeight: '600', color: Colors.text3 },
  categoryLabelActive: { color: Colors.bg, fontWeight: '700' },
  // Brands grid
  brandsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  // Products masonry
  productsGrid: { flexDirection: 'row', gap: 12 },
  productCol: { flex: 1, gap: 0 },
  productColOffset: { marginTop: 40 },
  feedTabs: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  feedTab: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2, overflow: 'hidden',
  },
  feedTabActive: { borderColor: Colors.gold3 },
  feedTabText: { fontSize: 14, fontWeight: '600', color: Colors.text3 },
  feedTabTextActive: { color: Colors.bg, fontWeight: '700' },
  forYouEmpty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 10 },
  forYouEmptyIcon: { fontSize: 48 },
  forYouEmptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text2 },
  forYouEmptySubtitle: { fontSize: 14, color: Colors.text4, textAlign: 'center', lineHeight: 20 },
  affiliateNote: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    paddingHorizontal: 4, marginBottom: 8,
  },
  affiliateText: { fontSize: 11, color: Colors.text5, lineHeight: 16, flex: 1 },
  trendingList: { paddingRight: 4 },
});
