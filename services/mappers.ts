import type { Brand, Campaign, Product, Shipment, ShipmentEvent, UserProfile } from '@/types';

type Row = Record<string, any>;

export function fromDbBrand(row: Row, isFavorite = false): Brand {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle ?? '',
    logo: row.logo_url ?? '',
    coverImage: row.cover_url ?? '',
    category: row.category,
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
  row: Row,
  brand?: { name: string; logo_url?: string | null },
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

export function fromDbShipmentEvent(row: Row): ShipmentEvent {
  return {
    id: row.id,
    timestamp: row.timestamp,
    location: row.location ?? '',
    description: row.description,
    status: row.status,
  };
}

export function fromDbShipment(row: Row, brand?: { logo_url?: string | null }): Shipment {
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
    status: row.status,
    statusLabel: row.status_label ?? '',
    estimatedDelivery: row.estimated_delivery ?? '',
    lastUpdate: latest?.timestamp ?? row.updated_at ?? row.created_at,
    lastLocation: row.last_location ?? '',
    events,
    products: row.products ?? [],
    totalAmount: row.total_amount != null ? Number(row.total_amount) : 0,
    currency: row.currency ?? 'TL',
  };
}

export function fromDbCampaign(
  row: Row,
  brand?: { name: string; logo_url?: string | null },
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
    discountType: row.discount_type ?? undefined,
    endsAt: row.ends_at,
    image: row.image_url ?? undefined,
    code: row.code ?? undefined,
    url: row.url,
    affiliateUrl: row.affiliate_url ?? row.url,
    isRead,
    isSponsored: !!row.is_sponsored,
    createdAt: row.created_at,
  };
}

export function fromDbProfile(row: Row): UserProfile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar_url ?? undefined,
    preferences: row.preferences ?? {
      categories: [],
      priceRange: [0, 50000],
      sizes: [],
      notifications: { campaigns: true, newArrivals: false, shipping: true, priceDrops: true },
    },
    connectedAccounts: row.connected_accounts ?? {},
    stats: { savedBrands: 0, savedProducts: 0, activeOrders: 0 },
  };
}
