import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { Colors } from '@/constants/Colors';
import { useProductDetail } from '@/hooks/useProductDetail';
import { useSavedProducts } from '@/hooks/useSavedProducts';
import { useAuth } from '@/context/AuthContext';
import { trackAffiliateClick } from '@/services/queries';
import { ProductCard } from '@/components/ProductCard';
import { useStockAlert } from '@/hooks/useStockAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const CHART_W = width - 64;
const CHART_H = 80;

function PriceChart({ history }: { history: { price: number; recordedAt: string }[] }) {
  if (history.length < 2) return null;

  const prices = history.map(h => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = history.map((h, i) => {
    const x = (i / (history.length - 1)) * CHART_W;
    const y = CHART_H - ((h.price - min) / range) * (CHART_H - 16) - 4;
    return `${x},${y}`;
  }).join(' ');

  const lastPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const dropped = lastPrice < firstPrice;
  const lineColor = dropped ? Colors.success : Colors.gold3;

  return (
    <View style={chartStyles.container}>
      <Text style={chartStyles.title}>Fiyat Geçmişi (30 gün)</Text>
      <View style={chartStyles.labels}>
        <Text style={chartStyles.label}>₺{min.toLocaleString('tr-TR')}</Text>
        <Text style={[chartStyles.label, { color: dropped ? Colors.success : Colors.rose3 }]}>
          {dropped ? '▼' : '▲'} ₺{Math.abs(lastPrice - firstPrice).toLocaleString('tr-TR')}
        </Text>
        <Text style={chartStyles.label}>₺{max.toLocaleString('tr-TR')}</Text>
      </View>
      <Svg width={CHART_W} height={CHART_H}>
        <Line x1={0} y1={CHART_H - 4} x2={CHART_W} y2={CHART_H - 4} stroke={Colors.border2} strokeWidth={1} />
        <Polyline points={points} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle
          cx={(history.length - 1) / (history.length - 1) * CHART_W}
          cy={CHART_H - ((lastPrice - min) / range) * (CHART_H - 16) - 4}
          r={4} fill={lineColor}
        />
      </Svg>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { backgroundColor: Colors.surface2, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border1, marginBottom: 24 },
  title: { fontSize: 12, fontWeight: '700', color: Colors.text4, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: 11, color: Colors.text4, fontWeight: '600' },
});

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { product: productQ, related: relatedQ, priceHistory } = useProductDetail(id);
  const { add: saveProduct, remove: unsaveProduct, isSaved } = useSavedProducts();
  const { isAlerted, toggle: toggleAlert } = useStockAlert(id ?? '');
  const [imgIdx, setImgIdx] = useState(0);

  const product = productQ.data;
  const related = relatedQ.data ?? [];
  const history = priceHistory.data ?? [];

  // Görüntüleme geçmişine kaydet
  React.useEffect(() => {
    if (!product?.id) return;
    AsyncStorage.getItem('viewHistory').then(raw => {
      const prev: string[] = raw ? JSON.parse(raw) : [];
      const updated = [product.id, ...prev.filter(i => i !== product.id)].slice(0, 50);
      AsyncStorage.setItem('viewHistory', JSON.stringify(updated));
    });
  }, [product?.id]);

  const allImages = product ? [product.image, ...(product.images ?? [])].filter(Boolean) : [];

  const handleSaveToggle = () => {
    if (!product) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isSaved(product.id)) unsaveProduct.mutate(product.id);
    else saveProduct.mutate(product.id);
  };

  if (productQ.isLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.gold3} size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Ürün bulunamadı.</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backLinkText}>Geri dön</Text></TouchableOpacity>
      </View>
    );
  }

  const saved = isSaved(product.id);
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const leftRelated = related.filter((_, i) => i % 2 === 0);
  const rightRelated = related.filter((_, i) => i % 2 === 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Fotoğraf galerisi */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {allImages.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.productImage} resizeMode="cover" />
            ))}
          </ScrollView>

          {/* Sayfa göstergesi */}
          {allImages.length > 1 && (
            <View style={styles.dots}>
              {allImages.map((_, i) => (
                <View key={i} style={[styles.dot, i === imgIdx && styles.dotActive]} />
              ))}
            </View>
          )}

          {/* Geri */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.text1} />
          </TouchableOpacity>

          {/* Stok uyarısı */}
          {!product.inStock && (
            <View style={styles.outOfStock}>
              <Text style={styles.outOfStockText}>Tükendi</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          {/* Marka */}
          <TouchableOpacity
            style={styles.brandRow}
            onPress={() => router.push(`/brand/${product.brandId}` as any)}
          >
            <Image source={{ uri: product.brandLogo }} style={styles.brandLogo} />
            <Text style={styles.brandName}>{product.brandName}</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.text5} />
          </TouchableOpacity>

          {/* Ürün adı */}
          <Text style={styles.productName}>{product.name}</Text>

          {/* Fiyat */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>₺{product.price.toLocaleString('tr-TR')}</Text>
            {product.originalPrice && (
              <>
                <Text style={styles.originalPrice}>₺{product.originalPrice.toLocaleString('tr-TR')}</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-%{discount}</Text>
                </View>
              </>
            )}
          </View>

          {/* Beden / renk */}
          {(product.sizes?.length ?? 0) > 0 && (
            <View style={styles.attrSection}>
              <Text style={styles.attrLabel}>Bedenler</Text>
              <View style={styles.attrRow}>
                {product.sizes!.map(s => (
                  <View key={s} style={styles.attrChip}><Text style={styles.attrChipText}>{s}</Text></View>
                ))}
              </View>
            </View>
          )}
          {(product.colors?.length ?? 0) > 0 && (
            <View style={styles.attrSection}>
              <Text style={styles.attrLabel}>Renkler</Text>
              <View style={styles.attrRow}>
                {product.colors!.map(c => (
                  <View key={c} style={styles.attrChip}><Text style={styles.attrChipText}>{c}</Text></View>
                ))}
              </View>
            </View>
          )}

          {/* Fiyat geçmişi */}
          {history.length > 1 && <PriceChart history={history} />}

          {/* Benzer ürünler */}
          {related.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Benzer Ürünler</Text>
              <View style={styles.grid}>
                <View style={styles.col}>
                  {leftRelated.map((p, i) => (
                    <ProductCard key={p.id} product={p} tall={i % 3 === 1}  />
                  ))}
                </View>
                <View style={[styles.col, styles.colOffset]}>
                  {rightRelated.map((p, i) => (
                    <ProductCard key={p.id} product={p} tall={i % 3 === 0}  />
                  ))}
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Sabit alt bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <LinearGradient colors={[Colors.bg, Colors.surface2]} style={StyleSheet.absoluteFill} />
        <TouchableOpacity
          style={[styles.saveBottomBtn, saved && styles.saveBottomBtnActive]}
          onPress={handleSaveToggle}
        >
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? Colors.rose3 : Colors.text3} />
        </TouchableOpacity>
        {product.inStock ? (
          <TouchableOpacity
            style={styles.visitBottomBtn}
            onPress={() => {
              trackAffiliateClick(user?.id ?? null, product.brandId, product.id, product.affiliateUrl || product.url);
              Linking.openURL(product.affiliateUrl || product.url);
            }}
          >
            <LinearGradient colors={[Colors.rose2, Colors.rose4]} style={StyleSheet.absoluteFill} />
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={styles.visitBottomText}>Mağazaya Git</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.alertBottomBtn, isAlerted && styles.alertBottomBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              toggleAlert.mutate();
            }}
            activeOpacity={0.85}
          >
            {isAlerted && (
              <LinearGradient colors={[Colors.gold2, Colors.gold4]} style={StyleSheet.absoluteFill} />
            )}
            <Ionicons
              name={isAlerted ? 'checkmark-circle' : 'notifications-outline'}
              size={18}
              color={isAlerted ? Colors.bg : Colors.gold3}
            />
            <Text style={[styles.alertBottomText, isAlerted && styles.alertBottomTextActive]}>
              {isAlerted ? 'Uyarı Aktif ✓' : 'Stoka Gelince Haber Ver'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontSize: 16, color: Colors.text3 },
  backLinkText: { fontSize: 15, color: Colors.gold3, fontWeight: '600' },
  imageContainer: { position: 'relative', height: 380 },
  productImage: { width, height: 380, backgroundColor: Colors.surface3 },
  dots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 18 },
  backBtn: {
    position: 'absolute', top: 16, left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.glass3, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border2,
  },
  outOfStock: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: Colors.error, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  outOfStockText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  brandLogo: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.surface3 },
  brandName: { fontSize: 13, color: Colors.text3, fontWeight: '600', flex: 1 },
  productName: { fontSize: 22, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5, lineHeight: 28, marginBottom: 14 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  price: { fontSize: 26, fontWeight: '800', color: Colors.gold4, letterSpacing: -0.5 },
  originalPrice: { fontSize: 16, color: Colors.text5, textDecorationLine: 'line-through' },
  discountBadge: { backgroundColor: Colors.roseGlow, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  discountText: { fontSize: 12, fontWeight: '800', color: Colors.rose3 },
  attrSection: { marginBottom: 16 },
  attrLabel: { fontSize: 12, fontWeight: '700', color: Colors.text4, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  attrRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attrChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2 },
  attrChipText: { fontSize: 13, fontWeight: '600', color: Colors.text2 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5, marginBottom: 14 },
  grid: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  colOffset: { marginTop: 40 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingTop: 16,
    overflow: 'hidden',
  },
  saveBottomBtn: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border2,
  },
  saveBottomBtnActive: { borderColor: Colors.rose3, backgroundColor: Colors.roseGlow },
  visitBottomBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 14, overflow: 'hidden',
  },
  visitBottomText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  alertBottomBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.gold3, backgroundColor: Colors.glassGold,
  },
  alertBottomBtnActive: {
    borderColor: 'transparent',
  },
  alertBottomText: {
    fontSize: 15, fontWeight: '700', color: Colors.gold3,
  },
  alertBottomTextActive: {
    color: Colors.bg,
  },
});
