import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Typography';
import { fetchPublicCollection } from '@/services/queries';
import { ProductCard } from '@/components/ProductCard';

export default function PublicCollectionScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['public-collection', userId],
    queryFn: () => fetchPublicCollection(userId ?? ''),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const left = products.filter((_, i) => i % 2 === 0);
  const right = products.filter((_, i) => i % 2 === 1);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.text2} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Koleksiyon</Text>
            <Text style={styles.headerSub}>{userId?.slice(0, 8) ?? ''}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.gold3} size="large" />
            </View>
          ) : products.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>Bu koleksiyon boş</Text>
              <Text style={styles.emptySub}>Henüz kaydedilmiş ürün yok.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.count}>{products.length} ürün</Text>
              <View style={styles.grid}>
                <View style={styles.col}>
                  {left.map((p, i) => (
                    <ProductCard key={p.id} product={p} tall={i % 3 === 1} />
                  ))}
                </View>
                <View style={[styles.col, styles.colOffset]}>
                  {right.map((p, i) => (
                    <ProductCard key={p.id} product={p} tall={i % 3 === 0} />
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border2,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.text1, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: Colors.text4, marginTop: 1 },
  body: { paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text2 },
  emptySub: { fontSize: 14, color: Colors.text4 },
  count: { fontSize: 13, color: Colors.text4, fontWeight: '500', marginBottom: 16 },
  grid: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  colOffset: { marginTop: 40 },
});
