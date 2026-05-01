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
      {/* Arka plan — void noir */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['#0F0A18', Colors.bg, '#0A0C10']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Ambient ışık — sol üst köşe, altın tonu */}
      <View style={styles.ambientGold} />
      {/* Ambient ışık — sağ alt, rose tonu */}
      <View style={styles.ambientRose} />

      {/* İnce dikey çizgiler (editorial grid hissi) */}
      <View style={styles.gridLine1} />
      <View style={styles.gridLine2} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.topBar}>
          <Image
            source={require('../../assets/images/logo-butika.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
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
            colors={[Colors.gold2, Colors.gold3, Colors.gold4]}
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

  // Ambient lights
  ambientGold: {
    position: 'absolute',
    top: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.goldGlow,
    opacity: 0.7,
  },
  ambientRose: {
    position: 'absolute',
    bottom: 60,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: Colors.roseGlow,
    opacity: 0.5,
  },

  // Editorial grid lines
  gridLine1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33%',
    width: 0.5,
    backgroundColor: Colors.border1,
  },
  gridLine2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '66%',
    width: 0.5,
    backgroundColor: Colors.border1,
  },

  // Top bar
  topBar: {
    marginTop: 64,
    marginBottom: 0,
  },
  logoImg: {
    width: 180,
    height: 58,
  },
  logoMarkInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: Colors.gold3,
    opacity: 0.6,
  },
  logoText: {
    fontFamily: Fonts.ui,
    fontSize: 13,
    letterSpacing: 4,
    color: Colors.gold3,
  },

  // Hero
  heroSection: {
    marginTop: 48,
    marginBottom: 40,
    gap: 10,
  },
  heroEyebrow: {
    fontFamily: Fonts.uiMedium,
    fontSize: 9,
    letterSpacing: 3,
    color: Colors.gold3,
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: Fonts.editorial,
    fontSize: 52,
    letterSpacing: -0.5,
    color: Colors.text1,
    lineHeight: 54,
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
    backgroundColor: Colors.surface2,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    paddingHorizontal: 16,
    height: 54,
    position: 'relative',
    overflow: 'hidden',
  },
  fieldFocused: {
    borderColor: Colors.borderGold,
    backgroundColor: Colors.surface3,
  },
  fieldActiveLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: Colors.gold3,
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
