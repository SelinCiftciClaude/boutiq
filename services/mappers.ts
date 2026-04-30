import type { Brand, BrandCategory, Campaign, Product, Shipment, ShipmentEvent, ShipmentStatus, UserProfile } from '@/types';

interface BrandJoin { name: string; logo_url?: string | null }

export interface BrandRow {
  id: string;
  name: string;
  handle?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  category: string;
  tags?: string[] | null;
  website: string;
  affiliate_url?: string | null;
  product_count?: number | null;
  is_verified?: boolean | null;
  description?: string | null;
  rating?: number | string | null;
  brands?: BrandJoin | null;
}

export interface ProductRow {
  id: string;
  brand_id: string;
  name: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  price: number | string;
  original_price?: number | string | null;
  currency?: string | null;
  url: string;
  affiliate_url?: string | null;
  category?: string | null;
  tags?: string[] | null;
  is_on_sale?: boolean | null;
  in_stock?: boolean | null;
  sizes?: string[] | null;
  colors?: string[] | null;
  instagram_post_id?: string | null;
  brands?: BrandJoin | null;
}

export interface ShipmentEventRow {
  id: string;
  timestamp: string;
  location?: string | null;
  description: string;
  status: string;
}

export interface ShipmentRow {
  id: string;
  brand_id?: string | null;
  brand_name: string;
  order_number: string;
  tracking_number?: string | null;
  carrier?: string | null;
  status: string;
  status_label?: string | null;
  estimated_delivery?: string | null;
  last_location?: string | null;
  products?: unknown[] | null;
  total_amount?: number | string | null;
  currency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  shipment_events?: ShipmentEventRow[] | null;
  brands?: { logo_url?: string | null } | null;
}

export interface CampaignRow {
  id: string;
  brand_id: string;
  title: string;
  description?: string | null;
  discount?: number | string | null;
  discount_type?: string | null;
  ends_at?: string | null;
  image_url?: string | null;
  code?: string | null;
  url: string;
  affiliate_url?: string | null;
  is_sponsored?: boolean | null;
  created_at: string;
  brands?: BrandJoin | null;
}

export interface ProfileRow {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  preferences?: Record<string, unknown> | null;
  connected_accounts?: Record<string, unknown> | null;
}

export function fromDbBrand(row: BrandRow, isFavorite = false): Brand {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle ?? '',
    logo: row.logo_url ?? '',
    coverImage: row.cover_url ?? '',
    category: row.category as BrandCategory,
    tags: row.tags ?? [],
    website: row.website,
    affiliateUrl: row.affiliate_url ?? row.website,
    productCount: row.product_count ?? 0,
    isVerified: !!row.is_verified,
    isFavorite,
    description: row.description ?? undefined,
    rating: row.rating != null ? Number(row.rating) : undefined,
  };
}

export function fromDbProduct(
  row: ProductRow,
  brand?: BrandJoin | null,
  isSaved = false,
  savedAt?: string | null
): Product {
  return {
    id: row.id,
    brandId: row.brand_id,
    brandName: brand?.name ?? row.brands?.name ?? '',
    brandLogo: brand?.logo_url ?? row.brands?.logo_url ?? '',
    name: row.name,
    image: row.image_url ?? '',
    images: row.image_urls ?? undefined,
    price: Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    currency: row.currency ?? 'TL',
    url: row.url,
    affiliateUrl: row.affiliate_url ?? row.url,
    category: row.category ?? '',
    tags: row.tags ?? [],
    isSaved,
    isOnSale: !!row.is_on_sale,
    savedAt: savedAt ?? undefined,
    inStock: row.in_stock !== false,
    sizes: row.sizes ?? undefined,
    colors: row.colors ?? undefined,
    instagramPostId: row.instagram_post_id ?? undefined,
  };
}

export function fromDbShipmentEvent(row: ShipmentEventRow): ShipmentEvent {
  return {
    id: row.id,
    timestamp: row.timestamp,
    location: row.location ?? '',
    description: row.description,
    status: row.status as ShipmentStatus,
  };
}

export function fromDbShipment(row: ShipmentRow, brand?: { logo_url?: string | null }): Shipment {
  const events: ShipmentEvent[] = (row.shipment_events ?? [])
    .map(fromDbShipmentEvent)
    .sort((a: ShipmentEvent, b: ShipmentEvent) => (a.timestamp < b.timestamp ? 1 : -1));
  const latest = events[0];
  return {
    id: row.id,
    brandId: row.brand_id ?? '',
    brandName: row.brand_name,
    brandLogo: brand?.logo_url ?? row.brands?.logo_url ?? '',
    orderNumber: row.order_number,
    trackingNumber: row.tracking_number ?? '',
    carrier: row.carrier ?? '',
    status: row.status as ShipmentStatus,
    statusLabel: row.status_label ?? '',
    estimatedDelivery: row.estimated_delivery ?? '',
    lastUpdate: latest?.timestamp ?? row.updated_at ?? row.created_at,
    lastLocation: row.last_location ?? '',
    events,
    products: (row.products ?? []) as Shipment['products'],
    totalAmount: row.total_amount != null ? Number(row.total_amount) : 0,
    currency: row.currency ?? 'TL',
    createdAt: row.created_at ?? row.updated_at ?? new Date().toISOString(),
  };
}

export function fromDbCampaign(
  row: CampaignRow,
  brand?: BrandJoin | null,
  isRead = false
): Campaign {
  return {
    id: row.id,
    brandId: row.brand_id,
    brandName: brand?.name ?? row.brands?.name ?? '',
    brandLogo: brand?.logo_url ?? row.brands?.logo_url ?? '',
    title: row.title,
    description: row.description ?? '',
    discount: row.discount != null ? Number(row.discount) : undefined,
    discountType: (row.discount_type ?? undefined) as 'percent' | 'fixed' | undefined,
    endsAt: row.ends_at ?? '',
    image: row.image_url ?? undefined,
    code: row.code ?? undefined,
    url: row.url,
    affiliateUrl: row.affiliate_url ?? row.url,
    isRead,
    isSponsored: !!row.is_sponsored,
    createdAt: row.created_at,
  };
}

export function fromDbProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar_url ?? undefined,
    preferences: (row.preferences as UserProfile['preferences']) ?? {
      categories: [],
      priceRange: [0, 50000],
      sizes: [],
      notifications: { campaigns: true, newArrivals: false, shipping: true, priceDrops: true },
    },
    connectedAccounts: row.connected_accounts ?? {},
    stats: { savedBrands: 0, savedProducts: 0, activeOrders: 0 },
  };
}
