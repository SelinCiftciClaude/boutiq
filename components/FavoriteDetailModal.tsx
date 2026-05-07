import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Pressable, TextInput, Switch, Alert, Linking, Animated,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useFavoritePriceHistory, useUpdateFavorite, useDeleteFavorite, useRefreshFavoritePrice } from '@/hooks/useFavorites';
import { useCollections } from '@/hooks/useCollections';
import type { Favorite } from '@/services/favoritesService';

interface Props {
  favorite: Favorite | null;
  onClose: () => void;
}

function Sparkline({ data }: { data: { price: number; recordedAt: string }[] }) {
  if (data.length < 2) return null;
  const W = 280, H = 64, PAD = 6;
  const prices = data.map(d => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + (1 - (d.price - min) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = pts[pts.length - 1].split(',');
  const lastPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const isDown = lastPrice < firstPrice;

  return (
    <View style={spark.wrap}>
      <Svg width={W} height={H}>
        <Line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke={Colors.border2} strokeWidth="1" />
        <Polyline
          points={pts.join(' ')}
          fill="none"
          stroke={isDown ? '#2A7432' : '#A32D2D'}
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <Circle cx={last[0]} cy={last[1]} r="3" fill={isDown ? '#2A7432' : '#A32D2D'} />
      </Svg>
      <View style={spark.labels}>
        <Text style={spark.label}>{data[0].recordedAt.slice(0, 10)}</Text>
        <Text style={[spark.label, spark.labelRight]}>Bugün</Text>
      </View>
    </View>
  );
}

const spark = StyleSheet.create({
  wrap: { marginVertical: 8 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginTop: 2 },
  label: { fontFamily: Fonts.uiLight, fontSize: 10, color: Colors.text5 },
  labelRight: { textAlign: 'right' },
});

export function FavoriteDetailModal({ favorite, onClose }: Props) {
  const [note, setNote]               = useState('');
  const [watchPrice, setWatchPrice]   = useState(false);
  const [watchStock, setWatchStock]   = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [showCollPicker, setShowCollPicker] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;

  const { data: history = [] }    = useFavoritePriceHistory(favorite?.id ?? null);
  const { data: collections = [] } = useCollections();
  const updateMut  = useUpdateFavorite();
  const deleteMut  = useDeleteFavorite();
  const refreshMut = useRefreshFavoritePrice();

  useEffect(() => {
    if (favorite) {
      setNote(favorite.note ?? '');
      setWatchPrice(favorite.watchPriceDrop);
      setWatchStock(favorite.watchStockChange);
      setTargetPrice(favorite.targetPrice ? String(favorite.targetPrice) : '');
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 400, useNativeDriver: true, duration: 220 }).start();
    }
  }, [favorite]);

  if (!favorite) return null;

  const displayPrice = favorite.currentPrice ?? favorite.priceAtSave;
  const priceDrop = displayPrice != null && favorite.priceAtSave != null && displayPrice < favorite.priceAtSave;
  const pricePct  = favorite.priceAtSave && favorite.priceAtSave > 0
    ? Math.abs(((displayPrice ?? favorite.priceAtSave) - favorite.priceAtSave) / favorite.priceAtSave * 100)
    : 0;

  const handleSave = () => {
    updateMut.mutate({
      id: favorite.id,
      patch: {
        note: note || undefined,
        watchPriceDrop: watchPrice,
        watchStockChange: watchStock,
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
      },
    });
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Favoriden çıkar',
      `"${favorite.productName}" favorilerden kaldırılsın mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır', style: 'destructive',
          onPress: () => { deleteMut.mutate(favorite.id); onClose(); },
        },
      ]
    );
  };

  const handleMoveToCollection = (collId: string) => {
    updateMut.mutate({ id: favorite.id, patch: { collectionId: collId } });
    setShowCollPicker(false);
    Haptics.selectionAsync();
  };

  return (
    <Modal visible={!!favorite} transparent animationType="none" statusBarTranslucent>
      <Pressable style={styles.overlay} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Header with image */}
            <View style={styles.imgRow}>
              {favorite.primaryImageUrl ? (
                <Image source={{ uri: favorite.primaryImageUrl }} style={styles.img} resizeMode="cover" />
              ) : (
                <View style={styles.imgPlaceholder}>
                  <Text style={styles.imgEmoji}>{favorite.collection?.emoji ?? '🛍️'}</Text>
                </View>
              )}
              <View style={styles.headerInfo}>
                {favorite.merchantName ? (
                  <Text style={styles.merchant}>{favorite.merchantName}</Text>
                ) : null}
                <Text style={styles.productName}>{favorite.productName}</Text>
                {displayPrice != null && displayPrice > 0 && (
                  <View style={styles.priceWrap}>
                    <Text style={[styles.price, priceDrop && styles.priceGreen]}>
                      ₺{displayPrice.toLocaleString('tr')}
                    </Text>
                    {priceDrop && favorite.priceAtSave && (
                      <Text style={styles.strikePrice}>₺{favorite.priceAtSave.toLocaleString('tr')}</Text>
                    )}
                    {priceDrop && pricePct >= 1 && (
                      <View style={styles.dropChip}>
                        <Text style={styles.dropChipText}>%{pricePct.toFixed(0)} düştü</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Price history sparkline */}
            {history.length >= 2 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Fiyat Geçmişi</Text>
                <Sparkline data={history} />
              </View>
            )}

            {/* Watch toggles */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Takip</Text>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Fiyat düşüşü bildirimi</Text>
                  <Text style={styles.toggleSub}>%3'ten fazla düşünce haber ver</Text>
                </View>
                <Switch
                  value={watchPrice}
                  onValueChange={(v) => { setWatchPrice(v); Haptics.selectionAsync(); }}
                  trackColor={{ true: Colors.rose3, false: Colors.border2 }}
                  thumbColor="#fff"
                />
              </View>

              {watchPrice && (
                <View style={styles.targetRow}>
                  <Text style={styles.toggleLabel}>Hedef fiyat (opsiyonel)</Text>
                  <View style={styles.targetInputWrap}>
                    <Text style={styles.currencySign}>₺</Text>
                    <TextInput
                      style={styles.targetInput}
                      placeholder="0"
                      placeholderTextColor={Colors.text5}
                      value={targetPrice}
                      onChangeText={setTargetPrice}
                      keyboardType="numeric"
                      selectionColor={Colors.rose3}
                    />
                  </View>
                </View>
              )}

              <View style={[styles.toggleRow, { marginTop: 10 }]}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleLabel}>Stok takibi</Text>
                  <Text style={styles.toggleSub}>Tükenme ve stoka dönüş bildirimi</Text>
                </View>
                <Switch
                  value={watchStock}
                  onValueChange={(v) => { setWatchStock(v); Haptics.selectionAsync(); }}
                  trackColor={{ true: Colors.rose3, false: Colors.border2 }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Note */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notum</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Kendine not bırak..."
                placeholderTextColor={Colors.text5}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={200}
                selectionColor={Colors.rose3}
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  const url = favorite.sourceUrl;
                  if (!url) return;
                  Linking.openURL(url).catch(() => {});
                }}
              >
                <Ionicons name="open-outline" size={17} color={Colors.teal2} />
                <Text style={[styles.actionText, { color: Colors.teal2 }]}>Ürünü Aç</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => { refreshMut.mutate(favorite.id); Haptics.selectionAsync(); }}
                disabled={refreshMut.isPending}
              >
                <Ionicons name="refresh-outline" size={17} color={Colors.text3} />
                <Text style={styles.actionText}>{refreshMut.isPending ? 'Yenileniyor...' : 'Fiyatı Güncelle'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShowCollPicker(true)}
              >
                <Ionicons name="folder-outline" size={17} color={Colors.text3} />
                <Text style={styles.actionText}>Koleksiyonu Değiştir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={17} color="#A32D2D" />
                <Text style={[styles.actionText, { color: '#A32D2D' }]}>Favoriden Çıkar</Text>
              </TouchableOpacity>
            </View>

            {/* Save button */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Kaydet</Text>
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Collection picker */}
        {showCollPicker && (
          <View style={styles.collPicker}>
            <Text style={styles.collPickerTitle}>Koleksiyon Seç</Text>
            {collections.map(col => (
              <TouchableOpacity
                key={col.id}
                style={styles.collPickerItem}
                onPress={() => handleMoveToCollection(col.id)}
              >
                <Text style={styles.collPickerEmoji}>{col.emoji}</Text>
                <Text style={styles.collPickerName}>{col.name}</Text>
                {favorite.collectionId === col.id && (
                  <Ionicons name="checkmark" size={16} color={Colors.rose3} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowCollPicker(false)} style={styles.collPickerCancel}>
              <Text style={styles.collPickerCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Colors.border2,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  content: { paddingHorizontal: 20, paddingBottom: 20 },

  imgRow: { flexDirection: 'row', gap: 14, marginTop: 12, marginBottom: 6 },
  img: { width: 100, height: 130, borderRadius: 12, backgroundColor: Colors.surface2 },
  imgPlaceholder: {
    width: 100, height: 130, borderRadius: 12,
    backgroundColor: Colors.surface2,
    alignItems: 'center', justifyContent: 'center',
  },
  imgEmoji: { fontSize: 36 },
  headerInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  merchant: {
    fontFamily: Fonts.uiRegular,
    fontSize: 10,
    color: Colors.text4,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  productName: {
    fontFamily: Fonts.displayBold,
    fontSize: 16,
    color: Colors.text1,
    lineHeight: 22,
  },
  priceWrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  price: { fontFamily: Fonts.uiMedium, fontSize: 18, color: Colors.text1 },
  priceGreen: { color: '#2A7432' },
  strikePrice: {
    fontFamily: Fonts.uiLight, fontSize: 13,
    color: Colors.text4, textDecorationLine: 'line-through',
  },
  dropChip: {
    backgroundColor: 'rgba(42,116,50,0.12)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  dropChipText: { fontFamily: Fonts.uiMedium, fontSize: 11, color: '#2A7432' },

  section: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border2,
  },
  sectionTitle: {
    fontFamily: Fonts.ui,
    fontSize: 11,
    color: Colors.text4,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1 },
  toggleSub: { fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4, marginTop: 2 },

  targetRow: { marginTop: 12 },
  targetInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border2,
    paddingBottom: 6,
  },
  currencySign: { fontFamily: Fonts.uiMedium, fontSize: 16, color: Colors.text3 },
  targetInput: {
    flex: 1,
    fontFamily: Fonts.uiMedium,
    fontSize: 16,
    color: Colors.text1,
  },

  noteInput: {
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text1,
    backgroundColor: Colors.surface1,
    borderRadius: 10,
    padding: 12,
    minHeight: 70,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    textAlignVertical: 'top',
  },

  actions: { marginTop: 20, gap: 0 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border2,
  },
  actionText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: Colors.text2,
  },

  saveBtn: {
    marginTop: 20,
    backgroundColor: Colors.rose3,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: Fonts.ui,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.5,
  },

  collPicker: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.bg,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border2,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
  },
  collPickerTitle: {
    fontFamily: Fonts.ui,
    fontSize: 11,
    color: Colors.text4,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  collPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border2,
  },
  collPickerEmoji: { fontSize: 20 },
  collPickerName: { flex: 1, fontFamily: Fonts.uiMedium, fontSize: 15, color: Colors.text1 },
  collPickerCancel: { paddingVertical: 14, alignItems: 'center' },
  collPickerCancelText: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text3 },
});
