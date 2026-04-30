import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useFonts } from 'expo-font';
import {
  CormorantGaramond_300Light,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
  CormorantGaramond_300Light_Italic,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold_Italic,
  CormorantGaramond_700Bold_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
} from '@expo-google-fonts/dm-sans';
import { Colors } from '@/constants/Colors';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { InterestsProvider, useInterests } from '@/context/InterestsContext';
import { SaveFromShareModal } from './save-from-share';
import { getAndSavePushToken } from '@/services/notifications';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function RouteGate() {
  const { session, loading } = useAuth();
  const { hasInterests, checked } = useInterests();
  const segments = useSegments();
  const router = useRouter();
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) getAndSavePushToken(session.user.id);
  }, [session?.user?.id]);

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      try {
        const parsed = Linking.parse(event.url);
        if (parsed.path === 'save' && parsed.queryParams?.url) {
          setShareUrl(decodeURIComponent(parsed.queryParams.url as string));
        } else if (parsed.path?.startsWith('collection/')) {
          const userId = parsed.path.replace('collection/', '');
          if (userId) router.push(('/collection/' + userId) as any);
        }
      } catch {}
    };
    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then(url => { if (url) handleUrl({ url }); });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (loading || !checked) return;
    SplashScreen.hideAsync();

    const first = segments[0] as string | undefined;
    const inAuthGroup  = first === '(auth)';
    const inTabsGroup  = first === '(tabs)';
    const onLanding    = first === undefined;
    const inOnboarding = first === 'onboarding';

    if (!session) {
      if (inTabsGroup || inOnboarding) router.replace('/(auth)/login');
    } else if (!hasInterests) {
      if (!inOnboarding) router.replace('/onboarding');
    } else {
      if (inAuthGroup || onLanding || inOnboarding) router.replace('/(tabs)');
    }
  }, [loading, session, segments, router, hasInterests, checked]);

  return (
    <>
      <Slot />
      {shareUrl && (
        <SaveFromShareModal
          visible={!!shareUrl}
          url={shareUrl}
          onClose={() => setShareUrl(null)}
        />
      )}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    CormorantGaramond_300Light_Italic,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold_Italic,
    CormorantGaramond_700Bold_Italic,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <InterestsProvider>
            <StatusBar style="light" backgroundColor={Colors.bg} />
            <RouteGate />
          </InterestsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
});
