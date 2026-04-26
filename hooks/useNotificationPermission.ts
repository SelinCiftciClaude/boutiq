import { useState, useEffect } from 'react';
import * as ExpoNotifications from 'expo-notifications';
import { getAndSavePushToken } from '@/services/notifications';
import { useAuth } from '@/context/AuthContext';

export function useNotificationPermission() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    ExpoNotifications.getPermissionsAsync().then(({ status }) => {
      setPermission(status as 'granted' | 'denied' | 'undetermined');
    });
  }, []);

  useEffect(() => {
    if (!user || permission !== 'granted') return;
    getAndSavePushToken(user.id).then(t => { if (t) setToken(t); });
  }, [user?.id, permission]);

  const request = async () => {
    if (!user) return false;
    const t = await getAndSavePushToken(user.id);
    const { status } = await ExpoNotifications.getPermissionsAsync();
    setPermission(status as 'granted' | 'denied' | 'undetermined');
    if (t) setToken(t);
    return !!t;
  };

  return { permission, token, request };
}
