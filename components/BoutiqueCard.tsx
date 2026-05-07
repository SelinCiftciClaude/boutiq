import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';

// ── Tipler ───────────────────────────────────────────────────────────────────

export type BoutiqueStatus = 'synced' | 'pending' | 'error' | 'manual';

export interface ManagedBoutique {
  id: string;
  name: string;
  handle: string;
  logoUrl?: string;
  category: string;
  status: BoutiqueStatus;
  productCount: number;
  lastSync?: string;
  isManual: boolean;
}

interface Props {
  boutique: ManagedBoutique;
  onPress?: (b: ManagedBoutique) => void;
  onRemove?: (id: string) => void;
}

// ── Durum rozeti ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BoutiqueStatus, { label: string; color: string; bg: string }> = {
  synced:  { label: 'Senkron',   color: '#2A7432', bg: 'rgba(42,116,50,0.10)'  },
  pending: { label: 'Bekliyor',  color: '#A07010', bg: 'rgba(180,130,0,0.12)'  },
  error:   { label: 'Hata',      color: '#B22222', bg: 'rgba(178,34,34,0.10)'  },
  manual:  { label: 'Manuel',    color: '#6B5000', bg: 'rgba(180,130,0,0.10)'  },
};

function StatusBadge({ status }: { status: BoutiqueStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[badge.wrap, { backgroundColor: cfg.bg }]}>
      <View style={[badge.dot, { backgroundColor: cfg.color }]} />
      <Text style={[badge.label, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  label: { fontFamily: Fonts.uiMedium, fontSize: 10, letterSpacing: 0.3 },
});

// ── Kart ─────────────────────────────────────────────────────────────────────

export function BoutiqueCard({ boutique, onPress, onRemove }: Props) {
  const isManualBg = boutique.isManual || boutique.status === 'manual';

  return (
    <View style={[s.card, isManualBg && s.cardManual]}>
      {/* Tıklanabilir alan: logo + bilgi */}
      <TouchableOpacity
        style={s.pressable}
        onPress={() => onPress?.(boutique)}
        activeOpacity={0.75}
      >
        {/* Logo */}
        <View style={s.logoWrap}>
          {boutique.logoUrl ? (
            <Image source={{ uri: boutique.logoUrl }} style={s.logo} />
          ) : (
            <View style={s.logoPlaceholder}>
              <Text style={s.logoInitial}>{boutique.name[0]}</Text>
            </View>
          )}
        </View>

        {/* Bilgi */}
        <View style={s.info}>
          <View style={s.topRow}>
            <Text style={s.name} numberOfLines={1}>{boutique.name}</Text>
            <StatusBadge status={boutique.status} />
          </View>
          <Text style={s.handle}>{boutique.handle}</Text>
          <View style={s.metaRow}>
            <Text style={s.meta}>{boutique.category}</Text>
            <Text style={s.metaDot}>·</Text>
            <Text style={s.meta}>{boutique.productCount} ürün</Text>
            {boutique.lastSync && (
              <>
                <Text style={s.metaDot}>·</Text>
                <Text style={s.meta}>{boutique.lastSync}</Text>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Çıkar — dışarıda, iç içe touchable sorunu yok */}
      {onRemove && (
        <TouchableOpacity
          style={s.removeBtn}
          onPress={() => onRemove(boutique.id)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.5}
        >
          <Ionicons name="close" size={16} color={Colors.text4} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface1,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    overflow: 'hidden',
  },
  pressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  cardManual: {
    backgroundColor: 'rgba(180,130,0,0.06)',
    borderColor: 'rgba(180,130,0,0.25)',
  },
  logoWrap: {
    width: 48, height: 48, borderRadius: 12,
    overflow: 'hidden', backgroundColor: Colors.surface2,
  },
  logo: { width: '100%', height: '100%' },
  logoPlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surface3,
  },
  logoInitial: {
    fontFamily: Fonts.displayBold, fontSize: 20, color: Colors.rose3,
  },
  info:   { flex: 1, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:   { fontFamily: Fonts.uiMedium, fontSize: 14, color: Colors.text1, flex: 1 },
  handle: { fontFamily: Fonts.uiLight,  fontSize: 11, color: Colors.text4 },
  metaRow:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  meta:   { fontFamily: Fonts.uiLight,  fontSize: 11, color: Colors.text4 },
  metaDot:{ fontFamily: Fonts.uiLight,  fontSize: 11, color: Colors.text5 },
  removeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
});
