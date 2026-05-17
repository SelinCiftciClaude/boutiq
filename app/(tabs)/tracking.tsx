import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { ShipmentCard } from '@/components/ShipmentCard';
import { AddManualShipmentSheet } from '@/components/AddManualShipmentSheet';
import {
  useShipments,
  useShipmentSummary,
  useArchivedShipments,
} from '@/hooks/useShipments';
import type { Shipment, ArchiveMonth } from '@/services/shipmentService';
import { Image } from 'react-native';

type Filter = 'all' | 'preparing' | 'in_transit' | 'delivered';

const FILTER_CONFIG: Array<{
  key: Filter;
  label: string;
  summaryKey: 'preparing' | 'in_transit' | 'delivered';
  color: string;
  bgPassive: string;
  bgActive: string;
}> = [
  { key: 'preparing',  label: 'HAZIRLANIYOR', summaryKey: 'preparing',  color: '#FFF',   bgPassive: 'rgba(163,45,45,0.10)',  bgActive: '#A32D2D' },
  { key: 'in_transit', label: 'YOLDA',        summaryKey: 'in_transit', color: '#FFF',   bgPassive: 'rgba(186,117,23,0.10)', bgActive: '#BA7517' },
  { key: 'delivered',  label: 'TESLİM',       summaryKey: 'delivered',  color: '#FFF',   bgPassive: 'rgba(59,109,17,0.10)',  bgActive: '#3B6D11' },
];

// ── Gruplandırma (aynı butikten 2+ kargo) ───────────────────────────────────

function groupByBrand(shipments: Shipment[]): Array<{ brand: string; items: Shipment[] }> {
  const map = new Map<string, Shipment[]>();
  for (const s of shipments) {
    const existing = map.get(s.brandName) ?? [];
    existing.push(s);
    map.set(s.brandName, existing);
  }
  return Array.from(map.entries()).map(([brand, items]) => ({ brand, items }));
}

// ── Durum sıralaması ─────────────────────────────────────────────────────────

function sortShipments(list: Shipment[]): Shipment[] {
  const order: Record<string, number> = {
    out_for_delivery: 0,
    in_transit: 1,
    shipped: 2,
    processing: 3,
    ordered: 4,
    delivered: 5,
    returned: 6,
    failed: 7,
  };
  return [...list].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
}

// ── Ana ekran ─────────────────────────────────────────────────────────────────

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter]       = useState<Filter>('all');
  const [showSearch, setSearch]   = useState(false);
  const [searchQ, setSearchQ]     = useState('');
  const [showAdd, setShowAdd]     = useState(false);
  const [refreshing, setRefresh]  = useState(false);

  const { data: shipments = [], isLoading, refetch } = useShipments(filter);
  const { data: summary } = useShipmentSummary();
  const { data: archive = [] } = useArchivedShipments();

  const filtered = searchQ
    ? shipments.filter(s =>
        s.brandName.toLowerCase().includes(searchQ.toLowerCase()) ||
        s.trackingNumber.includes(searchQ) ||
        (s.products[0]?.name ?? '').toLowerCase().includes(searchQ.toLowerCase())
      )
    : shipments;

  const sorted  = sortShipments(filtered);
  const groups  = groupByBrand(sorted);
  const recent  = sorted.filter(s => s.status !== 'delivered');
  const delivered = sorted.filter(s => s.status === 'delivered');

  const onRefresh = useCallback(async () => {
    setRefresh(true);
    await refetch();
    setRefresh(false);
  }, [refetch]);

  const toggleFilter = (f: Filter) => {
    Haptics.selectionAsync();
    setFilter(prev => prev === f ? 'all' : f);
  };

  const activeLabel = sorted.length;
  const brandCount  = new Set(sorted.map(s => s.brandName)).size;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Kargolarım</Text>
          {activeLabel > 0 && (
            <Text style={styles.headerSub}>
              {summary?.total_active ?? 0} aktif sipariş · {brandCount} butikten
            </Text>
          )}
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={[styles.iconBtn, showSearch && styles.iconBtnActive]}
            onPress={() => { Haptics.selectionAsync(); setSearch(s => !s); setSearchQ(''); }}
          >
            <Ionicons name="search-outline" size={18} color={showSearch ? Colors.rose3 : Colors.text2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Arama */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={Colors.text4} />
          <TextInput
            style={styles.searchInput}
            placeholder="Butik adı, takip no veya ürün ara..."
            placeholderTextColor={Colors.text5}
            value={searchQ}
            onChangeText={setSearchQ}
            autoFocus
            selectionColor={Colors.rose3}
          />
          {searchQ.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQ('')}>
              <Ionicons name="close-circle" size={16} color={Colors.text4} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Durum sayaç filtre kutucukları */}
      <View style={styles.counters}>
        {FILTER_CONFIG.map(cfg => {
          const count = summary?.[cfg.summaryKey] ?? 0;
          const active = filter === cfg.key;
          return (
            <TouchableOpacity
              key={cfg.key}
              style={[
                styles.counter,
                { backgroundColor: active ? cfg.bgActive : cfg.bgPassive },
                active && styles.counterActive,
              ]}
              onPress={() => toggleFilter(cfg.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.counterNum, active && styles.counterNumActive]}>
                {count}
              </Text>
              <Text style={[styles.counterLabel, active && styles.counterLabelActive]}>
                {cfg.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Liste */}
      {isLoading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.rose3} />
        </View>
      ) : sorted.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} hasFilter={filter !== 'all' || searchQ.length > 0} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.rose3}
              colors={[Colors.rose3]}
            />
          }
        >
          {/* Aktif kargolar */}
          {recent.length > 0 && (
            <>
              {filter === 'all' && recent.length > 0 && (
                <Text style={styles.sectionLabel}>AKTİF ({recent.length})</Text>
              )}
              {groups
                .filter(g => g.items.some(s => s.status !== 'delivered'))
                .map(group => (
                  <BrandGroup key={group.brand} group={group} filter={filter} />
                ))}
            </>
          )}

          {/* Teslim edilenler (gri, ayrı bölüm) */}
          {filter !== 'preparing' && filter !== 'in_transit' && delivered.length > 0 && (
            <DeliveredSection shipments={delivered} />
          )}

          {/* Geçmiş alışverişler arşivi */}
          {archive.length > 0 && filter === 'all' && !searchQ && (
            <ArchiveSection months={archive} />
          )}

          {/* Manuel ekle */}
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
            <LinearGradient
              colors={[Colors.rose2, Colors.rose3]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Manuel kargo bilgisi ekle</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Bottom sheet */}
      <AddManualShipmentSheet visible={showAdd} onClose={() => setShowAdd(false)} />
    </View>
  );
}

