import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const SUPABASE_URL     = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
// Edge Function'ın tam URL'si (OAuth callback olarak Google'a kayıtlı olmalı)
const CALLBACK_URL     = `${SUPABASE_URL}/functions/v1/gmail-oauth`;

const PERMISSIONS = [
  { icon: 'checkmark-circle', color: Colors.success, text: 'Kargo e-postalarını otomatik okur' },
  { icon: 'checkmark-circle', color: Colors.success, text: 'Son 30 günü tarar, kargoları ekler' },
  { icon: 'close-circle',     color: Colors.error,   text: 'Kişisel e-postalarınıza erişmez' },
  { icon: 'close-circle',     color: Colors.error,   text: 'E-posta gönderemez' },
];

export default function ConnectMailScreen() {
  const insets    = useSafeAreaInsets();
  const { user }  = useAuth();
  const qc        = useQueryClient();
  const params    = useLocalSearchParams<{ success?: string; found?: string; error?: string }>();

  const [loading,   setLoading]   = useState(false);
  const [connected, setConnected] = useState(false);
  const [found,     setFound]     = useState(0);
  const [error,     setError]     = useState<string | null>(null);

  // Derin bağlantı ile geri dönünce (boutiq://connect-mail?success=true)
  useEffect(() => {
    if (params.success === 'true') {
      setFound(Number(params.found ?? 0));
      setConnected(true);
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    } else if (params.error) {
      setError('Google bağlantısı başarısız. Tekrar dene.');
      setLoading(false);
    }
  }, [params.success, params.error]);

  const buildAuthUrl = () => {
    if (!user) return null;
    const scope    = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email';
    const authUrl  = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id',     GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri',  CALLBACK_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope',         scope);
    authUrl.searchParams.set('access_type',   'offline');
    authUrl.searchParams.set('prompt',        'consent');
    authUrl.searchParams.set('state',         user.id); // Edge Function userId olarak kullanır
    return authUrl.toString();
  };

  const handleConnect = async () => {
    if (!user) return;

    if (!GOOGLE_CLIENT_ID) {
      setError('.env dosyasına EXPO_PUBLIC_GOOGLE_CLIENT_ID eklenmeli.');
      return;
    }

    const authUrl = buildAuthUrl();
    if (!authUrl) return;

    setLoading(true);
    setError(null);

    // Tarayıcıda Google giriş ekranını aç
    // boutiq://connect-mail?success=true ile geri döner
    const result = await WebBrowser.openAuthSessionAsync(authUrl, 'boutiq://connect-mail');

    if (result.type === 'cancel') {
      setLoading(false);
    }
    // success durumu useEffect'te params üzerinden gelir
  };

  return (
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

      <View style={styles.content}>
        {connected ? (
          /* ── Başarı ── */
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <LinearGradient colors={[Colors.success, '#06d6a0']} style={StyleSheet.absoluteFill} />
              <Ionicons name="checkmark" size={52} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Gmail Bağlandı!</Text>
            {found > 0 ? (
              <Text style={styles.successBody}>
                Son 30 günde <Text style={{ color: Colors.gold3, fontWeight: '800' }}>{found} kargo</Text> bulundu
                ve otomatik olarak eklendi.
              </Text>
            ) : (
              <Text style={styles.successBody}>
                E-posta bağlandı. Yeni kargo bildirimleri geldiğinde otomatik eklenecek.
              </Text>
            )}
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
              Gmail hesabını bağla — son 30 günün kargo e-postalarını okuyalım,
              siparişlerini otomatik ekleyelim.
            </Text>

            {/* İzinler */}
            <View style={styles.permCard}>
              <LinearGradient colors={[Colors.surface2, Colors.surface3]} style={StyleSheet.absoluteFill} />
              <Text style={styles.permTitle}>Bu bağlantı şunları yapar:</Text>
              {PERMISSIONS.map((p, i) => (
                <View key={i} style={styles.permRow}>
                  <Ionicons name={p.icon as any} size={18} color={p.color} />
                  <Text style={styles.permText}>{p.text}</Text>
                </View>
              ))}
            </View>

            {/* Desteklenen firmalar */}
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
              disabled={loading}
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
              Yalnızca kargo bildirimleri okunur. Bağlantıyı profilinden istediğin zaman kaldırabilirsin.
            </Text>
          </>
        )}
      </View>
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
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 48 },
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  iconBg: { width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 30, fontWeight: '800', color: Colors.text1,
    letterSpacing: -1.2, lineHeight: 36, marginBottom: 12, textAlign: 'center',
  },
  subtitle: { fontSize: 15, color: Colors.text3, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  permCard: {
    borderRadius: 20, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border1, overflow: 'hidden', gap: 10,
  },
  permTitle: {
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
  connectBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  privacyNote: { fontSize: 12, color: Colors.text5, textAlign: 'center', lineHeight: 18 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  successIcon: {
    width: 100, height: 100, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  successBody: { fontSize: 15, color: Colors.text3, textAlign: 'center', lineHeight: 23, paddingHorizontal: 16 },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 56, width: 200, borderRadius: 18, overflow: 'hidden', marginTop: 8,
  },
  doneBtnText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});
