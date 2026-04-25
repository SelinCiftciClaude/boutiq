import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { fetchDashboard, fetchProfile } from '@/services/queries';

export function useDashboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard', user?.id ?? 'anon'],
    queryFn: () => (user ? fetchDashboard(user.id) : Promise.resolve(null)),
    enabled: !!user,
    staleTime: 15_000,
  });
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id ?? 'anon'],
    queryFn: () => (user ? fetchProfile(user.id) : Promise.resolve(null)),
    enabled: !!user,
    staleTime: 60_000,
  });
}
