import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

WebBrowser.maybeCompleteAuthSession();

const PERMISSIONS = [
  { icon: 'checkmark-circle', color: Colors.success, text: 'Kargo e-postalarını okur' },
  { icon: 'checkmark-circle', color: Colors.success, text: 'Kargo takibini otomatikleştirir' },
  { icon: 'close-circle',     color: Colors.error,   text: 'Kişisel e-postalarınızı okumaz' },
  { icon: 'close-circle',     color: Colors.error,   text: 'E-posta gönderemez' },
];

export default function ConnectMailScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const handleConnect = async () => {
    if (!isValidEmail || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          connected_accounts: {
            gmail: {
              connected: true,
              email: email.trim().toLowerCase(),
              connected_at: new Date().toISOString(),
            },
          },
        })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      qc.invalidateQueries({ queryKey: ['profile', user.id] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConnected(true);
    } catch (err: any) {
      setError('Bağlantı kurulamadı. Tekrar dene.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={[Colors.surface3, Colors.bg]}
          style={StyleSheet.absoluteFill}
          locations={[0, 0.35]}
        />

        {/* Geri */}
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 12 }]}>
          <Ionicons name="chevron-back" size={22} color={Colors.text3} />
        </TouchableOpacity>

        <View style={styles.scroll}>
          {connected ? (
            /* ── Başarı ── */
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <LinearGradient colors={[Colors.success, '#06d6a0']} style={StyleSheet.absoluteFill} />
                <Ionicons name="checkmark" size={48} color="#fff" />
              </View>
              <Text style={styles.successTitle}>E-posta Bağlandı!</Text>
              <Text style={styles.successBody}>
                Kargo e-postaların artık otomatik olarak{'\n'}Kargo Takip ekranına eklenecek.
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                <LinearGradient colors={[Colors.rose2, Colors.rose4]} style={StyleSheet.absoluteFill} />
                <Text style={styles.doneBtnText}>Harika!</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* İkon */}
              <View style={styles.iconContainer}>
                <LinearGradient colors={[Colors.gold2, Colors.gold4]} style={styles.iconBg}>
                  <Ionicons name="mail" size={48} color="#fff" />
                </LinearGradient>
              </View>

              <Text style={styles.title}>Kargo Takibini{'\n'}Otomatikleştir</Text>
              <Text style={styles.subtitle}>
                Gmail adresini gir, kargo e-postalarını otomatik olarak okuyalım.
              </Text>

              {/* Gmail input */}
              <View style={[styles.inputWrap, focused && styles.inputFocused]}>
                <Ionicons name="mail-outline" size={20} color={focused ? Colors.gold3 : Colors.text4} />
                <TextInput
                  style={styles.input}
                  placeholder="gmail adresin"
                  placeholderTextColor={Colors.text5}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  selectionColor={Colors.gold3}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
              </View>

              {/* İzinler */}
              <View style={styles.permissionsCard}>
                <LinearGradient colors={[Colors.surface2, Colors.surface3]} style={StyleSheet.absoluteFill} />
                <Text style={styles.permissionsTitle}>Bu bağlantı şunları yapar:</Text>
                {PERMISSIONS.map((p, i) => (
                  <View key={i} style={styles.permRow}>
                    <Ionicons name={p.icon as any} size={18} color={p.color} />
                    <Text style={styles.permText}>{p.text}</Text>
                  </View>
                ))}
              </View>

              {/* Kargo firmaları */}
              <View style={styles.carriersCard}>
                <Text style={styles.carriersTitle}>Desteklenen kargo firmaları</Text>
                <Text style={styles.carriers}>Yurtiçi · MNG · PTT · Aras · Sürat · UPS · DHL</Text>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="warning" size={16} color={Colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Bağlan */}
              <TouchableOpacity
                style={[styles.connectBtn, (!isValidEmail || loading) && styles.connectBtnDisabled]}
                onPress={handleConnect}
                disabled={!isValidEmail || loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={isValidEmail ? ['#4285F4', '#2563EB'] : [Colors.surface3, Colors.surface3]}
                  style={StyleSheet.absoluteFill}
                />
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Ionicons name="mail" size={20} color={isValidEmail ? '#fff' : Colors.text4} />
                      <Text style={[styles.connectBtnText, !isValidEmail && { color: Colors.text4 }]}>
                        Gmail ile Bağlan
                      </Text>
                    </>}
              </TouchableOpacity>

              <Text style={styles.privacyNote}>
                Güvenliğin için yalnızca kargo bildirimleri içeren e-postalara erişilir.
                Bağlantıyı istediğin zaman profilinden kaldırabilirsin.
              </Text>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  backBtn: {
    position: 'absolute', left: 16, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border2,
  },
  scroll: { flex: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 48 },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  iconBg: { width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 30, fontWeight: '800', color: Colors.text1,
    letterSpacing: -1.2, lineHeight: 36, marginBottom: 12, textAlign: 'center',
  },
  subtitle: { fontSize: 15, color: Colors.text3, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface2, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.border2,
    paddingHorizontal: 16, height: 56, marginBottom: 16,
  },
  inputFocused: { borderColor: Colors.gold3 },
  input: { flex: 1, fontSize: 16, color: Colors.text1 },
  permissionsCard: {
    borderRadius: 20, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border1, overflow: 'hidden', gap: 10,
  },
  permissionsTitle: {
    fontSize: 11, fontWeight: '700', color: Colors.text4,
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4,
  },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  permText: { fontSize: 13, color: Colors.text2, fontWeight: '500' },
  carriersCard: {
    backgroundColor: Colors.surface2, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.border1, marginBottom: 20, gap: 4,
  },
  carriersTitle: { fontSize: 11, fontWeight: '700', color: Colors.text4, textTransform: 'uppercase', letterSpacing: 0.5 },
  carriers: { fontSize: 12, color: Colors.text3 },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(208,58,58,0.08)', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: 'rgba(208,58,58,0.2)', marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: Colors.error, lineHeight: 18 },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 56, borderRadius: 18, overflow: 'hidden', marginBottom: 16,
  },
  connectBtnDisabled: { opacity: 0.6 },
  connectBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  privacyNote: { fontSize: 12, color: Colors.text5, textAlign: 'center', lineHeight: 18 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  successIcon: {
    width: 100, height: 100, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  successBody: { fontSize: 15, color: Colors.text3, textAlign: 'center', lineHeight: 23 },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, width: 200, borderRadius: 18, overflow: 'hidden', marginTop: 8,
  },
  doneBtnText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});
