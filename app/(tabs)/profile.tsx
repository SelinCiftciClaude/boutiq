import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Alert, Dimensions, Modal, TextInput,
  Animated, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { useInterests } from '@/context/InterestsContext';
import {
  useProfileDashboard, useDismissLiveEvent,
  type ProfileLiveEvent,
} from '@/hooks/useProfileDashboard';

const { width } = Dimensions.get('window');
const CARD_W = (width - 32 - 10) / 2; // 2 kolon, 16px kenar + 10px gap

// ── Yardımcı: baş harf üret ──────────────────────────────────────────────────

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

// ── Yardımcı: canlı event renk yapılandırması ─────────────────────────────────

const EVENT_CONFIG: Record<string, { label: string; accentColor: string; icon: string; bg: string }> = {
  priceDrop:  { label: 'FİYAT DÜŞTÜ',       accentColor: Colors.success,  icon: 'trending-down', bg: Colors.successGlow },
  shipment:   { label: 'KARGO GÜNCELLEMESİ', accentColor: Colors.warning,  icon: 'cube-outline',  bg: 'rgba(176,122,16,0.08)' },
  newArrival: { label: 'YENİ ÜRÜN',          accentColor: Colors.rose3,    icon: 'sparkles',      bg: Colors.roseGlow },
  campaign:   { label: 'KAMPANYA',           accentColor: Colors.gold2,    icon: 'megaphone',     bg: Colors.goldGlow },
  system:     { label: 'BİLDİRİM',           accentColor: Colors.teal2,    icon: 'information-circle', bg: Colors.tealGlow },
};

// ── 1. Header ─────────────────────────────────────────────────────────────────

function Header({ unreadCount }: { unreadCount: number }) {
  return (
    <View style={h.wrap}>
      <Text style={h.title}>Profil</Text>
      <View style={h.actions}>
        <TouchableOpacity
          style={h.iconBtn}
          onPress={() => router.push('/notifications' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="notifications-outline" size={20} color={Colors.text2} />
          {unreadCount > 0 && <View style={h.dot} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={h.iconBtn}
          onPress={() => router.push('/account-settings' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="settings-outline" size={20} color={Colors.text2} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const h = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontFamily: Fonts.displayBold, fontSize: 22, color: Colors.rose3, letterSpacing: -0.3 },
  actions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.goldGlow,
    borderWidth: 1, borderColor: Colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  dot: {
    position: 'absolute', top: 6, right: 6,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: Colors.error,
    borderWidth: 1.5, borderColor: Colors.bg,
  },
});

// ── 2. Kimlik Kartı ───────────────────────────────────────────────────────────

function IdentityCard({ name, city, monthsOnButika, styleTags }: {
  name: string; city?: string; monthsOnButika: number; styleTags: string[];
}) {
  const initials = getInitials(name || 'B');
  const meta = [
    city,
    `${monthsOnButika} aydır Butika'da`,
  ].filter(Boolean).join(' · ');

  return (
    <View style={id.card}>
      {/* Avatar */}
      <LinearGradient colors={[Colors.rose5, Colors.rose3]} style={id.avatar}>
        <Text style={id.avatarText}>{initials}</Text>
      </LinearGradient>

      {/* Bilgi */}
      <View style={{ flex: 1 }}>
        <TouchableOpacity activeOpacity={0.8}>
          <Text style={id.name} numberOfLines={1}>{name || 'Butika Kullanıcısı'}</Text>
        </TouchableOpacity>
        <Text style={id.meta}>{meta}</Text>

        {/* Tarz etiketleri */}
        <View style={id.tagRow}>
          {styleTags.length > 0
            ? styleTags.slice(0, 3).map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={id.tag}
                  onPress={() => router.push('/style-preferences' as any)}
                >
                  <Text style={id.tagText}>{tag}</Text>
                </TouchableOpacity>
              ))
            : (
              <TouchableOpacity
                style={[id.tag, id.tagCta]}
                onPress={() => router.push('/style-preferences' as any)}
              >
                <Text style={[id.tagText, id.tagCtaText]}>Tarzını seç →</Text>
              </TouchableOpacity>
            )
          }
        </View>
      </View>
    </View>
  );
}

const id = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.surface1,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    padding: 14,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontFamily: Fonts.displayBold, fontSize: 24, color: '#FFF9EE' },
  name: { fontFamily: Fonts.displayBold, fontSize: 20, color: Colors.text1, letterSpacing: -0.3 },
  meta: { fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4, marginTop: 2, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  tag: {
    backgroundColor: Colors.roseGlow,
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 0.5, borderColor: Colors.borderBurgund,
  },
  tagText: { fontFamily: Fonts.uiMedium, fontSize: 10, color: Colors.rose3 },
  tagCta: { backgroundColor: Colors.goldGlow, borderColor: Colors.borderGold },
  tagCtaText: { color: Colors.gold2 },
});

