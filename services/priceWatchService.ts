import { supabase } from './supabase';
import type { StockStatus } from './scrapers';

// ── Tipleri ──────────────────────────────────────────────────────────────────

export interface ProductWatch {
  id: string;
  userId: string;
  productId: string;
  watchPriceDrop: boolean;
  watchLowStock: boolean;
  watchBackInStock: boolean;
  targetPrice: number | null;
  initialPrice: number;
  isActive: boolean;
  createdAt: string;
  // JOIN ile gelen
  product?: {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    brandName: string;
    brandLogo: string;
    affiliateUrl: string;
    isOnSale: boolean;
    inStock: boolean;
  };
}

export interface WatchInput {
  productId: string;
  initialPrice: number;
  watchPriceDrop?: boolean;
  watchLowStock?: boolean;
  watchBackInStock?: boolean;
  targetPrice?: number | null;
}

export interface NotificationPreferences {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  minDiscountPct: number;
  dailyLimit: number;
}

// ── Takip CRUD ────────────────────────────────────────────────────────────────

export async function addWatch(input: WatchInput): Promise<ProductWatch> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş gerekli');

  const { data, error } = await supabase
    .from('product_watches')
    .upsert({
      user_id: user.id,
      product_id: input.productId,
      initial_price: input.initialPrice,
      watch_price_drop: input.watchPriceDrop ?? true,
      watch_low_stock: input.watchLowStock ?? true,
      watch_back_in_stock: input.watchBackInStock ?? false,
      target_price: input.targetPrice ?? null,
      is_active: true,
    }, { onConflict: 'user_id,product_id' })
    .select()
    .single();

  if (error) throw error;
  return fromDb(data);
}

export async function removeWatch(productId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş gerekli');

  const { error } = await supabase
    .from('product_watches')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', productId);

  if (error) throw error;
}

export async function updateWatch(
  watchId: string,
  patch: Partial<Pick<ProductWatch, 'watchPriceDrop' | 'watchLowStock' | 'watchBackInStock' | 'targetPrice' | 'isActive'>>
): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.watchPriceDrop !== undefined)    dbPatch.watch_price_drop    = patch.watchPriceDrop;
  if (patch.watchLowStock !== undefined)     dbPatch.watch_low_stock     = patch.watchLowStock;
  if (patch.watchBackInStock !== undefined)  dbPatch.watch_back_in_stock = patch.watchBackInStock;
  if (patch.targetPrice !== undefined)       dbPatch.target_price        = patch.targetPrice;
  if (patch.isActive !== undefined)          dbPatch.is_active           = patch.isActive;

  const { error } = await supabase
    .from('product_watches')
    .update(dbPatch)
    .eq('id', watchId);

  if (error) throw error;
}

