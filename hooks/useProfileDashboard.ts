import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/context/AuthContext';

// ── Tipler ────────────────────────────────────────────────────────────────────

export interface ProfileIdentity {
  name: string;
  email: string;
  avatarUrl?: string;
  city?: string;
  styleTags: string[];
  monthsOnButika: number;
}

export interface ProfileInsights {
  yearMonth: string;
  totalSavings: number;
  discountCount: number;
  notifCount: number;
  newBrandsCount: number;
  newFavsCount: number;
  headline: string;
  headlineType: string;
}

export interface ProfileShortcuts {
  brandCount: number;
  favoriteCount: number;
  activeShipments: number;
  trackingCount: number;
  unreadCount: number;
}

export interface ProfileLiveEvent {
  id: string;
  type: 'campaign' | 'shipment' | 'newArrival' | 'priceDrop' | 'system';
  title: string;
  body: string;
  createdAt: string;
}

export interface ProfileDashboard {
  identity: ProfileIdentity;
  insights: ProfileInsights;
  shortcuts: ProfileShortcuts;
  liveEvent: ProfileLiveEvent | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProfileDashboard() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile-dashboard', user?.id],
    queryFn: async (): Promise<ProfileDashboard> => {
      const { data, error } = await supabase.rpc('get_profile_dashboard');
      if (error) throw error;
      return data as ProfileDashboard;
    },
    enabled: !!user,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

// ── Tarz etiketleri güncelleme ────────────────────────────────────────────────

export function useUpdateStyleTags() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (tags: string[]) => {
      const { data: profile } = await supabase
        .from('profiles').select('preferences').eq('id', user!.id).single();
      const current = (profile?.preferences as Record<string, unknown>) ?? {};
      const { error } = await supabase
        .from('profiles')
        .update({ preferences: { ...current, style_tags: tags } })
        .eq('id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile-dashboard', user?.id] });
      qc.invalidateQueries({ queryKey: ['profile', user?.id] });
    },
  });
}

// ── Canlı event dismiss ───────────────────────────────────────────────────────

export function useDismissLiveEvent() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', eventId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile-dashboard', user?.id] });
    },
  });
}
