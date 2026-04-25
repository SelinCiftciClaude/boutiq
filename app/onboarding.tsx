import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { useInterests } from '@/context/InterestsContext';

const CATEGORIES = [
  { id: 'giyim',     label: 'Giyim',           emoji: '👗' },
  { id: 'ayakkabi',  label: 'Ayakkabı',         emoji: '👟' },
  { id: 'canta',     label: 'Çanta',            emoji: '👜' },
  { id: 'taki',      label: 'Takı & Aksesuar',  emoji: '💎' },
  { id: 'kozmetik',  label: 'Kozmetik',         emoji: '💄' },
  { id: 'spor',      label: 'Spor',             emoji: '🏃' },
  { id: 'bebek',     label: 'Bebek & Çocuk',    emoji: '👶' },
  { id: 'mutfak',    label: 'Mutfak',           emoji: '🍳' },
  { id: 'ev',        label: 'Ev & Dekor',       emoji: '🏠' },
  { id: 'teknoloji', label: 'Teknoloji',        emoji: '📱' },
  { id: 'kitap',     label: 'Kitap & Kırtasiye',emoji: '📚' },
  { id: 'oyuncak',   label: 'Oyuncak',          emoji: '🧸' },
  { id: 'parfum',    label: 'Parfüm',           emoji: '🌸' },
  { id: 'outdoor',   label: 'Outdoor & Kamp',   emoji: '🏕️' },
  { id: 'saglik',    label: 'Sağlık & Wellness',emoji: '🧘' },
  { id: 'evcil',     label: 'Evcil Hayvan',     emoji: '🐾' },
];

const MIN_SELECTION = 3;

export default function OnboardingScreen() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { markDone } = useInterests();

  const toggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const finish = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await markDone([...selected]);
    // RouteGate sees hasInterests = true and navigates to tabs
  };

  const skip = async () => {
    await markDone([]);
  };

  const canContinue = selected.size >= MIN_SELECTION;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.surface3, Colors.surface2, Colors.bg]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.35, 1]}
      />
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.logo}>BOUTIQ</Text>
          <Text style={styles.title}>Seni{'\n'}tanıyalım</Text>
          <Text style={styles.subtitle}>
            İlgini çeken kategorileri seç — sana özel butikler ve kampanyalar gösterelim.
          </Text>

          <Text style={styles.hint}>En az {MIN_SELECTION} kategori seç</Text>

          <View style={styles.grid}>
            {CATEGORIES.map(cat => {
              const isSelected = selected.has(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.pill, isSelected && styles.pillSelected]}
                  onPress={() => toggle(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emoji}>{cat.emoji}</Text>
                  <Text style={[styles.pillLabel, isSelected && styles.pillLabelSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            {selected.size > 0 && (
              <Text style={styles.selectedCount}>
                {selected.size} kategori seçildi
              </Text>
            )}
            <Button
              label="Devam Et"
              onPress={finish}
              variant="primary"
              size="xl"
              disabled={!canContinue}
            />
            <TouchableOpacity onPress={skip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Şimdilik geç</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  glow1: {
    position: 'absolute',
    top: -60,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.goldGlow,
    opacity: 0.6,
  },
  glow2: {
    position: 'absolute',
    top: 160,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Colors.roseGlow,
    opacity: 0.5,
  },
  logo: {
    marginTop: 56,
    fontSize: 13,
    fontWeight: '800',
    color: Colors.gold3,
    letterSpacing: 5,
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.text1,
    letterSpacing: -2,
    lineHeight: 46,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text3,
    lineHeight: 23,
    marginBottom: 28,
  },
  hint: {
    fontSize: 12,
    color: Colors.text4,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 36,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 50,
    backgroundColor: Colors.surface2,
    borderWidth: 1.5,
    borderColor: Colors.border2,
  },
  pillSelected: {
    backgroundColor: Colors.roseGlow,
    borderColor: Colors.rose3,
  },
  emoji: {
    fontSize: 16,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text2,
  },
  pillLabelSelected: {
    color: Colors.rose2,
  },
  footer: {
    gap: 14,
  },
  selectedCount: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.gold3,
    fontWeight: '600',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 13,
    color: Colors.text5,
    fontWeight: '500',
  },
});
