import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { MOCK_SHIPMENTS } from '../../constants/MockData';
import { ShipmentCard } from '../../components/ShipmentCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Shipment, ShipmentStatus } from '../../types';

const STATUS_FILTERS: { label: string; value: ShipmentStatus | 'all' }[] = [
  { label: 'Tümü', value: 'all' },
  { label: 'Yolda', value: 'in_transit' },
  { label: 'Dağıtımda', value: 'out_for_delivery' },
  { label: 'Teslim', value: 'delivered' },
  { label: 'İşlemde', value: 'processing' },
];

function ConnectMailModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);

  const providers = [
    { name: 'Gmail', icon: 'mail', color: '#EA4335' },
    { name: 'Outlook', icon: 'mail-open', color: '#0078D4' },
    { name: 'Yahoo Mail', icon: 'mail-unread', color: '#6001D2' },
    { name: 'iCloud Mail', icon: 'logo-apple', color: Colors.text2 },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={cStyles.sheet}>
          <LinearGradient
            colors={[Colors.surface2, Colors.surface1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={cStyles.handle} />

          {step === 0 && (
            <>
              <View style={cStyles.iconContainer}>
                <LinearGradient
                  colors={[Colors.gold2, Colors.gold4]}
                  style={cStyles.bigIcon}
                >
                  <Ionicons name="mail" size={32} color={Colors.bg} />
                </LinearGradient>
              </View>
              <Text style={cStyles.title}>Kargo Takibini Otomatikleştir</Text>
              <Text style={cStyles.subtitle}>
                E-postanı bağla, kargo bilgilerini otomatik olarak BOUTIQ'e çek.
                Yalnızca kargo e-postaları okunur, başka hiçbir şeye erişilmez.
              </Text>

              <View style={cStyles.permissions}>
                {[
                  { icon: 'checkmark-circle', text: 'Sadece kargo e-postaları okunur', ok: true },
                  { icon: 'close-circle', text: 'Kişisel e-postalara erişilmez', ok: false },
                  { icon: 'close-circle', text: 'Hiçbir veri satılmaz veya paylaşılmaz', ok: false },
                  { icon: 'checkmark-circle', text: 'İstediğin zaman bağlantıyı kesebilirsin', ok: true },
                ].map((item, i) => (
                  <View key={i} style={cStyles.permissionItem}>
                    <Ionicons
                      name={item.icon as any}
                      size={16}
                      color={item.ok ? Colors.success : Colors.error}
                    />
                    <Text style={cStyles.permissionText}>{item.text}</Text>
                  </View>
                ))}
              </View>

              <Button
                label="E-posta Bağla"
                onPress={() => setStep(1)}
                variant="primary"
                size="xl"
                style={cStyles.cta}
                icon={<Ionicons name="arrow-forward" size={18} color={Colors.bg} />}
                iconPosition="right"
              />
            </>
          )}

          {step === 1 && (
            <>
              <Text style={cStyles.title}>Hangi hesabı bağlamak{'\n'}istiyorsun?</Text>
              <Text style={cStyles.subtitle}>Güvenli OAuth ile bağlan.</Text>

              <View style={cStyles.providers}>
                {providers.map((p) => (
                  <TouchableOpacity
                    key={p.name}
                    style={cStyles.providerBtn}
                    onPress={() => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setStep(2);
                    }}
                  >
                    <View style={[cStyles.providerIcon, { backgroundColor: `${p.color}20` }]}>
                      <Ionicons name={p.icon as any} size={22} color={p.color} />
                    </View>
                    <Text style={cStyles.providerName}>{p.name}</Text>
                    <Ionicons name="chevron-forward" size={16} color={Colors.text4} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {step === 2 && (
            <>
              <View style={cStyles.successIcon}>
                <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
              </View>
              <Text style={cStyles.title}>Bağlantı Kuruldu!</Text>
              <Text style={cStyles.subtitle}>
                Kargo e-postaların otomatik olarak takip edilecek.
                İlk güncelleme birkaç dakika içinde görünecek.
              </Text>
              <Button label="Harika!" onPress={onClose} variant="primary" size="xl" style={cStyles.cta} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const cStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 52,
    borderWidth: 1,
    borderColor: Colors.border2,
    overflow: 'hidden',
    position: 'relative',
    borderBottomWidth: 0,
  },
  handle: {
    width: 40, height: 4, backgroundColor: Colors.border3,
    borderRadius: 2, alignSelf: 'center', marginBottom: 28,
  },
  iconContainer: { alignItems: 'center', marginBottom: 20 },
  bigIcon: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  successIcon: { alignItems: 'center', marginBottom: 20 },
  title: {
    fontSize: 26, fontWeight: '800', color: Colors.text1,
    letterSpacing: -0.8, marginBottom: 10, lineHeight: 32,
  },
  subtitle: { fontSize: 14, color: Colors.text3, lineHeight: 21, marginBottom: 24 },
  permissions: { gap: 10, marginBottom: 28 },
  permissionItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  permissionText: { fontSize: 14, color: Colors.text2, fontWeight: '500' },
  cta: {},
  providers: { gap: 10 },
  providerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.surface3, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border2,
  },
  providerIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  providerName: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.text1 },
});

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const [shipments] = useState(MOCK_SHIPMENTS);
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'all'>('all');
  const [showMailModal, setShowMailModal] = useState(false);
  const [mailConnected] = useState(false);

  const filtered = statusFilter === 'all'
    ? shipments
    : shipments.filter((s) => s.status === statusFilter);

  const active = shipments.filter((s) => !['delivered', 'returned'].includes(s.status));
  const delivered = shipments.filter((s) => s.status === 'delivered');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bgGlow} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>LOJİSTİK</Text>
          <Text style={styles.headerTitle}>Kargo Takip</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowMailModal(true)}
          style={[styles.mailBtn, mailConnected && styles.mailBtnConnected]}
        >
          <Ionicons name="mail" size={16} color={mailConnected ? Colors.success : Colors.gold3} />
          <Text style={[styles.mailBtnText, mailConnected && { color: Colors.success }]}>
            {mailConnected ? 'Bağlı' : 'Mail Bağla'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.summaryScroll}
      >
        <View style={styles.summaryCard}>
          <LinearGradient
            colors={[Colors.surface3, Colors.surface2]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.summaryIcon, { backgroundColor: Colors.goldGlow }]}>
            <Ionicons name="bicycle" size={20} color={Colors.gold3} />
          </View>
          <Text style={styles.summaryNum}>{active.length}</Text>
          <Text style={styles.summaryLabel}>Aktif Sipariş</Text>
        </View>

        <View style={styles.summaryCard}>
          <LinearGradient
            colors={[Colors.surface3, Colors.surface2]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.summaryIcon, { backgroundColor: Colors.successGlow }]}>
            <Ionicons name="checkmark-done-circle" size={20} color={Colors.success} />
          </View>
          <Text style={styles.summaryNum}>{delivered.length}</Text>
          <Text style={styles.summaryLabel}>Teslim Edildi</Text>
        </View>

        <View style={styles.summaryCard}>
          <LinearGradient
            colors={[Colors.surface3, Colors.surface2]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.summaryIcon, { backgroundColor: Colors.purpleGlow }]}>
            <Ionicons name="cash" size={20} color={Colors.purple3} />
          </View>
          <Text style={styles.summaryNum}>
            ₺{shipments.reduce((a, s) => a + s.totalAmount, 0).toLocaleString('tr-TR')}
          </Text>
          <Text style={styles.summaryLabel}>Toplam Harcama</Text>
        </View>
      </ScrollView>

      {/* Status filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {STATUS_FILTERS.map((f) => {
          const count = f.value === 'all'
            ? shipments.length
            : shipments.filter((s) => s.status === f.value).length;
          const active = statusFilter === f.value;

          return (
            <TouchableOpacity
              key={f.value}
              onPress={() => {
                Haptics.selectionAsync();
                setStatusFilter(f.value);
              }}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              {active && (
                <LinearGradient
                  colors={[Colors.gold2, Colors.gold4]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                  <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Shipments */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Sipariş bulunamadı</Text>
            <Text style={styles.emptySubtitle}>
              Bu kategoride sipariş yok.
            </Text>
          </View>
        ) : (
          filtered.map((s) => <ShipmentCard key={s.id} shipment={s} />)
        )}

        {/* Connect mail CTA */}
        {!mailConnected && (
          <TouchableOpacity
            style={styles.mailCta}
            onPress={() => setShowMailModal(true)}
          >
            <LinearGradient
              colors={[Colors.surface3, Colors.surface2]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.mailCtaIcon}>
              <Ionicons name="mail" size={24} color={Colors.gold3} />
            </View>
            <View style={styles.mailCtaText}>
              <Text style={styles.mailCtaTitle}>E-posta Bağla</Text>
              <Text style={styles.mailCtaSubtitle}>
                Tüm kargo bilgilerini otomatik çek
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.text4} />
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <ConnectMailModal
        visible={showMailModal}
        onClose={() => setShowMailModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  bgGlow: {
    position: 'absolute',
    top: 200,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.successGlow,
    opacity: 0.35,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerLabel: {
    fontSize: 10, fontWeight: '700',
    color: Colors.gold3, letterSpacing: 2, marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26, fontWeight: '800', color: Colors.text1, letterSpacing: -1,
  },
  mailBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, backgroundColor: Colors.glassGold,
    borderWidth: 1, borderColor: Colors.borderGold,
    marginTop: 4,
  },
  mailBtnConnected: {
    backgroundColor: Colors.successGlow,
    borderColor: `${Colors.success}40`,
  },
  mailBtnText: {
    fontSize: 13, fontWeight: '700', color: Colors.gold3,
  },
  summaryScroll: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    width: 120, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border1,
    overflow: 'hidden', gap: 8,
  },
  summaryIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryNum: {
    fontSize: 20, fontWeight: '800',
    color: Colors.text1, letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 11, fontWeight: '600',
    color: Colors.text4, letterSpacing: 0.3,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 50, backgroundColor: Colors.surface2,
    borderWidth: 1, borderColor: Colors.border2, overflow: 'hidden',
  },
  filterChipActive: { borderColor: Colors.gold3 },
  filterLabel: { fontSize: 13, fontWeight: '600', color: Colors.text3 },
  filterLabelActive: { color: Colors.bg, fontWeight: '700' },
  filterBadge: {
    backgroundColor: Colors.surface4,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  filterBadgeActive: { backgroundColor: 'rgba(7,7,15,0.30)' },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.text4 },
  filterBadgeTextActive: { color: Colors.bg },
  scrollContent: { paddingHorizontal: 16 },
  emptyState: {
    alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 10,
  },
  emptyIcon: { fontSize: 52, marginBottom: 8 },
  emptyTitle: {
    fontSize: 20, fontWeight: '700', color: Colors.text2,
    textAlign: 'center', letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 14, color: Colors.text4, textAlign: 'center', lineHeight: 20,
  },
  mailCta: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 20, padding: 18, borderWidth: 1,
    borderColor: Colors.borderGold, overflow: 'hidden',
    position: 'relative', marginTop: 8,
  },
  mailCtaIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.glassGold, alignItems: 'center', justifyContent: 'center',
  },
  mailCtaText: { flex: 1 },
  mailCtaTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.text1,
    letterSpacing: -0.3, marginBottom: 2,
  },
  mailCtaSubtitle: { fontSize: 12, color: Colors.text4 },
});
