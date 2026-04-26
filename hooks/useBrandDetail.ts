import { useQuery } from '@tanstack/react-query';
import { fetchBrandById, fetchProductsByBrand, fetchCampaignsByBrand } from '@/services/queries';
import { useAuth } from '@/context/AuthContext';

export function useBrandDetail(brandId: string) {
  const { user } = useAuth();

  const brand = useQuery({
    queryKey: ['brand', brandId, user?.id],
    queryFn: () => fetchBrandById(brandId, user?.id),
    enabled: !!brandId,
    staleTime: 60_000,
  });

  const products = useQuery({
    queryKey: ['brand-products', brandId, user?.id],
    queryFn: () => fetchProductsByBrand(brandId, user?.id),
    enabled: !!brandId,
    staleTime: 60_000,
  });

  const campaigns = useQuery({
    queryKey: ['brand-campaigns', brandId],
    queryFn: () => fetchCampaignsByBrand(brandId),
    enabled: !!brandId,
    staleTime: 30_000,
  });

  return { brand, products, campaigns };
}
