import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';

const PAGE_SIZE = 20;

export interface DiscoverProduct {
  id: string;
  name: string;
  imageUrl: string;
  imageUrls: string[];
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
  sizes: string[];
  colors: string[];
}

export interface DiscoverCategory {
  id: string;
  slug: string;
  nameTr: string;
  emoji: string;
  productCount: number;
  isExtra?: boolean; // kullanıcı manuel ekledi, takip edilen markalardan gelmiyor
}

export interface DiscoverFilters {
  onSale: boolean;
  newOnly: boolean;
  maxPrice: number | null;
}

// Kategorileri döndür.
// brandIds boşsa → tüm ürünlerden kategori listesi çeker ("Senin İçin" modu)
export function useDiscoverCategories(brandIds: string[], extraCategorySlugs: string[] = []) {
  return useQuery({
    queryKey: ['discover-categories', brandIds, extraCategorySlugs],
    queryFn: async () => {
      const countMap: Record<string, { cat: any; count: number; isExtra: boolean }> = {};

      // 1. Ürünleri olan kategorileri çek
      //    brandIds doluysa sadece o markalar, boşsa tüm markalar
      {
        let q = supabase
          .from('products')
          .select('master_category_id, master_categories(id, slug, name_tr, emoji, display_order)')
          .eq('is_available', true)
          .not('master_category_id', 'is', null);

        if (brandIds.length > 0) q = q.in('brand_id', brandIds);

        const { data } = await q;
        for (const row of data ?? []) {
          const cat = (row as any).master_categories;
          if (!cat) continue;
          if (!countMap[cat.id]) countMap[cat.id] = { cat, count: 0, isExtra: false };
          countMap[cat.id].count++;
        }
      }

      // 2. Kullanıcının manuel eklediği extra kategoriler
      if (extraCategorySlugs.length > 0) {
        const { data: extraCats } = await supabase
          .from('master_categories')
          .select('id, slug, name_tr, emoji, display_order')
          .in('slug', extraCategorySlugs);

        for (const cat of extraCats ?? []) {
          if (!countMap[cat.id]) {
            countMap[cat.id] = { cat, count: 0, isExtra: true };
          }
        }
      }

      return Object.values(countMap)
        .sort((a, b) => {
          if (a.isExtra !== b.isExtra) return a.isExtra ? 1 : -1;
          return b.count - a.count || a.cat.display_order - b.cat.display_order;
        })
        .map(({ cat, count, isExtra }) => ({
          id: cat.id,
          slug: cat.slug,
          nameTr: cat.name_tr,
          emoji: cat.emoji ?? '',
          productCount: count,
          isExtra,
        } as DiscoverCategory & { isExtra: boolean }));
    },
    // Her zaman çalışır (all-brands modunda da)
    enabled: true,
    staleTime: 10 * 60 * 1000,
  });
}

// Bir kategorideki markaları döndür (brand filter row için)
export interface CategoryBrand {
  id: string;
  name: string;
  logoUrl: string | null;
}

export function useCategoryBrands(categorySlug: string, brandIds: string[]) {
  return useQuery({
    queryKey: ['category-brands', categorySlug, brandIds],
    queryFn: async (): Promise<CategoryBrand[]> => {
      if (categorySlug === 'all') return [];

      const { data: catRow } = await supabase
        .from('master_categories')
        .select('id')
        .eq('slug', categorySlug)
        .maybeSingle();
      if (!catRow) return [];

      let q = supabase
        .from('products')
        .select('brand_id, brands!inner(id, name, logo_url)')
        .eq('master_category_id', catRow.id)
        .eq('is_available', true);
      if (brandIds.length > 0) q = q.in('brand_id', brandIds);

      const { data } = await q.limit(1000);

      const map = new Map<string, CategoryBrand>();
      for (const row of data ?? []) {
        const b = (row as any).brands;
        if (b && !map.has(b.id)) {
          map.set(b.id, { id: b.id, name: b.name, logoUrl: b.logo_url ?? null });
        }
      }
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    },
    enabled: categorySlug !== 'all',
    staleTime: 5 * 60 * 1000,
  });
}

// Kategori ID'sini slug'dan çöz — kısa süreli cache
const categoryIdCache = new Map<string, string | null>();
async function resolveCategoryId(slug: string): Promise<string | null> {
  if (slug === 'all') return null;
  if (categoryIdCache.has(slug)) return categoryIdCache.get(slug)!;
  const { data } = await supabase.from('master_categories').select('id').eq('slug', slug).maybeSingle();
  const id = data?.id ?? null;
  categoryIdCache.set(slug, id);
  return id;
}

