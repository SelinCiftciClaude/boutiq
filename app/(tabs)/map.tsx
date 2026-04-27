import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { fetchBrandsWithLocation } from '@/services/queries';

const ISTANBUL = {
  latitude: 41.015,
  longitude: 28.979,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const [region, setRegion] = useState(ISTANBUL);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands-with-location'],
    queryFn: fetchBrandsWithLocation,
    staleTime: 5 * 60_000,
  });

  const handleMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Konum izni gerekli', 'Konumunuzu görmek için ayarlardan izin verin.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setUserCoords(coords);
    setRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Harita</Text>
        <Text style={styles.headerSubtitle}>Fiziksel mağazaları keşfet</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.gold3} size="large" />
        </View>
      ) : brands.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="map-outline" size={48} color={Colors.text5} />
          <Text style={styles.emptyText}>Henüz haritada marka yok</Text>
        </View>
      ) : (
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={!!userCoords}
          showsMyLocationButton={false}
        >
          {brands.map((brand) => {
            if (!brand.latitude || !brand.longitude) return null;
            return (
              <Marker
                key={brand.id}
                coordinate={{ latitude: brand.latitude, longitude: brand.longitude }}
                title={brand.name}
                pinColor={Colors.rose3}
              >
                <Callout
                  onPress={() => router.push(('/brand/' + brand.id) as any)}
                  style={styles.callout}
                >
                  <View style={styles.calloutContent}>
                    <Text style={styles.calloutName}>{brand.name}</Text>
                    {brand.address ? (
                      <Text style={styles.calloutAddress}>{brand.address}</Text>
                    ) : null}
                    <Text style={styles.calloutLink}>Detaya Git →</Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>
      )}

      {/* Konumumu Göster */}
      <TouchableOpacity
        style={[styles.locationBtn, { top: insets.top + 80 }]}
        onPress={handleMyLocation}
        activeOpacity={0.8}
      >
        <Ionicons name="locate" size={22} color={Colors.rose3} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text1,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.text4,
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text4,
    fontWeight: '600',
    textAlign: 'center',
  },
  callout: {
    minWidth: 160,
  },
  calloutContent: {
    padding: 10,
    gap: 4,
  },
  calloutName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text1,
  },
  calloutAddress: {
    fontSize: 12,
    color: Colors.text4,
  },
  calloutLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.rose3,
    marginTop: 4,
  },
  locationBtn: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
});
