import { supabase } from './supabase';
import { unfurlUrl, type UnfurledProduct } from './linkUnfurler';
import { sendLocalNotification } from './notifications';

// ── Tipler ───────────────────────────────────────────────────────────────────

export interface Collection {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  coverImageUrl?: string;
  description?: string;
  isDefault: boolean;
  isPrivate: boolean;
  displayOrder: number;
  favoriteCount?: number;
  createdAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  collectionId: string;
  sourceUrl: string;
  urlHash: string;
  productName: string;
  productDescription?: string;
  primaryImageUrl?: string;
  imageUrls: string[];
  priceAtSave?: number;
  originalPriceAtSave?: number;
  currency: string;
  currentPrice?: number;
  currentStockStatus: string;
  currentStockCount?: number;
  lastPriceCheckAt?: string;
  merchantName?: string;
  note?: string;
  tags: string[];
  watchPriceDrop: boolean;
  watchStockChange: boolean;
  targetPrice?: number;
  parserUsed: string;
  needsManualReview: boolean;
  shareSource: string;
  masterCategoryId?: string;
  savedAt: string;
  collection?: Collection;
}

export interface AddFavoriteInput {
  url: string;
  collectionId?: string;
  note?: string;
  watchPriceDrop?: boolean;
  watchStockChange?: boolean;
  targetPrice?: number;
  shareSource?: string;
  // override için
  manualProduct?: Partial<UnfurledProduct>;
}

export interface CreateCollectionInput {
  name: string;
  emoji?: string;
  description?: string;
  isPrivate?: boolean;
}

// ── Koleksiyonlar ────────────────────────────────────────────────────────────

export async function getCollections(): Promise<Collection[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('favorite_collections')
    .select('*, favorites(count)')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(colFromDb);
}

export async function createCollection(input: CreateCollectionInput): Promise<Collection> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş gerekli');

  const { data: existing } = await supabase
    .from('favorite_collections')
    .select('display_order')
    .eq('user_id', user.id)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (existing?.display_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('favorite_collections')
    .insert({
      user_id: user.id,
      name: input.name,
      emoji: input.emoji ?? '📂',
      description: input.description,
      is_private: input.isPrivate ?? true,
      display_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return colFromDb(data);
}

export async function updateCollection(id: string, patch: Partial<CreateCollectionInput>): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined)        dbPatch.name        = patch.name;
  if (patch.emoji !== undefined)       dbPatch.emoji       = patch.emoji;
  if (patch.description !== undefined) dbPatch.description = patch.description;
  if (patch.isPrivate !== undefined)   dbPatch.is_private  = patch.isPrivate;

  const { error } = await supabase.from('favorite_collections').update(dbPatch).eq('id', id);
  if (error) throw error;
}

export async function deleteCollection(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş gerekli');

  // Varsayılan koleksiyonu al
  const { data: def } = await supabase
    .from('favorite_collections')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .maybeSingle();

  // İçindeki favorileri varsayılan koleksiyona taşı
  if (def?.id) {
    await supabase.from('favorites').update({ collection_id: def.id }).eq('collection_id', id);
  }

  const { error } = await supabase.from('favorite_collections').delete().eq('id', id);
  if (error) throw error;
}

async function getDefaultCollectionId(userId: string): Promise<string> {
  const { data } = await supabase.rpc('get_or_create_default_collection', { p_user_id: userId });
  return data as string;
}

// ── Favoriler ─────────────────────────────────────────────────────────────────

export async function getFavorites(collectionId?: string | null): Promise<Favorite[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let q = supabase
    .from('favorites')
    .select('*, favorite_collections(id,name,emoji,is_default)')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false });

  if (collectionId) q = q.eq('collection_id', collectionId);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(favFromDb);
}

