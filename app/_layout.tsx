import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Colors } from '@/constants/Colors';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { InterestsProvider, useInterests } from '@/context/InterestsContext';
import { SaveFromShareModal } from './save-from-share';

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

  // Deep link handler: boutiq://save?url=...
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      try {
        const parsed = Linking.parse(event.url);
        if (parsed.path === 'save' && parsed.queryParams?.url) {
          setShareUrl(decodeURIComponent(parsed.queryParams.url as string));
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
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <InterestsProvider>
            <StatusBar style="dark" backgroundColor={Colors.bg} />
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
