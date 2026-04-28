import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

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
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'boutiq', path: 'connect-mail' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    { authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth' }
  );

  React.useEffect(() => {
    if (response?.type === 'success' && response.params.code) {
      handleGoogleSuccess(response.params.code);
    } else if (response?.type === 'error') {
      setError('Google bağlantısı başarısız oldu. Tekrar deneyin.');
      setLoading(false);
    }
  }, [response]);

  const handleGoogleSuccess = async (code: string) => {
    if (!user) return;
    try {
      // Token exchange ve DB kayıt
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          connected_accounts: { gmail: { connected: true, code, connected_at: new Date().toISOString() } },
        })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      qc.invalidateQueries({ queryKey: ['profile', user.id] });
      setConnected(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Client ID eksik. .env dosyasına EXPO_PUBLIC_GOOGLE_CLIENT_ID ekle.');
      return;
    }
    setLoading(true);
    setError(null);
    await promptAsync();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.surface3, Colors.bg]} style={StyleSheet.absoluteFill} locations={[0, 0.3]} />

      <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 12 }]}>
        <Ionicons name="chevron-back" size={22} color={Colors.text3} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {connected ? (
          // Başarı ekranı
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <LinearGradient colors={[Colors.success, '#06d6a0']} style={StyleSheet.absoluteFill} />
              <Ionicons name="checkmark" size={48} color="#fff" />
            </View>
            <Text style={styles.successTitle}>E-posta Bağlandı!</Text>
            <Text style={styles.successBody}>
              Artık kargo e-postaların otomatik olarak Kargo Takip ekranına eklenecek.
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
              Gmail hesabını bağla, kargo e-postalarını otomatik olarak okuyalım.{'\n'}
              Sipariş verdiğinde kargo bilgin Boutiq'e otomatik eklenir.
            </Text>

            {/* İzinler */}
            <View style={styles.permissionsCard}>
              <LinearGradient colors={[Colors.surface2, Colors.surface3]} style={StyleSheet.absoluteFill} />
              <Text style={styles.permissionsTitle}>Bu bağlantı şunları yapar:</Text>
              {PERMISSIONS.map((p, i) => (
                <View key={i} style={styles.permRow}>
                  <Ionicons name={p.icon as any} size={20} color={p.color} />
                  <Text style={styles.permText}>{p.text}</Text>
                </View>
              ))}
            </View>

            {/* Desteklenen kargo firmaları */}
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

            {/* Bağlan butonu */}
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={handleConnect}
              disabled={loading || !request}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#4285F4', '#2563EB']} style={StyleSheet.absoluteFill} />
              {loading
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Ionicons name="logo-google" size={20} color="#fff" />
                    <Text style={styles.connectBtnText}>Gmail ile Bağlan</Text>
                  </>}
            </TouchableOpacity>

            <Text style={styles.privacyNote}>
              Güvenliğin için yalnızca kargo bildirimleri içeren e-postalara erişilir.
              Bağlantıyı istediğin zaman profilinden kaldırabilirsin.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
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
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 48 },
  iconContainer: { alignItems: 'center', marginBottom: 28 },
  iconBg: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: Colors.text1, letterSpacing: -1.5, lineHeight: 38, marginBottom: 14, textAlign: 'center' },
  subtitle: { fontSize: 15, color: Colors.text3, lineHeight: 23, textAlign: 'center', marginBottom: 28 },
  permissionsCard: {
    borderRadius: 20, padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.border1, overflow: 'hidden', gap: 10,
  },
  permissionsTitle: { fontSize: 13, fontWeight: '700', color: Colors.text4, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  permText: { fontSize: 14, color: Colors.text2, fontWeight: '500' },
  carriersCard: {
    backgroundColor: Colors.surface2, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border1, marginBottom: 24, gap: 4,
  },
  carriersTitle: { fontSize: 12, fontWeight: '700', color: Colors.text4, textTransform: 'uppercase', letterSpacing: 0.5 },
  carriers: { fontSize: 13, color: Colors.text3, lineHeight: 20 },
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
  connectBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  privacyNote: { fontSize: 12, color: Colors.text5, textAlign: 'center', lineHeight: 18 },
  // Başarı ekranı
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingTop: 40 },
  successIcon: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  successTitle: { fontSize: 28, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  successBody: { fontSize: 15, color: Colors.text3, textAlign: 'center', lineHeight: 23, paddingHorizontal: 20 },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, width: 200, borderRadius: 18, overflow: 'hidden', marginTop: 8 },
  doneBtnText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});
