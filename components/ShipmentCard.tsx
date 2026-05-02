import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Typography';
import { Shipment, ShipmentStatus } from '../types';

const STATUS_CONFIG: Record<ShipmentStatus, { label: string; color: string; icon: string; step: number }> = {
  ordered: { label: 'Henüz Kargoya Verilmedi', color: Colors.purple3, icon: 'checkmark-circle', step: 1 },
  processing: { label: 'Hazırlanıyor', color: Colors.gold3, icon: 'cube', step: 2 },
  shipped: { label: 'Kargoya Verildi', color: Colors.gold3, icon: 'archive', step: 3 },
  in_transit: { label: 'Yolda', color: Colors.info, icon: 'git-branch', step: 4 },
  out_for_delivery: { label: 'Dağıtımda', color: Colors.success, icon: 'bicycle', step: 5 },
  delivered: { label: 'Teslim Edildi', color: Colors.success, icon: 'checkmark-done-circle', step: 6 },
  returned: { label: 'İade', color: Colors.error, icon: 'return-down-back', step: 0 },
};

interface ShipmentCardProps {
  shipment: Shipment;
}

export function ShipmentCard({ shipment }: ShipmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[shipment.status];

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => !prev);
  };

  const isDelivered = shipment.status === 'delivered';

  return (
    <View style={[styles.card, isDelivered && styles.cardDelivered]}>
      {/* Status glow line */}
      <View style={[styles.statusLine, { backgroundColor: config.color }]} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandInfo}>
          <Image source={{ uri: shipment.brandLogo }} style={styles.logo} />
          <View>
            <Text style={styles.brandName}>{shipment.brandName}</Text>
            <Text style={styles.orderNum}>#{shipment.orderNumber}</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: `${config.color}20`, borderColor: `${config.color}40` }]}>
          <Ionicons name={config.icon as any} size={12} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>

      {/* Products preview */}
      <View style={styles.productsRow}>
        {shipment.products.slice(0, 3).map((p, i) => (
          <Image
            key={i}
            source={{ uri: p.image }}
            style={[styles.productThumb, { marginLeft: i > 0 ? -8 : 0, zIndex: 3 - i }]}
          />
        ))}
        {shipment.products.length > 3 && (
          <View style={styles.moreProducts}>
            <Text style={styles.moreText}>+{shipment.products.length - 3}</Text>
          </View>
        )}
        <View style={styles.productMeta}>
          <Text style={styles.productName} numberOfLines={1}>
            {shipment.products[0].name}
          </Text>
          {shipment.products.length > 1 && (
            <Text style={styles.moreProductsText}>
              +{shipment.products.length - 1} ürün daha
            </Text>
          )}
        </View>
      </View>

      {/* Progress bar */}
      {!isDelivered && shipment.status !== 'returned' && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            {[1, 2, 3, 4, 5].map((step) => (
              <React.Fragment key={step}>
                <View
                  style={[
                    styles.progressDot,
                    step <= config.step && styles.progressDotActive,
                    step <= config.step && { backgroundColor: config.color },
                  ]}
                />
                {step < 5 && (
                  <View
                    style={[
                      styles.progressLine,
                      step < config.step && styles.progressLineActive,
                      step < config.step && { backgroundColor: config.color },
                    ]}
                  />
                )}
              </React.Fragment>
            ))}
          </View>
          <View style={styles.progressLabels}>
            {['Alındı', 'Hazır', 'Kargo', 'Yolda', 'Teslim'].map((l, i) => (
              <Text
                key={i}
                style={[styles.progressLabel, i + 1 <= config.step && { color: config.color }]}
              >
                {l}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* ETA or delivery info */}
      <View style={styles.etaRow}>
        <Ionicons
          name={isDelivered ? 'checkmark-circle' : 'time-outline'}
          size={14}
          color={isDelivered ? Colors.success : Colors.text3}
        />
        <Text style={[styles.etaText, isDelivered && { color: Colors.success }]}>
          {shipment.estimatedDelivery}
        </Text>
        <Text style={styles.carrierText}> · {shipment.carrier}</Text>
      </View>

      {/* Expand/collapse events */}
      <TouchableOpacity style={styles.expandBtn} onPress={toggle}>
        <Text style={styles.expandText}>
          {expanded ? 'Gizle' : 'Kargo geçmişi'}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={Colors.text4}
        />
      </TouchableOpacity>

      {/* Event timeline */}
      {expanded && (
        <View style={styles.events}>
          {shipment.events.map((event, i) => {
            const evConfig = STATUS_CONFIG[event.status];
            return (
              <View key={event.id} style={styles.event}>
                <View style={styles.eventLeft}>
                  <View style={[styles.eventDot, { backgroundColor: i === 0 ? evConfig.color : Colors.surface4 }]} />
                  {i < shipment.events.length - 1 && <View style={styles.eventLine} />}
                </View>
                <View style={styles.eventRight}>
                  <Text style={[styles.eventDesc, i === 0 && { color: Colors.text1 }]}>
                    {event.description}
                  </Text>
                  <Text style={styles.eventLocation}>{event.location}</Text>
                  <Text style={styles.eventTime}>{event.timestamp}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface2,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cardDelivered: {
    borderColor: `${Colors.success}30`,
  },
  statusLine: {
    height: 3,
    width: '100%',
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
  },
  brandInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  brandName: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: Colors.text1,
    letterSpacing: -0.2,
  },
  orderNum: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  productsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 0,
  },
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.surface3,
    borderWidth: 2,
    borderColor: Colors.surface2,
  },
  moreProducts: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
    zIndex: 0,
    borderWidth: 2,
    borderColor: Colors.surface2,
  },
  moreText: {
    fontSize: 11,
    color: Colors.text3,
    fontWeight: '700',
  },
  productMeta: {
    flex: 1,
    marginLeft: 10,
  },
  productName: {
    fontSize: 13,
    color: Colors.text2,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  moreProductsText: {
    fontSize: 11,
    color: Colors.text4,
    marginTop: 2,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surface4,
  },
  progressDotActive: {},
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.surface4,
  },
  progressLineActive: {},
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressLabel: {
    fontSize: 9,
    color: Colors.text5,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 5,
  },
  etaText: {
    fontSize: 13,
    color: Colors.text3,
    fontWeight: '600',
  },
  carrierText: {
    fontSize: 12,
    color: Colors.text4,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
    gap: 6,
  },
  expandText: {
    fontSize: 12,
    color: Colors.text4,
    fontWeight: '500',
  },
  events: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border1,
  },
  event: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 60,
  },
  eventLeft: {
    alignItems: 'center',
    width: 16,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },
  eventLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.surface4,
    marginTop: 4,
    marginBottom: 4,
  },
  eventRight: {
    flex: 1,
    paddingBottom: 12,
  },
  eventDesc: {
    fontSize: 13,
    color: Colors.text3,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  eventLocation: {
    fontSize: 12,
    color: Colors.text4,
    marginTop: 2,
  },
  eventTime: {
    fontSize: 11,
    color: Colors.text5,
    marginTop: 2,
  },
});
