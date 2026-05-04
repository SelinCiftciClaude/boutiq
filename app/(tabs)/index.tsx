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
const INFO_HEIGHT = 82; // brand(16) + name(32) + price(18) + padding(16) = 82

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

      {/* Info — marka adı her zaman görünür */}
      <View style={pc.info}>
        <Text style={pc.brand} numberOfLines={1}>
          {product.brandName || '—'}
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

        {/* Renk noktaları */}
        {product.colors.length > 0 && (
          <View style={pc.colorRow}>
            {product.colors.slice(0, 5).map(c => (
              <View
                key={c}
                style={[pc.colorDot, { backgroundColor: colorToHex(c) }]}
              />
            ))}
            {product.colors.length > 5 && (
              <Text style={pc.variantMore}>+{product.colors.length - 5}</Text>
            )}
          </View>
        )}

        {/* Beden chips */}
        {product.sizes.length > 0 && (
          <View style={pc.sizeRow}>
            {product.sizes.slice(0, 4).map(s => (
              <Text key={s} style={pc.sizeChip}>{s}</Text>
            ))}
            {product.sizes.length > 4 && (
              <Text style={pc.variantMore}>+{product.sizes.length - 4}</Text>
            )}
          </View>
        )}
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
  searchQuery?: string;
  onClearCategory?: () => void;
  clearInterests?: () => void;
}

