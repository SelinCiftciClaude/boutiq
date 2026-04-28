import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

WebBrowser.maybeCompleteAuthSession();

// Google Cloud Console → iOS Client ID (bundle: com.boutiq.app)
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

// ── Kargo takip no regex'leri ──────────────────────────────────────────────
const CARGO_PATTERNS: { carrier: string; re: RegExp }[] = [
  { carrier: 'Yurtiçi Kargo', re: /\b(YK\d{9,12}(?:TR)?)\b/i },
  { carrier: 'MNG Kargo',     re: /\b(MNG\d{9,12})\b/i },
  { carrier: 'PTT Kargo',     re: /\b(PTT\d{9,12})\b/i },
  { carrier: 'Aras Kargo',    re: /\b(ARS\d{9,12})\b/i },
  { carrier: 'Sürat Kargo',   re: /\b(SRT\d{9,12})\b/i },
  { carrier: 'UPS',           re: /\b(1Z[A-Z0-9]{16})\b/i },
  { carrier: 'DHL',           re: /\b(\d{10,12})\b/ },
  { carrier: 'Kargo',         re: /takip\s*(?:no|numarası)[:\s]*([A-Z0-9]{8,20})/i },
];

// ── Gmail API yardımcıları ─────────────────────────────────────────────────
function b64decode(s: string) {
  try { return atob(s.replace(/-/g, '+').replace(/_/g, '/')); } catch { return ''; }
}

function bodyFromParts(parts: any[]): string {
  let out = '';
  for (const p of parts ?? []) {
    if (p.mimeType === 'text/plain' && p.body?.data) out += b64decode(p.body.data);
    else if (p.parts) out += bodyFromParts(p.parts);
  }
  return out;
}

async function gmailFetch(token: string, path: string) {
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.json();
}

