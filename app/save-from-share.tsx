import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { useAddFavorite } from '@/hooks/useFavorites';

function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

interface Props {
  visible: boolean;
  url: string;
  onClose: () => void;
}

export function SaveFromShareModal({ visible, url, onClose }: Props) {
  const addFavorite = useAddFavorite();

  const [editableUrl, setEditableUrl] = useState(url);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error' | 'duplicate'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Yeni URL gelince state'i sıfırla
  useEffect(() => {
    setEditableUrl(url);
    setStatus('idle');
    setErrorMsg('');
  }, [url]);

  const handleSave = async () => {
    const trimmedUrl = editableUrl.trim();
    if (!trimmedUrl || status === 'saving') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStatus('saving');
    setErrorMsg('');

    try {
      await addFavorite.mutateAsync({ url: trimmedUrl, watchPriceDrop: true });
      setStatus('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(onClose, 1600);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (e?.message === 'DUPLICATE') {
        setStatus('duplicate');
      } else {
        setStatus('error');
        setErrorMsg(e?.message ?? 'Bilinmeyen hata');
      }
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setErrorMsg('');
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* ── Başarılı ── */}
          {status === 'success' && (
            <View style={styles.centerBlock}>
              <Ionicons name="checkmark-circle" size={44} color={Colors.success} />
              <Text style={styles.feedbackTitle}>Favorilere eklendi</Text>
              <Text style={styles.feedbackSub}>Fiyat takibi başlatıldı</Text>
            </View>
          )}

          {/* ── Zaten kayıtlı ── */}
          {status === 'duplicate' && (
            <View style={styles.centerBlock}>
              <Ionicons name="bookmark" size={44} color={Colors.gold3} />
              <Text style={styles.feedbackTitle}>Zaten kaydedilmiş</Text>
              <Text style={styles.feedbackSub}>Bu ürün favori listenizde</Text>
              <TouchableOpacity style={styles.textBtn} onPress={handleClose}>
                <Text style={styles.textBtnLabel}>Kapat</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Hata ── */}
          {status === 'error' && (
            <View style={styles.centerBlock}>
              <Ionicons name="alert-circle" size={44} color={Colors.error} />
              <Text style={[styles.feedbackTitle, { color: Colors.error }]}>Kaydedilemedi</Text>
              <Text style={styles.feedbackSub}>
                {errorMsg || 'Bağlantı veya URL sorunu. Tekrar dene.'}
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
                <Text style={styles.primaryBtnText}>Tekrar Dene</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.textBtn} onPress={handleClose}>
                <Text style={styles.textBtnLabel}>Kapat</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Normal / Yükleniyor ── */}
          {(status === 'idle' || status === 'saving') && (
            <>
              <Text style={styles.title}>Favorilere ekle</Text>
              <Text style={styles.subtitle}>
                Kaydedilecek linki kontrol et, gerekirse düzenle.
              </Text>

              {/* Düzenlenebilir URL alanı */}
              <View style={styles.urlInputWrap}>
                <Ionicons name="link-outline" size={15} color={Colors.text4} style={styles.urlIcon} />
                <TextInput
                  style={styles.urlInput}
                  value={editableUrl}
                  onChangeText={setEditableUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="https://..."
                  placeholderTextColor={Colors.text5}
                  selectionColor={Colors.rose3}
                  editable={status !== 'saving'}
                  numberOfLines={1}
                />
              </View>

              {/* Domain önizleme */}
              {!!editableUrl.trim() && (
                <Text style={styles.domainHint}>{getDomain(editableUrl)}</Text>
              )}

              {/* Kaydet butonu */}
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  (!editableUrl.trim() || status === 'saving') && styles.primaryBtnDisabled,
                ]}
                onPress={handleSave}
                disabled={!editableUrl.trim() || status === 'saving'}
                activeOpacity={0.82}
              >
                {status === 'saving' ? (
                  <>
                    <ActivityIndicator size="small" color={Colors.surface1} />
                    <Text style={styles.primaryBtnText}>Ürün bilgisi alınıyor...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="heart-outline" size={18} color={Colors.surface1} />
                    <Text style={styles.primaryBtnText}>Favorilere Ekle</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClose} style={styles.textBtn}>
                <Text style={styles.textBtnLabel}>İptal</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  sheet: {
    backgroundColor: Colors.surface1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 44,
    borderWidth: 0.5,
    borderBottomWidth: 0,
    borderColor: Colors.border2,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border3,
    alignSelf: 'center',
    marginBottom: 24,
  },

  title: {
    fontFamily: Fonts.displayBold,
    fontSize: 22,
    color: Colors.text1,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text3,
    lineHeight: 21,
    marginBottom: 18,
  },

  // Düzenlenebilir URL
  urlInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    gap: 8,
  },
  urlIcon: {
    flexShrink: 0,
  },
  urlInput: {
    flex: 1,
    fontFamily: Fonts.uiLight,
    fontSize: 13,
    color: Colors.text2,
    padding: 0,
  },
  domainHint: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text5,
    marginBottom: 20,
    paddingLeft: 4,
  },

  // Buton
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 54,
    borderRadius: 14,
    backgroundColor: Colors.rose3,
    marginBottom: 10,
  },
  primaryBtnDisabled: {
    opacity: 0.40,
  },
  primaryBtnText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 15,
    color: Colors.surface1,
    letterSpacing: 0.2,
  },

  // İptal / Kapat linki
  textBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  textBtnLabel: {
    fontFamily: Fonts.uiLight,
    fontSize: 15,
    color: Colors.text4,
  },

  // Geri bildirim bloğu (success / duplicate / error)
  centerBlock: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  feedbackTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 20,
    color: Colors.text1,
    marginTop: 4,
  },
  feedbackSub: {
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text3,
    textAlign: 'center',
    lineHeight: 20,
  },
});