export async function getWatchList(filter?: 'price_drop' | 'low_stock' | 'back_in_stock'): Promise<ProductWatch[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let q = supabase
    .from('product_watches')
    .select(`
      *,
      products (
        id, name, price, original_price, image, is_on_sale, in_stock, affiliate_url,
        brands ( name, logo_url )
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (filter === 'price_drop')    q = q.eq('watch_price_drop', true);
  if (filter === 'low_stock')     q = q.eq('watch_low_stock', true);
  if (filter === 'back_in_stock') q = q.eq('watch_back_in_stock', true);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(fromDb);
}

export async function isWatched(productId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { count } = await supabase
    .from('product_watches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .eq('is_active', true);

  return (count ?? 0) > 0;
}

// ── Bildirim tercihleri ───────────────────────────────────────────────────────

export async function getNotificationPrefs(): Promise<NotificationPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    userId: data.user_id,
    pushEnabled: data.push_enabled,
    emailEnabled: data.email_enabled,
    quietHoursEnabled: data.quiet_hours_enabled,
    quietStart: data.quiet_start,
    quietEnd: data.quiet_end,
    minDiscountPct: data.min_discount_pct,
    dailyLimit: data.daily_limit,
  };
}

export async function upsertNotificationPrefs(prefs: Partial<NotificationPreferences>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş gerekli');

  const patch: Record<string, unknown> = { user_id: user.id };
  if (prefs.pushEnabled !== undefined)       patch.push_enabled        = prefs.pushEnabled;
  if (prefs.emailEnabled !== undefined)      patch.email_enabled       = prefs.emailEnabled;
  if (prefs.quietHoursEnabled !== undefined) patch.quiet_hours_enabled = prefs.quietHoursEnabled;
  if (prefs.quietStart !== undefined)        patch.quiet_start         = prefs.quietStart;
  if (prefs.quietEnd !== undefined)          patch.quiet_end           = prefs.quietEnd;
  if (prefs.minDiscountPct !== undefined)    patch.min_discount_pct    = prefs.minDiscountPct;
  if (prefs.dailyLimit !== undefined)        patch.daily_limit         = prefs.dailyLimit;

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(patch, { onConflict: 'user_id' });

  if (error) throw error;
}

// ── Bildirim tetikleyici (yerel simülasyon — Edge Function'ın yaptığını taklit eder) ──

export async function simulatePriceCheck(productId: string, newPrice: number, stockStatus: StockStatus = 'in_stock'): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Son fiyat kaydını al
  const { data: lastRecord } = await supabase
    .from('product_price_history')
    .select('price, stock_status')
    .eq('product_id', productId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const oldPrice   = lastRecord?.price ?? newPrice;
  const oldStock   = lastRecord?.stock_status ?? 'in_stock';
  const dropPct    = oldPrice > 0 ? ((oldPrice - newPrice) / oldPrice) * 100 : 0;

  // Aktif takip kaydı
  const { data: watch } = await supabase
    .from('product_watches')
    .select('*')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .eq('is_active', true)
    .maybeSingle();

  if (!watch) return;

  const notifications: Array<{ title: string; body: string; type: string; payload: object }> = [];

  // Fiyat düştü
  if (watch.watch_price_drop && newPrice < oldPrice && dropPct >= 5) {
    notifications.push({
      type: 'price_drop',
      title: 'Fiyat düştü! 🎉',
      body: `₺${oldPrice.toLocaleString('tr-TR')} → ₺${newPrice.toLocaleString('tr-TR')} (%${dropPct.toFixed(0)} indirim)`,
      payload: { old_price: oldPrice, new_price: newPrice, drop_pct: dropPct },
    });
  }

  // Hedef fiyata ulaşıldı
  if (watch.target_price && newPrice <= watch.target_price && oldPrice > watch.target_price) {
    notifications.push({
      type: 'target_reached',
      title: 'Hedef fiyata ulaştı! ✨',
      body: `Takip ettiğin ürün ₺${watch.target_price.toLocaleString('tr-TR')} hedefine düştü.`,
      payload: { target_price: watch.target_price, new_price: newPrice },
    });
  }

  // Stok azaldı
  if (watch.watch_low_stock && stockStatus === 'low_stock' && oldStock === 'in_stock') {
    notifications.push({
      type: 'low_stock',
      title: 'Stok azalıyor ⚠️',
      body: 'Takip ettiğin üründen son birkaç adet kaldı.',
      payload: { stock_status: stockStatus },
    });
  }

  // Tekrar stokta
  if (watch.watch_back_in_stock && stockStatus === 'in_stock' && oldStock === 'out_of_stock') {
    notifications.push({
      type: 'back_in_stock',
      title: 'Tekrar stokta! ✨',
      body: 'Takipte tuttuğun ürün tekrar satışa girdi.',
      payload: { stock_status: stockStatus },
    });
  }

  // Bildirimleri kaydet
  for (const n of notifications) {
    await supabase.from('notifications').insert({
      user_id: user.id,
      product_id: productId,
      type: n.type,
      title: n.title,
      body: n.body,
      payload: n.payload,
      is_read: false,
    });
  }

  // Fiyat geçmişini güncelle (değişiklik varsa)
  if (newPrice !== oldPrice || stockStatus !== oldStock) {
    await supabase.from('product_price_history').insert({
      product_id: productId,
      price: newPrice,
      stock_status: stockStatus,
      is_on_sale: newPrice < (oldPrice || newPrice),
    });

    // products tablosunu güncelle
    await supabase.from('products').update({
      price: newPrice,
      in_stock: stockStatus !== 'out_of_stock',
      is_on_sale: newPrice < oldPrice,
    }).eq('id', productId);
  }
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function fromDb(row: any): ProductWatch {
  const p   = row.products;
  const br  = p?.brands;
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    watchPriceDrop: row.watch_price_drop,
    watchLowStock: row.watch_low_stock,
    watchBackInStock: row.watch_back_in_stock,
    targetPrice: row.target_price ?? null,
    initialPrice: row.initial_price,
    isActive: row.is_active,
    createdAt: row.created_at,
    product: p ? {
      id: p.id,
      name: p.name,
      price: p.price,
      originalPrice: p.original_price ?? undefined,
      image: p.image,
      brandName: br?.name ?? '',
      brandLogo: br?.logo_url ?? '',
      affiliateUrl: p.affiliate_url ?? '',
      isOnSale: p.is_on_sale ?? false,
      inStock: p.in_stock ?? true,
    } : undefined,
  };
}
