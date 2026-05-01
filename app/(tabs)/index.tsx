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
import { Fonts } from '../../constants/Typography';
import { CATEGORIES } from '../../constants/MockData';
import { BrandCard } from '../../components/BrandCard';
import { ProductCard } from '../../components/ProductCard';
import { Badge } from '../../components/ui/Badge';
import { AddBrandSheet } from '../../components/AddBrandSheet';
import { useBrands } from '@/hooks/useBrands';
import { useSavedBrands } from '@/hooks/useSavedBrands';
import { useProducts } from '@/hooks/useProducts';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useShipments } from '@/hooks/useShipments';
import { useInterests, INTEREST_TO_CATEGORY } from '@/context/InterestsContext';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/context/AuthContext';
import { useTrending } from '@/hooks/useTrending';
import { trackAffiliateClick } from '@/services/queries';
import { Brand, Campaign, Shipment, ShipmentStatus } from '../../types';

function CampaignBanner({ campaign, onCopyCode, userId }: { campaign: Campaign; onCopyCode: (code: string) => void; userId?: string }) {
  const code = campaign.code ?? 'BUTİKA10';
  const handlePress = () => {
    trackAffiliateClick(userId ?? null, campaign.brandId, null, campaign.affiliateUrl || campaign.url);
    Linking.openURL(campaign.affiliateUrl || campaign.url);
  };
  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.campaignCard} onPress={handlePress}>
      <LinearGradient
        colors={[Colors.surface1, Colors.surface2]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Üst altın çizgi */}
      <View style={styles.campaignAccent} />

      <View style={styles.campaignContent}>
        {/* Üst satır: logo + marka adı + sponsorlu badge */}
        <View style={styles.campaignTopRow}>
          <Image source={{ uri: campaign.brandLogo }} style={styles.campaignLogo} />
          <Text style={styles.campaignBrand} numberOfLines={1}>{campaign.brandName}</Text>
          {campaign.isSponsored && (
            <View style={styles.sponsoredBadge}>
              <Text style={styles.sponsoredText}>Sponsorlu</Text>
            </View>
          )}
        </View>

        {/* Kampanya başlığı */}
        <Text style={styles.campaignTitle} numberOfLines={2}>{campaign.title}</Text>

        {/* Alt satır: indirim + kupon kodu */}
        <View style={styles.campaignBottomRow}>
          {campaign.discount ? (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                {campaign.discountType === 'percent'
                  ? `%${campaign.discount} İndirim`
                  : `₺${campaign.discount} İndirim`}
              </Text>
            </View>
          ) : <View />}

          <TouchableOpacity
            style={styles.codeBox}
            onPress={(e) => { e.stopPropagation?.(); onCopyCode(code); }}
            activeOpacity={0.7}
          >
            <Text style={styles.codeText}>{code}</Text>
            <Ionicons name="copy-outline" size={13} color={Colors.rose3} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Kargo durumu renkleri ────────────────────────────────────────────────────
const STATUS_DOT: Record<ShipmentStatus, string> = {
  delivered:        '#3AAA78',  // yeşil
  out_for_delivery: '#C49450',  // sarı-altın
  in_transit:       '#C49450',
  shipped:          '#C49450',
  processing:       '#BC3C3C',  // kırmızı
  ordered:          '#BC3C3C',
  returned:         '#BC3C3C',
};

const STATUS_PROGRESS: Record<ShipmentStatus, number> = {
  ordered: 0.08, processing: 0.25, shipped: 0.45,
  in_transit: 0.65, out_for_delivery: 0.85, delivered: 1, returned: 0,
};

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  ordered: 'Sipariş alındı', processing: 'Hazırlanıyor', shipped: 'Kargoya verildi',
  in_transit: 'Yolda', out_for_delivery: 'Dağıtımda', delivered: 'Teslim edildi', returned: 'İade',
};

