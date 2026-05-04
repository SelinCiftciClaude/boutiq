import { supabase } from '@/services/supabase';
import {
  fromDbBrand,
  fromDbCampaign,
  fromDbProduct,
  fromDbProfile,
  fromDbShipment,
  type BrandRow,
  type ProductRow,
  type ShipmentRow,
  type CampaignRow,
  type ProfileRow,
} from '@/services/mappers';
import type { Brand, BrandCategory, Campaign, Product, Review, Shipment, UserProfile } from '@/types';

export async function fetchAllBrands(userId?: string): Promise<Brand[]> {
  const [brandsRes, savedRes] = await Promise.all([
    supabase.from('brands').select('*').order('created_at', { ascending: false }),
    userId
      ? supabase.from('user_brands').select('brand_id, is_favorite').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (brandsRes.error) throw brandsRes.error;
  if (savedRes.error) throw savedRes.error;
  const savedMap = new Map<string, boolean>(
    (savedRes.data ?? []).map((r: { brand_id: string; is_favorite: boolean }) => [r.brand_id, !!r.is_favorite])
  );
  return (brandsRes.data ?? []).map((b: BrandRow) => fromDbBrand(b, savedMap.has(b.id)));
}

export async function fetchSavedBrands(userId: string): Promise<Brand[]> {
  const { data, error } = await supabase
    .from('user_brands')
    .select('is_favorite, brands(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  type SavedBrandRow = { brands: BrandRow; is_favorite: boolean };
  const rows = (data ?? []) as unknown as SavedBrandRow[];
  return rows
    .filter((row) => row.brands)
    .map((row) => fromDbBrand(row.brands, !!row.is_favorite));
}

export async function addSavedBrand(
  userId: string,
  brandId: string,
  isFavorite = false
): Promise<void> {
  const { error } = await supabase
    .from('user_brands')
    .upsert({ user_id: userId, brand_id: brandId, is_favorite: isFavorite }, {
      onConflict: 'user_id,brand_id',
    });
  if (error) throw error;

  // Arka planda ürün senkronizasyonu — kullanıcıyı bekletme
  const { data: brand } = await supabase
    .from('brands').select('website, platform').eq('id', brandId).maybeSingle();
  if (brand?.website) {
    supabase.functions
      .invoke('sync-brand-products', { body: { brand_id: brandId, website_url: brand.website } })
      .catch(() => {});
  }
}

export async function removeSavedBrand(userId: string, brandId: string): Promise<void> {
  const { error } = await supabase
    .from('user_brands')
    .delete()
    .eq('user_id', userId)
    .eq('brand_id', brandId);
  if (error) throw error;
}

export async function fetchAllProducts(userId?: string): Promise<Product[]> {
  const [productsRes, savedRes] = await Promise.all([
    supabase
      .from('products')
      .select('*, brands(name, logo_url)')
      .order('created_at', { ascending: false }),
    userId
      ? supabase
          .from('saved_products')
          .select('product_id, saved_at')
          .eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (productsRes.error) throw productsRes.error;
  if (savedRes.error) throw savedRes.error;
  const savedMap = new Map<string, string>(
    (savedRes.data ?? []).map((r: { product_id: string; saved_at: string }) => [r.product_id, r.saved_at])
  );
  return (productsRes.data ?? []).map((p: ProductRow) =>
    fromDbProduct(p, p.brands, savedMap.has(p.id), savedMap.get(p.id))
  );
}

export async function fetchSavedProducts(userId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('saved_products')
    .select('saved_at, products(*, brands(name, logo_url))')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  if (error) throw error;
  type SavedProductRow = { saved_at: string; products: ProductRow };
  const savedRows = (data ?? []) as unknown as SavedProductRow[];
  return savedRows
    .filter((row) => row.products)
    .map((row) => fromDbProduct(row.products, row.products.brands, true, row.saved_at));
}

export async function addSavedProduct(userId: string, productId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_products')
    .upsert(
      { user_id: userId, product_id: productId, saved_at: new Date().toISOString() },
      { onConflict: 'user_id,product_id' }
    );
  if (error) throw error;
}

export async function removeSavedProduct(userId: string, productId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_products')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) throw error;
}

export async function addManualShipment(
  userId: string,
  params: { brandName: string; orderNumber: string; trackingNumber?: string; carrier: string }
): Promise<void> {
  const { error } = await supabase.from('shipments').insert({
    user_id: userId,
    brand_name: params.brandName,
    order_number: params.orderNumber,
    tracking_number: params.trackingNumber || null,
    carrier: params.carrier,
    status: 'processing',
    status_label: 'İşleniyor',
    source: 'manual',
  });
  if (error) throw error;
}

export async function fetchShipments(userId: string): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*, brands(logo_url), shipment_events(*)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? [] as unknown as ShipmentRow[]).map((row: ShipmentRow) => fromDbShipment(row, row.brands ?? undefined));
}

export async function fetchCampaignsForUser(userId: string): Promise<Campaign[]> {
  const [brandsRes, readsRes] = await Promise.all([
    supabase.from('user_brands').select('brand_id').eq('user_id', userId),
    supabase.from('user_campaign_reads').select('campaign_id').eq('user_id', userId),
  ]);
  if (brandsRes.error) throw brandsRes.error;
  if (readsRes.error) throw readsRes.error;

  const brandIds = (brandsRes.data ?? []).map((r: { brand_id: string }) => r.brand_id);
  if (brandIds.length === 0) return [];
  const readSet = new Set<string>((readsRes.data ?? []).map((r: { campaign_id: string }) => r.campaign_id));

  const { data, error } = await supabase
    .from('campaigns')
    .select('*, brands(name, logo_url)')
    .in('brand_id', brandIds)
    .eq('is_active', true)
    .order('is_sponsored', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: CampaignRow) => fromDbCampaign(row, row.brands, readSet.has(row.id)));
}

export async function markCampaignRead(userId: string, campaignId: string): Promise<void> {
  const { error } = await supabase
    .from('user_campaign_reads')
    .upsert(
      { user_id: userId, campaign_id: campaignId, read_at: new Date().toISOString() },
      { onConflict: 'user_id,campaign_id' }
    );
  if (error) throw error;
}

export async function fetchBrandById(brandId: string, userId?: string): Promise<Brand | null> {
  const [brandRes, savedRes] = await Promise.all([
    supabase.from('brands').select('*').eq('id', brandId).single(),
    userId
      ? supabase.from('user_brands').select('is_favorite').eq('user_id', userId).eq('brand_id', brandId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (brandRes.error) throw brandRes.error;
  return fromDbBrand(brandRes.data, !!savedRes.data);
}

export async function fetchProductsByBrand(brandId: string, userId?: string): Promise<Product[]> {
  const [productsRes, savedRes] = await Promise.all([
    supabase.from('products').select('*, brands(name, logo_url)').eq('brand_id', brandId).order('created_at', { ascending: false }),
    userId
      ? supabase.from('saved_products').select('product_id, saved_at').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (productsRes.error) throw productsRes.error;
  if (savedRes.error) throw savedRes.error;
  const savedMap = new Map<string, string>((savedRes.data ?? []).map((r: { product_id: string; saved_at: string }) => [r.product_id, r.saved_at]));
  return (productsRes.data ?? []).map((p: ProductRow) => fromDbProduct(p, p.brands, savedMap.has(p.id), savedMap.get(p.id)));
}

export async function fetchProductById(productId: string, userId?: string): Promise<Product | null> {
  const [productRes, savedRes] = await Promise.all([
    supabase.from('products').select('*, brands(name, logo_url)').eq('id', productId).single(),
    userId
      ? supabase.from('saved_products').select('saved_at').eq('user_id', userId).eq('product_id', productId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (productRes.error) throw productRes.error;
  const p = productRes.data;
  return fromDbProduct(p, p.brands, !!savedRes.data, savedRes.data?.saved_at);
}

export async function fetchRelatedProducts(category: string, excludeId: string, userId?: string): Promise<Product[]> {
  const [productsRes, savedRes] = await Promise.all([
    supabase.from('products').select('*, brands(name, logo_url)').eq('category', category).neq('id', excludeId).limit(6),
    userId
      ? supabase.from('saved_products').select('product_id, saved_at').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (productsRes.error) throw productsRes.error;
  if (savedRes.error) throw savedRes.error;
  const savedMap = new Map<string, string>((savedRes.data ?? []).map((r: { product_id: string; saved_at: string }) => [r.product_id, r.saved_at]));
  return (productsRes.data ?? []).map((p: ProductRow) => fromDbProduct(p, p.brands, savedMap.has(p.id), savedMap.get(p.id)));
}

export async function fetchPriceHistory(productId: string): Promise<{ price: number; recordedAt: string }[]> {
  const { data, error } = await supabase
    .from('product_price_history')
    .select('price, recorded_at')
    .eq('product_id', productId)
    .order('recorded_at', { ascending: true })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((r: { price: number | string; recorded_at: string }) => ({ price: Number(r.price), recordedAt: r.recorded_at }));
}

export async function fetchCampaignsByBrand(brandId: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, brands(name, logo_url)')
    .eq('brand_id', brandId)
    .eq('is_active', true)
    .order('is_sponsored', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: CampaignRow) => fromDbCampaign(row, row.brands));
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? fromDbProfile(data as ProfileRow) : null;
}

export type DashboardStats = {
  savedBrands: number;
  savedProducts: number;
  activeShipments: number;
  unreadCampaigns: number;
};

export async function fetchDashboard(userId: string): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_user_dashboard');
  if (error) throw error;
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    savedBrands: Array.isArray(d.saved_brands) ? d.saved_brands.length : 0,
    savedProducts: Number(d.saved_products ?? 0),
    activeShipments: Number(d.active_shipments ?? 0),
    unreadCampaigns: Number(d.unread_campaigns ?? 0),
  };
}

export async function searchBrandsAndProducts(
  query: string,
  userId?: string
): Promise<{ brands: Brand[]; products: Product[] }> {
  const q = query.trim();
  if (!q) return { brands: [], products: [] };

  const likeQ = `%${q}%`;

  const [brandsRes, savedBrandsRes, productsRes, savedProductsRes] = await Promise.all([
    // Brands: name veya category ilike eşleşmesi
    supabase
      .from('brands')
      .select('*')
      .or(`name.ilike.${likeQ},category.ilike.${likeQ}`)
      .limit(20),

    // Kullanıcının kayıtlı marka listesi
    userId
      ? supabase.from('user_brands').select('brand_id, is_favorite').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),

    // Products: name veya category ilike eşleşmesi (brand adı join'den)
    supabase
      .from('products')
      .select('*, brands(name, logo_url)')
      .or(`name.ilike.${likeQ},category.ilike.${likeQ}`)
      .limit(30),

    // Kullanıcının kayıtlı ürün listesi
    userId
      ? supabase.from('saved_products').select('product_id, saved_at').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (brandsRes.error) throw brandsRes.error;
  if (productsRes.error) throw productsRes.error;

  const savedBrandMap = new Map<string, boolean>(
    ((savedBrandsRes as { data: { brand_id: string; is_favorite: boolean }[] | null }).data ?? [])
      .map(r => [r.brand_id, !!r.is_favorite])
  );
  const savedProductMap = new Map<string, string>(
    ((savedProductsRes as { data: { product_id: string; saved_at: string }[] | null }).data ?? [])
      .map(r => [r.product_id, r.saved_at])
  );

  const brands = (brandsRes.data ?? []).map((b: BrandRow) =>
    fromDbBrand(b, savedBrandMap.has(b.id))
  );

  const products = (productsRes.data ?? []).map((p: ProductRow) =>
    fromDbProduct(p, p.brands, savedProductMap.has(p.id), savedProductMap.get(p.id))
  );

  return { brands, products };
}

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

export async function updateNotificationPreferences(
  userId: string,
  notifications: { campaigns: boolean; shipping: boolean; newArrivals: boolean; priceDrops: boolean }
): Promise<void> {
  const { data, error: fetchErr } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', userId)
    .single();
  if (fetchErr) throw fetchErr;
  const current = (data?.preferences as Record<string, unknown>) ?? {};
  const { error } = await supabase
    .from('profiles')
    .update({
      preferences: {
        ...current,
        notifications: {
          campaigns: notifications.campaigns,
          new_arrivals: notifications.newArrivals,
          shipping: notifications.shipping,
          price_drops: notifications.priceDrops,
        },
      },
    })
    .eq('id', userId);
  if (error) throw error;
}

export async function trackAffiliateClick(
  userId: string | null,
  brandId: string | null,
  productId: string | null,
  affiliateUrl: string
): Promise<void> {
  if (!userId) return;
  await supabase.from('affiliate_clicks').insert({
    user_id: userId,
    brand_id: brandId,
    product_id: productId,
    affiliate_url: affiliateUrl,
    clicked_at: new Date().toISOString(),
  });
}

export async function fetchReviews(brandId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    brandId: r.brand_id,
    rating: r.rating,
    comment: r.comment ?? undefined,
    createdAt: r.created_at,
  }));
}

export async function upsertReview(userId: string, brandId: string, rating: number, comment: string): Promise<void> {
  const { error } = await supabase.from('reviews').upsert(
    { user_id: userId, brand_id: brandId, rating, comment: comment.trim() || null },
    { onConflict: 'user_id,brand_id' }
  );
  if (error) throw error;
}

export async function fetchPublicCollection(userId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('saved_products')
    .select('product_id, saved_at, products(*, brands(name, logo_url))')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  if (error) throw error;
  type CollectionRow = { saved_at: string; products: ProductRow };
  const collectionRows = (data ?? []) as unknown as CollectionRow[];
  return collectionRows
    .filter((r) => r.products)
    .map((r) => fromDbProduct(r.products, r.products?.brands, true, r.saved_at));
}

export async function fetchTrendingBrands(): Promise<Brand[]> {
  const { data: viewData, error: viewErr } = await supabase
    .from('popular_brands_week')
    .select('brand_id');
  if (viewErr) throw viewErr;
  const ids = (viewData ?? []).map((r: { brand_id: string }) => r.brand_id).filter(Boolean);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('brands').select('*').in('id', ids);
  if (error) throw error;
  const order = new Map(ids.map((id: string, i: number) => [id, i]));
  return (data ?? [])
    .map((b: BrandRow) => fromDbBrand(b))
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

export async function fetchTrendingProducts(): Promise<Product[]> {
  const { data: viewData, error: viewErr } = await supabase
    .from('popular_products_week')
    .select('product_id');
  if (viewErr) throw viewErr;
  const ids = (viewData ?? []).map((r: { product_id: string }) => r.product_id).filter(Boolean);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('products')
    .select('*, brands(name, logo_url)')
    .in('id', ids);
  if (error) throw error;
  const order = new Map(ids.map((id: string, i: number) => [id, i]));
  return (data ?? [])
    .map((p: ProductRow) => fromDbProduct(p, p.brands))
    .sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
}

// ── 6C — Stok uyarıları ───────────────────────────────────────────────────
export async function addStockAlert(userId: string, productId: string): Promise<void> {
  const { error } = await supabase.from('stock_alerts')
    .upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id' });
  if (error) throw error;
}

export async function removeStockAlert(userId: string, productId: string): Promise<void> {
  const { error } = await supabase.from('stock_alerts')
    .delete().eq('user_id', userId).eq('product_id', productId);
  if (error) throw error;
}

export async function hasStockAlert(userId: string, productId: string): Promise<boolean> {
  const { data } = await supabase.from('stock_alerts')
    .select('id').eq('user_id', userId).eq('product_id', productId).maybeSingle();
  return !!data;
}

// ── 6D — Referral ─────────────────────────────────────────────────────────
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('owner_user_id', userId)
    .maybeSingle();
  if (existing?.code) return existing.code;

  const rand = new Uint32Array(1);
  crypto.getRandomValues(rand);
  const code = 'BTQ' + rand[0].toString(36).padStart(7, '0').slice(0, 7).toUpperCase();

  const { error } = await supabase
    .from('referral_codes')
    .insert({ code, owner_user_id: userId });

  if (error) {
    // Unique conflict — concurrent insert, ya da bu kullanıcının kodu zaten var
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('owner_user_id', userId)
        .maybeSingle();
      return retry?.code ?? code;
    }
    throw error;
  }
  return code;
}

export async function claimReferralCode(code: string, newUserId: string): Promise<void> {
  const { data: codeRow } = await supabase.from('referral_codes').select('*').eq('code', code.toUpperCase()).maybeSingle();
  if (!codeRow || codeRow.owner_user_id === newUserId) return;
  await supabase.from('referral_uses').upsert({ code: codeRow.code, referred_user_id: newUserId }, { onConflict: 'referred_user_id' });
  await supabase.from('referral_codes').update({ uses: codeRow.uses + 1 }).eq('code', codeRow.code);
}

export type { BrandCategory };