// ── 3. Bu Ay Insight Kartı ────────────────────────────────────────────────────

function BuAyCard({ insights }: { insights: { headline: string; discountCount: number; notifCount: number; newBrandsCount: number } }) {
  return (
    <View style={ba.card}>
      {/* Başlık */}
      <View style={ba.labelRow}>
        <View style={ba.labelDot} />
        <Text style={ba.label}>BU AY</Text>
      </View>

      {/* Headline */}
      <Text style={ba.headline}>{insights.headline}</Text>

      {/* 3 metrik */}
      <View style={ba.metricsRow}>
        <View style={ba.metric}>
          <Text style={ba.metricNum}>{insights.discountCount}</Text>
          <Text style={ba.metricLabel}>{'İNDİRİM\nYAKALADIN'}</Text>
        </View>
        <View style={ba.metricDivider} />
        <View style={ba.metric}>
          <Text style={ba.metricNum}>{insights.notifCount}</Text>
          <Text style={ba.metricLabel}>{'BİLDİRİM\nALDIN'}</Text>
        </View>
        <View style={ba.metricDivider} />
        <View style={ba.metric}>
          <Text style={ba.metricNum}>{insights.newBrandsCount}</Text>
          <Text style={ba.metricLabel}>{'YENİ\nBUTİK'}</Text>
        </View>
      </View>
    </View>
  );
}

const ba = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: Colors.surface1,
    borderRadius: 16, borderWidth: 0.5, borderColor: Colors.border2,
    padding: 14,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  labelDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.gold3 },
  label: { fontFamily: Fonts.uiMedium, fontSize: 10, color: Colors.gold2, letterSpacing: 1.5 },
  headline: {
    fontFamily: Fonts.displayBold, fontSize: 17, color: Colors.text1,
    lineHeight: 23, marginBottom: 12, letterSpacing: -0.2,
  },
  metricsRow: { flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1, alignItems: 'center', gap: 4 },
  metricNum: { fontFamily: Fonts.displayBold, fontSize: 22, color: Colors.text1, letterSpacing: -0.3 },
  metricLabel: {
    fontFamily: Fonts.uiLight, fontSize: 9, color: Colors.text4,
    letterSpacing: 0.5, textAlign: 'center', lineHeight: 13,
  },
  metricDivider: {
    width: 0, height: 32,
    borderLeftWidth: 1, borderColor: Colors.border2,
    borderStyle: 'dashed',
  },
});

// ── 4. Canlı Bildirim Kartı ───────────────────────────────────────────────────

function LiveEventCard({ event, onDismiss }: { event: ProfileLiveEvent; onDismiss: () => void }) {
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.system;

  return (
    <TouchableOpacity
      style={[lv.card, { borderLeftColor: cfg.accentColor, backgroundColor: cfg.bg }]}
      onPress={() => router.push('/notifications' as any)}
      activeOpacity={0.85}
    >
      {/* Sol accent çizgisi görevi borderLeftWidth ile yapıldı */}
      <View style={{ flex: 1 }}>
        <Text style={[lv.eventLabel, { color: cfg.accentColor }]}>
          {cfg.label}
        </Text>
        <Text style={lv.title} numberOfLines={1}>{event.title}</Text>
        <Text style={lv.body} numberOfLines={1}>{event.body}</Text>
      </View>

      <View style={lv.right}>
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={lv.closeBtn}
        >
          <Ionicons name="close" size={14} color={Colors.text4} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={Colors.text4} style={{ marginTop: 8 }} />
      </View>
    </TouchableOpacity>
  );
}

