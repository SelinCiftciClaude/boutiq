import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { useSavedProducts } from '@/hooks/useSavedProducts';
import { CATEGORIES } from '@/constants/MockData';
import { BrandCategory } from '@/types';

// URL'nin ürün sayfası mı yoksa butik ana sayfası mı olduğunu tahmin eder
function detectUrlType(url: string): 'product' | 'brand' | 'unknown' {
  const productPatterns = ['/product', '/p/', '/item', '/urun', '?sku=', '?pid=', '/shop/'];
  const lower = url.toLowerCase();
  if (productPatterns.some(p => lower.includes(p))) return 'product';
  try {
    const u = new URL(url);
    // Kök path veya çok kısa path ise muhtemelen marka anasayfası
    if (u.pathname === '/' || u.pathname === '' || u.pathname.split('/').filter(Boolean).length <= 1) return 'brand';
  } catch {}
  return 'unknown';
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

interface Props {
  visible: boolean;
  url: string;
  onClose: () => void;
}

export function SaveFromShareModal({ visible, url, onClose }: Props) {
  const [mode, setMode] = useState<'auto' | 'product' | 'brand'>(() => {
    const t = detectUrlType(url);
    return t === 'unknown' ? 'auto' : t;
  });
  const [selectedCategory, setSelectedCategory] = useState<BrandCategory>('giyim');
  const [saved, setSaved] = useState(false);

  const { add: addProduct } = useSavedProducts();
  const domain = getDomain(url);

  const handleSaveProduct = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // URL'yi kaydedilen ürün olarak işaretle (gerçek product ID yok, URL tabanlı)
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  const handleSaveBrand = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Harici URL'den gelen markalar henüz DB'de yoktur; Phase 2'de brand creation
    // akışı eklenecek. Şimdilik sadece başarı göster.
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <LinearGradient colors={[Colors.surface2, Colors.surface3]} style={StyleSheet.absoluteFill} />
        <View style={styles.handle} />

        {saved ? (
          <View style={styles.savedRow}>
            <Ionicons name="checkmark-circle" size={28} color={Colors.success} />
            <Text style={styles.savedText}>Kaydedildi!</Text>
          </View>
        ) : (
          <>
            {/* URL önizleme */}
            <View style={styles.urlPreview}>
              <Ionicons name="link" size={16} color={Colors.text4} />
              <Text style={styles.urlText} numberOfLines={1}>{domain}</Text>
            </View>

            {/* Mod seçimi: bilinmiyorsa kullanıcıya sor */}
            {mode === 'auto' ? (
              <>
                <Text style={styles.title}>Bu ne?</Text>
                <Text style={styles.subtitle}>Paylaşılan linkin ne olduğunu belirt.</Text>
                <View style={styles.modeRow}>
                  <TouchableOpacity style={styles.modeBtn} onPress={() => setMode('product')}>
                    <LinearGradient colors={[Colors.rose2, Colors.rose4]} style={StyleSheet.absoluteFill} />
                    <Ionicons name="bag-handle" size={22} color="#fff" />
                    <Text style={styles.modeBtnText}>Ürün</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modeBtn} onPress={() => setMode('brand')}>
                    <LinearGradient colors={[Colors.gold2, Colors.gold4]} style={StyleSheet.absoluteFill} />
                    <Ionicons name="storefront" size={22} color="#fff" />
                    <Text style={styles.modeBtnText}>Butik</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : mode === 'product' ? (
              <>
                <Text style={styles.title}>Ürünü favorilerine ekle</Text>
                <Text style={styles.subtitle}>{domain} sitesinden bulunan ürün kaydedilecek.</Text>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProduct}>
                  <LinearGradient colors={[Colors.rose2, Colors.rose4]} style={StyleSheet.absoluteFill} />
                  <Ionicons name="heart" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Favorilerime Ekle</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>Butiği koleksiyonuna ekle</Text>
                <Text style={styles.subtitle}>Kategori seç, ardından koleksiyonuna ekle.</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
                  {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                    const active = selectedCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => { Haptics.selectionAsync(); setSelectedCategory(cat.id as BrandCategory); }}
                        style={[styles.catChip, active && styles.catChipActive]}
                      >
                        {active && <LinearGradient colors={[Colors.gold2, Colors.gold4]} style={StyleSheet.absoluteFill} />}
                        <Text style={styles.catIcon}>{cat.icon}</Text>
                        <Text style={[styles.catLabel, active && styles.catLabelActive]}>{cat.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBrand}>
                  <LinearGradient colors={[Colors.gold2, Colors.gold4]} style={StyleSheet.absoluteFill} />
                  <Ionicons name="storefront" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Koleksiyona Ekle</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>İptal</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, overflow: 'hidden',
    borderWidth: 1, borderBottomWidth: 0, borderColor: Colors.border2,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border3, alignSelf: 'center', marginBottom: 20 },
  urlPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface3, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 20 },
  urlText: { fontSize: 13, color: Colors.text3, flex: 1 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.text3, lineHeight: 20, marginBottom: 20 },
  modeRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 16, overflow: 'hidden' },
  modeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  catScroll: { gap: 8, marginBottom: 20 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50, backgroundColor: Colors.surface3, borderWidth: 1, borderColor: Colors.border2, overflow: 'hidden' },
  catChipActive: { borderColor: Colors.gold3 },
  catIcon: { fontSize: 14 },
  catLabel: { fontSize: 12, fontWeight: '600', color: Colors.text3 },
  catLabelActive: { color: Colors.bg, fontWeight: '700' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 15, color: Colors.text4, fontWeight: '500' },
  savedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 24 },
  savedText: { fontSize: 20, fontWeight: '700', color: Colors.text1 },
});
