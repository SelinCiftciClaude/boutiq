import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email || !password) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    // Simulate auth - replace with real supabase auth
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    router.replace('/(tabs)');
  };

  const handleGuestLogin = () => {
    Haptics.selectionAsync();
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background */}
      <LinearGradient
        colors={[Colors.surface3, Colors.bg, Colors.bg]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.4, 1]}
      />

      {/* Decorative glow */}
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-down" size={24} color={Colors.text3} />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>BOUTIQ</Text>
          <Text style={styles.title}>Tekrar{'\n'}hoş geldin</Text>
          <Text style={styles.subtitle}>
            Favori butiğin seni bekliyor.
          </Text>
        </View>

        {/* Social Login */}
        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialBtn} onPress={handleGuestLogin}>
            <Ionicons name="logo-google" size={20} color={Colors.text1} />
            <Text style={styles.socialText}>Google ile devam</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialBtnSmall} onPress={handleGuestLogin}>
            <Ionicons name="logo-apple" size={22} color={Colors.text1} />
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>veya e-posta ile</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={[styles.inputWrapper, focused === 'email' && styles.inputWrapperFocused]}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={focused === 'email' ? Colors.gold3 : Colors.text4}
              style={styles.inputIcon}
            />
            <TextInput
              ref={emailRef}
              style={styles.input}
              placeholder="E-posta adresin"
              placeholderTextColor={Colors.text5}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              onSubmitEditing={() => passwordRef.current?.focus()}
              selectionColor={Colors.gold3}
            />
          </View>

          {/* Password */}
          <View style={[styles.inputWrapper, focused === 'password' && styles.inputWrapperFocused]}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={focused === 'password' ? Colors.gold3 : Colors.text4}
              style={styles.inputIcon}
            />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Şifren"
              placeholderTextColor={Colors.text5}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              onSubmitEditing={handleLogin}
              selectionColor={Colors.gold3}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((p) => !p)}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color={Colors.text4}
              />
            </TouchableOpacity>
          </View>

          {/* Forgot */}
          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Şifreni mi unuttun?</Text>
          </TouchableOpacity>
        </View>

        {/* Login CTA */}
        <Button
          label="Giriş Yap"
          onPress={handleLogin}
          variant="primary"
          size="xl"
          loading={loading}
          disabled={!email || !password}
          style={styles.loginBtn}
        />

        {/* Register */}
        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Hesabın yok mu?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Ücretsiz oluştur</Text>
          </TouchableOpacity>
        </View>

        {/* Guest */}
        <TouchableOpacity onPress={handleGuestLogin} style={styles.guestBtn}>
          <Text style={styles.guestText}>Misafir olarak devam et</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: 48,
  },
  glow1: {
    position: 'absolute',
    top: 0,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.goldGlow,
    opacity: 0.5,
  },
  glow2: {
    position: 'absolute',
    top: 100,
    right: -150,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: Colors.purpleGlow,
    opacity: 0.4,
  },
  backBtn: {
    marginTop: 60,
    marginBottom: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  header: {
    marginTop: 16,
    marginBottom: 36,
    gap: 10,
  },
  logo: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.gold3,
    letterSpacing: 5,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.text1,
    letterSpacing: -2,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.text3,
    lineHeight: 22,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  socialBtnSmall: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border1,
  },
  dividerText: {
    fontSize: 12,
    color: Colors.text4,
    fontWeight: '500',
  },
  form: {
    gap: 14,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperFocused: {
    borderColor: Colors.gold3,
    backgroundColor: Colors.surface2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text1,
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 13,
    color: Colors.gold3,
    fontWeight: '600',
  },
  loginBtn: {
    marginBottom: 20,
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  registerText: {
    fontSize: 14,
    color: Colors.text4,
  },
  registerLink: {
    fontSize: 14,
    color: Colors.gold3,
    fontWeight: '700',
  },
  guestBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  guestText: {
    fontSize: 13,
    color: Colors.text5,
    fontWeight: '500',
  },
});