// ── Alt bileşenler ────────────────────────────────────────────────────────────

function BrandGroup({ group, filter }: { group: { brand: string; items: Shipment[] }; filter: Filter }) {
  const [expanded, setExpanded] = useState(true);
  const relevant = group.items.filter(s => {
    if (filter === 'preparing')  return ['ordered','processing'].includes(s.status);
    if (filter === 'in_transit') return ['shipped','in_transit','out_for_delivery'].includes(s.status);
    if (filter === 'delivered')  return s.status === 'delivered';
    return s.status !== 'delivered';
  });

  if (relevant.length === 0) return null;

  if (relevant.length === 1) {
    return <ShipmentCard key={relevant[0].id} shipment={relevant[0]} />;
  }

  return (
    <View style={grp.wrap}>
      <TouchableOpacity
        style={grp.header}
        onPress={() => { Haptics.selectionAsync(); setExpanded(e => !e); }}
      >
        <Text style={grp.brandName}>{group.brand}</Text>
        <Text style={grp.count}>{relevant.length} kargo</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.text4} />
      </TouchableOpacity>
      {expanded && relevant.map(s => <ShipmentCard key={s.id} shipment={s} />)}
    </View>
  );
}

function DeliveredSection({ shipments }: { shipments: Shipment[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.deliveredSection}>
      <TouchableOpacity
        style={styles.deliveredToggle}
        onPress={() => { Haptics.selectionAsync(); setExpanded(e => !e); }}
      >
        <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
        <Text style={styles.deliveredLabel}>Teslim edildi ({shipments.length})</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.text4} />
      </TouchableOpacity>
      {expanded && shipments.map(s => <ShipmentCard key={s.id} shipment={s} />)}
    </View>
  );
}

// ── Arşiv bölümü ─────────────────────────────────────────────────────────────

function ArchiveSection({ months }: { months: ArchiveMonth[] }) {
  return (
    <View style={arc.wrap}>
      {/* Başlık */}
      <View style={arc.header}>
        <Ionicons name="archive-outline" size={15} color={Colors.text4} />
        <Text style={arc.title}>GEÇMİŞ ALIŞVERİŞLER</Text>
      </View>
      {months.map(m => (
        <ArchiveMonthCard key={m.yearMonth} month={m} />
      ))}
    </View>
  );
}

