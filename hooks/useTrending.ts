import { useQuery } from '@tanstack/react-query';
import { fetchTrendingBrands, fetchTrendingProducts } from '@/services/queries';

export function useTrending() {
  const brands = useQuery({
    queryKey: ['trending-brands'],
    queryFn: fetchTrendingBrands,
    staleTime: 300_000,
  });
  const products = useQuery({
    queryKey: ['trending-products'],
    queryFn: fetchTrendingProducts,
    staleTime: 300_000,
  });
  return { brands, products };
}
