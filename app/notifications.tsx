import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { useNotifications } from '@/hooks/useNotifications';

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  campaign:    { icon: 'megaphone',     color: Colors.gold3,    bg: Colors.glassGold },
  shipment:    { icon: 'bicycle',       color: Colors.success,  bg: Colors.successGlow },
  newArrival:  { icon: 'sparkles',      color: Colors.purple3,  bg: Colors.purpleGlow },
  priceDrop:   { icon: 'trending-down', color: Colors.rose3,    bg: Colors.roseGlow },
  system:      { icon: 'information-circle', color: Colors.info, bg: 'rgba(59,130,246,0.12)' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Az önce';
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}sa önce`;
  return `${Math.floor(h / 24)}g önce`;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { data: notifications = [], markRead, markAllRead, unreadCount } = useNotifications();

  const handlePress = (n: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!n.isRead && n.id && !n.id.startsWith('n')) {
      markRead.mutate(n.id);
    }
    if (n.type === 'shipment') router.push('/(tabs)/tracking' as any);
    else if (n.type === 'campaign') router.push('/(tabs)/' as any);
    else router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.surface3, Colors.bg]} style={StyleSheet.absoluteFill} locations={[0, 0.25]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text3} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => markAllRead.mutate()} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Tümünü oku</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
          <Text style={styles.emptySub}>Kampanyalar, kargo güncellemeleri ve fiyat düşüşleri burada görünecek.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {notifications.map((n: any) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
            return (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, !n.isRead && styles.cardUnread]}
                onPress={() => handlePress(n)}
                activeOpacity={0.8}
              >
                {!n.isRead && <View style={styles.unreadDot} />}
                <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon as any} size={20} color={cfg.color} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    {n.brandLogo && (
                      <Image source={{ uri: n.brandLogo }} style={styles.brandLogo} />
                    )}
                    <Text style={styles.cardTitle} numberOfLines={1}>{n.title}</Text>
                  </View>
                  <Text style={styles.cardText} numberOfLines={2}>{n.body}</Text>
                  <Text style={styles.cardTime}>{timeAgo(n.createdAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={Colors.text5} />
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8, gap: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border2 },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  unreadBadge: { backgroundColor: Colors.rose3, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  unreadCount: { fontSize: 11, fontWeight: '800', color: '#fff' },
  markAllBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  markAllText: { fontSize: 13, color: Colors.gold3, fontWeight: '600' },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text2 },
  emptySub: { fontSize: 14, color: Colors.text4, textAlign: 'center', lineHeight: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface2, borderRadius: 18,
    borderWidth: 1, borderColor: Colors.border1,
    padding: 14, marginBottom: 8, position: 'relative',
  },
  cardUnread: { borderColor: Colors.borderGold, backgroundColor: Colors.glassGold },
  unreadDot: {
    position: 'absolute', top: 14, left: 10,
    width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.rose3,
  },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  brandLogo: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.surface3 },
  cardBody: { flex: 1, gap: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text1, flex: 1 },
  cardText: { fontSize: 13, color: Colors.text3, lineHeight: 18 },
  cardTime: { fontSize: 11, color: Colors.text5, marginTop: 2 },
});
