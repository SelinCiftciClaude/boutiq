import { useQuery } from '@tanstack/react-query';
import { fetchProductById, fetchRelatedProducts, fetchPriceHistory } from '@/services/queries';
import { useAuth } from '@/context/AuthContext';

export function useProductDetail(productId: string) {
  const { user } = useAuth();

  const product = useQuery({
    queryKey: ['product', productId, user?.id],
    queryFn: () => fetchProductById(productId, user?.id),
    enabled: !!productId,
    staleTime: 60_000,
  });

  const related = useQuery({
    queryKey: ['related-products', product.data?.category, productId, user?.id],
    queryFn: () => fetchRelatedProducts(product.data!.category, productId, user?.id),
    enabled: !!product.data?.category,
    staleTime: 60_000,
  });

  const priceHistory = useQuery({
    queryKey: ['price-history', productId],
    queryFn: () => fetchPriceHistory(productId),
    enabled: !!productId,
    staleTime: 300_000,
  });

  return { product, related, priceHistory };
}
