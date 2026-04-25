import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/services/supabase';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const handleSend = async () => {
    if (!email) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={[Colors.surface3, Colors.surface2, Colors.bg]} style={StyleSheet.absoluteFill} locations={[0, 0.4, 1]} />
      <View style={styles.glow1} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text3} />
        </TouchableOpacity>

        {!sent ? (
          <>
            <View style={styles.header}>
              <Text style={styles.logo}>BOUTIQ</Text>
              <Text style={styles.title}>Şifreni{'\n'}sıfırla</Text>
              <Text style={styles.subtitle}>
                E-posta adresini gir, sana sıfırlama bağlantısı gönderelim.
              </Text>
            </View>

            <View style={[styles.inputWrapper, focused && styles.inputFocused]}>
              <Ionicons name="mail-outline" size={18} color={focused ? Colors.gold3 : Colors.text4} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-posta adresin"
                placeholderTextColor={Colors.text5}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="send"
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onSubmitEditing={handleSend}
                selectionColor={Colors.gold3}
              />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <Button
              label="Sıfırlama Bağlantısı Gönder"
              onPress={handleSend}
              variant="primary"
              size="xl"
              loading={loading}
              disabled={!email}
              style={styles.btn}
            />
          </>
        ) : (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>E-posta gönderildi!</Text>
            <Text style={styles.successBody}>
              <Text style={styles.successEmail}>{email}</Text> adresine sıfırlama bağlantısı gönderdik. Gelen kutunu kontrol et.
            </Text>
            <Button label="Giriş'e Dön" onPress={() => router.replace('/(auth)/login')} variant="primary" size="xl" style={styles.btn} />
          </View>
        )}

        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Giriş'e dön</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },
  glow1: { position: 'absolute', top: -60, left: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: Colors.goldGlow, opacity: 0.6 },
  backBtn: { marginTop: 60, marginBottom: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border2 },
  header: { marginTop: 16, marginBottom: 36, gap: 10 },
  logo: { fontSize: 13, fontWeight: '800', color: Colors.gold3, letterSpacing: 5 },
  title: { fontSize: 40, fontWeight: '800', color: Colors.text1, letterSpacing: -2, lineHeight: 44 },
  subtitle: { fontSize: 15, color: Colors.text3, lineHeight: 22 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface2, borderRadius: 16, borderWidth: 1, borderColor: Colors.border2, paddingHorizontal: 16, height: 56, marginBottom: 16 },
  inputFocused: { borderColor: Colors.gold3 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: Colors.text1, height: '100%' },
  error: { fontSize: 13, color: Colors.error, marginBottom: 12, textAlign: 'center' },
  btn: { marginTop: 8 },
  successContainer: { flex: 1, alignItems: 'center', paddingTop: 80, gap: 16 },
  successIcon: { marginBottom: 8 },
  successTitle: { fontSize: 28, fontWeight: '800', color: Colors.text1, letterSpacing: -1 },
  successBody: { fontSize: 15, color: Colors.text3, textAlign: 'center', lineHeight: 22 },
  successEmail: { fontWeight: '700', color: Colors.text1 },
  backLink: { alignItems: 'center', paddingVertical: 20 },
  backLinkText: { fontSize: 14, color: Colors.gold3, fontWeight: '600' },
});
