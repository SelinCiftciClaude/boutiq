import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';

function SectionLabel({ text }: { text: string }) {
  return (
    <Text style={{
      fontFamily: Fonts.uiMedium, fontSize: 10, color: Colors.gold2,
      letterSpacing: 1.5, marginHorizontal: 16, marginBottom: 8, marginTop: 20,
    }}>
      {text}
    </Text>
  );
}

function RowItem({ icon, label, value, onPress, danger }: {
  icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={row.item} onPress={onPress} activeOpacity={0.75} disabled={!onPress}>
      <View style={[row.icon, danger && row.iconDanger]}>
        <Ionicons name={icon as any} size={16} color={danger ? Colors.error : Colors.gold2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[row.label, danger && { color: Colors.error }]}>{label}</Text>
        {value && <Text style={row.value}>{value}</Text>}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={15} color={Colors.text4} />}
    </TouchableOpacity>
  );
}

const row = StyleSheet.create({
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surface1, paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border1,
  },
  icon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: Colors.goldGlow,
    alignItems: 'center', justifyContent: 'center',
  },
  iconDanger: { backgroundColor: 'rgba(140,21,32,0.10)' },
  label: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.text1 },
  value: { fontFamily: Fonts.uiLight, fontSize: 11, color: Colors.text4, marginTop: 1 },
});

export default function AccountSettingsScreen() {
  const navigation = useNavigation();
  const goBack = () => navigation.canGoBack() ? navigation.goBack() : router.replace('/(tabs)/profile' as any);
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [changingPassword, setChangingPassword] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordChange = async () => {
    if (!newPw || newPw.length < 6) {
      Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalı.');
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);
    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Başarılı', 'Şifren güncellendi.');
      setChangingPassword(false);
      setOldPw(''); setNewPw('');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hesabı Sil',
      'Bu işlem geri alınamaz. Tüm verilerinin kalıcı olarak silineceğini onaylıyor musun?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Talep Alındı', 'Hesap silme talebiniz alındı. 30 gün içinde işleme konulacak ve e-posta adresinize bilgi gönderilecek. (KVKK Md. 11)');
          },
        },
      ],
    );
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={[Colors.surface1, Colors.bg]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.text1} />
        </TouchableOpacity>
        <Text style={s.title}>Hesap & Gizlilik</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionLabel text="HESAP BİLGİLERİ" />
        <View style={s.group}>
          <RowItem icon="mail-outline" label="E-posta" value={user?.email ?? '—'} />
          <RowItem
            icon="lock-closed-outline"
            label="Şifre değiştir"
            onPress={() => setChangingPassword(!changingPassword)}
          />
        </View>

        {/* Şifre formu */}
        {changingPassword && (
          <View style={s.pwForm}>
            <TextInput
              style={s.input} placeholder="Yeni şifre (min. 6 karakter)"
              placeholderTextColor={Colors.text5}
              value={newPw} onChangeText={setNewPw}
              secureTextEntry autoCapitalize="none"
              selectionColor={Colors.rose3}
            />
            <TouchableOpacity
              style={[s.pwBtn, (!newPw || pwLoading) && s.pwBtnDisabled]}
              onPress={handlePasswordChange}
              disabled={!newPw || pwLoading}
            >
              {pwLoading
                ? <ActivityIndicator size="small" color={Colors.bg} />
                : <Text style={s.pwBtnText}>Güncelle</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        <SectionLabel text="GİZLİLİK & KVKK" />
        <View style={s.group}>
          <RowItem
            icon="shield-checkmark-outline"
            label="Gizlilik Politikası"
            value="KVKK & kişisel veri işleme"
            onPress={() => Alert.alert('Gizlilik', 'Verileriniz KVKK kapsamında işlenmekte ve üçüncü şahıslarla paylaşılmamaktadır.')}
          />
          <RowItem
            icon="document-text-outline"
            label="Kullanım Koşulları"
            onPress={() => Alert.alert('Kullanım Koşulları', 'Butika kullanım koşulları yakında yayınlanacaktır.')}
          />
          <RowItem
            icon="cloud-download-outline"
            label="Verilerimi İndir"
            value="Kişisel verilerinin kopyasını al"
            onPress={() => Alert.alert('Talep Alındı', 'Veri kopyası e-posta adresinize gönderilecek. (KVKK Md. 11-ç)')}
          />
        </View>

        <SectionLabel text="HESAP İŞLEMLERİ" />
        <View style={s.group}>
          <RowItem
            icon="trash-outline"
            label="Hesabı Sil"
            value="Tüm verileri kalıcı olarak sil"
            danger
            onPress={handleDeleteAccount}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.surface2, borderWidth: 1, borderColor: Colors.border2,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', fontFamily: Fonts.displayBold, fontSize: 18, color: Colors.text1 },
  group: { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.border2 },
  pwForm: {
    marginHorizontal: 16, marginTop: 8, gap: 8,
    backgroundColor: Colors.surface2, borderRadius: 14,
    padding: 14, borderWidth: 0.5, borderColor: Colors.border2,
  },
  input: {
    backgroundColor: Colors.surface3, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border2,
    paddingHorizontal: 14, paddingVertical: 11,
    fontFamily: Fonts.uiLight, fontSize: 14, color: Colors.text1,
  },
  pwBtn: {
    backgroundColor: Colors.rose3, borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  pwBtnDisabled: { opacity: 0.5 },
  pwBtnText: { fontFamily: Fonts.uiMedium, fontSize: 14, color: '#FFF9EE' },
});
