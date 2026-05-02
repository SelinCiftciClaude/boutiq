import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useNotificationPrefs } from '@/hooks/useWatchList';

const DISCOUNT_OPTIONS = [
  { label: 'Tüm fiyat değişimleri', value: 0 },
  { label: '%10+ indirimler', value: 10 },
  { label: '%20+ indirimler', value: 20 },
  { label: '%30+ indirimler', value: 30 },
];

const LIMIT_OPTIONS = [
  { label: 'Günde 3', value: 3 },
  { label: 'Günde 5', value: 5 },
  { label: 'Günde 10', value: 10 },
  { label: 'Sınırsız', value: 999 },
];

export default function NotificationPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { data: prefs, update } = useNotificationPrefs();

  const [pushEnabled, setPushEnabled]   = useState(true);
  const [quietEnabled, setQuietEnabled] = useState(true);
  const [minDiscount, setMinDiscount]   = useState(0);
  const [dailyLimit, setDailyLimit]     = useState(5);

  useEffect(() => {
    if (!prefs) return;
    setPushEnabled(prefs.pushEnabled);
    setQuietEnabled(prefs.quietHoursEnabled);
    setMinDiscount(prefs.minDiscountPct);
    setDailyLimit(prefs.dailyLimit);
  }, [prefs?.userId]);

  const save = (patch: Parameters<typeof update.mutate>[0]) => {
    Haptics.selectionAsync();
    update.mutate(patch);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bildirim Ayarları</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Push bildirimler */}
        <Section title="Kanal">
          <SettingRow
            icon="notifications-outline"
            title="Push Bildirimleri"
            subtitle="Anlık fiyat ve stok uyarıları"
            value={pushEnabled}
            onChange={(v) => { setPushEnabled(v); save({ pushEnabled: v }); }}
          />
        </Section>

        {/* Sessiz saatler */}
        <Section title="Sessiz Saatler">
          <SettingRow
            icon="moon-outline"
            title="Sessiz Modu"
            subtitle="22:00 – 09:00 arası bildirim gönderme"
            value={quietEnabled}
            onChange={(v) => { setQuietEnabled(v); save({ quietHoursEnabled: v }); }}
          />
        </Section>

        {/* Minimum indirim */}
        <Section title="Hangi indirimleri bildireyim?">
          {DISCOUNT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={styles.selectRow}
              onPress={() => { setMinDiscount(opt.value); save({ minDiscountPct: opt.value }); }}
            >
              <Text style={styles.selectLabel}>{opt.label}</Text>
              {minDiscount === opt.value && (
                <Ionicons name="checkmark" size={18} color={Colors.rose3} />
              )}
            </TouchableOpacity>
          ))}
        </Section>

        {/* Günlük limit */}
        <Section title="Günlük bildirim limiti">
          {LIMIT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={styles.selectRow}
              onPress={() => { setDailyLimit(opt.value); save({ dailyLimit: opt.value }); }}
            >
              <Text style={styles.selectLabel}>{opt.label}</Text>
              {dailyLimit === opt.value && (
                <Ionicons name="checkmark" size={18} color={Colors.rose3} />
              )}
            </TouchableOpacity>
          ))}
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionGroup}>{children}</View>
    </View>
  );
}

function SettingRow({ icon, title, subtitle, value, onChange }: {
  icon: string; title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: Colors.roseGlow }]}>
        <Ionicons name={icon as any} size={18} color={Colors.rose3} />
      </View>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={value ? Colors.rose3 : Colors.text4}
        trackColor={{ false: Colors.surface4, true: Colors.roseGlow }}
        ios_backgroundColor={Colors.surface4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: Colors.border2,
  },
  headerTitle: { fontFamily: Fonts.editorial, fontSize: 22, color: Colors.text1 },

  content: { paddingHorizontal: 16 },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontFamily: Fonts.uiMedium, fontSize: 10, letterSpacing: 2,
    color: Colors.text4, textTransform: 'uppercase', marginBottom: 8,
  },
  sectionGroup: {
    backgroundColor: Colors.surface2, borderRadius: 14,
    borderWidth: 0.5, borderColor: Colors.border1, overflow: 'hidden',
  },

  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderBottomWidth: 0.5, borderBottomColor: Colors.border1,
  },
  settingIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  settingText: { flex: 1 },
  settingTitle: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1 },
  settingSubtitle: { fontFamily: Fonts.uiLight, fontSize: 12, color: Colors.text4, marginTop: 1 },

  selectRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderBottomWidth: 0.5, borderBottomColor: Colors.border1,
  },
  selectLabel: { fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text1 },
});
