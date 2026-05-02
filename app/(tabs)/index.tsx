import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Switch,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useSavedBrands } from '@/hooks/useSavedBrands';
import {
  useDiscoverFeed,
  useDiscoverCategories,
  useCategoryBrands,
  type CategoryBrand,
  DiscoverProduct,
  DiscoverCategory,
  DiscoverFilters,
} from '@/hooks/useDiscoverFeed';
import { useAuth } from '@/context/AuthContext';
import { useInterests } from '@/context/InterestsContext';

// ── Constants ────────────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get('window').width;
const GRID_PADDING = 12;
const CARD_GAP = 8;
const cardWidth = (SCREEN_W - GRID_PADDING * 2 - CARD_GAP) / 2;
const INFO_HEIGHT = 72;

// ── Affiliate URL helper ──────────────────────────────────────────────────────
function buildAffiliateUrl(url: string): string {
  if (!url) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}utm_source=butika&utm_medium=discover`;
}

// ── Masonry layout algorithm ──────────────────────────────────────────────────
interface MasonryItem {
  product: DiscoverProduct;
  x: number;
  y: number;
  height: number;
}

function computeLayouts(
  products: DiscoverProduct[],
  cw: number,
): { items: MasonryItem[]; totalHeight: number } {
  const colHeights = [0, 0];
  const items: MasonryItem[] = [];
  for (const p of products) {
    const ar = p.imageAspectRatio || 0.75;
    const imageH = cw / ar;
    const cardH = imageH + INFO_HEIGHT;
    const col = colHeights[0] <= colHeights[1] ? 0 : 1;
    items.push({
      product: p,
      x: col * (cw + CARD_GAP) + GRID_PADDING,
      y: colHeights[col],
      height: cardH,
    });
    colHeights[col] += cardH + CARD_GAP;
  }
  return { items, totalHeight: Math.max(colHeights[0], colHeights[1]) };
}

// ── Skeleton placeholder heights (alternating) ────────────────────────────────
const SKELETON_ASPECT_RATIOS = [0.75, 1.2, 0.75, 1.2, 1.2, 0.75, 1.2, 0.75];

// ── ProductCard ───────────────────────────────────────────────────────────────
interface ProductCardProps {
  product: DiscoverProduct;
  cardWidth: number;
  height: number;
}

const ProductCard = React.memo(function ProductCard({
  product,
  cardWidth: cw,
  height,
}: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleLoad = useCallback(() => {
    setImgLoaded(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleError = useCallback(() => {
    setImgError(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const ar = product.imageAspectRatio || 0.75;
  const imageHeight = cw / ar;

  const handlePress = useCallback(() => {
    const url = buildAffiliateUrl(product.affiliateUrl || product.url);
    Linking.openURL(url);
  }, [product.affiliateUrl, product.url]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // ActionSheet placeholder — share/hide
  }, []);

  const handleDotsPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <TouchableOpacity
      style={[pc.card, { width: cw, height }]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.92}
    >
      {/* Image */}
      <View style={{ width: cw, height: imageHeight, overflow: 'hidden' }}>
        {imgError ? (
          <Animated.View
            style={[
              pc.imgPlaceholder,
              { width: cw, height: imageHeight, opacity: fadeAnim },
            ]}
          >
            <Ionicons name="image-outline" size={28} color={Colors.text4} />
          </Animated.View>
        ) : (
          <Animated.Image
            source={{ uri: product.imageUrl }}
            style={{ width: cw, height: imageHeight, opacity: fadeAnim }}
            resizeMode="cover"
            onLoad={handleLoad}
            onError={handleError}
          />
        )}

        {/* Badges — top left */}
        {(product.isNew || product.isOnSale) && (
          <View style={pc.badgeStack}>
            {product.isNew && (
              <View style={[pc.badge, pc.badgeNew]}>
                <Text style={pc.badgeText}>YENİ</Text>
              </View>
            )}
            {product.isOnSale && (
              <View style={[pc.badge, pc.badgeSale]}>
                <Text style={pc.badgeText}>İNDİRİM</Text>
              </View>
            )}
          </View>
        )}

        {/* Three-dots — top right */}
        <TouchableOpacity
          style={pc.dotsBtn}
          onPress={handleDotsPress}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="ellipsis-horizontal" size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={[pc.info, { height: INFO_HEIGHT }]}>
        <Text style={pc.brand} numberOfLines={1}>
          {product.brandName}
        </Text>
        <Text style={pc.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={pc.priceRow}>
          <Text style={pc.price}>₺{product.price.toLocaleString('tr-TR')}</Text>
          {product.isOnSale && product.originalPrice != null && (
            <Text style={pc.originalPrice}>
              ₺{product.originalPrice.toLocaleString('tr-TR')}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ── SkeletonGrid ──────────────────────────────────────────────────────────────
function SkeletonGrid() {
  const shimmer = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.8,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  // Build skeleton items using the same masonry algorithm
  const skeletonProducts = useMemo(
    () =>
      SKELETON_ASPECT_RATIOS.map((ar, i) => ({
        id: `sk-${i}`,
        imageAspectRatio: ar,
      })),
    [],
  );

  const colHeights = [0, 0];
  const skItems: Array<{ x: number; y: number; height: number; key: string }> = [];
  for (const p of skeletonProducts) {
    const imageH = cardWidth / p.imageAspectRatio;
    const cardH = imageH + INFO_HEIGHT;
    const col = colHeights[0] <= colHeights[1] ? 0 : 1;
    skItems.push({
      key: p.id,
      x: col * (cardWidth + CARD_GAP) + GRID_PADDING,
      y: colHeights[col],
      height: cardH,
    });
    colHeights[col] += cardH + CARD_GAP;
  }
  const totalH = Math.max(colHeights[0], colHeights[1]);

  return (
    <View style={{ height: totalH, position: 'relative', marginTop: 8 }}>
      {skItems.map(item => (
        <Animated.View
          key={item.key}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            width: cardWidth,
            height: item.height,
            borderRadius: 12,
            backgroundColor: Colors.surface3,
            opacity: shimmer,
          }}
        />
      ))}
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
type EmptyVariant = 'noBrands' | 'noProducts';

interface EmptyStateProps {
  variant: EmptyVariant;
  onClearCategory?: () => void;
  clearInterests?: () => void;
}

function EmptyState({ variant, onClearCategory, clearInterests }: EmptyStateProps) {
  if (variant === 'noBrands') {
    return (
      <View style={es.wrap}>
        <View style={es.iconCircle}>
          <Ionicons name="bookmark-outline" size={32} color={Colors.rose3} />
        </View>
        <Text style={es.title}>Henüz butik eklemedin</Text>
        <Text style={es.subtitle}>
          Onboarding'de ilgi alanlarını seç, keşif feed'in canlansın.
        </Text>
        {clearInterests && (
          <TouchableOpacity
            style={es.btn}
            onPress={clearInterests}
            activeOpacity={0.85}
          >
            <Text style={es.btnText}>İlgi alanlarını sıfırla</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }
  return (
    <View style={es.wrap}>
      <View style={es.iconCircle}>
        <Ionicons name="search-outline" size={32} color={Colors.rose3} />
      </View>
      <Text style={es.title}>Bu kategoride ürün yok</Text>
      <Text style={es.subtitle}>
        Başka bir kategori dene ya da tüm ürünlere bak.
      </Text>
      {onClearCategory && (
        <TouchableOpacity
          style={es.linkBtn}
          onPress={onClearCategory}
          activeOpacity={0.7}
        >
          <Text style={es.linkBtnText}>Tümüne bak</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── FilterSheet ───────────────────────────────────────────────────────────────
interface FilterSheetProps {
  visible: boolean;
  filters: DiscoverFilters;
  onApply: (f: DiscoverFilters) => void;
  onClose: () => void;
}

function FilterSheet({ visible, filters, onApply, onClose }: FilterSheetProps) {
  const [local, setLocal] = useState<DiscoverFilters>(filters);
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      setLocal(filters);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, filters, slideAnim]);

  const handleApply = useCallback(() => {
    onApply(local);
    onClose();
  }, [local, onApply, onClose]);

  const handleReset = useCallback(() => {
    const reset: DiscoverFilters = { onSale: false, newOnly: false, maxPrice: null };
    setLocal(reset);
    onApply(reset);
    onClose();
  }, [onApply, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={fs.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[fs.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle */}
        <View style={fs.handle} />

        <Text style={fs.title}>Filtrele</Text>

        {/* Toggle: only on sale */}
        <View style={fs.row}>
          <View style={fs.rowTextWrap}>
            <Text style={fs.rowLabel}>Sadece indirimdekiler</Text>
            <Text style={fs.rowSub}>İndirimli ürünleri göster</Text>
          </View>
          <Switch
            value={local.onSale}
            onValueChange={v => setLocal(prev => ({ ...prev, onSale: v }))}
            trackColor={{ false: Colors.surface3, true: Colors.rose3 }}
            thumbColor={Colors.surface1}
          />
        </View>

        <View style={fs.divider} />

        {/* Toggle: new only */}
        <View style={fs.row}>
          <View style={fs.rowTextWrap}>
            <Text style={fs.rowLabel}>Sadece yeni gelenler</Text>
            <Text style={fs.rowSub}>Yeni eklenen ürünleri göster</Text>
          </View>
          <Switch
            value={local.newOnly}
            onValueChange={v => setLocal(prev => ({ ...prev, newOnly: v }))}
            trackColor={{ false: Colors.surface3, true: Colors.rose3 }}
            thumbColor={Colors.surface1}
          />
        </View>

        {/* Buttons */}
        <TouchableOpacity
          style={fs.applyBtn}
          onPress={handleApply}
          activeOpacity={0.88}
        >
          <Text style={fs.applyBtnText}>Uygula</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={fs.resetBtn}
          onPress={handleReset}
          activeOpacity={0.7}
        >
          <Text style={fs.resetBtnText}>Sıfırla</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ── DiscoverHeader ────────────────────────────────────────────────────────────
interface DiscoverHeaderProps {
  onFilterPress: () => void;
}

function DiscoverHeader({ onFilterPress }: DiscoverHeaderProps) {
  return (
    <View style={dh.wrap}>
      <Text style={dh.title}>Keşfet</Text>
      <View style={dh.actions}>
        <TouchableOpacity
          style={dh.iconBtn}
          onPress={() => router.push('/search' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="search-outline" size={20} color={Colors.text2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={dh.iconBtn}
          onPress={onFilterPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="options-outline" size={20} color={Colors.text2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── BrandFilterRow ────────────────────────────────────────────────────────────
interface BrandFilterRowProps {
  brands: CategoryBrand[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}

function BrandFilterRow({ brands, selected, onToggle, onClear }: BrandFilterRowProps) {
  if (brands.length < 2) return null;
  const allSelected = selected.length === 0;

  return (
    <View style={bfr.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={bfr.row}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tümü */}
        <TouchableOpacity
          style={[bfr.pill, allSelected && bfr.pillActive]}
          onPress={() => { Haptics.selectionAsync(); onClear(); }}
          activeOpacity={0.75}
        >
          <Text style={[bfr.pillText, allSelected && bfr.pillTextActive]}>Tümü</Text>
        </TouchableOpacity>

        {brands.map(brand => {
          const sel = selected.includes(brand.id);
          const initial = brand.name.charAt(0).toUpperCase();
          return (
            <TouchableOpacity
              key={brand.id}
              style={[bfr.pill, sel && bfr.pillActive]}
              onPress={() => { Haptics.selectionAsync(); onToggle(brand.id); }}
              activeOpacity={0.75}
            >
              {/* Marka avatarı */}
              <View style={[bfr.avatar, sel && bfr.avatarActive]}>
                {brand.logoUrl ? (
                  <Image source={{ uri: brand.logoUrl }} style={bfr.avatarImg} />
                ) : (
                  <Text style={[bfr.avatarInitial, sel && { color: '#fff' }]}>{initial}</Text>
                )}
              </View>
              <Text style={[bfr.pillText, sel && bfr.pillTextActive]} numberOfLines={1}>
                {brand.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const bfr = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.bg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border1,
    paddingVertical: 8,
  },
  row: {
    paddingHorizontal: 12,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: Colors.surface2,
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  pillActive: {
    backgroundColor: Colors.rose3,
    borderColor: Colors.rose3,
  },
  pillText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 11,
    color: Colors.text2,
    maxWidth: 90,
  },
  pillTextActive: {
    color: '#fff',
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  avatarImg: {
    width: 18,
    height: 18,
  },
  avatarInitial: {
    fontFamily: Fonts.ui,
    fontSize: 9,
    color: Colors.text3,
  },
});

// ── CategoryTabs ──────────────────────────────────────────────────────────────
interface CategoryTabsProps {
  categories: DiscoverCategory[];
  active: string;
  onSelect: (slug: string) => void;
}

function CategoryTabs({ categories, active, onSelect }: CategoryTabsProps) {
  return (
    <View style={ct.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ct.scrollContent}
      >
        {/* All tab */}
        <TouchableOpacity
          style={[ct.tab, active === 'all' && ct.tabActive]}
          onPress={() => onSelect('all')}
          activeOpacity={0.8}
        >
          <Text style={[ct.tabText, active === 'all' && ct.tabTextActive]}>
            Tümü
          </Text>
        </TouchableOpacity>

        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[ct.tab, active === cat.slug && ct.tabActive]}
            onPress={() => onSelect(cat.slug)}
            activeOpacity={0.8}
          >
            <Text style={[ct.tabText, active === cat.slug && ct.tabTextActive]}>
              {cat.emoji} {cat.nameTr}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ── MasonryGrid ───────────────────────────────────────────────────────────────
interface MasonryGridProps {
  items: MasonryItem[];
  totalHeight: number;
}

function MasonryGrid({ items, totalHeight }: MasonryGridProps) {
  return (
    <View style={{ height: totalHeight, position: 'relative', marginTop: 8 }}>
      {items.map(item => (
        <View
          key={item.product.id}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            width: cardWidth,
          }}
        >
          <ProductCard
            product={item.product}
            cardWidth={cardWidth}
            height={item.height}
          />
        </View>
      ))}
    </View>
  );
}

// ── DiscoverScreen ────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('all');
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState<DiscoverFilters>({
    onSale: false,
    newOnly: false,
    maxPrice: null,
  });

  const { data: savedBrands = [] } = useSavedBrands();
  const { clearInterests } = useInterests();

  const brandIds = useMemo(
    () => (savedBrands as any[]).map((b: any) => b.id as string),
    [savedBrands],
  );

  const { data: categories = [] } = useDiscoverCategories(brandIds);
  const { data: categoryBrands = [] } = useCategoryBrands(activeCategory, brandIds);

  // Filtre aktifse sadece seçili markalar, değilse tümü
  const effectiveBrandIds = useMemo(
    () => brandFilter.length > 0 ? brandFilter : brandIds,
    [brandFilter, brandIds],
  );

  // 350ms debounce — her tuşa basmada query tetikleme
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  const {
    data: feedPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useDiscoverFeed(effectiveBrandIds, activeCategory, filters, debouncedSearch);

  const allProducts = useMemo(
    () => (feedPages?.pages ?? []).flat() as DiscoverProduct[],
    [feedPages],
  );

  const { items: masonryItems, totalHeight } = useMemo(
    () => computeLayouts(allProducts, cardWidth),
    [allProducts],
  );

  const handleScroll = useCallback(
    ({ nativeEvent }: any) => {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      if (
        contentOffset.y + layoutMeasurement.height >=
        contentSize.height - 300
      ) {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const handleCategorySelect = useCallback((slug: string) => {
    Haptics.selectionAsync();
    setActiveCategory(slug);
    setBrandFilter([]);
    setSearchText('');
    setDebouncedSearch('');
  }, []);

  const handleApplyFilters = useCallback((f: DiscoverFilters) => {
    setFilters(f);
  }, []);

  const hasBrands = brandIds.length > 0;
  const hasProducts = allProducts.length > 0;

  // Decide what to show in the content area
  let content: React.ReactNode;
  if (!hasBrands) {
    content = (
      <EmptyState
        variant="noBrands"
        clearInterests={clearInterests}
      />
    );
  } else if (isLoading) {
    content = <SkeletonGrid />;
  } else if (!hasProducts) {
    content = (
      <EmptyState
        variant="noProducts"
        onClearCategory={() => setActiveCategory('all')}
      />
    );
  } else {
    content = (
      <>
        <MasonryGrid items={masonryItems} totalHeight={totalHeight} />
        {isFetchingNextPage && (
          <View style={s.loadingMore}>
            <ActivityIndicator color={Colors.rose3} size="small" />
          </View>
        )}
      </>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Fixed header — outside scroll */}
      <DiscoverHeader onFilterPress={() => setShowFilter(true)} />

      {/* Scrollable content: CategoryTabs (sticky via stickyHeaderIndices) + grid */}
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.rose3}
          />
        }
      >
        {/* Index 0 — sticky header (CategoryTabs + BrandFilterRow birlikte) */}
        <View>
          <CategoryTabs
            categories={categories}
            active={activeCategory}
            onSelect={handleCategorySelect}
          />
          {activeCategory !== 'all' && (
            <BrandFilterRow
              brands={categoryBrands}
              selected={brandFilter}
              onToggle={(id) =>
                setBrandFilter(prev =>
                  prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
                )
              }
              onClear={() => setBrandFilter([])}
            />
          )}
          {/* Kategori içi arama */}
          <View style={s.searchBarWrap}>
            <Ionicons name="search-outline" size={16} color={Colors.text4} style={s.searchIcon} />
            <TextInput
              style={s.searchInput}
              placeholder={activeCategory === 'all' ? 'Ürün ara...' : 'Bu kategoride ara...'}
              placeholderTextColor={Colors.text4}
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="never"
            />
            {searchText.length > 0 && (
              <TouchableOpacity
                onPress={() => { setSearchText(''); setDebouncedSearch(''); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={s.searchClear}
              >
                <Ionicons name="close-circle" size={16} color={Colors.text4} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Grid / empty / skeleton */}
        {content}

        {/* Bottom spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Filter sheet */}
      <FilterSheet
        visible={showFilter}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={() => setShowFilter(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

// Main screen
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flex: 1,
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 8,
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    height: 38,
    paddingRight: 8,
  },
  searchIcon: {
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text1,
    height: '100%',
  },
  searchClear: {
    padding: 4,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

// DiscoverHeader
const dh = StyleSheet.create({
  wrap: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: Colors.bg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border1,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: Colors.rose3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
});

// CategoryTabs
const ct = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.bg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.surface2,
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  tabActive: {
    backgroundColor: Colors.rose3,
    borderColor: Colors.rose3,
  },
  tabText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.text3,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});

// ProductCard
const pc = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surface1,
    borderWidth: 0.5,
    borderColor: Colors.border1,
  },
  imgPlaceholder: {
    backgroundColor: Colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeStack: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'column',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeNew: {
    backgroundColor: 'rgba(45,90,17,0.9)',
  },
  badgeSale: {
    backgroundColor: 'rgba(163,45,45,0.9)',
  },
  badgeText: {
    fontFamily: Fonts.ui,
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dotsBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    backgroundColor: Colors.surface1,
    padding: 8,
  },
  brand: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
    color: Colors.rose3,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  name: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text1,
    lineHeight: 16,
    numberOfLines: 2,
    marginBottom: 4,
  } as any,
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontFamily: Fonts.ui,
    fontSize: 13,
    color: Colors.rose3,
  },
  originalPrice: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    textDecorationLine: 'line-through',
    marginLeft: 4,
  },
});

// EmptyState
const es = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 32,
    gap: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border2,
    marginBottom: 4,
  },
  title: {
    fontFamily: Fonts.uiMedium,
    fontSize: 17,
    color: Colors.text1,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text4,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.rose3,
  },
  btnText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: '#FFFFFF',
  },
  linkBtn: {
    marginTop: 4,
    paddingVertical: 8,
  },
  linkBtnText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: Colors.rose3,
    textDecorationLine: 'underline',
  },
});

// FilterSheet
const fs = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 22,
    color: Colors.text1,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowTextWrap: {
    flex: 1,
    marginRight: 16,
  },
  rowLabel: {
    fontFamily: Fonts.uiMedium,
    fontSize: 15,
    color: Colors.text1,
  },
  rowSub: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text4,
    marginTop: 2,
  },
  divider: {
    height: 0.5,
    backgroundColor: Colors.border1,
  },
  applyBtn: {
    marginTop: 24,
    backgroundColor: Colors.rose3,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 16,
    color: '#FFFFFF',
  },
  resetBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  resetBtnText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: Colors.text3,
  },
});
