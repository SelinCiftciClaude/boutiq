import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { supabase } from '@/services/supabase';

const STORAGE_KEY = (userId: string) => `boutiq_onboarding_v3_${userId}`;

type Value = {
  hasInterests: boolean;
  checked: boolean;
  interests: string[];           // seçilen kategori slug'ları
  stylePreferences: string[];
  markDone: (categories: string[], styles: string[]) => Promise<void>;
  clearInterests: () => Promise<void>;
  addCategory: (slug: string) => Promise<void>;    // tek kategori ekle
  removeCategory: (slug: string) => Promise<void>; // tek kategori çıkar
};

const InterestsContext = createContext<Value>({
  hasInterests: false,
  checked: false,
  interests: [],
  stylePreferences: [],
  markDone: async () => {},
  clearInterests: async () => {},
  addCategory: async () => {},
  removeCategory: async () => {},
});

export function InterestsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [hasInterests, setHasInterests] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [stylePreferences, setStylePreferences] = useState<string[]>([]);
  const [checkedForUserId, setCheckedForUserId] = useState<string | null>(undefined as any);

  const currentUserId = user?.id ?? null;
  const checked = checkedForUserId === currentUserId;

  useEffect(() => {
    if (!user) {
      setHasInterests(false);
      setInterests([]);
      setStylePreferences([]);
      setCheckedForUserId(null);
      return;
    }
    AsyncStorage.getItem(STORAGE_KEY(user.id)).then(val => {
      if (val !== null) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            setInterests(parsed);
            setStylePreferences([]);
          } else {
            setInterests(parsed.categories ?? []);
            setStylePreferences(parsed.styles ?? []);
          }
        } catch {
          setInterests([]);
          setStylePreferences([]);
        }
        setHasInterests(true);
      } else {
        setHasInterests(false);
        setInterests([]);
        setStylePreferences([]);
      }
      setCheckedForUserId(user.id);
    });
  }, [user?.id]);

  // Tüm kategori + stil listesini kaydet
  const persist = useCallback(async (categories: string[], styles: string[]) => {
    if (!user) return;
    const payload = { categories, styles };
    await AsyncStorage.setItem(STORAGE_KEY(user.id), JSON.stringify(payload));
    await supabase
      .from('profiles')
      .update({ style_preferences: styles, onboarding_completed: true })
      .eq('id', user.id);
  }, [user?.id]);

  const markDone = useCallback(async (categories: string[], styles: string[]) => {
    if (!user) return;
    await persist(categories, styles);
    setInterests(categories);
    setStylePreferences(styles);
    setHasInterests(true);
  }, [user?.id, persist]);

  // Tek kategori ekle (profil sayfasından veya marka eklenince)
  const addCategory = useCallback(async (slug: string) => {
    if (!user) return;
    setInterests(prev => {
      if (prev.includes(slug)) return prev;
      const next = [...prev, slug];
      persist(next, stylePreferences);
      setHasInterests(true);
      return next;
    });
  }, [user?.id, stylePreferences, persist]);

  // Tek kategori çıkar
  const removeCategory = useCallback(async (slug: string) => {
    if (!user) return;
    setInterests(prev => {
      const next = prev.filter(s => s !== slug);
      persist(next, stylePreferences);
      return next;
    });
  }, [user?.id, stylePreferences, persist]);

  const clearInterests = useCallback(async () => {
    if (!user) return;
    await AsyncStorage.removeItem(STORAGE_KEY(user.id));
    setInterests([]);
    setStylePreferences([]);
    setHasInterests(false);
    await supabase
      .from('profiles')
      .update({ onboarding_completed: false, onboarding_step: 0 })
      .eq('id', user.id);
  }, [user?.id]);

  return (
    <InterestsContext.Provider value={{
      hasInterests, checked, interests, stylePreferences,
      markDone, clearInterests, addCategory, removeCategory,
    }}>
      {children}
    </InterestsContext.Provider>
  );
}

export function useInterests() {
  return useContext(InterestsContext);
}
