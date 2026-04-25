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
};

const InterestsContext = createContext<Value>({
  hasInterests: false,
  checked: false,
  interests: [],
  markDone: async () => {},
});

export function InterestsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [hasInterests, setHasInterests] = useState(false);
  const [checked, setChecked] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setHasInterests(false);
      setInterests([]);
      setChecked(true);
      return;
    }
    setChecked(false);
    AsyncStorage.getItem(KEY(user.id)).then(val => {
      if (val !== null) {
        try { setInterests(JSON.parse(val)); } catch { setInterests([]); }
        setHasInterests(true);
      } else {
        setHasInterests(false);
        setInterests([]);
      }
      setChecked(true);
    });
  }, [user?.id]);

  const markDone = useCallback(async (selected: string[]) => {
    if (!user) return;
    await AsyncStorage.setItem(KEY(user.id), JSON.stringify(selected));
    setInterests(selected);
    setHasInterests(true);
  }, [user?.id]);

  return (
    <InterestsContext.Provider value={{ hasInterests, checked, interests, markDone }}>
      {children}
    </InterestsContext.Provider>
  );
}

export function useInterests() {
  return useContext(InterestsContext);
}
