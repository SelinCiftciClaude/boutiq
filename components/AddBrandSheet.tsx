import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/Colors';
import { Brand, BrandCategory } from '../types';
import { CATEGORIES } from '../constants/MockData';

const { height } = Dimensions.get('window');

const CATEGORY_LABELS: Record<string, string> = {
  giyim: 'Giyim',
  ayakkabı: 'Ayakkabı',
  aksesuar: 'Aksesuar',
  çanta: 'Çanta',
  takı: 'Takı',
  güzellik: 'Güzellik',
  ev: 'Ev',
  spor: 'Spor',
  vintage: 'Vintage',
  tasarımcı: 'Tasarımcı',
};

interface AddBrandSheetProps {
  brand: Brand | null;
  visible: boolean;
  alreadySaved?: boolean;
  currentCategory?: BrandCategory;
  onSave: (brand: Brand, category: BrandCategory) => void;
  onRemove?: (brandId: string) => void;
  onClose: () => void;
}

export function AddBrandSheet({
  brand,
  visible,
  alreadySaved,
  currentCategory,
  onSave,
  onRemove,
  onClose,
}: AddBrandSheetProps) {
  const [selected, setSelected] = useState<BrandCategory | null>(currentCategory ?? null);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSelected(currentCategory ?? null);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSave = () => {
    if (!brand || !selected) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(brand, selected);
    onClose();
  };

  const handleRemove = () => {
    if (!brand) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRemove?.(brand.id);
    onClose();
  };

  if (!brand) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="auto"
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={[Colors.surface2, Colors.surface1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Handle */}
        <View style={styles.handle} />

        {/* Brand preview */}
        <View style={styles.brandPreview}>
          <Image source={{ uri: brand.logo }} style={styles.brandLogo} />
          <View style={styles.brandInfo}>
            <View style={styles.brandNameRow}>
              <Text style={styles.brandName}>{brand.name}</Text>
              {brand.isVerified && (
                <Ionicons name="checkmark-circle" size={14} color={Colors.gold3} />
              )}
            </View>
            <Text style={styles.brandHandle}>{brand.handle}</Text>
          </View>
          {alreadySaved && (
            <View style={styles.savedPill}>
              <Ionicons name="checkmark" size={12} color={Colors.success} />
              <Text style={styles.savedPillText}>Kayıtlı</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>
          {alreadySaved ? 'Kategoriyi Güncelle' : 'Koleksiyonuna Ekle'}
        </Text>
        <Text style={styles.subtitle}>
          Bu butik hangi koleksiyonunda görünsün?
        </Text>

        {/* Categories */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.categoriesGrid}
        >
          {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => {
            const isSelected = selected === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelected(cat.id as BrandCategory);
                }}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                activeOpacity={0.75}
              >
                {isSelected && (
                  <LinearGradient
                    colors={[Colors.gold2, Colors.gold4]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View style={[styles.chipIconWrap, isSelected && styles.chipIconWrapSelected]}>
                  <Text style={styles.chipIcon}>{cat.icon}</Text>
                </View>
                <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                  {cat.label}
                </Text>
                {isSelected && (
                  <View style={styles.chipCheck}>
                    <Ionicons name="checkmark" size={12} color={Colors.bg} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          {alreadySaved && (
            <TouchableOpacity style={styles.removeBtn} onPress={handleRemove}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={styles.removeBtnText}>Kaldır</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.saveBtn, !selected && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!selected}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={selected ? [Colors.gold2, Colors.gold4] : [Colors.surface4, Colors.surface3]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtnGradient}
            >
              <Ionicons
                name={alreadySaved ? 'refresh' : 'add-circle'}
                size={18}
                color={selected ? Colors.bg : Colors.text5}
              />
              <Text style={[styles.saveBtnText, !selected && styles.saveBtnTextDisabled]}>
                {alreadySaved ? 'Güncelle' : 'Koleksiyona Ekle'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 48,
    borderWidth: 1,
    borderColor: Colors.border2,
    overflow: 'hidden',
    borderBottomWidth: 0,
    maxHeight: height * 0.82,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Colors.border3,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  brandPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  brandLogo: {
    width: 52, height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface3,
    borderWidth: 2,
    borderColor: Colors.border2,
  },
  brandInfo: { flex: 1 },
  brandNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  brandName: {
    fontSize: 17, fontWeight: '700',
    color: Colors.text1, letterSpacing: -0.3,
  },
  brandHandle: { fontSize: 13, color: Colors.text4, marginTop: 2 },
  savedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.successGlow,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: `${Colors.success}40`,
  },
  savedPillText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  title: {
    fontSize: 22, fontWeight: '800',
    color: Colors.text1, letterSpacing: -0.8,
    paddingHorizontal: 24, marginBottom: 4,
  },
  subtitle: {
    fontSize: 14, color: Colors.text4,
    paddingHorizontal: 24, marginBottom: 16, lineHeight: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: Colors.surface3,
    borderWidth: 1,
    borderColor: Colors.border2,
    overflow: 'hidden',
    position: 'relative',
  },
  categoryChipSelected: {
    borderColor: Colors.gold3,
  },
  chipIconWrap: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface4,
    alignItems: 'center', justifyContent: 'center',
  },
  chipIconWrapSelected: {
    backgroundColor: 'rgba(7,7,15,0.25)',
  },
  chipIcon: { fontSize: 15 },
  chipLabel: {
    fontSize: 14, fontWeight: '600',
    color: Colors.text3, flex: 1,
  },
  chipLabelSelected: {
    color: Colors.bg, fontWeight: '700',
  },
  chipCheck: {
    width: 18, height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(7,7,15,0.30)',
    alignItems: 'center', justifyContent: 'center',
  },
  actions: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  removeBtnText: {
    fontSize: 15, fontWeight: '600', color: Colors.error,
  },
  saveBtn: { borderRadius: 16, overflow: 'hidden' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  saveBtnText: {
    fontSize: 16, fontWeight: '800',
    color: Colors.bg, letterSpacing: -0.2,
  },
  saveBtnTextDisabled: { color: Colors.text5 },
});
