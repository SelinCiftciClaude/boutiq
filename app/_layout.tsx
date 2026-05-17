import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_500Medium_Italic,
  PlayfairDisplay_600SemiBold_Italic,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';
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
import { extractUrlFromSharedContent } from '@/services/shareUrlUtils';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000),
      staleTime: 5 * 60_000,     // 5 dakika
      gcTime: 15 * 60_000,       // 15 dakika cache'de tut
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

function RouteGate() {
  const { session, loading, signIn } = useAuth();
  const { hasInterests, checked } = useInterests();
  const segments = useSegments();
  const router = useRouter();
  const qc = useQueryClient();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const autoLoginAttempted = useState(false);

  // ── iOS Share Extension + Android SEND intent ──────────────────────────────
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  useEffect(() => {
    if (!hasShareIntent) return;
    const url = extractUrlFromSharedContent(shareIntent.text, shareIntent.webUrl);
    if (url) setShareUrl(url);
    resetShareIntent();
  }, [hasShareIntent]);
  // ────────────────────────────────────────────────────────────────────────────

  // Kullanıcı çıkış yaptığında cache'i tamamen temizle.
  const prevSessionRef = useState<string | null>(null);
  useEffect(() => {
    const prevId = prevSessionRef[0];
    const curId  = session?.user?.id ?? null;
    if (prevId && !curId) {
      qc.clear();
    }
    prevSessionRef[1](curId);
  }, [session?.user?.id, qc]);

  // Oturum yoksa demo kullanıcısıyla otomatik giriş yap
  useEffect(() => {
    if (loading || session || autoLoginAttempted[0]) return;
    autoLoginAttempted[1](true);
    signIn('demo@boutiq.app', 'demo1234').catch(() => {});
  }, [loading, session]);

  useEffect(() => {
    if (session?.user) getAndSavePushToken(session.user.id);
  }, [session?.user?.id]);

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      try {
        const parsed = Linking.parse(event.url);
        if (parsed.path === 'save') {
          // boutiq://save?url=https://...
          const raw = parsed.queryParams?.url as string | undefined;
          if (raw) {
            const decoded = decodeURIComponent(raw);
            const extracted = extractUrlFromSharedContent(decoded, decoded);
            if (extracted) setShareUrl(extracted);
          }
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
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_500Medium_Italic,
    PlayfairDisplay_600SemiBold_Italic,
    PlayfairDisplay_700Bold_Italic,
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
      {/* ShareIntentProvider en dışta — iOS Share Extension + Android SEND intent için */}
      <ShareIntentProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <InterestsProvider>
              <StatusBar style="dark" backgroundColor={Colors.bg} />
              <RouteGate />
            </InterestsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ShareIntentProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
});
