import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ScrollView, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { CARRIER_LIST, validateTrackingNumber } from '@/services/carriers';
import { useAddManualShipment } from '@/hooks/useShipments';
import type { CarrierCode } from '@/services/carriers';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AddManualShipmentSheet({ visible, onClose }: Props) {
  const [carrier, setCarrier]     = useState<CarrierCode>('yurtici');
  const [trackingNo, setTracking] = useState('');
  const [brandName, setBrandName] = useState('');
  const [productName, setProduct] = useState('');
  const [showCarrierPicker, setShowCarrier] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  const slideAnim  = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const mutation   = useAddManualShipment();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim,  { toValue: 0, useNativeDriver: true, tension: 70, friction: 11 }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,  { toValue: 600, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const selectedCarrier = CARRIER_LIST.find(c => c.code === carrier)!;

  const validateAndSubmit = async () => {
    if (!trackingNo.trim()) { setTrackingError('Takip numarası zorunlu'); return; }
    if (!validateTrackingNumber(carrier, trackingNo.trim())) {
      setTrackingError(`${selectedCarrier.name} için geçersiz format`);
      return;
    }
    if (!brandName.trim()) return;

    setTrackingError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await mutation.mutateAsync({
        carrier,
        trackingNumber: trackingNo.trim(),
        brandName: brandName.trim(),
        productName: productName.trim() || undefined,
      });
      // Formu temizle ve kapat
      setTracking(''); setBrandName(''); setProduct('');
      onClose();
    } catch (err: any) {
      setTrackingError(err.message ?? 'Bir hata oluştu');
    }
  };

  const canSubmit = trackingNo.trim() && brandName.trim() && !mutation.isPending;

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Overlay */}
        <Animated.View style={[sty.overlay, { opacity: overlayAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={[sty.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={[Colors.surface1, Colors.bg]} style={StyleSheet.absoluteFill} />

          {/* Handle */}
          <View style={sty.handle} />

          {/* Başlık */}
          <View style={sty.header}>
            <Text style={sty.title}>Manuel Sipariş Ekle</Text>
            <Text style={sty.subtitle}>Butika dışındaki siparişlerini de buradan takip et</Text>
            <TouchableOpacity style={sty.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={Colors.text3} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={sty.form}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Kargo firması */}
            <View style={sty.fieldGroup}>
              <Text style={sty.label}>KARGO FİRMASI</Text>
              <TouchableOpacity
                style={sty.selector}
                onPress={() => { Haptics.selectionAsync(); setShowCarrier(s => !s); }}
              >
                <Text style={sty.selectorText}>{selectedCarrier.name}</Text>
                <Ionicons name={showCarrierPicker ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.text3} />
              </TouchableOpacity>

              {showCarrierPicker && (
                <View style={sty.pickerList}>
                  {CARRIER_LIST.map(c => (
                    <TouchableOpacity
                      key={c.code}
                      style={[sty.pickerItem, carrier === c.code && sty.pickerItemActive]}
                      onPress={() => { setCarrier(c.code); setShowCarrier(false); setTrackingError(''); }}
                    >
                      <Text style={[sty.pickerText, carrier === c.code && sty.pickerTextActive]}>
                        {c.name}
                      </Text>
                      {carrier === c.code && <Ionicons name="checkmark" size={16} color={Colors.rose3} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Takip numarası */}
            <View style={sty.fieldGroup}>
              <Text style={sty.label}>KARGO TAKİP NUMARASI</Text>
              <View style={[sty.inputWrap, trackingError ? sty.inputError : null]}>
                <TextInput
                  style={sty.input}
                  placeholder="Kargo takip numaranızı girin"
                  placeholderTextColor={Colors.text5}
                  value={trackingNo}
                  onChangeText={t => { setTracking(t); setTrackingError(''); }}
                  autoCapitalize="characters"
                  returnKeyType="next"
                  selectionColor={Colors.rose3}
                />
              </View>
              {trackingError ? (
                <Text style={sty.errorText}>{trackingError}</Text>
              ) : null}
            </View>

            {/* Butik adı */}
            <View style={sty.fieldGroup}>
              <Text style={sty.label}>BUTİK / SATICI ADI</Text>
              <View style={sty.inputWrap}>
                <TextInput
                  style={sty.input}
                  placeholder="ör. Selma Çilek"
                  placeholderTextColor={Colors.text5}
                  value={brandName}
                  onChangeText={setBrandName}
                  returnKeyType="next"
                  selectionColor={Colors.rose3}
                />
              </View>
            </View>

            {/* Ürün adı (opsiyonel) */}
            <View style={sty.fieldGroup}>
              <Text style={sty.label}>ÜRÜN ADI <Text style={sty.optional}>(opsiyonel)</Text></Text>
              <View style={sty.inputWrap}>
                <TextInput
                  style={sty.input}
                  placeholder="ör. Keten beyaz gömlek"
                  placeholderTextColor={Colors.text5}
                  value={productName}
                  onChangeText={setProduct}
                  returnKeyType="done"
                  onSubmitEditing={canSubmit ? validateAndSubmit : undefined}
                  selectionColor={Colors.rose3}
                />
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[sty.submitBtn, !canSubmit && sty.submitDisabled]}
              onPress={validateAndSubmit}
              disabled={!canSubmit}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={[Colors.rose2, Colors.rose3, Colors.rose4]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={sty.submitText}>
                {mutation.isPending ? 'Ekleniyor...' : 'Takibe Başla'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sty = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border3,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 4,
    position: 'relative',
  },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.text1,
    marginBottom: 3,
  },
  subtitle: {
    fontFamily: Fonts.uiLight,
    fontSize: 13,
    color: Colors.text3,
  },
  closeBtn: {
    position: 'absolute',
    top: 4, right: 16,
    width: 32, height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface3,
    alignItems: 'center', justifyContent: 'center',
  },
  form: { paddingHorizontal: 20, paddingBottom: 32 },
  fieldGroup: { marginBottom: 16 },
  label: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.text4,
    marginBottom: 8,
  },
  optional: { color: Colors.text5, fontFamily: Fonts.uiLight },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: 14,
    height: 48,
  },
  selectorText: {
    fontFamily: Fonts.uiLight,
    fontSize: 15,
    color: Colors.text1,
  },
  pickerList: {
    marginTop: 4,
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border2,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border1,
  },
  pickerItemActive: { backgroundColor: Colors.roseGlow },
  pickerText: { fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text1 },
  pickerTextActive: { fontFamily: Fonts.uiMedium, color: Colors.rose3 },
  inputWrap: {
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  inputError: { borderColor: Colors.error },
  input: {
    fontFamily: Fonts.uiLight,
    fontSize: 15,
    color: Colors.text1,
  },
  errorText: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
  },
  submitBtn: {
    height: 54,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  submitDisabled: { opacity: 0.45 },
  submitText: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    letterSpacing: 0.5,
    color: '#fff',
  },
});