// Sonsuz ürün feed'i — arama varsa PostgreSQL RPC kullanır (name+category+tags)
export function useDiscoverFeed(
  brandIds: string[],
  categorySlug: string,
  filters: DiscoverFilters,
  search: string = '',
  forYou: boolean = false,       // true = tüm markalardan keşif modu
  excludeBrandIds: string[] = [], // "Senin İçin": takip edilenleri dışla
) {
  // Markalar yüklenmediyse ve arama da yoksa sorgu çalıştırma
  // forYou modunda her zaman çalış (brandIds boş bile olsa)
  const shouldRun = brandIds.length > 0 || !!search.trim() || forYou;

  return useInfiniteQuery({
    queryKey: ['discover-feed', brandIds, categorySlug, filters, search, excludeBrandIds],
    enabled: shouldRun,
    queryFn: async ({ pageParam = 0 }) => {
      const masterCategoryId = await resolveCategoryId(categorySlug);
      if (categorySlug !== 'all' && !masterCategoryId) return [];

      // Arama varsa → RPC (kelime bazlı tokenized arama)
      if (search.trim()) {
        // Türkçe büyük/küçük harf normalleştirmesi (ı/İ dahil)
        // + fazla boşlukları temizle
        const normalizedSearch = search
          .toLocaleLowerCase('tr-TR')
          .trim()
          .replace(/\s+/g, ' ');

        const { data, error } = await supabase.rpc('search_products_feed', {
          p_search:      normalizedSearch,
          p_brand_ids:   brandIds.length > 0 ? brandIds : null,
          p_category_id: masterCategoryId,
          p_on_sale:     filters.onSale,
          p_new_only:    filters.newOnly,
          p_page:        pageParam,
          p_page_size:   PAGE_SIZE,
        });
        if (error) return [];
        return (data ?? [])
          .filter((p: any) => p.image_url && p.price > 0)
          .map((p: any) => ({
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
            brandName: p.brand_name || p.brand_id || '—',
            brandLogoUrl: p.brand_logo_url ?? null,
            masterCategorySlug: p.master_category_slug ?? null,
            sizes: [],
            colors: [],
            imageUrls: [],
          } as DiscoverProduct));
      }

      // Arama yoksa → standart tablo sorgusu
      // forYou: indirimli + yeni ürünler önce (farklı keşif sıralaması)
      let query = supabase
        .from('products')
        .select(`
          id, name, image_url, image_urls, image_aspect_ratio,
          price, original_price, is_on_sale, is_new,
          url, affiliate_url, brand_id, sizes, colors,
          brands(name, logo_url),
          master_categories(slug)
        `)
        .eq('is_available', true)
        .order(forYou ? 'is_on_sale' : 'created_at', { ascending: false })
        .order(forYou ? 'is_new' : 'created_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (brandIds.length > 0)        query = query.in('brand_id', brandIds);
      if (excludeBrandIds.length > 0) query = query.not('brand_id', 'in', `(${excludeBrandIds.join(',')})`);
      if (masterCategoryId)           query = query.eq('master_category_id', masterCategoryId);
      if (filters.onSale)             query = query.eq('is_on_sale', true);
      if (filters.newOnly)            query = query.eq('is_new', true);
      if (filters.maxPrice)           query = query.lte('price', filters.maxPrice);

      const { data } = await query;
      return (data ?? [])
        .filter(p => p.image_url && p.price > 0)
        .map(p => ({
          id: p.id,
          name: p.name,
          imageUrl: p.image_url,
          imageUrls: (p as any).image_urls ?? [],
          imageAspectRatio: p.image_aspect_ratio ?? 0.75,
          price: p.price,
          originalPrice: p.original_price ?? null,
          isOnSale: p.is_on_sale ?? false,
          isNew: p.is_new ?? false,
          url: p.url,
          affiliateUrl: p.affiliate_url || p.url,
          brandId: p.brand_id,
          brandName: (p as any).brands?.name || '—',
          brandLogoUrl: (p as any).brands?.logo_url ?? null,
          masterCategorySlug: (p as any).master_categories?.slug ?? null,
          sizes: (p as any).sizes ?? [],
          colors: (p as any).colors ?? [],
        } as DiscoverProduct));
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length : undefined,
    staleTime: 5 * 60 * 1000,
  });
}