function EmptyState({ variant, searchQuery, onClearCategory, clearInterests }: EmptyStateProps) {
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
          <TouchableOpacity style={es.btn} onPress={clearInterests} activeOpacity={0.85}>
            <Text style={es.btnText}>İlgi alanlarını sıfırla</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const isSearch = !!searchQuery?.trim();
  return (
    <View style={es.wrap}>
      <View style={es.iconCircle}>
        <Ionicons name={isSearch ? 'search-outline' : 'grid-outline'} size={32} color={Colors.rose3} />
      </View>
      <Text style={es.title}>
        {isSearch ? `"${searchQuery}" bulunamadı` : 'Bu filtre için ürün yok'}
      </Text>
      <Text style={es.subtitle}>
        {isSearch
          ? 'Farklı bir kelime dene ya da filtreleri sıfırla.'
          : 'Başka bir kategori dene ya da tüm ürünlere bak.'}
      </Text>
      {onClearCategory && (
        <TouchableOpacity style={es.linkBtn} onPress={onClearCategory} activeOpacity={0.7}>
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
  categories: DiscoverCategory[];
  activeCategory: string;
  onApply: (f: DiscoverFilters, category: string) => void;
  onClose: () => void;
}

function FilterSheet({
  visible,
  filters,
  categories,
  activeCategory,
  onApply,
  onClose,
}: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<DiscoverFilters>(filters);
  const [localCategory, setLocalCategory] = useState(activeCategory);
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
      setLocalCategory(activeCategory);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 200 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 500, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  const activeCount =
    (localCategory !== 'all' ? 1 : 0) +
    (localFilters.onSale ? 1 : 0) +
    (localFilters.newOnly ? 1 : 0);

  const handleApply = () => { onApply(localFilters, localCategory); onClose(); };

  const handleReset = () => {
    const empty: DiscoverFilters = { onSale: false, newOnly: false, maxPrice: null };
    setLocalFilters(empty);
    setLocalCategory('all');
    onApply(empty, 'all');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={fs.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[fs.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={fs.handle} />

        {/* Başlık */}
        <View style={fs.titleRow}>
          <Text style={fs.title}>Filtrele</Text>
          {activeCount > 0 && (
            <TouchableOpacity onPress={handleReset} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={fs.resetLink}>Sıfırla</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── KATEGORİ ─────────────────────────────── */}
        <Text style={fs.sectionLabel}>KATEGORİ</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={fs.chipRow}
        >
          {[{ slug: 'all', nameTr: 'Tümü', emoji: '' }, ...categories].map(cat => {
            const active = localCategory === cat.slug;
            return (
              <TouchableOpacity
                key={cat.slug}
                style={[fs.chip, active && fs.chipActive]}
                onPress={() => { setLocalCategory(cat.slug); Haptics.selectionAsync(); }}
                activeOpacity={0.75}
              >
                {cat.emoji ? <Text style={fs.chipEmoji}>{cat.emoji}</Text> : null}
                <Text style={[fs.chipText, active && fs.chipTextActive]}>{cat.nameTr}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={fs.divider} />

        {/* ── ÜRÜN ─────────────────────────────────── */}
        <Text style={fs.sectionLabel}>ÜRÜN</Text>

        <View style={fs.row}>
          <View style={fs.rowTextWrap}>
            <Text style={fs.rowLabel}>Sadece indirimde olanlar</Text>
            <Text style={fs.rowSub}>Fiyatı düşürülmüş ürünleri göster</Text>
          </View>
          <Switch
            value={localFilters.onSale}
            onValueChange={v => setLocalFilters(p => ({ ...p, onSale: v }))}
            trackColor={{ false: Colors.border2, true: Colors.rose3 }}
            thumbColor="#fff"
          />
        </View>

        <View style={fs.rowDivider} />

        <View style={fs.row}>
          <View style={fs.rowTextWrap}>
            <Text style={fs.rowLabel}>Sadece yeni gelenler</Text>
            <Text style={fs.rowSub}>Yeni eklenen ürünleri göster</Text>
          </View>
          <Switch
            value={localFilters.newOnly}
            onValueChange={v => setLocalFilters(p => ({ ...p, newOnly: v }))}
            trackColor={{ false: Colors.border2, true: Colors.rose3 }}
            thumbColor="#fff"
          />
        </View>

        {/* Uygula */}
        <TouchableOpacity style={fs.applyBtn} onPress={handleApply} activeOpacity={0.88}>
          <Text style={fs.applyBtnText}>
            {activeCount > 0 ? `Uygula (${activeCount})` : 'Uygula'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ── DiscoverHeader ────────────────────────────────────────────────────────────
interface DiscoverHeaderProps {
  onFilterPress: () => void;
  activeFilterCount?: number;
}

function DiscoverHeader({ onFilterPress, activeFilterCount = 0 }: DiscoverHeaderProps) {
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
          style={[dh.iconBtn, activeFilterCount > 0 && dh.iconBtnActive]}
          onPress={onFilterPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFilterCount > 0 ? Colors.rose3 : Colors.text2}
          />
          {activeFilterCount > 0 && (
            <View style={dh.badge}>
              <Text style={dh.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
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

// ── DiscoverTabSwitcher ───────────────────────────────────────────────────────

type DiscoverTab = 'following' | 'foryou';

function DiscoverTabSwitcher({
  active,
  onChange,
  followingCount,
}: {
  active: DiscoverTab;
  onChange: (t: DiscoverTab) => void;
  followingCount: number;
}) {
  return (
    <View style={dt.wrap}>
      <TouchableOpacity
        style={dt.tab}
        onPress={() => { Haptics.selectionAsync(); onChange('following'); }}
        activeOpacity={0.8}
      >
        <Text style={[dt.label, active === 'following' && dt.labelActive]}>
          Takip ettiğin
        </Text>
        {followingCount > 0 && (
          <View style={[dt.badge, active === 'following' && dt.badgeActive]}>
            <Text style={[dt.badgeText, active === 'following' && dt.badgeTextActive]}>
              {followingCount}
            </Text>
          </View>
        )}
        {active === 'following' && <View style={dt.underline} />}
      </TouchableOpacity>

      <TouchableOpacity
        style={dt.tab}
        onPress={() => { Haptics.selectionAsync(); onChange('foryou'); }}
        activeOpacity={0.8}
      >
        <Text style={[dt.label, active === 'foryou' && dt.labelActive]}>
          Senin İçin
        </Text>
        <Text style={dt.sparkle}>✨</Text>
        {active === 'foryou' && <View style={dt.underline} />}
      </TouchableOpacity>
    </View>
  );
}

const dt = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 2,
    backgroundColor: Colors.bg,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border2,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginRight: 24,
    gap: 6,
    position: 'relative',
  },
  label: {
    fontFamily: Fonts.displayBold,
    fontSize: 16,
    color: Colors.text4,
  },
  labelActive: {
    color: Colors.text1,
  },
  badge: {
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: Colors.rose3,
  },
  badgeText: {
    fontFamily: Fonts.ui,
    fontSize: 10,
    color: Colors.text4,
  },
  badgeTextActive: {
    color: '#fff',
  },
  sparkle: {
    fontSize: 13,
  },
  underline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.rose3,
    borderRadius: 1,
  },
});

// ── DiscoverFeedPanel (ortak panel — her iki sekme bunu kullanır) ──────────────

interface DiscoverFeedPanelProps {
  mode: DiscoverTab;
  visible: boolean;
  brandIds: string[];
  brandsLoading: boolean;
  interests: string[];
  clearInterests: () => void;
  filters: DiscoverFilters;
  activeCategory: string;
  showFilter: boolean;
  onCategoryChange: (slug: string) => void;
  onApplyFilters: (f: DiscoverFilters, cat: string) => void;
  onFilterClose: () => void;
}

function DiscoverFeedPanel({
  mode, visible,
  brandIds, brandsLoading, interests, clearInterests,
  filters, activeCategory,
  showFilter, onCategoryChange, onApplyFilters, onFilterClose,
}: DiscoverFeedPanelProps) {
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const isForYou = mode === 'foryou';

  // "Takip ettiğin": sadece takip edilen markalar, en yeni önce
  // "Senin İçin": tüm markalar, indirimli + yeni ürünler önce → farklı içerik
  const panelBrandIds = isForYou ? [] : brandIds;
  const excludeIds: string[] = []; // hariç tutma yok, ordering ile farklılaştırıyoruz

  // Kategori listesi: "Senin İçin"de tüm ürünlerden çekilir (panelBrandIds=[])
  const { data: categories = [] } = useDiscoverCategories(panelBrandIds, interests);

  const autoCategSlugs = useMemo(
    () => new Set(categories.filter((c: any) => !c.isExtra).map((c: any) => c.slug)),
    [categories],
  );
  const isExtraCategory = activeCategory !== 'all' && !autoCategSlugs.has(activeCategory);
  const { data: categoryBrands = [] } = useCategoryBrands(activeCategory, panelBrandIds);

  const effectiveBrandIds = useMemo(() => {
    if (brandFilter.length > 0) return brandFilter;
    if (debouncedSearch.trim()) return panelBrandIds;
    if (isExtraCategory) return [];
    return panelBrandIds;
  }, [brandFilter, panelBrandIds, debouncedSearch, isExtraCategory]);

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
  } = useDiscoverFeed(
    effectiveBrandIds, activeCategory, filters, debouncedSearch,
    isForYou,   // forYou: boş brandIds ile de çalış
    excludeIds, // excludeBrandIds: "Senin İçin"de takip edilenleri dışla
  );

  const allProducts = useMemo(
    () => (feedPages?.pages ?? []).flat() as DiscoverProduct[],
    [feedPages],
  );
  const { items: masonryItems, totalHeight } = useMemo(
    () => computeLayouts(allProducts, cardWidth),
    [allProducts],
  );

  const handleScroll = useCallback(({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 300) {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleCategorySelect = useCallback((slug: string) => {
    Haptics.selectionAsync();
    setBrandFilter([]);
    setSearchText('');
    setDebouncedSearch('');
    onCategoryChange(slug);
  }, [onCategoryChange]);

  const hasBrands = isForYou || brandIds.length > 0;
  const hasProducts = allProducts.length > 0;

  let content: React.ReactNode;
  if (!isForYou && brandsLoading && !hasBrands) {
    content = <SkeletonGrid />;
  } else if (!isForYou && !hasBrands) {
    content = <EmptyState variant="noBrands" clearInterests={clearInterests} />;
  } else if (isLoading) {
    content = <SkeletonGrid />;
  } else if (!hasProducts) {
    content = (
      <EmptyState
        variant="noProducts"
        searchQuery={debouncedSearch}
        onClearCategory={() => { onCategoryChange('all'); setSearchText(''); setDebouncedSearch(''); }}
      />
    );
  } else {
    content = (
      <>
        {/* Hint: az butik takip ediyorsan "Senin İçin"e yönlendirme */}
        {mode === 'following' && brandIds.length > 0 && brandIds.length < 5 && (
          <View style={s.followHint}>
            <View style={s.followHintBadge}>
              <Text style={s.followHintBadgeText}>{brandIds.length}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.followHintTitle}>{brandIds.length} butik takip ediyorsun</Text>
              <Text style={s.followHintSub}>Daha fazla butik eklersen feed&apos;in çok daha zenginleşir.</Text>
            </View>
          </View>
        )}
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
    <View style={{ flex: 1, display: visible ? 'flex' : 'none' }}>
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.rose3} />
        }
      >
        {/* Sticky: kategori + marka filtresi + arama */}
        <View>
          <CategoryTabs categories={categories} active={activeCategory} onSelect={handleCategorySelect} />
          {activeCategory !== 'all' && (
            <BrandFilterRow
              brands={categoryBrands}
              selected={brandFilter}
              onToggle={id => setBrandFilter(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id])}
              onClear={() => setBrandFilter([])}
            />
          )}
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

        {content}
        <View style={{ height: 100 }} />
      </ScrollView>

      <FilterSheet
        visible={showFilter}
        filters={filters}
        categories={categories}
        activeCategory={activeCategory}
        onApply={onApplyFilters}
        onClose={onFilterClose}
      />
    </View>
  );
}

// ── DiscoverScreen ────────────────────────────────────────────────────────────
export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [discoverTab, setDiscoverTab] = useState<DiscoverTab>('following');

  // Her sekmenin kendi filtre + kategori state'i
  const [followingCategory, setFollowingCategory] = useState('all');
  const [foryouCategory, setForyouCategory] = useState('all');
  const [followingFilters, setFollowingFilters] = useState<DiscoverFilters>({
    onSale: false, newOnly: false, maxPrice: null,
  });
  const [foryouFilters, setForyouFilters] = useState<DiscoverFilters>({
    onSale: false, newOnly: false, maxPrice: null,
  });
  const [showFilter, setShowFilter] = useState(false);

  const { data: savedBrands = [], isLoading: brandsLoading } = useSavedBrands();
  const { clearInterests, interests } = useInterests();

  const brandIds = useMemo(
    () => (savedBrands as any[]).map((b: any) => b.id as string),
    [savedBrands],
  );

  // Aktif sekmenin filtre / kategori state'ini seç
  const activeFilters   = discoverTab === 'following' ? followingFilters   : foryouFilters;
  const activeCategory  = discoverTab === 'following' ? followingCategory  : foryouCategory;
  const setActiveFilters   = discoverTab === 'following' ? setFollowingFilters   : setForyouFilters;
  const setActiveCategory  = discoverTab === 'following' ? setFollowingCategory  : setForyouCategory;

  const handleApplyFilters = useCallback((f: DiscoverFilters, cat: string) => {
    setActiveFilters(f);
    setActiveCategory(cat);
  }, [setActiveFilters, setActiveCategory]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (activeCategory !== 'all') n++;
    if (activeFilters.onSale) n++;
    if (activeFilters.newOnly) n++;
    return n;
  }, [activeCategory, activeFilters]);

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Fixed header */}
      <DiscoverHeader
        onFilterPress={() => setShowFilter(true)}
        activeFilterCount={activeFilterCount}
      />

      {/* Fixed sekme çubuğu: "Takip ettiğin" | "Senin İçin" */}
      <DiscoverTabSwitcher
        active={discoverTab}
        onChange={setDiscoverTab}
        followingCount={brandIds.length}
      />

      {/* Her iki panel mount edilir, görünmeyen gizlenir (state korunur) */}
      <DiscoverFeedPanel
        mode="following"
        visible={discoverTab === 'following'}
        brandIds={brandIds}
        brandsLoading={brandsLoading}
        interests={interests}
        clearInterests={clearInterests}
        filters={followingFilters}
        activeCategory={followingCategory}
        showFilter={showFilter && discoverTab === 'following'}
        onCategoryChange={setFollowingCategory}
        onApplyFilters={(f, cat) => { setFollowingFilters(f); setFollowingCategory(cat); }}
        onFilterClose={() => setShowFilter(false)}
      />
      <DiscoverFeedPanel
        mode="foryou"
        visible={discoverTab === 'foryou'}
        brandIds={brandIds}
        brandsLoading={brandsLoading}
        interests={interests}
        clearInterests={clearInterests}
        filters={foryouFilters}
        activeCategory={foryouCategory}
        showFilter={showFilter && discoverTab === 'foryou'}
        onCategoryChange={setForyouCategory}
        onApplyFilters={(f, cat) => { setForyouFilters(f); setForyouCategory(cat); }}
        onFilterClose={() => setShowFilter(false)}
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
  followHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: Colors.surface1,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    padding: 12,
  },
  followHintBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  followHintBadgeText: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    color: Colors.text2,
  },
  followHintTitle: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.text1,
    marginBottom: 2,
  },
  followHintSub: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    lineHeight: 15,
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
  iconBtnActive: {
    backgroundColor: 'rgba(107,21,32,0.08)',
    borderColor: Colors.borderBurgund,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.rose3,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: Fonts.ui,
    fontSize: 9,
    color: '#fff',
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

// Renk adı → HEX (Türkçe + İngilizce yaygın renkler)
const COLOR_HEX: Record<string, string> = {
  siyah: '#1a1a1a', black: '#1a1a1a',
  beyaz: '#f8f8f8', white: '#f8f8f8',
  krem: '#f0ead2', cream: '#f0ead2', ekru: '#f5f0e8', ecru: '#f5f0e8',
  bej: '#e8d9c0', beige: '#e8d9c0',
  lacivert: '#1a2e5a', navy: '#1a2e5a',
  mavi: '#4a90d9', blue: '#4a90d9',
  kırmızı: '#cc2200', red: '#cc2200',
  pembe: '#e8a0a0', pink: '#e8a0a0',
  pudra: '#f2d0d0', blush: '#f2c4c4',
  gri: '#888888', grey: '#888888', gray: '#888888',
  haki: '#8b8740', khaki: '#8b8740', olive: '#7a7a3a',
  nane: '#a8d8a8', mint: '#a8d8a8',
  yeşil: '#3a8a3a', green: '#3a8a3a',
  turuncu: '#e87030', orange: '#e87030',
  sarı: '#e8c830', yellow: '#e8c830', gold: '#c8a020',
  mor: '#7a30c8', purple: '#7a30c8', lilac: '#c8a0d8',
  bordo: '#6b1520', burgundy: '#6b1520', wine: '#5a1010',
  kestane: '#5c3317', brown: '#7a4520', kahverengi: '#7a4520',
  vanilla: '#f3e5ab', caramel: '#c68642',
  parrot: '#e8371a', coral: '#e86040',
  silver: '#c0c0c0', gümüş: '#c0c0c0',
};

function colorToHex(colorName: string): string {
  const lower = colorName.toLowerCase().trim();
  for (const [key, hex] of Object.entries(COLOR_HEX)) {
    if (lower.includes(key)) return hex;
  }
  // Bilinmeyen renk için nötr gri
  return '#c8c8c8';
}

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
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 8,
    minHeight: INFO_HEIGHT,
  },
  brand: {
    fontFamily: Fonts.ui,
    fontSize: 11,
    color: Colors.rose3,
    letterSpacing: 0.3,
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
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 5,
    flexWrap: 'wrap',
  },
  sizeChip: {
    fontFamily: Fonts.uiLight,
    fontSize: 9,
    color: Colors.text4,
    backgroundColor: Colors.surface2,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  variantMore: {
    fontFamily: Fonts.uiLight,
    fontSize: 9,
    color: Colors.text5,
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
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingBottom: 44,
  },
  handle: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.text1,
  },
  resetLink: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.rose3,
  },
  sectionLabel: {
    fontFamily: Fonts.ui,
    fontSize: 10,
    color: Colors.text4,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 7,
    paddingBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface1,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  chipActive: {
    backgroundColor: Colors.rose3,
    borderColor: Colors.rose3,
  },
  chipEmoji: { fontSize: 13 },
  chipText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.text3,
  },
  chipTextActive: { color: '#fff' },
  divider: {
    height: 0.5,
    backgroundColor: Colors.border2,
    marginVertical: 14,
  },
  rowDivider: {
    height: 0.5,
    backgroundColor: Colors.border2,
    marginHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowTextWrap: { flex: 1, marginRight: 16 },
  rowLabel: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: Colors.text1,
  },
  rowSub: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    marginTop: 2,
  },
  applyBtn: {
    marginTop: 20,
    backgroundColor: Colors.rose3,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: Fonts.ui,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.3,
  },
});
