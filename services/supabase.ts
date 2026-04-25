import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project credentials
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth helpers
export const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Database helpers
export const getBrands = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_brands')
    .select('*, brands(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const getSavedProducts = async (userId: string) => {
  const { data, error } = await supabase
    .from('saved_products')
    .select('*, products(*)')
    .eq('user_id', userId)
    .order('saved_at', { ascending: false });
  return { data, error };
};

export const getShipments = async (userId: string) => {
  const { data, error } = await supabase
    .from('shipments')
    .select('*, shipment_events(*)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  return { data, error };
};

export const getCampaigns = async (userId: string) => {
  // First get user's brand IDs, then fetch campaigns for those brands
  const { data: userBrands } = await supabase
    .from('user_brands')
    .select('brand_id')
    .eq('user_id', userId);

  const brandIds = (userBrands ?? []).map((ub: { brand_id: string }) => ub.brand_id);
  if (brandIds.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .in('brand_id', brandIds)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const trackAffiliateClick = async (
  userId: string,
  brandId: string,
  productId: string | null,
  affiliateUrl: string
) => {
  await supabase.from('affiliate_clicks').insert({
    user_id: userId,
    brand_id: brandId,
    product_id: productId,
    affiliate_url: affiliateUrl,
    clicked_at: new Date().toISOString(),
  });
};
