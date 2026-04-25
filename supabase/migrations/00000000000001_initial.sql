-- BOUTIQ Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ PROFILES ============
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  preferences JSONB DEFAULT '{
    "categories": [],
    "price_range": [0, 50000],
    "notifications": {
      "campaigns": true,
      "new_arrivals": false,
      "shipping": true,
      "price_drops": true
    }
  }'::JSONB,
  connected_accounts JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============ BRANDS ============
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  handle TEXT,
  logo_url TEXT,
  cover_url TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  website TEXT NOT NULL,
  affiliate_url TEXT,
  description TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3,1),
  product_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User-Brand relationship (saved boutiques)
CREATE TABLE user_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, brand_id)
);

-- ============ PRODUCTS ============
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  image_urls TEXT[] DEFAULT '{}',
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  currency TEXT DEFAULT 'TL',
  url TEXT NOT NULL,
  affiliate_url TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_on_sale BOOLEAN DEFAULT FALSE,
  in_stock BOOLEAN DEFAULT TRUE,
  sizes TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  instagram_post_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved products (user wishlist)
CREATE TABLE saved_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ============ SHIPMENTS ============
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES brands(id),
  brand_name TEXT NOT NULL,
  order_number TEXT NOT NULL,
  tracking_number TEXT,
  carrier TEXT,
  status TEXT NOT NULL DEFAULT 'ordered' CHECK (
    status IN ('ordered','processing','shipped','in_transit','out_for_delivery','delivered','returned')
  ),
  status_label TEXT,
  estimated_delivery TEXT,
  last_location TEXT,
  products JSONB DEFAULT '[]'::JSONB,
  total_amount NUMERIC(10,2),
  currency TEXT DEFAULT 'TL',
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'email', 'api')),
  email_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shipment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  location TEXT,
  description TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CAMPAIGNS ============
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount NUMERIC(10,2),
  discount_type TEXT CHECK (discount_type IN ('percent', 'fixed')),
  ends_at TIMESTAMPTZ,
  image_url TEXT,
  code TEXT,
  url TEXT NOT NULL,
  affiliate_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User campaign read status
CREATE TABLE user_campaign_reads (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, campaign_id)
);

-- ============ AFFILIATE TRACKING ============
CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  affiliate_url TEXT NOT NULL,
  ip_hash TEXT,
  device_info JSONB,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ PRICE HISTORY (for price drop alerts) ============
CREATE TABLE product_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  is_on_sale BOOLEAN,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ ROW LEVEL SECURITY ============
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_campaign_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User brands: own only
CREATE POLICY "Users manage own brands" ON user_brands FOR ALL USING (auth.uid() = user_id);

-- Saved products: own only
CREATE POLICY "Users manage own saved products" ON saved_products FOR ALL USING (auth.uid() = user_id);

-- Shipments: own only
CREATE POLICY "Users manage own shipments" ON shipments FOR ALL USING (auth.uid() = user_id);

-- Brands: public read
CREATE POLICY "Brands are publicly readable" ON brands FOR SELECT TO anon, authenticated USING (true);

-- Products: public read
CREATE POLICY "Products are publicly readable" ON products FOR SELECT TO anon, authenticated USING (true);

-- Campaigns: public read
CREATE POLICY "Campaigns are publicly readable" ON campaigns FOR SELECT TO anon, authenticated USING (is_active = true);

-- Affiliate clicks: insert only
CREATE POLICY "Users can log clicks" ON affiliate_clicks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ FUNCTIONS ============

-- Get user's full dashboard data
CREATE OR REPLACE FUNCTION get_user_dashboard(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'saved_brands', (
      SELECT jsonb_agg(row_to_json(b.*)::JSONB || jsonb_build_object('is_favorite', ub.is_favorite))
      FROM user_brands ub
      JOIN brands b ON b.id = ub.brand_id
      WHERE ub.user_id = p_user_id
    ),
    'saved_products', (
      SELECT COUNT(*) FROM saved_products WHERE user_id = p_user_id
    ),
    'active_shipments', (
      SELECT COUNT(*) FROM shipments
      WHERE user_id = p_user_id AND status NOT IN ('delivered', 'returned')
    ),
    'unread_campaigns', (
      SELECT COUNT(*) FROM campaigns c
      JOIN user_brands ub ON ub.brand_id = c.brand_id
      LEFT JOIN user_campaign_reads ucr ON ucr.campaign_id = c.id AND ucr.user_id = p_user_id
      WHERE ub.user_id = p_user_id AND ucr.campaign_id IS NULL AND c.is_active = true
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ INDEXES ============
CREATE INDEX idx_user_brands_user ON user_brands(user_id);
CREATE INDEX idx_saved_products_user ON saved_products(user_id);
CREATE INDEX idx_shipments_user ON shipments(user_id);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_affiliate_clicks_brand ON affiliate_clicks(brand_id);
CREATE INDEX idx_campaigns_brand ON campaigns(brand_id);
CREATE INDEX idx_campaigns_active ON campaigns(is_active, ends_at);
CREATE INDEX idx_price_history_product ON product_price_history(product_id, recorded_at);