function ArchiveMonthCard({ month }: { month: ArchiveMonth }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={arc.card}>
      {/* Ay başlığı */}
      <TouchableOpacity
        style={arc.monthRow}
        onPress={() => { Haptics.selectionAsync(); setOpen(o => !o); }}
        activeOpacity={0.75}
      >
        <View style={arc.monthLeft}>
          <View style={arc.monthDot} />
          <Text style={arc.monthLabel}>{month.label} alışverişlerin</Text>
          <View style={arc.countBadge}>
            <Text style={arc.countText}>{month.shipments.length}</Text>
          </View>
        </View>
        <View style={arc.monthRight}>
          <Text style={arc.monthTotal}>₺{month.totalAmount.toLocaleString('tr-TR')}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.text4} />
        </View>
      </TouchableOpacity>

      {/* İçerik */}
      {open && (
        <View style={arc.items}>
          {month.shipments.map(s => {
            const product = s.products?.[0];
            return (
              <View key={s.id} style={arc.item}>
                {product?.image ? (
                  <Image source={{ uri: product.image }} style={arc.itemImg} resizeMode="cover" />
                ) : (
                  <View style={[arc.itemImg, arc.itemImgPlaceholder]}>
                    <Ionicons name="cube-outline" size={14} color={Colors.text4} />
                  </View>
                )}
                <View style={arc.itemInfo}>
                  <Text style={arc.itemBrand} numberOfLines={1}>{s.brandName}</Text>
                  <Text style={arc.itemName} numberOfLines={1}>{product?.name ?? '—'}</Text>
                </View>
                <Text style={arc.itemPrice}>₺{(s.totalAmount ?? 0).toLocaleString('tr-TR')}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const arc = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  title: { fontFamily: Fonts.uiMedium, fontSize: 10, letterSpacing: 1.5, color: Colors.text4 },
  card: {
    backgroundColor: Colors.surface2,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Colors.border2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  monthLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  monthDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.rose3, opacity: 0.5 },
  monthLabel: { fontFamily: Fonts.uiMedium, fontSize: 13, color: Colors.text1 },
  countBadge: {
    backgroundColor: Colors.roseGlow, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 0.5, borderColor: Colors.borderBurgund,
  },
  countText: { fontFamily: Fonts.ui, fontSize: 11, color: Colors.rose3 },
  monthRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  monthTotal: { fontFamily: Fonts.uiMedium, fontSize: 12, color: Colors.text3 },
  items: {
    borderTopWidth: 0.5, borderTopColor: Colors.border1,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, gap: 10,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemImg: { width: 44, height: 44, borderRadius: 8, backgroundColor: Colors.surface3 },
  itemImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, gap: 2 },
  itemBrand: { fontFamily: Fonts.uiMedium, fontSize: 11, color: Colors.rose3 },
  itemName: { fontFamily: Fonts.uiLight, fontSize: 12, color: Colors.text1 },
  itemPrice: { fontFamily: Fonts.uiMedium, fontSize: 12, color: Colors.text2 },
});

function EmptyState({ onAdd, hasFilter }: { onAdd: () => void; hasFilter: boolean }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyTitle}>
        {hasFilter ? 'Bu filtrede kargo yok' : 'Henüz kargo takip etmiyorsun'}
      </Text>
      <Text style={styles.emptySub}>
        {hasFilter
          ? 'Filtreni kaldır ya da yeni sipariş ekle.'
          : 'Şu an açık siparişin varsa manuel ekleyebilirsin.'}
      </Text>
      {!hasFilter && (
        <TouchableOpacity style={styles.emptyBtn} onPress={onAdd} activeOpacity={0.88}>
          <LinearGradient
            colors={[Colors.rose2, Colors.rose3]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name="add-circle-outline" size={16} color="#fff" />
          <Text style={styles.emptyBtnText}>Manuel kargo bilgisi ekle</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: Fonts.editorial,
    fontSize: 34,
    color: Colors.text1,
  },
  headerSub: {
    fontFamily: Fonts.uiLight,
    fontSize: 12,
    color: Colors.text4,
    marginTop: 1,
  },
  headerIcons: { flexDirection: 'row', gap: 8, marginTop: 6 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.surface2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: Colors.border2,
  },
  iconBtnActive: {
    backgroundColor: Colors.roseGlow,
    borderColor: Colors.borderBurgund,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border2,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text1,
  },

  // Sayaç filtreler
  counters: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  counter: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  counterActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  counterNum: {
    fontFamily: Fonts.ui,
    fontSize: 24,
    color: Colors.text1,
    lineHeight: 28,
  },
  counterNumActive: { color: '#fff' },
  counterLabel: {
    fontFamily: Fonts.uiMedium,
    fontSize: 8,
    letterSpacing: 1,
    color: Colors.text3,
  },
  counterLabelActive: { color: 'rgba(255,255,255,0.85)' },

  list: { paddingHorizontal: 16 },
  sectionLabel: {
    fontFamily: Fonts.uiMedium,
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.text4,
    marginBottom: 8,
    marginTop: 4,
  },

  deliveredSection: {
    marginTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border1,
    paddingTop: 12,
  },
  deliveredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  deliveredLabel: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.success,
    flex: 1,
  },

  addBtn: {
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  addBtnText: {
    fontFamily: Fonts.ui,
    fontSize: 14,
    letterSpacing: 0.3,
    color: '#fff',
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: {
    fontFamily: Fonts.displayBold,
    fontSize: 18,
    color: Colors.text2,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: Fonts.uiLight,
    fontSize: 14,
    color: Colors.text4,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    height: 48,
    borderRadius: 10,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  emptyBtnText: {
    fontFamily: Fonts.uiMedium,
    fontSize: 14,
    color: '#fff',
  },
});

const grp = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border2,
    marginBottom: 8,
    backgroundColor: Colors.surface1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border1,
    gap: 8,
  },
  brandName: {
    fontFamily: Fonts.uiMedium,
    fontSize: 13,
    color: Colors.rose3,
    flex: 1,
  },
  count: {
    fontFamily: Fonts.uiLight,
    fontSize: 11,
    color: Colors.text4,
  },
});
