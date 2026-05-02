import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useShipment, useRefreshShipment, useDeleteShipment } from '@/hooks/useShipments';
import { CARRIER_LIST } from '@/services/carriers';
import { STATUS_CONFIG } from '@/components/ShipmentCard';
import { formatDate, formatDateShort, timeAgo } from '@/utils/dateFormat';

// ── Timeline adım konfigürasyonu ─────────────────────────────────────────────

const TIMELINE_STEPS = ['ordered', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'];

function stepIndex(status: string): number {
  const idx = TIMELINE_STEPS.indexOf(status);
  return idx === -1 ? 1 : idx;
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────

export default function ShipmentDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [copied, setCopied] = useState(false);

  const { data: shipment, isLoading } = useShipment(id ?? null);
  const refresh = useRefreshShipment();
  const deleteMutation = useDeleteShipment();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.rose3} />
      </View>
    );
  }

  if (!shipment) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>Kargo bulunamadı</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.goBack}>Geri dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cfg = STATUS_CONFIG[shipment.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.processing;
  const currentStep = stepIndex(shipment.status);
  const firstProduct = shipment.products?.[0];
  const carrier = CARRIER_LIST.find(c => c.code === shipment.carrier);

  const copyTracking = async () => {
    await Clipboard.setStringAsync(shipment.trackingNumber);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openCarrierSite = () => {
    if (!carrier) return;
    Linking.openURL(carrier.trackingUrl(shipment.trackingNumber));
  };

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await refresh.mutateAsync(shipment.id);
    } catch (err: any) {
      Alert.alert('Hata', err.message ?? 'Kargo bilgisi alınamadı');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Kargoyu sil',
      `${shipment.brandName} kargosunu takip listesinden çıkarmak istediğine emin misin?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await deleteMutation.mutateAsync(shipment.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{shipment.brandName}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Ürün kart */}
        <View style={styles.productCard}>
          <LinearGradient colors={[Colors.surface1, Colors.bg]} style={StyleSheet.absoluteFill} />
          {firstProduct?.image || shipment.brandLogo ? (
            <Image
              source={{ uri: firstProduct?.image || shipment.brandLogo }}
              style={styles.productThumb}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.productThumb, styles.thumbPlaceholder]}>
              <Ionicons name="cube-outline" size={32} color={Colors.text4} />
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productBrand}>{shipment.brandName}</Text>
            {firstProduct?.name ? (
              <Text style={styles.productName} numberOfLines={2}>{firstProduct.name}</Text>
            ) : null}
            {shipment.totalAmount > 0 && (
              <Text style={styles.productPrice}>₺{shipment.totalAmount.toLocaleString('tr-TR')}</Text>
            )}
            <Text style={styles.orderDate}>Sipariş: {formatDateShort(shipment.createdAt)}</Text>
          </View>
        </View>

        {/* Durum banner */}
        <View style={[styles.statusBanner, { backgroundColor: cfg.bg }]}>
          <View style={styles.statusLeft}>
            <Text style={styles.statusEmoji}>{cfg.emoji}</Text>
            <View>
              <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
              {shipment.lastLocation ? (
                <Text style={styles.statusLocation}>{shipment.lastLocation}</Text>
              ) : null}
            </View>
          </View>
          {shipment.estimatedDelivery ? (
            <View style={styles.etaBadge}>
              <Text style={styles.etaLabel}>Tahmini</Text>
              <Text style={[styles.etaDate, { color: cfg.color }]}>{shipment.estimatedDelivery}</Text>
            </View>
          ) : null}
        </View>

        {/* Timeline — kargo adımları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TİMELINE</Text>
          <View style={styles.timeline}>
            {TIMELINE_STEPS.map((step, i) => {
              const done = i <= currentStep && shipment.status !== 'returned';
              const current = i === currentStep;
              const stepCfg = STATUS_CONFIG[step as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.processing;

              // Bu adıma ait gerçek event'i bul
              const event = shipment.events?.find(e => e.status === step);

              return (
                <View key={step} style={styles.timelineRow}>
                  {/* Dikey çizgi */}
                  {i < TIMELINE_STEPS.length - 1 && (
                    <View style={[styles.timelineLine, done && i < currentStep && { backgroundColor: cfg.color }]} />
                  )}

                  {/* Nokta */}
                  <View style={[
                    styles.timelineDot,
                    done && { backgroundColor: cfg.color, borderColor: cfg.color },
                    current && styles.timelineDotCurrent,
                  ]}>
                    {done && !current && (
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    )}
                    {current && (
                      <View style={[styles.timelineDotInner, { backgroundColor: cfg.color }]} />
                    )}
                  </View>

                  {/* İçerik */}
                  <View style={styles.timelineContent}>
                    <Text style={[
                      styles.timelineLabel,
                      done && { color: Colors.text1, fontFamily: Fonts.uiMedium },
                      current && { color: cfg.color },
                    ]}>
                      {current && '→ '}{stepCfg.label.replace(/📦|🚚|🏃|✓|↩️|⚠️|📋/g, '').trim()}
                    </Text>
                    {event && (
                      <>
                        {event.location ? (
                          <Text style={styles.timelineLocation}>{event.location}</Text>
                        ) : null}
                        <Text style={styles.timelineTime}>{formatDate(event.timestamp)}</Text>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Kargo olayları (detaylı log varsa) */}
        {shipment.events && shipment.events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>KARGO GEÇMİŞİ</Text>
            <View style={styles.eventsCard}>
              {shipment.events.map((ev, i) => (
                <View key={ev.id ?? i} style={[styles.eventRow, i > 0 && styles.eventRowBorder]}>
                  <View style={[styles.eventDot, { backgroundColor: STATUS_CONFIG[ev.status as keyof typeof STATUS_CONFIG]?.color ?? Colors.text4 }]} />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventDesc}>{ev.description}</Text>
                    {ev.location ? <Text style={styles.eventLoc}>{ev.location}</Text> : null}
                    <Text style={styles.eventTime}>{formatDate(ev.timestamp)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Kargo bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KARGO BİLGİLERİ</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Kargo firması" value={carrier?.name ?? shipment.carrier} />
            <InfoRow label="Sipariş no" value={shipment.orderNumber} />
            <View style={styles.infoRowFull}>
              <Text style={styles.infoLabel}>Takip numarası</Text>
              <View style={styles.trackingRow}>
                <Text style={styles.infoValue} selectable>{shipment.trackingNumber}</Text>
                <TouchableOpacity onPress={copyTracking} style={styles.copyBtn}>
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={14}
                    color={copied ? Colors.success : Colors.rose3}
                  />
                  <Text style={[styles.copyText, copied && { color: Colors.success }]}>
                    {copied ? 'Kopyalandı' : 'Kopyala'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            {shipment.lastCheckedAt && (
              <InfoRow label="Son güncelleme" value={timeAgo(shipment.lastCheckedAt)} />
            )}
          </View>

          {carrier && (
            <TouchableOpacity style={styles.openCarrierBtn} onPress={openCarrierSite}>
              <Ionicons name="open-outline" size={14} color={Colors.rose3} />
              <Text style={styles.openCarrierText}>{carrier.name} sitesinde aç →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Eylemler */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={handleRefresh}
            disabled={refresh.isPending}
          >
            {refresh.isPending
              ? <ActivityIndicator size="small" color={Colors.rose3} />
              : <Ionicons name="refresh-outline" size={16} color={Colors.rose3} />}
            <Text style={styles.actionBtnText}>Yenile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.error} />
            <Text style={[styles.actionBtnText, { color: Colors.error }]}>Sil</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surface2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: Colors.border2,
  },
  headerTitle: {
    fontFamily: Fonts.uiMedium,
    fontSize: 16,
    color: Colors.text1,
    flex: 1,
    textAlign: 'center',
  },

  productCard: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  productThumb: {
    width: 80, height: 80,
    borderRadius: 12,
    backgroundColor: Colors.surface3,
  },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1, gap: 3, justifyContent: 'center' },
  productBrand: {
    fontFamily: Fonts.uiMedium, fontSize: 12, color: Colors.rose3,
  },
  productName: {
    fontFamily: Fonts.uiMedium, fontSize: 15, color: Colors.text1, lineHeight: 20,
  },
  productPrice: {
    fontFamily: Fonts.ui, fontSize: 14, color: Colors.gold3,
  },
  orderDate: {
    fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4,
  },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusEmoji: { fontSize: 22 },
  statusLabel: { fontFamily: Fonts.ui, fontSize: 13, letterSpacing: 0.5 },
  statusLocation: {
    fontFamily: Fonts.uiLight, fontSize: 12, color: Colors.text3, marginTop: 2,
  },
  etaBadge: { alignItems: 'flex-end' },
  etaLabel: { fontFamily: Fonts.uiLight, fontSize: 10, color: Colors.text4 },
  etaDate: { fontFamily: Fonts.uiMedium, fontSize: 13 },

  section: { marginBottom: 16 },
  sectionTitle: {
    fontFamily: Fonts.uiMedium, fontSize: 9,
    letterSpacing: 2, color: Colors.text4,
    textTransform: 'uppercase', marginBottom: 10,
  },

  // Timeline
  timeline: { paddingLeft: 8 },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 44,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 11, top: 20, bottom: 0,
    width: 1.5,
    backgroundColor: Colors.border2,
    zIndex: 0,
  },
  timelineDot: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border3,
    backgroundColor: Colors.surface3,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1, marginTop: 2,
  },
  timelineDotCurrent: {
    width: 22, height: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: Colors.surface1,
  },
  timelineDotInner: {
    width: 10, height: 10, borderRadius: 5,
  },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineLabel: {
    fontFamily: Fonts.uiLight, fontSize: 13, color: Colors.text4, lineHeight: 18,
  },
  timelineLocation: {
    fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4, marginTop: 1,
  },
  timelineTime: {
    fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text5, marginTop: 2,
  },

  // Events
  eventsCard: {
    backgroundColor: Colors.surface2,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
  },
  eventRowBorder: { borderTopWidth: 0.5, borderTopColor: Colors.border1 },
  eventDot: {
    width: 8, height: 8, borderRadius: 4, marginTop: 4,
  },
  eventInfo: { flex: 1 },
  eventDesc: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.text1 },
  eventLoc: { fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text3, marginTop: 1 },
  eventTime: { fontFamily: Fonts.uiLight, fontSize: 10, color: Colors.text5, marginTop: 2 },

  // Info card
  infoCard: {
    backgroundColor: Colors.surface2,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border2,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border1,
  },
  infoRowFull: { padding: 12 },
  infoLabel: { fontFamily: Fonts.uiLight, fontSize: 12, color: Colors.text4 },
  infoValue: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.text1 },
  trackingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  copyText: { fontFamily: Fonts.uiMedium, fontSize: 12, color: Colors.rose3 },
  openCarrierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  openCarrierText: {
    fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.rose3,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 0.5,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.roseGlow,
    borderColor: Colors.borderBurgund,
  },
  actionBtnDanger: {
    backgroundColor: Colors.error + '10',
    borderColor: Colors.error + '40',
  },
  actionBtnText: {
    fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.rose3,
  },

  notFound: { fontFamily: Fonts.uiMedium, fontSize: 16, color: Colors.text3 },
  goBack: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.rose3, marginTop: 8 },
});
