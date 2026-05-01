import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useInterests } from '@/context/InterestsContext';

const CATEGORIES = [
  { id: 'giyim',     label: 'Giyim',           icon: '—' },
  { id: 'ayakkabi',  label: 'Ayakkabı',         icon: '—' },
  { id: 'canta',     label: 'Çanta',            icon: '—' },
  { id: 'taki',      label: 'Takı & Aksesuar',  icon: '—' },
  { id: 'kozmetik',  label: 'Kozmetik',         icon: '—' },
  { id: 'spor',      label: 'Spor',             icon: '—' },
  { id: 'bebek',     label: 'Bebek & Çocuk',    icon: '—' },
  { id: 'mutfak',    label: 'Mutfak',           icon: '—' },
  { id: 'ev',        label: 'Ev & Dekor',       icon: '—' },
  { id: 'teknoloji', label: 'Teknoloji',        icon: '—' },
  { id: 'kitap',     label: 'Kitap & Kırtasiye',icon: '—' },
  { id: 'oyuncak',   label: 'Oyuncak',          icon: '—' },
  { id: 'parfum',    label: 'Parfüm',           icon: '—' },
  { id: 'outdoor',   label: 'Outdoor & Kamp',   icon: '—' },
  { id: 'saglik',    label: 'Sağlık & Wellness',icon: '—' },
  { id: 'evcil',     label: 'Evcil Hayvan',     icon: '—' },
];

const MIN_SELECTION = 3;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { markDone } = useInterests();
  const progressAnim = useRef(new Animated.Value(0)).current;

  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      // Progress bar animation
      const progress = Math.min(next.size / MIN_SELECTION, 1);
      Animated.spring(progressAnim, {
        toValue: progress,
        useNativeDriver: false,
        tension: 80,
        friction: 10,
      }).start();

      return next;
    });
  };

  const finish = async () => {
    if (selected.size < MIN_SELECTION) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markDone([...selected]);
  };

  const skip = async () => {
    Haptics.selectionAsync();
    await markDone([]);
  };

  const canContinue = selected.size >= MIN_SELECTION;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#0E0A18', Colors.bg, '#0A0E10']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient ışıklar */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Üst başlık */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>BUTİKA — KİŞİSEL AYAR</Text>
          <Text style={styles.title}>Zevkini{'\n'}tanıyalım.</Text>
          <Text style={styles.subtitle}>
            En az {MIN_SELECTION} kategori seç — sana özel butikler ve kampanyalar gösterelim.
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
            <LinearGradient
              colors={[Colors.gold2, Colors.gold4]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
        <Text style={styles.progressLabel}>
          {selected.size < MIN_SELECTION
            ? `${MIN_SELECTION - selected.size} tane daha seç`
            : `${selected.size} kategori seçildi ✓`}
        </Text>

        {/* Kategori grid */}
        <View style={styles.grid}>
          {CATEGORIES.map(cat => {
            const isSelected = selected.has(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.pill, isSelected && styles.pillSelected]}
                onPress={() => toggle(cat.id)}
                activeOpacity={0.75}
              >
                {isSelected && (
                  <LinearGradient
                    colors={[Colors.surface3, Colors.surface4]}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={[styles.pillLabel, isSelected && styles.pillLabelSelected]}>
                  {cat.label}
                </Text>
                {isSelected && (
                  <View style={styles.pillCheck}>
                    <View style={styles.pillCheckDot} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
            onPress={finish}
            disabled={!canContinue}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={canContinue ? [Colors.gold2, Colors.gold3, Colors.gold4] : [Colors.surface3, Colors.surface4]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.continueBtnText, !canContinue && styles.continueBtnTextDisabled]}>
              DEVAM ET
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={skip} style={styles.skipBtn} hitSlop={{ top: 10, bottom: 10, left: 20, right: 20 }}>
            <Text style={styles.skipText}>Şimdilik geç</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  glow1: {
    position: 'absolute',
    top: -60,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.goldGlow,
    opacity: 0.8,
  },
  glow2: {
    position: 'absolute',
    top: 200,
    right: -120,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.roseGlow,
    opacity: 0.6,
  },

  header: {
    marginTop: 52,
    marginBottom: 32,
    gap: 10,
  },
  eyebrow: {
    fontFamily: Fonts.uiMedium,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.gold3,
    marginBottom: 6,
  },
  title: {
    fontFamily: Fonts.editorial,
    fontSize: 48,
    color: Colors.text1,
    lineHeight: 50,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text3,
    lineHeight: 21,
    marginTop: 4,
  },

  // Progress
  progressTrack: {
    height: 2,
    backgroundColor: Colors.border2,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressLabel: {
    fontFamily: Fonts.uiMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.text4,
    marginBottom: 24,
    textTransform: 'uppercase',
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 36,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: Colors.surface2,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    overflow: 'hidden',
    position: 'relative',
  },
  pillSelected: {
    borderColor: Colors.borderGold,
  },
  pillLabel: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.text3,
    letterSpacing: 0.1,
  },
  pillLabelSelected: {
    color: Colors.gold4,
  },
  pillCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: Colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillCheckDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold3,
  },

  // Footer
  footer: {
    gap: 14,
  },
  continueBtn: {
    height: 58,
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {},
  continueBtnText: {
    fontFamily: Fonts.ui,
    fontSize: 12,
    letterSpacing: 3,
    color: Colors.bg,
  },
  continueBtnTextDisabled: {
    color: Colors.text4,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: Fonts.uiLight,
    fontSize: 13,
    color: Colors.text5,
    letterSpacing: 0.3,
  },
});
