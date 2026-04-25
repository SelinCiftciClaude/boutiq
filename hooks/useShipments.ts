import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { fetchShipments } from '@/services/queries';

export function useShipments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['shipments', user?.id ?? 'anon'],
    queryFn: () => (user ? fetchShipments(user.id) : Promise.resolve([])),
    enabled: !!user,
    staleTime: 30_000,
  });
}
