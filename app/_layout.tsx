import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';
import { BrandsProvider } from '../context/BrandsContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <BrandsProvider>
        <StatusBar style="light" backgroundColor={Colors.bg} />
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="(auth)" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        </Stack>
      </BrandsProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
});
