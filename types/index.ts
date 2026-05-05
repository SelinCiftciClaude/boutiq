export interface Brand {
  id: string;
  name: string;
  handle: string;
  logo: string;
  coverImage: string;
  brandColor?: string;
  cardStyle?: 'hero' | 'logo_centered' | 'initials';
  category: BrandCategory;
  tags: string[];
  website: string;
  affiliateUrl: string;
  followerCount?: number;
  productCount?: number;
  isVerified: boolean;
  isFavorite: boolean;
  lastActive?: string;
  description?: string;
  rating?: number;
}

export type BrandCategory =
  | 'giyim'
  | 'ayakkabı'
  | 'aksesuar'
  | 'çanta'
  | 'takı'
  | 'güzellik'
  | 'ev'
  | 'spor'
  | 'vintage'
  | 'tasarımcı';

export interface Product {
  id: string;
  brandId: string;
  brandName: string;
  brandLogo: string;
  name: string;
  image: string;
  images?: string[];
  price: number;
  originalPrice?: number;
  currency: string;
  url: string;
  affiliateUrl: string;
  category: string;
  tags: string[];
  isSaved: boolean;
  isOnSale: boolean;
  savedAt?: string;
  inStock: boolean;
  sizes?: string[];
  colors?: string[];
  instagramPostId?: string;
}

export interface Shipment {
  id: string;
  brandId: string;
  brandName: string;
  brandLogo: string;
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
  status: ShipmentStatus;
  statusLabel: string;
  estimatedDelivery: string;
  lastUpdate: string;
  lastLocation: string;
  events: ShipmentEvent[];
  products: {
    name: string;
    image: string;
    quantity: number;
  }[];
  totalAmount: number;
  currency: string;
  createdAt: string;
}

export type ShipmentStatus =
  | 'ordered'
  | 'processing'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'returned';

export interface ShipmentEvent {
  id: string;
  timestamp: string;
  location: string;
  description: string;
  status: ShipmentStatus;
}

export interface Campaign {
  id: string;
  brandId: string;
  brandName: string;
  brandLogo: string;
  title: string;
  description: string;
  discount?: number;
  discountType?: 'percent' | 'fixed';
  endsAt: string;
  image?: string;
  code?: string;
  url: string;
  affiliateUrl: string;
  isRead: boolean;
  isSponsored: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences: {
    categories: BrandCategory[];
    priceRange: [number, number];
    sizes: string[];
    notifications: {
      campaigns: boolean;
      newArrivals: boolean;
      shipping: boolean;
      priceDrops: boolean;
    };
  };
  connectedAccounts: {
    instagram?: string;
    email?: string;
  };
  stats: {
    savedBrands: number;
    savedProducts: number;
    activeOrders: number;
  };
}

export interface Review {
  id: string;
  userId: string;
  brandId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'campaign' | 'shipment' | 'newArrival' | 'priceDrop' | 'system';
  title: string;
  body: string;
  brandId?: string;
  brandName?: string;
  brandLogo?: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}
