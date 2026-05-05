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
    // Ürün yoksa (sync henüz tamamlanmadı) 4 saniyede bir tekrar dene, max 10 deneme (40sn)
    refetchInterval: (query) => {
      const count = Array.isArray(query.state.data) ? query.state.data.length : 0;
      const attempts = query.state.dataUpdateCount;
      return count === 0 && attempts < 10 ? 4_000 : false;
    },
  });

  const campaigns = useQuery({
    queryKey: ['brand-campaigns', brandId],
    queryFn: () => fetchCampaignsByBrand(brandId),
    enabled: !!brandId,
    staleTime: 30_000,
  });

  return { brand, products, campaigns };
}
