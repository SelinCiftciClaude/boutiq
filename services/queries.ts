import { supabase } from '@/services/supabase';
import {
  fromDbBrand,
  fromDbCampaign,
  fromDbProduct,
  fromDbProfile,
  fromDbShipment,
} from '@/services/mappers';
import type { Brand, BrandCategory, Campaign, Product, Shipment, UserProfile } from '@/types';

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
    (savedRes.data ?? []).map((r: any) => [r.brand_id, !!r.is_favorite])
  );
  return (brandsRes.data ?? []).map((b: any) => fromDbBrand(b, savedMap.has(b.id)));
}

export async function fetchSavedBrands(userId: string): Promise<Brand[]> {
  const { data, error } = await supabase
    .from('user_brands')
    .select('is_favorite, brands(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .filter((row: any) => row.brands)
    .map((row: any) => fromDbBrand(row.brands, !!row.is_favorite));
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
    (savedRes.data ?? []).map((r: any) => [r.product_id, r.saved_at])
  );
  return (productsRes.data ?? []).map((p: any) =>
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
  return (data ?? [])
    .filter((row: any) => row.products)
    .map((row: any) => fromDbProduct(row.products, row.products.brands, true, row.saved_at));
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

export async function fetchShipments(userId: string): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*, brands(logo_url), shipment_events(*)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => fromDbShipment(row, row.brands));
}

export async function fetchCampaignsForUser(userId: string): Promise<Campaign[]> {
  const [brandsRes, readsRes] = await Promise.all([
    supabase.from('user_brands').select('brand_id').eq('user_id', userId),
    supabase.from('user_campaign_reads').select('campaign_id').eq('user_id', userId),
  ]);
  if (brandsRes.error) throw brandsRes.error;
  if (readsRes.error) throw readsRes.error;

  const brandIds = (brandsRes.data ?? []).map((r: any) => r.brand_id);
  if (brandIds.length === 0) return [];
  const readSet = new Set<string>((readsRes.data ?? []).map((r: any) => r.campaign_id));

  const { data, error } = await supabase
    .from('campaigns')
    .select('*, brands(name, logo_url)')
    .in('brand_id', brandIds)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => fromDbCampaign(row, row.brands, readSet.has(row.id)));
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

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? fromDbProfile(data) : null;
}

export type DashboardStats = {
  savedBrands: number;
  savedProducts: number;
  activeShipments: number;
  unreadCampaigns: number;
};

export async function fetchDashboard(userId: string): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_user_dashboard', { p_user_id: userId });
  if (error) throw error;
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    savedBrands: Array.isArray(d.saved_brands) ? d.saved_brands.length : 0,
    savedProducts: Number(d.saved_products ?? 0),
    activeShipments: Number(d.active_shipments ?? 0),
    unreadCampaigns: Number(d.unread_campaigns ?? 0),
  };
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

export type { BrandCategory };
