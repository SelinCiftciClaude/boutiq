import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, TextInput, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useProductWatch } from '@/hooks/useProductWatch';

interface Props {
  visible: boolean;
  productId: string;
  productName: string;
  currentPrice: number;
  onClose: () => void;
}

export function PriceWatchSheet({ visible, productId, productName, currentPrice, onClose }: Props) {
  const { watched, add, remove } = useProductWatch(productId);
  const [priceDrop, setPriceDrop]   = useState(true);
  const [lowStock, setLowStock]     = useState(true);
  const [backInStock, setBackInStock] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');

  const slideAnim = useRef(new Animated.Value(300)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSubmit = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await add.mutateAsync({
      productId,
      initialPrice: currentPrice,
      watchPriceDrop: priceDrop,
      watchLowStock: lowStock,
      watchBackInStock: backInStock,
      targetPrice: targetPrice ? parseFloat(targetPrice) : null,
    });
    onClose();
  };

  const handleRemove = async () => {
    await remove.mutateAsync();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Overlay */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', opacity: overlayAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={[Colors.surface1, Colors.bg]} style={StyleSheet.absoluteFill} />

          {/* Handle */}
          <View style={styles.handle} />

          {/* Başlık */}
          <View style={styles.header}>
            <View style={styles.bellWrap}>
              <Ionicons name="notifications" size={22} color={Colors.rose3} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>Takibe Al</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{productName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.text3} />
            </TouchableOpacity>
          </View>

          {/* Mevcut fiyat */}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Şu anki fiyat</Text>
            <Text style={styles.priceValue}>₺{currentPrice.toLocaleString('tr-TR')}</Text>
          </View>

          {/* Toggle seçenekler */}
          <View style={styles.options}>
            <OptionRow
              icon="trending-down-outline"
              title="Fiyat düşerse haber ver"
              value={priceDrop}
              onChange={setPriceDrop}
            />
            <OptionRow
              icon="cube-outline"
              title="Stok bitmek üzereyse haber ver"
              subtitle="Son 3 ürün kaldığında"
              value={lowStock}
              onChange={setLowStock}
            />
            <OptionRow
              icon="refresh-outline"
              title="Tekrar stoğa girerse haber ver"
              value={backInStock}
              onChange={setBackInStock}
            />
          </View>

          {/* Hedef fiyat */}
          <View style={styles.targetSection}>
            <Text style={styles.targetLabel}>Hedef fiyat (opsiyonel)</Text>
            <View style={styles.targetInputWrap}>
              <Text style={styles.currency}>₺</Text>
              <TextInput
                style={styles.targetInput}
                placeholder={`${Math.round(currentPrice * 0.8).toLocaleString('tr-TR')} TL altına düşünce bildir`}
                placeholderTextColor={Colors.text5}
                value={targetPrice}
                onChangeText={setTargetPrice}
                keyboardType="numeric"
                selectionColor={Colors.rose3}
              />
            </View>
          </View>

          {/* CTA */}
          {watched ? (
            <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
              <Ionicons name="notifications-off-outline" size={18} color={Colors.error} />
              <Text style={styles.removeBtnText}>Takipten Çıkar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={add.isPending}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={[Colors.rose2, Colors.rose3, Colors.rose4]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="notifications" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>
                {add.isPending ? 'Ekleniyor...' : 'Takibe Al'}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function OptionRow({ icon, title, subtitle, value, onChange }: {
  icon: string; title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.optionRow}>
      <View style={styles.optionIconWrap}>
        <Ionicons name={icon as any} size={18} color={Colors.rose3} />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => { Haptics.selectionAsync(); onChange(v); }}
        thumbColor={value ? Colors.rose3 : Colors.text4}
        trackColor={{ false: Colors.surface4, true: Colors.roseGlow }}
        ios_backgroundColor={Colors.surface4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  bellWrap: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.roseGlow,
    borderWidth: 0.5, borderColor: Colors.borderBurgund,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 18,
    color: Colors.text1,
  },
  subtitle: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text3,
    marginTop: 1,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surface3,
    alignItems: 'center', justifyContent: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  priceLabel: { fontFamily: Fonts.uiLight, fontSize: 13, color: Colors.text3 },
  priceValue: { fontFamily: Fonts.ui, fontSize: 16, color: Colors.rose3 },
  options: { gap: 2, marginBottom: 16 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border1,
  },
  optionIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.roseGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1 },
  optionSubtitle: { fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4, marginTop: 1 },
  targetSection: { marginBottom: 20 },
  targetLabel: {
    fontFamily: Fonts.uiMedium, fontSize: 11,
    color: Colors.text3, letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: 8,
  },
  targetInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: 12,
    height: 46,
    gap: 6,
  },
  currency: { fontFamily: Fonts.uiMedium, fontSize: 15, color: Colors.text3 },
  targetInput: {
    flex: 1, fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text1,
  },
  submitBtn: {
    height: 52, borderRadius: 12, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitBtnText: { fontFamily: Fonts.ui, fontSize: 14, letterSpacing: 0.5, color: '#fff' },
  removeBtn: {
    height: 52, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.error + '14',
    borderWidth: 0.5, borderColor: Colors.error + '44',
  },
  removeBtnText: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.error },
});