const lv = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border2,
    borderLeftWidth: 3, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  eventLabel: { fontFamily: Fonts.uiMedium, fontSize: 10, letterSpacing: 0.8, marginBottom: 3 },
  title: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.text1 },
  body: { fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4, marginTop: 1 },
  right: { alignItems: 'flex-end', justifyContent: 'space-between' },
  closeBtn: { padding: 2 },
});

// ── 5. Kısayol Kartı ──────────────────────────────────────────────────────────

function ShortcutCard({ icon, count, title, subtitle, onPress, hasAlert }: {
  icon: string; count: number; title: string; subtitle: string;
  onPress: () => void; hasAlert?: boolean;
}) {
  return (
    <TouchableOpacity style={[sc.card, hasAlert && sc.cardAlert]} onPress={onPress} activeOpacity={0.82}>
      {hasAlert && <View style={sc.alertDot} />}
      <View style={sc.topRow}>
        <View style={sc.iconWrap}>
          <Ionicons name={icon as any} size={16} color={Colors.rose4} />
        </View>
        <Text style={sc.count}>{count}</Text>
      </View>
      <Text style={sc.title}>{title}</Text>
      <View style={sc.subtitleRow}>
        <Text style={[sc.subtitle, hasAlert && sc.subtitleAlert]} numberOfLines={1}>{subtitle}</Text>
        <Text style={[sc.chevron, hasAlert && sc.subtitleAlert]}> ›</Text>
      </View>
    </TouchableOpacity>
  );
}

const sc = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: Colors.surface1,
    borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border2,
    padding: 13,
  },
  cardAlert: { borderColor: 'rgba(176,122,16,0.35)' },
  alertDot: {
    position: 'absolute', top: 10, right: 10,
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: Colors.warning,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  iconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(176,80,96,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  count: { fontFamily: Fonts.displayBold, fontSize: 22, color: Colors.text1, letterSpacing: -0.3 },
  title: { fontFamily: Fonts.uiMedium, fontSize: 12, color: Colors.text1, marginBottom: 4 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center' },
  subtitle: { fontFamily: Fonts.uiLight, fontSize: 10, color: Colors.rose3, flex: 1 },
  subtitleAlert: { color: Colors.warning },
  chevron: { fontFamily: Fonts.uiLight, fontSize: 12, color: Colors.rose3 },
});

// ── 6. Ayarlar Satırı ─────────────────────────────────────────────────────────

function SettingRow({ icon, title, subtitle, onPress }: {
  icon: string; title: string; subtitle: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={sr.row} onPress={onPress} activeOpacity={0.75}>
      <View style={sr.iconWrap}>
        <Ionicons name={icon as any} size={17} color={Colors.gold2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={sr.title}>{title}</Text>
        <Text style={sr.subtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.text4} />
    </TouchableOpacity>
  );
}

const sr = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: Colors.surface1,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border1,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.goldGlow,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  title: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.text1 },
  subtitle: { fontFamily: Fonts.uiLight, fontSize: 10, color: Colors.text3, marginTop: 1 },
});

// ── Bölüm başlığı ─────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={{
      fontFamily: Fonts.uiMedium,
      fontSize: 10,
      color: Colors.gold2,
      letterSpacing: 1.5,
      marginHorizontal: 16,
      marginBottom: 8,
      marginTop: 18,
    }}>
      {text}
    </Text>
  );
}

// ── Akıllı Asistan — bottom sheet ────────────────────────────────────────────

const QUICK_COMMANDS = [
  'Muun indirime girince bildir',
  'Selma Çilek yeni ürün eklerse haber ver',
  'Favorilerimin fiyatı düşünce bildir',
  'Hof Silk kampanya başlayınca bildir',
];

function SmartAssistantSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const screenH = Dimensions.get('window').height;
  const slideAnim = useRef(new Animated.Value(screenH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const [command, setCommand] = useState('');
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'done'>('idle');
  const [response, setResponse] = useState('');

  useCallback(() => {}, [])(); // silence lint

  React.useEffect(() => {
    if (visible) {
      setCommand(''); setPhase('idle'); setResponse('');
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: screenH, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSend = () => {
    if (!command.trim() || phase === 'thinking') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('thinking');
    setTimeout(() => {
      const lower = command.toLowerCase();
      let reply = '';
      if (lower.includes('indirim') || lower.includes('fiyat')) {
        reply = `"${command}" alarmı kuruldu. Fiyat değişikliği olduğunda seni hemen haberdar edeceğim.`;
      } else if (lower.includes('yeni ürün') || lower.includes('haber')) {
        reply = `"${command}" bildirimi oluşturuldu. Yeni ürün eklendiğinde bildirim gönderilecek.`;
      } else if (lower.includes('kampanya') || lower.includes('indirim')) {
        reply = `"${command}" kampanya alarmı aktif. Kampanya başladığında seni uyaracağım.`;
      } else {
        reply = `"${command}" komutu alındı. Bu özellik yakında tam olarak aktif olacak — şimdilik kaydettim.`;
      }
      setResponse(reply);
      setPhase('done');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1400);
  };

  const handleChip = (cmd: string) => {
    Haptics.selectionAsync();
    setCommand(cmd);
    setPhase('idle');
    setResponse('');
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[ai.backdrop, { opacity: backdropAnim }]} pointerEvents="auto">
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
        pointerEvents="box-none"
      >
        <Animated.View style={[ai.sheet, { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 20 }]}>
          <LinearGradient colors={[Colors.surface2, Colors.surface1]} style={StyleSheet.absoluteFill} />

          {/* Handle */}
          <View style={ai.handle} />

          {/* Başlık */}
          <View style={ai.header}>
            <View style={ai.headerIconWrap}>
              <Ionicons name="sparkles" size={18} color={Colors.rose3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ai.headerTitle}>Akıllı Asistan</Text>
              <Text style={ai.headerSub}>Komut gir veya aşağıdan seç</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={ai.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={19} color={Colors.text3} />
            </TouchableOpacity>
          </View>

          {/* Komut chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ai.chipScroll}
          >
            {QUICK_COMMANDS.map(cmd => (
              <TouchableOpacity
                key={cmd}
                style={[ai.chip, command === cmd && ai.chipActive]}
                onPress={() => handleChip(cmd)}
                activeOpacity={0.75}
              >
                <Text style={[ai.chipText, command === cmd && ai.chipTextActive]} numberOfLines={1}>
                  {cmd}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input */}
          <View style={ai.inputRow}>
            <TextInput
              style={ai.input}
              placeholder='"Muun indirime girince bildir..."'
              placeholderTextColor={Colors.text5}
              value={command}
              onChangeText={t => { setCommand(t); setPhase('idle'); setResponse(''); }}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              selectionColor={Colors.rose3}
              autoCorrect={false}
              multiline={false}
            />
            <TouchableOpacity
              style={[ai.sendBtn, (!command.trim() || phase === 'thinking') && ai.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!command.trim() || phase === 'thinking'}
            >
              {phase === 'thinking'
                ? <ActivityIndicator size="small" color={Colors.bg} />
                : <Ionicons name="arrow-up" size={17} color={Colors.bg} />
              }
            </TouchableOpacity>
          </View>

          {/* Yanıt alanı */}
          {phase !== 'idle' && (
            <View style={ai.responseWrap}>
              {phase === 'thinking' && (
                <View style={ai.thinkingRow}>
                  <View style={ai.thinkingDot} />
                  <View style={[ai.thinkingDot, { opacity: 0.6, marginHorizontal: 3 }]} />
                  <View style={[ai.thinkingDot, { opacity: 0.3 }]} />
                </View>
              )}
              {phase === 'done' && response && (
                <View style={ai.responseCard}>
                  <View style={ai.responseIconWrap}>
                    <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                  </View>
                  <Text style={ai.responseText}>{response}</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ai = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  sheet: {
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderWidth: 1, borderColor: Colors.border2, overflow: 'hidden',
    borderBottomWidth: 0,
  },
  handle: {
    width: 38, height: 4, backgroundColor: Colors.border3,
    borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, marginBottom: 14 },
  headerIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.roseGlow, borderWidth: 1, borderColor: Colors.borderBurgund,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: Fonts.displayBold, fontSize: 18, color: Colors.text1, letterSpacing: -0.3 },
  headerSub: { fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4, marginTop: 1 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surface3, alignItems: 'center', justifyContent: 'center',
  },
  chipScroll: { paddingHorizontal: 18, gap: 7, paddingBottom: 12 },
  chip: {
    backgroundColor: Colors.surface3, borderRadius: 20,
    paddingHorizontal: 13, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.border2,
    maxWidth: 220,
  },
  chipActive: { backgroundColor: Colors.roseGlow, borderColor: Colors.borderBurgund },
  chipText: { fontFamily: Fonts.uiLight, fontSize: 12, color: Colors.text3 },
  chipTextActive: { color: Colors.rose3, fontFamily: Fonts.uiMedium },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 18, marginBottom: 12,
  },
  input: {
    flex: 1, backgroundColor: Colors.surface3,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border3,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text1,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.rose3, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
  responseWrap: { marginHorizontal: 18, marginBottom: 4 },
  thinkingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  thinkingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.rose3 },
  responseCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 9,
    backgroundColor: Colors.successGlow, borderRadius: 12,
    padding: 12, borderWidth: 0.5, borderColor: `${Colors.success}30`,
  },
  responseIconWrap: { marginTop: 1, flexShrink: 0 },
  responseText: { fontFamily: Fonts.uiLight, fontSize: 13, color: Colors.text1, lineHeight: 19, flex: 1 },
});

// ── Akıllı Asistan — kart ─────────────────────────────────────────────────────

function SmartAssistantCard({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={asc.card} onPress={onPress} activeOpacity={0.88}>
      {/* Arka plan gradient */}
      <LinearGradient
        colors={[Colors.rose1, Colors.rose2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Krem ışıma (sağ üst) */}
      <View style={asc.glow} />

      {/* Sol içerik */}
      <View style={{ flex: 1 }}>
        <View style={asc.labelRow}>
          <Ionicons name="sparkles" size={13} color={Colors.gold4} />
          <Text style={asc.label}>AKILLI ASİSTAN</Text>
        </View>
        <Text style={asc.title}>İndirim alarmları kur,{'\n'}hızlı işlemler yap</Text>
        <View style={asc.cta}>
          <Text style={asc.ctaText}>Komut gir</Text>
          <Ionicons name="arrow-forward" size={13} color={Colors.rose5} />
        </View>
      </View>

      {/* Sağ ikon */}
      <View style={asc.iconCircle}>
        <Ionicons name="chatbubble-ellipses-outline" size={26} color={'rgba(250,246,232,0.9)'} />
      </View>
    </TouchableOpacity>
  );
}

const asc = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    // shadow iOS
    shadowColor: Colors.rose1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    // shadow Android
    elevation: 5,
  },
  glow: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(250,246,232,0.07)',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  label: { fontFamily: Fonts.uiMedium, fontSize: 10, color: Colors.gold4, letterSpacing: 1.2 },
  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 16,
    color: '#FFF9EE',
    letterSpacing: -0.2,
    lineHeight: 22,
    marginBottom: 10,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(250,246,232,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(250,246,232,0.25)',
  },
  ctaText: { fontFamily: Fonts.uiMedium, fontSize: 11, color: '#FFF9EE' },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(250,246,232,0.10)',
    borderWidth: 1, borderColor: 'rgba(250,246,232,0.20)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
});

// ── Ana Ekran ─────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets   = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { stylePreferences } = useInterests();
  const qc = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useProfileDashboard();
  const dismissEvent = useDismissLiveEvent();

  const [assistantVisible, setAssistantVisible] = useState(false);

  const handleSignOut = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Çıkış Yap',
      "Butika'dan çıkış yapmak istediğine emin misin?",
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            qc.clear();
          },
        },
      ],
    );
  }, [signOut, qc]);

  const { identity, insights, shortcuts, liveEvent } = data ?? {};

  // Kısayol alt yazıları (bağlam farkındalıklı)
  const brandSubtitle = !shortcuts ? '...' :
    shortcuts.brandCount === 0 ? 'İlk butiğini ekle' : 'Yönet & ekle';

  const favSubtitle = !shortcuts ? '...' :
    shortcuts.favoriteCount === 0 ? 'İlk favorini ekle' : 'Favorilerime git';

  const orderSubtitle = !shortcuts ? '...' :
    shortcuts.activeShipments > 0 ? `${shortcuts.activeShipments} kargon yolda` :
    'Sipariş geçmişim';

  const trackSubtitle = !shortcuts ? '...' :
    shortcuts.trackingCount === 0 ? 'İlk takibe al' : 'Fiyat alarmlarım';

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[Colors.surface1, Colors.bg]}
        locations={[0, 0.3]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.rose3}
          />
        }
        contentContainerStyle={s.scroll}
      >
        {/* ── Header ── */}
        <Header unreadCount={shortcuts?.unreadCount ?? 0} />

        {/* ── Kimlik Kartı ── */}
        {identity && (
          <IdentityCard
            name={identity.name}
            city={identity.city}
            monthsOnButika={identity.monthsOnButika}
            styleTags={stylePreferences.length > 0 ? stylePreferences : (identity.styleTags ?? [])}
          />
        )}

        {/* ── Bu Ay ── */}
        {insights && <BuAyCard insights={insights} />}

        {/* ── Canlı Bildirim ── */}
        {liveEvent && (
          <LiveEventCard
            event={liveEvent}
            onDismiss={() => dismissEvent.mutate(liveEvent.id)}
          />
        )}

        {/* ── Akıllı Asistan ── */}
        <SmartAssistantCard onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setAssistantVisible(true);
        }} />

        {/* ── Kısayollar ── */}
        <SectionLabel text="KISAYOLLAR" />
        <View style={s.shortcutGrid}>
          <ShortcutCard
            icon="storefront-outline"
            count={shortcuts?.brandCount ?? 0}
            title="Butiğin"
            subtitle={brandSubtitle}
            onPress={() => router.push('/my-boutiques' as any)}
          />
          <ShortcutCard
            icon="heart-outline"
            count={shortcuts?.favoriteCount ?? 0}
            title="Favorin"
            subtitle={favSubtitle}
            onPress={() => router.push('/(tabs)/saved' as any)}
          />
          <ShortcutCard
            icon="cube-outline"
            count={shortcuts?.activeShipments ?? 0}
            title="Sipariş"
            subtitle={orderSubtitle}
            hasAlert={(shortcuts?.activeShipments ?? 0) > 0}
            onPress={() => router.push('/(tabs)/tracking' as any)}
          />
          <ShortcutCard
            icon="notifications-outline"
            count={shortcuts?.trackingCount ?? 0}
            title="Takipte"
            subtitle={trackSubtitle}
            onPress={() => router.push('/(tabs)/watchlist' as any)}
          />
        </View>

        {/* ── Senin İçin ── */}
        <SectionLabel text="SENİN İÇİN" />
        <View style={s.settingsGroup}>
          <SettingRow
            icon="color-palette-outline"
            title="Tarz tercihlerini güncelle"
            subtitle="Senin İçin önerilerini iyileştir"
            onPress={() => router.push('/style-preferences' as any)}
          />
          <SettingRow
            icon="notifications-outline"
            title="Bildirim ayarları"
            subtitle="Sessiz saatler · bildirim türleri"
            onPress={() => router.push('/notification-preferences' as any)}
          />
          <SettingRow
            icon="person-outline"
            title="Hesap & gizlilik"
            subtitle="Email, şifre, KVKK"
            onPress={() => router.push('/account-settings' as any)}
          />
        </View>

        {/* ── Çıkış Yap ── */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={s.logoutText}>Çıkış yap</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      <SmartAssistantSheet
        visible={assistantVisible}
        onClose={() => setAssistantVisible(false)}
      />
    </View>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingBottom: 20 },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
  },
  settingsGroup: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border2,
  },
  logoutBtn: { alignSelf: 'center', paddingVertical: 16, marginTop: 8 },
  logoutText: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.rose5,
    letterSpacing: 0.3,
  },
});
