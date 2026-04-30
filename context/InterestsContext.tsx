import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

const KEY = (userId: string) => `boutiq_interests_v2_${userId}`;

// Onboarding interest ID → brand category mapping
export const INTEREST_TO_CATEGORY: Record<string, string> = {
  giyim: 'giyim',
  ayakkabi: 'ayakkabı',
  canta: 'çanta',
  taki: 'takı',
  kozmetik: 'güzellik',
  spor: 'spor',
  ev: 'ev',
  aksesuar: 'aksesuar',
  vintage: 'vintage',
};

type Value = {
  hasInterests: boolean;
  checked: boolean;
  interests: string[];
  markDone: (interests: string[]) => Promise<void>;
  clearInterests: () => Promise<void>;
};

const InterestsContext = createContext<Value>({
  hasInterests: false,
  checked: false,
  interests: [],
  markDone: async () => {},
  clearInterests: async () => {},
});

export function InterestsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [hasInterests, setHasInterests] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  // Hangi userId için kontrol yapıldığını takip et.
  // checked = (checkedForUserId === user?.id ?? null)
  const [checkedForUserId, setCheckedForUserId] = useState<string | null>(undefined as any);

  // checked: sadece MEVCUT kullanıcı için AsyncStorage okunmuşsa true
  const currentUserId = user?.id ?? null;
  const checked = checkedForUserId === currentUserId;

  useEffect(() => {
    if (!user) {
      setHasInterests(false);
      setInterests([]);
      setCheckedForUserId(null); // null user için okuma tamamlandı
      return;
    }
    // Kullanıcı değişti — yeni kullanıcı için henüz okumadık
    // checked false olarak kalacak (checkedForUserId !== user.id)
    AsyncStorage.getItem(KEY(user.id)).then(val => {
      if (val !== null) {
        try { setInterests(JSON.parse(val)); } catch { setInterests([]); }
        setHasInterests(true);
      } else {
        setHasInterests(false);
        setInterests([]);
      }
      setCheckedForUserId(user.id); // bu kullanıcı için kontrol tamamlandı
    });
  }, [user?.id]);

  const markDone = useCallback(async (selected: string[]) => {
    if (!user) return;
    await AsyncStorage.setItem(KEY(user.id), JSON.stringify(selected));
    setInterests(selected);
    setHasInterests(true);
  }, [user?.id]);

  const clearInterests = useCallback(async () => {
    if (!user) return;
    await AsyncStorage.removeItem(KEY(user.id));
    setInterests([]);
    setHasInterests(false);
  }, [user?.id]);

  return (
    <InterestsContext.Provider value={{ hasInterests, checked, interests, markDone, clearInterests }}>
      {children}
    </InterestsContext.Provider>
  );
}

export function useInterests() {
  return useContext(InterestsContext);
}
