import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { MOCK_BRANDS, MOCK_CAMPAIGNS, CATEGORIES, MOCK_PRODUCTS } from '../../constants/MockData';
import { BrandCard } from '../../components/BrandCard';
import { ProductCard } from '../../components/ProductCard';
import { Badge } from '../../components/ui/Badge';
import { AddBrandSheet } from '../../components/AddBrandSheet';
import { useBrands } from '../../context/BrandsContext';
import { Brand, BrandCategory, Campaign } from '../../types';

const { width } = Dimensions.get('window');
const NOTIFICATION_COUNT = 2;

function CampaignBanner({ campaign }: { campaign: Campaign }) {
  const timeLeft = () => {
    const end = new Date(campaign.endsAt);
    const now = new Date();
    const diff = Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `${diff}g kaldı` : 'Son gün!';
  };

  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.campaignCard}>
      <LinearGradient
        colors={[Colors.surface3, Colors.surface2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Gold accent line */}
      <View style={styles.campaignAccent} />

      <View style={styles.campaignContent}>
        <View style={styles.campaignLeft}>
          <Image source={{ uri: campaign.brandLogo }} style={styles.campaignLogo} />
          <View>
            <Text style={styles.campaignBrand}>{campaign.brandName}</Text>
            <Text style={styles.campaignTitle} numberOfLines={1}>{campaign.title}</Text>
            {campaign.discount && (
              <View style={styles.campaignDiscountRow}>
                {campaign.discountType === 'percent' ? (
                  <Text style={styles.campaignDiscount}>%{campaign.discount} indirim</Text>
                ) : (
                  <Text style={styles.campaignDiscount}>₺{campaign.discount} indirim</Text>
                )}
              </View>
            )}
          </View>
        </View>
        <View style={styles.campaignRight}>
          <Badge label={timeLeft()} variant="gold" size="sm" />
          {campaign.code && (
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{campaign.code}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const scrollY = useRef(new Animated.Value(0)).current;
  const [addSheetBrand, setAddSheetBrand] = useState<Brand | null>(null);
  const { saveBrand, removeBrand, isSaved, savedBrands } = useBrands();

  const handleAddBrand = (brand: Brand) => setAddSheetBrand(brand);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const activeCampaigns = MOCK_CAMPAIGNS.filter((c) => !c.isRead);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Floating header blur */}
      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={[Colors.bg, 'rgba(7,7,15,0)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Ambient background glow */}
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />

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
            <TouchableOpacity style={styles.searchBtn}>
              <Ionicons name="search" size={20} color={Colors.text2} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={20} color={Colors.text2} />
              {NOTIFICATION_COUNT > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifCount}>{NOTIFICATION_COUNT}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Campaign Alerts */}
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
              renderItem={({ item }) => <CampaignBanner campaign={item} />}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Featured Brand */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>HAFTANIN</Text>
            <Text style={styles.sectionTitle}>Öne Çıkan Butik</Text>
          </View>
          <BrandCard brand={MOCK_BRANDS[0]} variant="featured" />
        </View>

        {/* Category Filter */}
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
                    colors={[Colors.gold2, Colors.gold4]}
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

        {/* Brands Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tüm Butikler</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Tümünü gör</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.brandsGrid}>
            {MOCK_BRANDS.map((brand) => (
              <BrandCard
                key={brand.id}
                brand={brand}
                variant="grid"
                onAdd={handleAddBrand}
                isSaved={isSaved(brand.id)}
              />
            ))}
          </View>
        </View>

        {/* New Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionLabel}>YENI DÜŞENLER</Text>
              <Text style={styles.sectionTitle}>Ürünler</Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Tümünü gör</Text>
            </TouchableOpacity>
          </View>

          {/* Masonry Grid */}
          <View style={styles.productsGrid}>
            <View style={styles.productCol}>
              {MOCK_PRODUCTS.filter((_, i) => i % 2 === 0).map((p, i) => (
                <ProductCard key={p.id} product={p} tall={i % 3 === 1} />
              ))}
            </View>
            <View style={[styles.productCol, styles.productColOffset]}>
              {MOCK_PRODUCTS.filter((_, i) => i % 2 === 1).map((p, i) => (
                <ProductCard key={p.id} product={p} tall={i % 3 === 0} />
              ))}
            </View>
          </View>
        </View>

        {/* Affiliate disclosure */}
        <View style={styles.affiliateNote}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.text5} />
          <Text style={styles.affiliateText}>
            BOUTIQ, marka linklerinden komisyon kazanabilir. Bu sana ekstra ücret yansımaz.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      <AddBrandSheet
        brand={addSheetBrand}
        visible={!!addSheetBrand}
        alreadySaved={addSheetBrand ? isSaved(addSheetBrand.id) : false}
        currentCategory={
          addSheetBrand
            ? savedBrands.find((s) => s.brand.id === addSheetBrand.id)?.userCategory
            : undefined
        }
        onSave={(brand, category) => saveBrand(brand, category)}
        onRemove={(id) => removeBrand(id)}
        onClose={() => setAddSheetBrand(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 50,
    pointerEvents: 'none',
  },
  bgGlow1: {
    position: 'absolute',
    top: -100,
    right: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: Colors.goldGlow,
    opacity: 0.35,
  },
  bgGlow2: {
    position: 'absolute',
    top: 300,
    left: -200,
    width: 450,
    height: 450,
    borderRadius: 225,
    backgroundColor: Colors.purpleGlow,
    opacity: 0.25,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 13,
    color: Colors.text4,
    fontWeight: '500',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text1,
    letterSpacing: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  searchBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border2,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F43F5E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.bg,
  },
  notifCount: {
    fontSize: 8,
    fontWeight: '800',
    color: '#fff',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F43F5E',
    shadowColor: '#F43F5E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gold3,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text1,
    letterSpacing: -0.5,
  },
  seeAll: {
    fontSize: 13,
    color: Colors.gold3,
    fontWeight: '600',
  },
  // Campaign
  campaignCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderGold,
    position: 'relative',
  },
  campaignAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.gold3,
    opacity: 0.8,
  },
  campaignContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  campaignLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  campaignLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.borderGold,
  },
  campaignBrand: {
    fontSize: 11,
    color: Colors.text3,
    fontWeight: '500',
  },
  campaignTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text1,
    letterSpacing: -0.2,
    marginVertical: 2,
  },
  campaignDiscountRow: {},
  campaignDiscount: {
    fontSize: 13,
    color: Colors.gold4,
    fontWeight: '700',
  },
  campaignRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  codeBox: {
    backgroundColor: Colors.glassGold,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.borderGold,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.gold4,
    letterSpacing: 1.5,
  },
  // Category
  categoryScroll: {
    paddingRight: 16,
    gap: 8,
    marginBottom: 24,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 50,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
    overflow: 'hidden',
  },
  categoryChipActive: {
    borderColor: Colors.gold3,
  },
  categoryIcon: {
    fontSize: 15,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text3,
  },
  categoryLabelActive: {
    color: Colors.bg,
    fontWeight: '700',
  },
  // Brands grid
  brandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  // Products masonry
  productsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  productCol: {
    flex: 1,
    gap: 0,
  },
  productColOffset: {
    marginTop: 40,
  },
  affiliateNote: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  affiliateText: {
    fontSize: 11,
    color: Colors.text5,
    lineHeight: 16,
    flex: 1,
  },
});
