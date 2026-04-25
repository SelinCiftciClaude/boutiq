import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProfile, updateNotificationPreferences } from '@/services/queries';
import { useAuth } from '@/context/AuthContext';

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });

  const updateNotifications = useMutation({
    mutationFn: (prefs: {
      campaigns: boolean;
      shipping: boolean;
      newArrivals: boolean;
      priceDrops: boolean;
    }) => updateNotificationPreferences(user!.id, prefs),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }),
  });

  return { ...query, updateNotifications };
}