export async function addFavorite(input: AddFavoriteInput): Promise<Favorite> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş gerekli');

  const collectionId = input.collectionId ?? await getDefaultCollectionId(user.id);

  // URL unfurl
  const unfurlResult = await unfurlUrl(input.url);
  const product: Partial<UnfurledProduct> = {
    ...(unfurlResult.data ?? {}),
    ...(input.manualProduct ?? {}),
  };

  const urlHash = simpleHash(normalizeUrl(input.url));

  // Kategori slug'unu UUID'ye çevir
  let masterCategoryId: string | null = null;
  const categorySlug = product.category;
  if (categorySlug) {
    const { data: cat } = await supabase
      .from('master_categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle();
    masterCategoryId = cat?.id ?? null;
  }

  const { data, error } = await supabase
    .from('favorites')
    .insert({
      user_id: user.id,
      collection_id: collectionId,
      source_url: input.url,
      url_hash: urlHash,
      product_name: product.name ?? 'Ürün',
      product_description: product.description,
      primary_image_url: product.primaryImageUrl,
      image_urls: product.imageUrls ?? [],
      price_at_save: product.price ?? 0,
      original_price_at_save: product.originalPrice,
      currency: product.currency ?? 'TRY',
      current_price: product.price ?? 0,
      current_stock_status: product.stockStatus ?? 'unknown',
      current_stock_count: product.stockCount,
      merchant_name: product.merchantName,
      note: input.note,
      watch_price_drop: input.watchPriceDrop ?? true,
      watch_stock_change: input.watchStockChange ?? false,
      target_price: input.targetPrice,
      parser_used: product.parserUsed ?? 'unknown',
      needs_manual_review: product.needsManualReview ?? false,
      share_source: input.shareSource ?? 'in_app',
      master_category_id: masterCategoryId,
    })
    .select('*, favorite_collections(id,name,emoji,is_default)')
    .single();

  if (error) {
    // Duplicate URL — zaten ekli
    if (error.code === '23505') throw new Error('DUPLICATE');
    throw error;
  }
  return favFromDb(data);
}

export async function updateFavorite(
  id: string,
  patch: Partial<Pick<Favorite, 'note' | 'tags' | 'watchPriceDrop' | 'watchStockChange' | 'targetPrice' | 'collectionId' | 'productName'>>
): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.note !== undefined)            dbPatch.note              = patch.note;
  if (patch.tags !== undefined)            dbPatch.tags              = patch.tags;
  if (patch.watchPriceDrop !== undefined)  dbPatch.watch_price_drop  = patch.watchPriceDrop;
  if (patch.watchStockChange !== undefined) dbPatch.watch_stock_change = patch.watchStockChange;
  if (patch.targetPrice !== undefined)     dbPatch.target_price      = patch.targetPrice;
  if (patch.collectionId !== undefined)    dbPatch.collection_id     = patch.collectionId;
  if (patch.productName !== undefined)     dbPatch.product_name      = patch.productName;
  dbPatch.updated_at = new Date().toISOString();

  const { error } = await supabase.from('favorites').update(dbPatch).eq('id', id);
  if (error) throw error;
}

export async function deleteFavorite(id: string): Promise<void> {
  const { error } = await supabase.from('favorites').delete().eq('id', id);
  if (error) throw error;
}

