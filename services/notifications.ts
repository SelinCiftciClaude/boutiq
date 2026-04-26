import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Bildirim gösterim davranışı — uygulama açıkken de göster
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await ExpoNotifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await ExpoNotifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getAndSavePushToken(userId: string): Promise<string | null> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) return null;

    // Expo Go'da projectId olmadan token alınamaz — graceful degradation
    const tokenData = await ExpoNotifications.getExpoPushTokenAsync().catch(() => null);
    if (!tokenData) return null;

    const token = tokenData.data;
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

    await supabase.from('device_tokens').upsert(
      { user_id: userId, token, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,platform' }
    );

    return token;
  } catch {
    return null;
  }
}

export async function sendLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  await ExpoNotifications.scheduleNotificationAsync({
    content: { title, body, data: data ?? {} },
    trigger: null,
  });
}

// Expo Push API üzerinden bildirim gönder (edge function'dan çağrılır)
export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const messages = tokens.map(to => ({ to, title, body, data: data ?? {}, sound: 'default' }));
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
}
