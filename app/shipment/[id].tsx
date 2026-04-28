import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '@/constants/Colors';
import { useShipments } from '@/hooks/useShipments';
import { Shipment } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  ordered:          { label: 'Sipariş Alındı',   color: Colors.text3,   icon: 'bag-check-outline',        bg: Colors.surface3 },
  processing:       { label: 'Hazırlanıyor',      color: Colors.gold3,   icon: 'cube-outline',             bg: Colors.glassGold },
  shipped:          { label: 'Kargoya Verildi',   color: Colors.purple3, icon: 'arrow-up-circle-outline',  bg: Colors.purpleGlow },
  in_transit:       { label: 'Yolda',             color: Colors.rose3,   icon: 'bicycle-outline',          bg: Colors.roseGlow },
  out_for_delivery: { label: 'Dağıtımda',         color: Colors.gold3,   icon: 'navigate-circle-outline',  bg: Colors.glassGold },
  delivered:        { label: 'Teslim Edildi',     color: Colors.success, icon: 'checkmark-circle-outline', bg: Colors.successGlow },
  returned:         { label: 'İade Edildi',       color: Colors.error,   icon: 'return-down-back-outline', bg: 'rgba(239,68,68,0.12)' },
};

export default function ShipmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: shipments = [] } = useShipments();
  const shipment = shipments.find(s => s.id === id) as Shipment | undefined;

  if (!shipment) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>Sipariş bulunamadı.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Geri dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cfg = STATUS_CONFIG[shipment.status] ?? STATUS_CONFIG.ordered;
  const isDelivered = shipment.status === 'delivered';

  const copyTracking = async () => {
    if (!shipment.trackingNumber) return;
    await Clipboard.setStringAsync(shipment.trackingNumber);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text1} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sipariş Detayı</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Marka + sipariş no */}
        <View style={styles.brandCard}>
          <LinearGradient colors={[Colors.surface2, Colors.surface1]} style={StyleSheet.absoluteFill} />
          <Image source={{ uri: shipment.brandLogo }} style={styles.brandLogo} />
          <View style={styles.brandInfo}>
            <Text style={styles.brandName}>{shipment.brandName}</Text>
            <Text style={styles.orderNum}>Sipariş #{shipment.orderNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {/* Ürünler */}
        {shipment.products.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ürünler ({shipment.products.length})</Text>
            {shipment.products.map((p, i) => (
              <View key={i} style={styles.productRow}>
                <Image source={{ uri: p.image }} style={styles.productImg} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{p.name}</Text>
                  <Text style={styles.productQty}>{p.quantity} adet</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Kargo bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kargo Bilgileri</Text>
          <View style={styles.infoCard}>
            <LinearGradient colors={[Colors.surface2, Colors.surface1]} style={StyleSheet.absoluteFill} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Kargo Firması</Text>
              <Text style={styles.infoValue}>{shipment.carrier || '—'}</Text>
            </View>

            {shipment.trackingNumber ? (
              <TouchableOpacity style={styles.infoRow} onPress={copyTracking} activeOpacity={0.7}>
                <Text style={styles.infoLabel}>Takip Numarası</Text>
                <View style={styles.trackingRow}>
                  <Text style={styles.trackingNum}>{shipment.trackingNumber}</Text>
                  <Ionicons name="copy-outline" size={14} color={Colors.gold3} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Takip Numarası</Text>
                <Text style={styles.infoValue}>—</Text>
              </View>
            )}

            {shipment.estimatedDelivery ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tahmini Teslimat</Text>
                <Text style={styles.infoValue}>{shipment.estimatedDelivery}</Text>
              </View>
            ) : null}

            {shipment.lastLocation ? (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.infoLabel}>Son Konum</Text>
                <Text style={styles.infoValue}>{shipment.lastLocation}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Toplam tutar */}
        {shipment.totalAmount > 0 && (
          <View style={styles.totalCard}>
            <LinearGradient colors={[Colors.glassGold, Colors.surface2]} style={StyleSheet.absoluteFill} />
            <Text style={styles.totalLabel}>Toplam Tutar</Text>
            <Text style={styles.totalAmount}>
              {shipment.currency === 'TL' ? '₺' : shipment.currency}
              {shipment.totalAmount.toLocaleString('tr-TR')}
            </Text>
          </View>
        )}

        {/* Timeline */}
        {shipment.events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kargo Geçmişi</Text>
            {shipment.events.map((event, i) => {
              const isFirst = i === 0;
              const isLast = i === shipment.events.length - 1;
              const evtCfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.ordered;
              return (
                <View key={event.id} style={styles.timelineRow}>
                  {/* Sol: çizgi + nokta */}
                  <View style={styles.timelineLeft}>
                    {!isFirst && <View style={styles.timelineLineTop} />}
                    <View style={[styles.timelineDot, isFirst && { backgroundColor: evtCfg.color, borderColor: evtCfg.color }]}>
                      {isFirst && <Ionicons name={evtCfg.icon as any} size={10} color="#fff" />}
                    </View>
                    {!isLast && <View style={styles.timelineLineBottom} />}
                  </View>
                  {/* Sağ: bilgi */}
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineDesc, isFirst && { color: Colors.text1, fontWeight: '700' }]}>
                      {event.description}
                    </Text>
                    {event.location ? (
                      <Text style={styles.timelineLoc}>{event.location}</Text>
                    ) : null}
                    <Text style={styles.timelineDate}>
                      {new Date(event.timestamp).toLocaleString('tr-TR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFound: { fontSize: 16, color: Colors.text3 },
  backLink: { paddingVertical: 8 },
  backLinkText: { fontSize: 15, color: Colors.gold3, fontWeight: '600' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border2,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text1 },

  scroll: { paddingHorizontal: 16, paddingTop: 8 },

  brandCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 20, padding: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border1, marginBottom: 20,
  },
  brandLogo: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: Colors.surface3, borderWidth: 1, borderColor: Colors.border2,
  },
  brandInfo: { flex: 1 },
  brandName: { fontSize: 16, fontWeight: '800', color: Colors.text1, letterSpacing: -0.3 },
  orderNum: { fontSize: 12, color: Colors.text4, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', color: Colors.text4,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },

  productRow: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: Colors.surface2, borderRadius: 16,
    padding: 12, borderWidth: 1, borderColor: Colors.border1, marginBottom: 8,
  },
  productImg: {
    width: 60, height: 60, borderRadius: 12,
    backgroundColor: Colors.surface3, borderWidth: 1, borderColor: Colors.border2,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: Colors.text1, lineHeight: 19 },
  productQty: { fontSize: 12, color: Colors.text4, marginTop: 4 },

  infoCard: {
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border1,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border1,
  },
  infoLabel: { fontSize: 13, color: Colors.text4, fontWeight: '500' },
  infoValue: { fontSize: 13, color: Colors.text1, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 16 },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trackingNum: { fontSize: 13, color: Colors.gold3, fontWeight: '700' },

  totalCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 18, padding: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.borderGold, marginBottom: 20,
  },
  totalLabel: { fontSize: 14, fontWeight: '600', color: Colors.text3 },
  totalAmount: { fontSize: 22, fontWeight: '800', color: Colors.gold3, letterSpacing: -0.5 },

  timelineRow: { flexDirection: 'row', gap: 14, minHeight: 60 },
  timelineLeft: { alignItems: 'center', width: 20 },
  timelineLineTop: { width: 2, height: 12, backgroundColor: Colors.border2 },
  timelineLineBottom: { width: 2, flex: 1, backgroundColor: Colors.border2 },
  timelineDot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.surface3, borderWidth: 2, borderColor: Colors.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineDesc: { fontSize: 14, color: Colors.text3, fontWeight: '500', lineHeight: 19 },
  timelineLoc: { fontSize: 12, color: Colors.text4, marginTop: 2 },
  timelineDate: { fontSize: 11, color: Colors.text5, marginTop: 4 },
});