export async function refreshFavoritePrice(id: string): Promise<Favorite> {
  const { data: fav, error: fetchErr } = await supabase
    .from('favorites')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;

  const unfurlResult = await unfurlUrl(fav.source_url);
  if (!unfurlResult.success || !unfurlResult.data) throw new Error('Ürün bilgisi alınamadı');

  const p = unfurlResult.data;
  const { data: updated, error: updateErr } = await supabase
    .from('favorites')
    .update({
      current_price: p.price,
      current_stock_status: p.stockStatus,
      current_stock_count: p.stockCount,
      last_price_check_at: new Date().toISOString(),
      next_price_check_at: new Date(Date.now() + 6 * 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*, favorite_collections(id,name,emoji,is_default)')
    .single();
  if (updateErr) throw updateErr;

  // Fiyat geçmişine yaz
  await supabase.from('favorite_price_history').insert({
    favorite_id: id,
    price: p.price,
    stock_status: p.stockStatus,
  });

  // Fiyat düşüşü bildirimi: takip açıksa, kaydetme fiyatından %3+ düşüş varsa tetikle
  if (
    fav.watch_price_drop &&
    p.price != null && p.price > 0 &&
    fav.price_at_save != null && fav.price_at_save > 0
  ) {
    const prevPrice: number = fav.current_price ?? fav.price_at_save;
    const dropFromSave = (fav.price_at_save - p.price) / fav.price_at_save * 100;
    const isFurtherDrop = p.price < prevPrice;
    const isUnderSavePrice = p.price < fav.price_at_save;
    const meetsTarget = fav.target_price != null && p.price <= fav.target_price;

    if ((isFurtherDrop && isUnderSavePrice && dropFromSave >= 3) || meetsTarget) {
      await sendLocalNotification(
        'Fiyat düştü',
        `${fav.product_name} — ₺${p.price.toLocaleString('tr')} (kaydettiğinden %${dropFromSave.toFixed(0)} ucuz)`,
        { favoriteId: id, sourceUrl: fav.source_url },
      ).catch(() => { /* bildirim izni yoksa sessizce geç */ });
    }
  }

  return favFromDb(updated);
}

export async function getFavoritePriceHistory(
  favoriteId: string
): Promise<Array<{ price: number; recordedAt: string }>> {
  const { data, error } = await supabase
    .from('favorite_price_history')
    .select('price, recorded_at')
    .eq('favorite_id', favoriteId)
    .order('recorded_at', { ascending: true })
    .limit(60);
  if (error) throw error;
  return (data ?? []).map(r => ({ price: r.price, recordedAt: r.recorded_at }));
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    ['utm_source','utm_medium','utm_campaign','fbclid','gclid','ref'].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch { return url; }
}

function simpleHash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16).padStart(8, '0') + str.slice(-24).replace(/[^a-z0-9]/gi, '').padEnd(24, '0').slice(0, 24);
}

function colFromDb(row: any): Collection {
  const cnt = row.favorites;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    emoji: row.emoji ?? '❤️',
    coverImageUrl: row.cover_image_url,
    description: row.description,
    isDefault: row.is_default,
    isPrivate: row.is_private,
    displayOrder: row.display_order,
    favoriteCount: Array.isArray(cnt) ? cnt.length : cnt?.count ?? 0,
    createdAt: row.created_at,
  };
}

function favFromDb(row: any): Favorite {
  const col = row.favorite_collections;
  return {
    id: row.id,
    userId: row.user_id,
    collectionId: row.collection_id,
    sourceUrl: row.source_url,
    urlHash: row.url_hash,
    productName: row.product_name,
    productDescription: row.product_description,
    primaryImageUrl: row.primary_image_url,
    imageUrls: row.image_urls ?? [],
    priceAtSave: row.price_at_save,
    originalPriceAtSave: row.original_price_at_save,
    currency: row.currency ?? 'TRY',
    currentPrice: row.current_price,
    currentStockStatus: row.current_stock_status ?? 'unknown',
    currentStockCount: row.current_stock_count,
    lastPriceCheckAt: row.last_price_check_at,
    merchantName: row.merchant_name,
    note: row.note,
    tags: row.tags ?? [],
    watchPriceDrop: row.watch_price_drop ?? false,
    watchStockChange: row.watch_stock_change ?? false,
    targetPrice: row.target_price,
    parserUsed: row.parser_used ?? 'unknown',
    needsManualReview: row.needs_manual_review ?? false,
    shareSource: row.share_source ?? 'in_app',
    masterCategoryId: row.master_category_id ?? undefined,
    savedAt: row.saved_at,
    collection: col ? colFromDb(col) : undefined,
  };
}
