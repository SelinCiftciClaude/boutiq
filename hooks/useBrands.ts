import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { fetchAllBrands } from '@/services/queries';

export function useBrands() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['brands', user?.id ?? 'anon'],
    queryFn: () => fetchAllBrands(user?.id),
    staleTime: 60_000,
  });
}
