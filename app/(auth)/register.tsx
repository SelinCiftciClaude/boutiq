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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/Colors';
import { Button } from '../../components/ui/Button';
import { CATEGORIES } from '../../constants/MockData';
import { useAuth } from '@/context/AuthContext';

const STEPS = ['Bilgiler', 'Zevkler', 'Hazır!'];

export default function RegisterScreen() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const { signUp } = useAuth();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const toggleCategory = (id: string) => {
    Haptics.selectionAsync();
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      setStep(0);
      return;
    }
    router.replace('/(tabs)');
  };

  const canProceed = () => {
    if (step === 0) return name.length > 1 && email.includes('@') && password.length >= 6;
    if (step === 1) return selectedCategories.length > 0;
    return true;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[Colors.surface3, Colors.surface2, Colors.bg]}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.35, 1]}
      />
      <View style={styles.glow} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => (step > 0 ? setStep((s) => s - 1) : router.back())}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.text3} />
        </TouchableOpacity>

        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  i <= step && { backgroundColor: Colors.gold3 },
                ]}
              />
              {i < STEPS.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    i < step && { backgroundColor: Colors.gold3 },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>BOUTIQ</Text>
          {step === 0 && (
            <>
              <Text style={styles.title}>Hesap oluştur</Text>
              <Text style={styles.subtitle}>Ücretsiz ve hızlı. Kredi kartı gerekmez.</Text>
            </>
          )}
          {step === 1 && (
            <>
              <Text style={styles.title}>Ne seviyorsun?</Text>
              <Text style={styles.subtitle}>Seçimlerine göre en iyi butiği sana bulacağız.</Text>
            </>
          )}
          {step === 2 && (
            <>
              <Text style={styles.titleLarge}>✦</Text>
              <Text style={styles.title}>Her şey hazır!</Text>
              <Text style={styles.subtitle}>
                Hoş geldin{name ? `, ${name.split(' ')[0]}` : ''}! Butikler seni bekliyor.
              </Text>
            </>
          )}
        </View>

        {/* Step 0: Info */}
        {step === 0 && (
          <View style={styles.form}>
            <View style={[styles.inputWrapper, focused === 'name' && styles.focused]}>
              <Ionicons name="person-outline" size={18} color={focused === 'name' ? Colors.gold3 : Colors.text4} style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder="Adın soyadın"
                placeholderTextColor={Colors.text5}
                value={name}
                onChangeText={setName}
                returnKeyType="next"
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={() => emailRef.current?.focus()}
                selectionColor={Colors.gold3}
              />
            </View>

            <View style={[styles.inputWrapper, focused === 'email' && styles.focused]}>
              <Ionicons name="mail-outline" size={18} color={focused === 'email' ? Colors.gold3 : Colors.text4} style={styles.icon} />
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

            <View style={[styles.inputWrapper, focused === 'password' && styles.focused]}>
              <Ionicons name="lock-closed-outline" size={18} color={focused === 'password' ? Colors.gold3 : Colors.text4} style={styles.icon} />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Şifre (min. 6 karakter)"
                placeholderTextColor={Colors.text5}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={handleNext}
                selectionColor={Colors.gold3}
              />
              <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
                <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={18} color={Colors.text4} />
              </TouchableOpacity>
            </View>

            <Text style={styles.terms}>
              Devam ederek{' '}
              <Text style={styles.termsLink}>Kullanım Şartları</Text>
              {' '}ve{' '}
              <Text style={styles.termsLink}>Gizlilik Politikası</Text>
              {'\'nı kabul etmiş olursun.'}
            </Text>
          </View>
        )}

        {/* Step 1: Categories */}
        {step === 1 && (
          <View style={styles.categories}>
            {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
              const selected = selectedCategories.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => toggleCategory(cat.id)}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryLabel, selected && styles.categoryLabelSelected]}>
                    {cat.label}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark-circle" size={14} color={Colors.gold3} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Step 2: Ready */}
        {step === 2 && (
          <View style={styles.readySection}>
            {[
              { icon: 'star', label: 'Kişiselleştirilmiş butik önerileri', color: Colors.gold3 },
              { icon: 'heart', label: 'Sınırsız ürün favorileme', color: '#F43F5E' },
              { icon: 'notifications', label: 'Kampanya bildirimleri', color: Colors.purple3 },
              { icon: 'bicycle', label: 'Kargo takip entegrasyonu', color: Colors.success },
            ].map((item, i) => (
              <View key={i} style={styles.readyItem}>
                <View style={[styles.readyIcon, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={styles.readyLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

        <Button
          label={step === STEPS.length - 1 ? 'BOUTIQ\'e Gir' : 'Devam Et'}
          onPress={handleNext}
          variant="primary"
          size="xl"
          loading={loading}
          disabled={!canProceed()}
          style={styles.cta}
          icon={step === STEPS.length - 1 ? <Ionicons name="sparkles" size={18} color={Colors.bg} /> : undefined}
          iconPosition="right"
        />

        <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.loginRow}>
          <Text style={styles.loginText}>Hesabın var mı? </Text>
          <Text style={styles.loginLink}>Giriş yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },
  glow: {
    position: 'absolute',
    top: -50,
    right: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: Colors.goldGlow,
    opacity: 0.6,
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
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surface4,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.surface4,
    marginHorizontal: 4,
  },
  header: { marginBottom: 32, gap: 8 },
  logo: { fontSize: 12, fontWeight: '800', color: Colors.gold3, letterSpacing: 5 },
  title: { fontSize: 36, fontWeight: '800', color: Colors.text1, letterSpacing: -1.5, lineHeight: 40 },
  titleLarge: { fontSize: 40, color: Colors.gold3 },
  subtitle: { fontSize: 15, color: Colors.text3, lineHeight: 22 },
  form: { gap: 14, marginBottom: 16 },
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
  focused: { borderColor: Colors.gold3 },
  icon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: Colors.text1, height: '100%' },
  terms: { fontSize: 12, color: Colors.text4, lineHeight: 18 },
  termsLink: { color: Colors.gold3, fontWeight: '600' },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.surface2,
    borderWidth: 1,
    borderColor: Colors.border2,
  },
  categoryChipSelected: {
    backgroundColor: Colors.glassGold,
    borderColor: Colors.borderGold,
  },
  categoryIcon: { fontSize: 18 },
  categoryLabel: { fontSize: 14, fontWeight: '600', color: Colors.text3 },
  categoryLabelSelected: { color: Colors.gold4 },
  readySection: { gap: 14, marginBottom: 36 },
  readyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.surface2,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border1,
  },
  readyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyLabel: { fontSize: 15, fontWeight: '600', color: Colors.text2, flex: 1, letterSpacing: -0.2 },
  cta: { marginBottom: 20 },
  errorText: {
    fontSize: 13,
    color: '#ff6b6b',
    marginBottom: 12,
    textAlign: 'center',
  },
  loginRow: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  loginText: { fontSize: 14, color: Colors.text4 },
  loginLink: { fontSize: 14, color: Colors.gold3, fontWeight: '700' },
});
