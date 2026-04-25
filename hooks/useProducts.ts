import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { fetchAllProducts } from '@/services/queries';

export function useProducts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['products', user?.id ?? 'anon'],
    queryFn: () => fetchAllProducts(user?.id),
    staleTime: 60_000,
  });
}
