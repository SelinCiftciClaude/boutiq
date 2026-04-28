import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { useShipments } from '@/hooks/useShipments';
import { useProfile } from '@/hooks/useProfile';
import { Shipment } from '../../types';

// ─── Kargo durumu config ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  ordered:          { label: 'Sipariş Alındı',   color: Colors.text3,   icon: 'bag-check-outline',        bg: Colors.surface3 },
  processing:       { label: 'Hazırlanıyor',      color: Colors.gold3,   icon: 'cube-outline',             bg: Colors.glassGold },
  shipped:          { label: 'Kargoya Verildi',   color: Colors.purple3, icon: 'arrow-up-circle-outline',  bg: Colors.purpleGlow },
  in_transit:       { label: 'Yolda',             color: Colors.rose3,   icon: 'bicycle-outline',          bg: Colors.roseGlow },
  out_for_delivery: { label: 'Dağıtımda',         color: Colors.gold3,   icon: 'navigate-circle-outline',  bg: Colors.glassGold },
  delivered:        { label: 'Teslim Edildi',     color: Colors.success, icon: 'checkmark-circle',         bg: Colors.successGlow },
  returned:         { label: 'İade',              color: Colors.error,   icon: 'return-down-back-outline', bg: 'rgba(239,68,68,0.12)' },
};


const CARRIERS = ['Yurtiçi Kargo','MNG Kargo','PTT Kargo','Aras Kargo','Sürat Kargo','UPS','DHL','Diğer'];

// ─── Tarihe göre gruplama ────────────────────────────────────────────────
function groupByDate(shipments: Shipment[]): { date: string; isoDate: string; items: Shipment[] }[] {
  const map = new Map<string, { isoDate: string; items: Shipment[] }>();
  for (const s of shipments) {
    const d = new Date(s.createdAt);
    const key = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!map.has(key)) map.set(key, { isoDate: s.createdAt, items: [] });
    map.get(key)!.items.push(s);
  }
  return Array.from(map.entries())
    .map(([date, { isoDate, items }]) => ({ date, isoDate, items }))
    .sort((a, b) => new Date(b.isoDate).getTime() - new Date(a.isoDate).getTime());
}