// ── Son 30 günün kargo maillerini çek + parse et ───────────────────────────
async function fetchCargoShipments(token: string, userId: string) {
  const after = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  const q = encodeURIComponent(
    `(kargo OR takip OR sipariş OR "tracking number") after:${after}`
  );
  const list = await gmailFetch(token, `/messages?q=${q}&maxResults=50`);
  const ids: string[] = (list.messages ?? []).map((m: any) => m.id);

  const created: string[] = [];

  for (const id of ids) {
    try {
      const msg = await gmailFetch(token, `/messages/${id}?format=full`);
      const headers = msg.payload?.headers ?? [];
      const h = (n: string) => headers.find((x: any) => x.name.toLowerCase() === n)?.value ?? '';

      const subject = h('subject');
      const from    = h('from');
      const dateStr = h('date');
      const body    = msg.payload?.body?.data
        ? b64decode(msg.payload.body.data)
        : bodyFromParts(msg.payload?.parts ?? []);
      const text = subject + ' ' + body;

      // Takip numarası bul
      let trackingNumber = '', carrier = 'Kargo';
      for (const { re, carrier: c } of CARGO_PATTERNS) {
        const m = text.match(re);
        if (m) { trackingNumber = m[1]; carrier = c; break; }
      }
      if (!trackingNumber) continue;

      // Zaten kayıtlı mı?
      const { data: ex } = await supabase
        .from('shipments')
        .select('id')
        .eq('user_id', userId)
        .eq('tracking_number', trackingNumber)
        .maybeSingle();
      if (ex) continue;

      // Marka adı
      const fromName = from.replace(/<[^>]+>/, '').replace(/"/g, '').trim().split('@')[0];
      const subMatch = subject.match(/([A-ZÇĞIİÖŞÜa-zçğıiöşü][A-ZÇĞIİÖŞÜa-zçğıiöşü\s]{2,24})/);
      const brandName = (fromName && !fromName.includes('@')) ? fromName : (subMatch?.[1]?.trim() ?? 'Marka');

      // Sipariş no
      const ordMatch = (subject + body).match(/(?:sipariş|order)\s*(?:no|#)[:\s]*([A-Z0-9\-]{5,20})/i);
      const orderNumber = ordMatch?.[1]?.trim() ?? `ORD-${id.slice(0, 8).toUpperCase()}`;

      await supabase.from('shipments').insert({
        user_id: userId,
        brand_name: brandName,
        order_number: orderNumber,
        tracking_number: trackingNumber,
        carrier,
        status: 'shipped',
        status_label: 'Kargoya Verildi',
        source: 'email',
        created_at: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        products: [],
      });
      created.push(trackingNumber);
    } catch { /* tek mail hatası genel akışı durdurmasın */ }
  }
  return created.length;
}

// ── Ekran ─────────────────────────────────────────────────────────────────
const PERMISSIONS = [
  { icon: 'checkmark-circle', color: Colors.success, text: 'Kargo e-postalarını otomatik okur' },
  { icon: 'checkmark-circle', color: Colors.success, text: 'Son 30 günü tarar, kargoları ekler' },
  { icon: 'close-circle',     color: Colors.error,   text: 'Kişisel e-postalarınıza erişmez' },
  { icon: 'close-circle',     color: Colors.error,   text: 'E-posta gönderemez' },
];

export default function ConnectMailScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [loading,   setLoading]   = useState(false);
  const [connected, setConnected] = useState(false);
  const [found,     setFound]     = useState(0);
  const [error,     setError]     = useState<string | null>(null);
  const [step,      setStep]      = useState<'scanning' | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: IOS_CLIENT_ID,
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  });

  // Google'dan cevap gelince
  React.useEffect(() => {
    if (!response || !user) return;
    if (response.type === 'success') {
      const token = response.authentication?.accessToken;
      if (token) processGmail(token);
      else { setError('Token alınamadı.'); setLoading(false); }
    } else if (response.type === 'error') {
      setError('Google bağlantısı başarısız: ' + (response.error?.message ?? ''));
      setLoading(false);
    } else if (response.type === 'cancel') {
      setLoading(false);
    }
  }, [response]);

  const processGmail = async (token: string) => {
    if (!user) return;
    setStep('scanning');
    try {
      // Token'ı profile'a kaydet
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json());

      await supabase.from('profiles').update({
        connected_accounts: {
          gmail: { connected: true, email: userInfo.email, connected_at: new Date().toISOString() },
        },
      }).eq('id', user.id);

      // Kargo maillerini çek
      const count = await fetchCargoShipments(token, user.id);

      qc.invalidateQueries({ queryKey: ['shipments'] });
      qc.invalidateQueries({ queryKey: ['profile'] });

      setFound(count);
      setConnected(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError('Gmail okunamadı: ' + err.message);
    } finally {
      setLoading(false);
      setStep(null);
    }
  };

  const handleConnect = async () => {
    if (!IOS_CLIENT_ID) {
      setError('.env dosyasına EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID eklenmeli.');
      return;
    }
    setLoading(true);
    setError(null);
    await promptAsync();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.surface3, Colors.bg]} style={StyleSheet.absoluteFill} locations={[0, 0.35]} />

      <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { top: insets.top + 12 }]}>
        <Ionicons name="chevron-back" size={22} color={Colors.text3} />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {connected ? (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <LinearGradient colors={[Colors.success, '#06d6a0']} style={StyleSheet.absoluteFill} />
              <Ionicons name="checkmark" size={52} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Gmail Bağlandı!</Text>
            <Text style={styles.successBody}>
              {found > 0
                ? `Son 30 günde `
                : 'E-posta bağlandı. Yeni kargo bildirimleri geldiğinde otomatik eklenecek.'}
              {found > 0 && <Text style={{ color: Colors.gold3, fontWeight: '800' }}>{found} kargo</Text>}
              {found > 0 && ' bulundu ve eklendi.'}
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
              <LinearGradient colors={[Colors.rose2, Colors.rose4]} style={StyleSheet.absoluteFill} />
              <Text style={styles.doneBtnText}>Harika!</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.iconContainer}>
              <LinearGradient colors={[Colors.gold2, Colors.gold4]} style={styles.iconBg}>
                <Ionicons name="mail" size={48} color="#fff" />
              </LinearGradient>
            </View>

            <Text style={styles.title}>Kargo Takibini{'\n'}Otomatikleştir</Text>
            <Text style={styles.subtitle}>
              Gmail hesabını bağla — son 30 günün kargo e-postalarını okuyup
              siparişlerini otomatik ekleyelim.
            </Text>

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

            <TouchableOpacity
              style={styles.connectBtn}
              onPress={handleConnect}
              disabled={loading || !request}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#4285F4', '#2563EB']} style={StyleSheet.absoluteFill} />
              {loading
                ? <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.connectBtnText}>
                      {step === 'scanning' ? 'E-postalar taranıyor...' : 'Bağlanıyor...'}
                    </Text>
                  </>
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
  iconContainer: { alignItems: 'center', marginBottom: 24 },
  iconBg: { width: 88, height: 88, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: Colors.text1, letterSpacing: -1.2, lineHeight: 36, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: Colors.text3, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  permCard: { borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: Colors.border1, overflow: 'hidden', gap: 10 },
  permTitle: { fontSize: 11, fontWeight: '700', color: Colors.text4, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  permText: { fontSize: 13, color: Colors.text2, fontWeight: '500' },
  carriersCard: { backgroundColor: Colors.surface2, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: Colors.border1, marginBottom: 20, gap: 4 },
  carriersTitle: { fontSize: 11, fontWeight: '700', color: Colors.text4, textTransform: 'uppercase', letterSpacing: 0.5 },
  carriers: { fontSize: 12, color: Colors.text3 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(208,58,58,0.08)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(208,58,58,0.2)', marginBottom: 16 },
  errorText: { flex: 1, fontSize: 13, color: Colors.error, lineHeight: 18 },
  connectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 56, borderRadius: 18, overflow: 'hidden', marginBottom: 16 },
  connectBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  privacyNote: { fontSize: 12, color: Colors.text5, textAlign: 'center', lineHeight: 18 },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingTop: 40 },
  successIcon: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  successTitle: { fontSize: 28, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  successBody: { fontSize: 15, color: Colors.text3, textAlign: 'center', lineHeight: 23, paddingHorizontal: 16 },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, width: 200, borderRadius: 18, overflow: 'hidden', marginTop: 8 },
  doneBtnText: { fontSize: 18, fontWeight: '700', color: '#fff' },
});
