import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { formatDateShort } from '@/utils/dateFormat';
import type { Shipment } from '@/services/shipmentService';

// ── Durum konfigürasyonu ─────────────────────────────────────────────────────

export const STATUS_CONFIG = {
  ordered:          { label: 'SİPARİŞ ALINDI',    emoji: '📋', color: '#A32D2D', bg: 'rgba(163,45,45,0.10)' },
  processing:       { label: 'HAZIRLANIYOR',        emoji: '📦', color: '#A32D2D', bg: 'rgba(163,45,45,0.10)' },
  shipped:          { label: 'KARGOYA VERİLDİ',     emoji: '🚚', color: '#BA7517', bg: 'rgba(186,117,23,0.10)' },
  in_transit:       { label: 'YOLDA',               emoji: '🚚', color: '#BA7517', bg: 'rgba(186,117,23,0.10)' },
  out_for_delivery: { label: 'DAĞITIMDA',            emoji: '🏃', color: '#CF8A0A', bg: 'rgba(207,138,10,0.12)' },
  delivered:        { label: 'TESLİM EDİLDİ',        emoji: '✓',  color: '#3B6D11', bg: 'rgba(59,109,17,0.10)' },
  returned:         { label: 'İADE',                 emoji: '↩️', color: '#6B6B6B', bg: 'rgba(107,107,107,0.10)' },
  failed:           { label: 'BİLGİ ALINAMIYOR',     emoji: '⚠️', color: '#A32D2D', bg: 'rgba(163,45,45,0.08)' },
} as const;

function getConfig(status: string) {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    ?? STATUS_CONFIG.processing;
}

// ── Bileşen ───────────────────────────────────────────────────────────────────

interface Props {
  shipment: Shipment;
  compact?: boolean;
}

export function ShipmentCard({ shipment, compact = false }: Props) {
  const cfg = getConfig(shipment.status);
  const firstProduct = shipment.products?.[0];
  const thumbnail = firstProduct?.image || shipment.brandLogo;
  const isDelivered = shipment.status === 'delivered';

  const handlePress = () => {
    Haptics.selectionAsync();
    router.push(`/shipment/${shipment.id}` as any);
  };

  return (
    <TouchableOpacity
      style={[styles.card, isDelivered && styles.cardDelivered]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      {/* Sol durum şeridi */}
      <View style={[styles.strip, { backgroundColor: cfg.color }]} />

      {/* Hafif renkli arka plan */}
      <LinearGradient
        colors={[cfg.bg, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0.6, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.inner}>
        {/* Ürün görseli */}
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail }}
            style={[styles.thumb, !firstProduct?.image && styles.thumbLogo]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]}>
            <Ionicons name="cube-outline" size={20} color={Colors.text4} />
          </View>
        )}

        {/* Bilgi */}
        <View style={styles.info}>
          {/* Durum rozeti */}
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={styles.statusEmoji}>{cfg.emoji}</Text>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>

          {/* Butik adı */}
          <Text style={styles.brandName} numberOfLines={1}>{shipment.brandName}</Text>

          {/* Ürün adı */}
          {firstProduct?.name ? (
            <Text style={styles.productName} numberOfLines={2}>{firstProduct.name}</Text>
          ) : null}

          {/* Metadata */}
          <Text style={styles.meta} numberOfLines={1}>
            {shipment.carrier !== 'unknown' ? `${shipment.carrier.toUpperCase()} · ` : ''}
            {shipment.estimatedDelivery
              ? `Tahmini: ${shipment.estimatedDelivery}`
              : shipment.lastLocation || `Sipariş: ${formatDateShort(shipment.createdAt)}`}
          </Text>
        </View>

        {/* Sağ ok */}
        <Ionicons name="chevron-forward" size={16} color={Colors.text4} style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.surface1,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    marginBottom: 8,
    position: 'relative',
  },
  cardDelivered: {
    opacity: 0.75,
  },
  strip: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    zIndex: 2,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    gap: 12,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: Colors.surface3,
  },
  thumbLogo: {
    borderRadius: 26,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    marginBottom: 1,
  },
  statusEmoji: {
    fontSize: 11,
  },
  statusText: {
    fontFamily: Fonts.ui,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  brandName: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.rose3,
    letterSpacing: 0.1,
  },
  productName: {
    fontFamily: Fonts.uiLight,
    fontSize: 13,
    color: Colors.text1,
    lineHeight: 17,
  },
  meta: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
  },
  chevron: {
    marginLeft: 4,
  },
});
