import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
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
import { Fonts } from '../../constants/Typography';
import { Button } from '../../components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [focused, setFocused]       = useState<'email' | 'password' | null>(null);
  const { signIn } = useAuth();

  const passwordRef = useRef<TextInput>(null);
  const shakeAnim   = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!email || !password) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setErrorMsg(null);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setErrorMsg('E-posta veya şifre hatalı.');
      shake();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Sıcak krem arka plan */}
      <LinearGradient
        colors={[Colors.surface2, Colors.bg, Colors.surface1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Tente şerit doku — üst kısım */}
      <View style={styles.tenteStripes}>
        {[...Array(8)].map((_, i) => (
          <View key={i} style={[styles.tenteStripe, { backgroundColor: i % 2 === 0 ? Colors.stripeWarm : Colors.stripeCool }]} />
        ))}
      </View>
      {/* Tente alt kenarı — burgund çizgi */}
      <View style={styles.tenteEdge} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo — Playfair + burgund */}
        <View style={styles.topBar}>
          <Text style={styles.logoText}>BUTİKA</Text>
          <Text style={styles.logoTagline}>bağımsız modanın çatısı</Text>
        </View>

        {/* Hero başlık */}
        <View style={styles.heroSection}>
          <Text style={styles.heroEyebrow}>HOŞ GELDİN</Text>
          <Text style={styles.heroTitle}>Tekrar{'\n'}merhaba.</Text>
          <Text style={styles.heroSub}>
            Favori butiğin seni bekliyor.
          </Text>
        </View>

        {/* Form alanı */}
        <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>

          {/* Email */}
          <View style={[styles.field, focused === 'email' && styles.fieldFocused]}>
            <Ionicons
              name="mail-outline"
              size={16}
              color={focused === 'email' ? Colors.gold3 : Colors.text4}
              style={styles.fieldIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="E-posta"
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
            {focused === 'email' && (
              <View style={styles.fieldActiveLine} />
            )}
          </View>

          {/* Şifre */}
          <View style={[styles.field, focused === 'password' && styles.fieldFocused]}>
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={focused === 'password' ? Colors.gold3 : Colors.text4}
              style={styles.fieldIcon}
            />
            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Şifre"
              placeholderTextColor={Colors.text5}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              onSubmitEditing={handleLogin}
              selectionColor={Colors.gold3}
            />
            <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons
                name={showPass ? 'eye-outline' : 'eye-off-outline'}
                size={16}
                color={Colors.text4}
              />
            </TouchableOpacity>
            {focused === 'password' && (
              <View style={styles.fieldActiveLine} />
            )}
          </View>

          {/* Şifremi unuttum */}
          <TouchableOpacity style={styles.forgotRow} onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={styles.forgotText}>Şifremi unuttum</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Hata */}
        {errorMsg && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Giriş butonu */}
        <TouchableOpacity
          style={[styles.loginBtn, (!email || !password || loading) && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={!email || !password || loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.rose2, Colors.rose3, Colors.rose4]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.loginBtnText}>
            {loading ? '...' : 'GİRİŞ YAP'}
          </Text>
          {!loading && <View style={styles.loginBtnArrow}>
            <Ionicons name="arrow-forward" size={16} color={Colors.bg} />
          </View>}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ya da</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Kayıt ol linki */}
        <View style={styles.registerRow}>
          <Text style={styles.registerLabel}>Hesabın yok mu?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Ücretsiz kayıt ol</Text>
          </TouchableOpacity>
        </View>

        {/* Alt dekoratif imza */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>bağımsız modanın evi</Text>
          <View style={styles.footerLine} />
        </View>

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
    paddingHorizontal: 28,
    paddingBottom: 48,
  },

  // Tente şerit dokusu — üst kısım
  tenteStripes: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  tenteStripe: {
    flex: 1,
    height: '100%',
    opacity: 0.55,
  },
  tenteEdge: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.rose3,
    opacity: 0.7,
  },

  // Top bar
  topBar: {
    marginTop: 100,
    marginBottom: 0,
    gap: 4,
  },
  logoText: {
    fontFamily: Fonts.display,
    fontSize: 42,
    letterSpacing: 2,
    color: Colors.rose3,
    lineHeight: 46,
  },
  logoTagline: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.teal2,
    textTransform: 'uppercase',
  },
  logoImg: { width: 180, height: 58 },

  // Hero
  heroSection: {
    marginTop: 40,
    marginBottom: 36,
    gap: 10,
  },
  heroEyebrow: {
    fontFamily: Fonts.uiMedium,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.rose3,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 48,
    letterSpacing: -0.3,
    color: Colors.text1,
    lineHeight: 52,
  },
  heroSub: {
    fontFamily: Fonts.uiLight,
    fontSize: 15,
    color: Colors.text3,
    lineHeight: 22,
    marginTop: 4,
  },

  // Form
  form: {
    gap: 12,
    marginBottom: 8,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: 16,
    height: 54,
    position: 'relative',
    overflow: 'hidden',
  },
  fieldFocused: {
    borderColor: Colors.borderBurgund,
    backgroundColor: Colors.surface1,
  },
  fieldActiveLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.rose3,
  },
  fieldIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.uiLight,
    fontSize: 15,
    color: Colors.text1,
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  forgotText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 12,
    color: Colors.gold3,
    letterSpacing: 0.3,
  },

  // Error
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    fontFamily: Fonts.uiLight,
    fontSize: 13,
    color: Colors.error,
  },

  // Login button
  loginBtn: {
    height: 58,
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  loginBtnDisabled: {
    opacity: 0.45,
  },
  loginBtnText: {
    fontFamily: Fonts.ui,
    fontSize: 13,
    letterSpacing: 2.5,
    color: Colors.bg,
  },
  loginBtnArrow: {
    position: 'absolute',
    right: 20,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: Colors.border2,
  },
  dividerText: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
    letterSpacing: 0.5,
  },

  // Register
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 40,
  },
  registerLabel: {
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text4,
  },
  registerLink: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: Colors.text1,
    letterSpacing: 0.2,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  footerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: Colors.border1,
  },
  footerText: {
    fontFamily: Fonts.uiLight,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.text5,
    textTransform: 'uppercase',
  },
});
