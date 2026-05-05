import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useInterests } from '@/context/InterestsContext';
import { useUpdateStyleTags } from '@/hooks/useProfileDashboard';

const STYLE_OPTIONS = [
  { id: 'Minimal',       emoji: '⬜', desc: 'Sade, temiz çizgiler' },
  { id: 'Romantik',      emoji: '🌸', desc: 'Dantel, fırfır, yumuşak' },
  { id: 'Bohem',         emoji: '🌿', desc: 'Özgür ruh, doğal dokular' },
  { id: 'Klasik',        emoji: '👑', desc: 'Zamansız, zarif kesimler' },
  { id: 'Sportif',       emoji: '⚡', desc: 'Rahat, atletik' },
  { id: 'Şık & Zarif',  emoji: '✨', desc: 'Sofistike, moda odaklı' },
  { id: 'Vintage',       emoji: '🎞️',  desc: 'Retro, ikinci el ruhu' },
  { id: 'Casual',        emoji: '☁️',  desc: 'Günlük, rahat' },
  { id: 'Edgy',          emoji: '🖤', desc: 'Cesur, asimetrik' },
  { id: 'Feminine',      emoji: '🌷', desc: 'Kadınsı, narin' },
];

const MAX_SELECT = 3;

export default function StylePreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { stylePreferences, markDone, interests } = useInterests();
  const updateStyleTags = useUpdateStyleTags();

  const [selected, setSelected] = useState<string[]>(stylePreferences);

  const toggle = (id: string) => {
    Haptics.selectionAsync();
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id);
      if (prev.length >= MAX_SELECT) return prev;
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markDone(interests, selected);
    updateStyleTags.mutate(selected);
    router.back();
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.surface1, Colors.bg]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.text1} />
        </TouchableOpacity>
        <Text style={s.title}>Tarz Tercihlerim</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={s.subtitle}>
        Senin İçin önerilerini iyileştirmek için en fazla {MAX_SELECT} tarz seçebilirsin.
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.grid}>
        {STYLE_OPTIONS.map(opt => {
          const active = selected.includes(opt.id);
          const disabled = !active && selected.length >= MAX_SELECT;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[s.option, active && s.optionActive, disabled && s.optionDisabled]}
              onPress={() => toggle(opt.id)}
              activeOpacity={0.8}
            >
              {active && (
                <LinearGradient
                  colors={Colors.gradients.rose as unknown as [string, string]}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <View style={s.optionLeft}>
                <Text style={s.emoji}>{opt.emoji}</Text>
                <View>
                  <Text style={[s.optionName, active && s.optionNameActive]}>{opt.id}</Text>
                  <Text style={[s.optionDesc, active && s.optionDescActive]}>{opt.desc}</Text>
                </View>
              </View>
              {active && (
                <View style={s.check}>
                  <Ionicons name="checkmark" size={13} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Kaydet butonu */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={s.saveBtn}
          onPress={handleSave}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={Colors.gradients.rose as unknown as [string, string]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.saveBtnGrad}
          >
            <Text style={s.saveBtnText}>
              {selected.length > 0 ? `${selected.length} tarz seçildi — Kaydet` : 'Kaydet'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.surface2,
    borderWidth: 1, borderColor: Colors.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', fontFamily: Fonts.displayBold, fontSize: 18, color: Colors.text1 },
  subtitle: {
    fontFamily: Fonts.uiLight, fontSize: 13, color: Colors.text4,
    textAlign: 'center', paddingHorizontal: 24, marginBottom: 16, lineHeight: 19,
  },
  grid: { paddingHorizontal: 16, gap: 8, paddingBottom: 20 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface2, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border2,
    padding: 14, overflow: 'hidden',
  },
  optionActive: { borderColor: Colors.rose3 },
  optionDisabled: { opacity: 0.4 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 22 },
  optionName: { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1 },
  optionNameActive: { color: '#FFF9EE' },
  optionDesc: { fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4, marginTop: 1 },
  optionDescActive: { color: 'rgba(255,249,238,0.72)' },
  check: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: Colors.bg },
  saveBtn: { borderRadius: 14, overflow: 'hidden' },
  saveBtnGrad: { paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { fontFamily: Fonts.ui, fontSize: 15, color: '#FFF9EE', letterSpacing: -0.1 },
});