// ─── Tek sipariş kartı ───────────────────────────────────────────────────
function ShipmentRow({ shipment }: { shipment: Shipment }) {
  const cfg = STATUS_CONFIG[shipment.status] ?? STATUS_CONFIG.ordered;

  return (
    <View style={rowStyles.card}>
      <LinearGradient colors={[Colors.surface2, Colors.surface1]} style={StyleSheet.absoluteFill} />

      {/* Üst: marka + detaylar */}
      <View style={rowStyles.top}>
        <View style={rowStyles.brandRow}>
          {shipment.brandLogo ? (
            <Image source={{ uri: shipment.brandLogo }} style={rowStyles.logo} />
          ) : (
            <View style={[rowStyles.logo, rowStyles.logoFallback]}>
              <Ionicons name="storefront-outline" size={16} color={Colors.text4} />
            </View>
          )}
          <View>
            <Text style={rowStyles.brandName}>{shipment.brandName}</Text>
            <Text style={rowStyles.orderNum}>#{shipment.orderNumber}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={rowStyles.detailBtn}
          onPress={() => {
            Haptics.selectionAsync();
            router.push(`/shipment/${shipment.id}` as any);
          }}
        >
          <Text style={rowStyles.detailText}>Detaylar</Text>
          <Ionicons name="chevron-forward" size={13} color={Colors.gold3} />
        </TouchableOpacity>
      </View>

      {/* Orta: durum */}
      <View style={[rowStyles.statusRow, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon as any} size={15} color={cfg.color} />
        <Text style={[rowStyles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        {shipment.carrier ? (
          <Text style={rowStyles.carrierText}> · {shipment.carrier}</Text>
        ) : null}
      </View>

      {/* Alt: mini ürün fotoları */}
      {shipment.products.length > 0 && (
        <View style={rowStyles.photosRow}>
          {shipment.products.slice(0, 4).map((p, i) => (
            <View key={i} style={rowStyles.photoWrap}>
              <Image source={{ uri: p.image }} style={rowStyles.photo} />
              {i === 3 && shipment.products.length > 4 && (
                <View style={rowStyles.moreOverlay}>
                  <Text style={rowStyles.moreText}>+{shipment.products.length - 4}</Text>
                </View>
              )}
            </View>
          ))}
          <Text style={rowStyles.productCount}>
            {shipment.products.length} ürün
            {shipment.status === 'delivered' ? ' teslim edildi' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const rowStyles = StyleSheet.create({
  card: {
    borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border1,
    padding: 16, gap: 12, marginBottom: 10,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logo: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.surface3, borderWidth: 1, borderColor: Colors.border2,
  },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 15, fontWeight: '700', color: Colors.text1, letterSpacing: -0.2 },
  orderNum: { fontSize: 11, color: Colors.text4, marginTop: 1 },
  detailBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: Colors.glassGold, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.borderGold,
  },
  detailText: { fontSize: 12, fontWeight: '700', color: Colors.gold3 },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  statusText: { fontSize: 13, fontWeight: '700' },
  carrierText: { fontSize: 12, color: Colors.text4, fontWeight: '500' },
  photosRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoWrap: { position: 'relative' },
  photo: {
    width: 52, height: 52, borderRadius: 12,
    backgroundColor: Colors.surface3,
    borderWidth: 1, borderColor: Colors.border2,
  },
  moreOverlay: {
    position: 'absolute', inset: 0,
    backgroundColor: 'rgba(7,7,15,0.55)',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  moreText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  productCount: { fontSize: 12, color: Colors.text4, fontWeight: '500', flex: 1 },
});

// ─── Kargo Ekleme Modalı ─────────────────────────────────────────────────
function AddShipmentModal({ visible, onClose, onAdd }: {
  visible: boolean; onClose: () => void;
  onAdd: (p: { brandName: string; orderNumber: string; trackingNumber?: string; carrier: string }) => Promise<void>;
}) {
  const [brandName, setBrandName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('Yurtiçi Kargo');
  const [loading, setLoading] = useState(false);

  const reset = () => { setBrandName(''); setOrderNumber(''); setTrackingNumber(''); setCarrier('Yurtiçi Kargo'); };

  const handleAdd = async () => {
    if (!brandName.trim() || !orderNumber.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      await onAdd({ brandName: brandName.trim(), orderNumber: orderNumber.trim(), trackingNumber: trackingNumber.trim() || undefined, carrier });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset(); onClose();
    } catch { /* modal açık kalır */ } finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={aStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={aStyles.sheet}>
          <LinearGradient colors={[Colors.surface2, Colors.surface1]} style={StyleSheet.absoluteFill} />
          <View style={aStyles.handle} />
          <Text style={aStyles.title}>Kargo Ekle</Text>
          <Text style={aStyles.subtitle}>Sipariş bilgilerini gir, biz takip edelim.</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={aStyles.label}>Mağaza / Marka *</Text>
            <View style={aStyles.inputRow}>
              <TextInput style={aStyles.input} placeholder="ör. Noire Studio" placeholderTextColor={Colors.text5} value={brandName} onChangeText={setBrandName} selectionColor={Colors.gold3} />
            </View>
            <Text style={aStyles.label}>Sipariş Numarası *</Text>
            <View style={aStyles.inputRow}>
              <TextInput style={aStyles.input} placeholder="ör. ORD-2026-1234" placeholderTextColor={Colors.text5} value={orderNumber} onChangeText={setOrderNumber} selectionColor={Colors.gold3} autoCapitalize="characters" />
            </View>
            <Text style={aStyles.label}>Takip Numarası (opsiyonel)</Text>
            <View style={aStyles.inputRow}>
              <TextInput style={aStyles.input} placeholder="ör. YK123456789TR" placeholderTextColor={Colors.text5} value={trackingNumber} onChangeText={setTrackingNumber} selectionColor={Colors.gold3} autoCapitalize="characters" />
            </View>
            <Text style={aStyles.label}>Kargo Firması</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={aStyles.carrierScroll}>
              {CARRIERS.map(c => {
                const active = carrier === c;
                return (
                  <TouchableOpacity key={c} onPress={() => { Haptics.selectionAsync(); setCarrier(c); }} style={[aStyles.carrierChip, active && aStyles.carrierChipActive]}>
                    {active && <LinearGradient colors={[Colors.gold2, Colors.gold4]} style={StyleSheet.absoluteFill} />}
                    <Text style={[aStyles.carrierText, active && aStyles.carrierTextActive]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={[aStyles.addBtn, (!brandName.trim() || !orderNumber.trim()) && aStyles.addBtnDisabled]} onPress={handleAdd} disabled={!brandName.trim() || !orderNumber.trim() || loading}>
              <LinearGradient colors={[Colors.rose2, Colors.rose4]} style={StyleSheet.absoluteFill} />
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={aStyles.addBtnText}>Kargoyu Ekle</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={aStyles.cancelBtn}>
              <Text style={aStyles.cancelText}>İptal</Text>
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const aStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 0, maxHeight: '90%', overflow: 'hidden', borderWidth: 1, borderBottomWidth: 0, borderColor: Colors.border2 },
  handle: { width: 40, height: 4, backgroundColor: Colors.border3, borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text1, letterSpacing: -0.8, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.text3, lineHeight: 20, marginBottom: 24 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.text4, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  inputRow: { backgroundColor: Colors.surface3, borderRadius: 14, borderWidth: 1, borderColor: Colors.border2, paddingHorizontal: 14, height: 50, justifyContent: 'center', marginBottom: 16 },
  input: { fontSize: 15, color: Colors.text1 },
  carrierScroll: { gap: 8, marginBottom: 24 },
  carrierChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, backgroundColor: Colors.surface3, borderWidth: 1, borderColor: Colors.border2, overflow: 'hidden' },
  carrierChipActive: { borderColor: Colors.gold3 },
  carrierText: { fontSize: 13, fontWeight: '600', color: Colors.text3 },
  carrierTextActive: { color: Colors.bg, fontWeight: '700' },
  addBtn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 12 },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { fontSize: 15, color: Colors.text4, fontWeight: '500' },
});

// ─── Ana ekran ────────────────────────────────────────────────────────────
export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const { data: shipments = [], add: addShipment } = useShipments();
  const { data: profile } = useProfile();
  const [showAddModal, setShowAddModal] = useState(false);

  const mailConnected = !!(profile?.connectedAccounts as any)?.gmail?.connected;
  const groups = groupByDate(shipments);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bgGlow} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kargo Takip</Text>
      </View>

      {/* Mail Bağla + Kargo Ekle butonları */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          onPress={() => router.push('/connect-mail' as any)}
          style={[styles.mailBtn, mailConnected && styles.mailBtnConnected]}
        >
          <Ionicons name="mail" size={16} color={mailConnected ? Colors.success : Colors.gold3} />
          <Text style={[styles.mailBtnText, mailConnected && { color: Colors.success }]}>
            {mailConnected ? 'Mail Bağlı' : 'Mail Bağla'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddModal(true); }}
        >
          <LinearGradient colors={[Colors.rose2, Colors.rose4]} style={StyleSheet.absoluteFill} />
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tarihe göre gruplu liste */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {groups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Henüz sipariş yok</Text>
            <Text style={styles.emptySubtitle}>Kargo ekle veya mail bağla, siparişlerin otomatik gelsin.</Text>
          </View>
        ) : (
          groups.map(group => (
            <View key={group.date}>
              <View style={styles.dateHeader}>
                <View style={styles.dateLine} />
                <View style={styles.datePill}>
                  <Ionicons name="calendar-outline" size={11} color={Colors.gold3} />
                  <Text style={styles.dateText}>{group.date}</Text>
                </View>
                <View style={styles.dateLine} />
              </View>
              {group.items.map(s => <ShipmentRow key={s.id} shipment={s} />)}
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <AddShipmentModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={params => addShipment.mutateAsync(params)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  bgGlow: { position: 'absolute', top: 200, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: Colors.successGlow, opacity: 0.3 },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.text1, letterSpacing: -1 },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingBottom: 16, paddingTop: 4,
  },
  mailBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 11, borderRadius: 14,
    backgroundColor: Colors.glassGold, borderWidth: 1, borderColor: Colors.borderGold,
  },
  mailBtnConnected: { backgroundColor: Colors.successGlow, borderColor: `${Colors.success}40` },
  mailBtnText: { fontSize: 14, fontWeight: '700', color: Colors.gold3 },
  addBtn: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16 },

  // Tarih header
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 4 },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border2 },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface2, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: Colors.borderGold },
  dateText: { fontSize: 11, fontWeight: '700', color: Colors.gold3, letterSpacing: 0.3 },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyIcon: { fontSize: 52, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text2, textAlign: 'center', letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 14, color: Colors.text4, textAlign: 'center', lineHeight: 20 },
  mailCtaSub: { fontSize: 12, color: Colors.text4 },
});