// Tarih: "1 Mayıs 2026" formatı
function todayLabel() {
  return new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ShipmentCard2({ s }: { s: Shipment }) {
  const dot   = STATUS_DOT[s.status];
  const prog  = STATUS_PROGRESS[s.status];
  const label = STATUS_LABEL[s.status];
  const isDelivered = s.status === 'delivered';
  const isActive    = !isDelivered && s.status !== 'returned';

  return (
    <TouchableOpacity
      style={sw.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/shipment/${s.id}` as any)}
    >
      {/* Üst satır: butik adı + nokta */}
      <View style={sw.topRow}>
        <Text style={sw.brandName} numberOfLines={1}>{s.brandName}</Text>
        <View style={[sw.dot, { backgroundColor: dot }]} />
      </View>

      {/* Kargo firması */}
      <Text style={sw.carrier}>{s.carrier}</Text>

      {/* Durum */}
      <Text style={[sw.statusText, { color: dot }]}>{label}</Text>

      {/* Progress bar */}
      <View style={sw.progressTrack}>
        <View style={[sw.progressFill, { width: `${prog * 100}%` as any, backgroundColor: dot }]} />
      </View>

      {/* ETA */}
      <Text style={[sw.eta, isDelivered && { color: '#3AAA78' }]} numberOfLines={1}>
        {s.estimatedDelivery}
      </Text>
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
  const { data: allShipments = [] } = useShipments();
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
          <Text style={styles.headerLogo}>BUTİKA</Text>
          <View style={styles.headerActions}>
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
        {/* Kargo Durumu Widget */}
        {allShipments.length > 0 && (
          <View style={styles.section}>
            {/* Tarih başlığı */}
            <Text style={sw.dateLabel}>{todayLabel()}</Text>

            {/* Bölüm başlığı */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Yoldaki Kargolar</Text>
              {allShipments.filter(s => s.status !== 'delivered').length > 0 && (
                <Badge
                  label={`${allShipments.filter(s => s.status !== 'delivered').length} aktif`}
                  variant="gold"
                />
              )}
            </View>

            {/* Yatay kayan kartlar */}
            <FlatList
              data={allShipments}
              keyExtractor={s => s.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 16 }}
              renderItem={({ item }) => <ShipmentCard2 s={item} />}
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
            BUTİKA, marka linklerinden komisyon kazanabilir. Bu sana ekstra ücret yansımaz.
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
    position: 'absolute', top: -80, right: -120,
    width: 350, height: 350, borderRadius: 175,
    backgroundColor: Colors.goldGlow, opacity: 0.5,
  },
  bgGlow2: {
    position: 'absolute', top: 350, left: -180,
    width: 400, height: 400, borderRadius: 200,
    backgroundColor: Colors.roseGlow, opacity: 0.3,
  },
  toast: {
    position: 'absolute', top: 100, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface2, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 0.5, borderColor: Colors.borderGold,
    shadowColor: Colors.gold3, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 8, zIndex: 100,
  },
  toastText: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.text1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', paddingTop: 8, paddingBottom: 20,
  },
  headerLogo: { fontFamily: Fonts.display, fontSize: 32, letterSpacing: 1.5, color: Colors.rose3 },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  searchBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: Colors.border2,
  },
  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: Colors.border2, position: 'relative',
  },
  notifBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 15, height: 15, borderRadius: 7.5,
    backgroundColor: Colors.rose3, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.bg,
  },
  notifCount: { fontFamily: Fonts.ui, fontSize: 8, color: Colors.text1 },
  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginBottom: 14,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: {
    width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.rose3,
    shadowColor: Colors.rose3, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 6, elevation: 4,
  },
  sectionLabel: {
    fontFamily: Fonts.uiMedium, fontSize: 9, color: Colors.gold3,
    letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 3,
  },
  sectionTitle: { fontFamily: Fonts.editorial, fontSize: 24, color: Colors.text1, letterSpacing: 0 },
  seeAll: { fontFamily: Fonts.uiMedium, fontSize: 11, color: Colors.text4, letterSpacing: 1, textTransform: 'uppercase' },
  emptyFilter: { fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text4, textAlign: 'center', paddingVertical: 24 },
  // Campaign
  campaignCard: {
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 0.5, borderColor: Colors.borderGold,
  },
  campaignAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1.5,
    backgroundColor: Colors.gold3, opacity: 0.7,
  },
  campaignContent: { padding: 16, gap: 10 },
  campaignTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  campaignLogo: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.surface3, borderWidth: 0.5, borderColor: Colors.borderGold,
  },
  campaignBrand: { fontFamily: Fonts.uiMedium, flex: 1, fontSize: 12, color: Colors.text3, letterSpacing: 0.5 },
  sponsoredBadge: {
    backgroundColor: Colors.glassGold, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 3,
    borderWidth: 0.5, borderColor: Colors.borderGold,
  },
  sponsoredText: { fontFamily: Fonts.uiMedium, fontSize: 8, color: Colors.gold3, letterSpacing: 1 },
  campaignTitle: {
    fontFamily: Fonts.uiMedium, fontSize: 15, color: Colors.text1,
    letterSpacing: -0.2, lineHeight: 21,
  },
  campaignBottomRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: 4,
  },
  discountBadge: {
    backgroundColor: Colors.glassRose, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 0.5, borderColor: Colors.borderRose,
  },
  discountText: { fontFamily: Fonts.ui, fontSize: 12, color: Colors.rose4 },
  codeBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.glassGold, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 0.5, borderColor: Colors.borderGold,
  },
  codeText: { fontFamily: Fonts.ui, fontSize: 13, color: Colors.gold4, letterSpacing: 2 },
  // Category
  categoryScroll: { paddingRight: 16, gap: 8, marginBottom: 24 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6,
    backgroundColor: Colors.surface2, borderWidth: 0.5, borderColor: Colors.border2, overflow: 'hidden',
  },
  categoryChipActive: { borderColor: Colors.borderGold },
  categoryIcon: { fontSize: 14 },
  categoryLabel: { fontFamily: Fonts.uiMedium, fontSize: 12, color: Colors.text3 },
  categoryLabelActive: { color: Colors.gold4 },
  // Brands grid
  brandsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // Products masonry
  productsGrid: { flexDirection: 'row', gap: 10 },
  productCol: { flex: 1, gap: 0 },
  productColOffset: { paddingTop: 20 },
  feedTabs: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  feedTab: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    backgroundColor: Colors.surface2, borderWidth: 0.5, borderColor: Colors.border2, overflow: 'hidden',
  },
  feedTabActive: { borderColor: Colors.borderGold },
  feedTabText: { fontFamily: Fonts.uiMedium, fontSize: 12, color: Colors.text3, letterSpacing: 0.5, textTransform: 'uppercase' },
  feedTabTextActive: { color: Colors.gold4 },
  forYouEmpty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 10 },
  forYouEmptyIcon: { fontSize: 48 },
  forYouEmptyTitle: { fontFamily: Fonts.editorial, fontSize: 22, color: Colors.text2 },
  forYouEmptySubtitle: { fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text4, textAlign: 'center', lineHeight: 20 },
  affiliateNote: {
    flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    paddingHorizontal: 4, marginBottom: 8,
  },
  affiliateText: { fontFamily: Fonts.uiLight, fontSize: 10, color: Colors.text5, lineHeight: 16, flex: 1 },
  trendingList: { paddingRight: 4 },
});

// Kargo widget stilleri
const CARD_W = 164;
const sw = StyleSheet.create({
  dateLabel: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    letterSpacing: 1.8,
    color: Colors.text2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  card: {
    width: CARD_W,
    backgroundColor: Colors.surface2,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    padding: 14,
    gap: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  carrier: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  brandName: {
    fontFamily: Fonts.ui,
    fontSize: 15,
    color: Colors.text1,
    letterSpacing: -0.2,
  },
  statusText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    letterSpacing: 0.1,
  },
  progressTrack: {
    height: 3,
    backgroundColor: Colors.border2,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  eta: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text3,
  },
});
