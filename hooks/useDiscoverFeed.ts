import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

const PAGE_SIZE = 20;

export interface DiscoverProduct {
  id: string;
  name: string;
  imageUrl: string;
  imageAspectRatio: number;
  price: number;
  originalPrice: number | null;
  isOnSale: boolean;
  isNew: boolean;
  url: string;
  affiliateUrl: string;
  brandId: string;
  brandName: string;
  brandLogoUrl: string | null;
  masterCategorySlug: string | null;
}

export interface DiscoverCategory {
  id: string;
  slug: string;
  nameTr: string;
  emoji: string;
  productCount: number;
}

export interface DiscoverFilters {
  onSale: boolean;
  newOnly: boolean;
  maxPrice: number | null;
}

// Kategorileri döndür: kullanıcının brand'larında ürünü olan master kategoriler
export function useDiscoverCategories(brandIds: string[]) {
  return useQuery({
    queryKey: ['discover-categories', brandIds],
    queryFn: async () => {
      if (!brandIds.length) return [];
      const { data } = await supabase
        .from('products')
        .select('master_category_id, master_categories(id, slug, name_tr, emoji, display_order)')
        .in('brand_id', brandIds)
        .eq('is_available', true)
        .not('master_category_id', 'is', null);

      if (!data?.length) return [];

      // Benzersiz kategorileri say
      const countMap: Record<string, { cat: any; count: number }> = {};
      for (const row of data) {
        const cat = (row as any).master_categories;
        if (!cat) continue;
        if (!countMap[cat.id]) countMap[cat.id] = { cat, count: 0 };
        countMap[cat.id].count++;
      }

      return Object.values(countMap)
        .sort((a, b) => b.count - a.count || a.cat.display_order - b.cat.display_order)
        .map(({ cat, count }) => ({
          id: cat.id,
          slug: cat.slug,
          nameTr: cat.name_tr,
          emoji: cat.emoji ?? '',
          productCount: count,
        } as DiscoverCategory));
    },
    enabled: brandIds.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}

// Sonsuz ürün feed'i
export function useDiscoverFeed(
  brandIds: string[],
  categorySlug: string,
  filters: DiscoverFilters,
) {
  return useInfiniteQuery({
    queryKey: ['discover-feed', brandIds, categorySlug, filters],
    queryFn: async ({ pageParam = 0 }) => {
      // Kategori ID'sini çöz
      let masterCategoryId: string | null = null;
      if (categorySlug !== 'all') {
        const { data: catRow } = await supabase
          .from('master_categories')
          .select('id')
          .eq('slug', categorySlug)
          .maybeSingle();
        masterCategoryId = catRow?.id ?? null;
        if (!masterCategoryId) return [];
      }

      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('products')
        .select(`
          id, name, image_url, image_aspect_ratio,
          price, original_price, is_on_sale, is_new,
          url, affiliate_url, brand_id,
          brands(name, logo_url),
          master_categories(slug)
        `)
        .eq('is_available', true)
        .eq('in_stock', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (brandIds.length > 0) {
        query = query.in('brand_id', brandIds);
      }
      if (masterCategoryId) {
        query = query.eq('master_category_id', masterCategoryId);
      }
      if (filters.onSale) query = query.eq('is_on_sale', true);
      if (filters.newOnly) query = query.eq('is_new', true);
      if (filters.maxPrice) query = query.lte('price', filters.maxPrice);

      const { data } = await query;
      return (data ?? []).map(p => ({
        id: p.id,
        name: p.name,
        imageUrl: p.image_url,
        imageAspectRatio: p.image_aspect_ratio ?? 0.75,
        price: p.price,
        originalPrice: p.original_price ?? null,
        isOnSale: p.is_on_sale ?? false,
        isNew: p.is_new ?? false,
        url: p.url,
        affiliateUrl: p.affiliate_url || p.url,
        brandId: p.brand_id,
        brandName: (p as any).brands?.name ?? '',
        brandLogoUrl: (p as any).brands?.logo_url ?? null,
        masterCategorySlug: (p as any).master_categories?.slug ?? null,
      } as DiscoverProduct));
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    staleTime: 5 * 60 * 1000,
  });
}
