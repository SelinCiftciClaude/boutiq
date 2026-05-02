import { supabase } from './supabase';
import { trackShipment, validateTrackingNumber, type CarrierCode } from './carriers';

// ── Tipler ───────────────────────────────────────────────────────────────────

export interface Shipment {
  id: string;
  userId: string;
  brandId?: string;
  brandName: string;
  brandLogo?: string;
  orderNumber: string;
  trackingNumber: string;
  carrier: CarrierCode;
  status: string;
  statusLabel: string;
  estimatedDelivery: string;
  lastLocation: string;
  products: Array<{ name: string; image: string; quantity: number }>;
  totalAmount: number;
  currency: string;
  source: string;
  isArchived: boolean;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
  events?: ShipmentEvent[];
}

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  description: string;
  location: string;
  status: string;
  timestamp: string;
}

export interface ShipmentSummary {
  preparing: number;
  in_transit: number;
  delivered: number;
  total_active: number;
}

export interface ManualShipmentInput {
  carrier: CarrierCode;
  trackingNumber: string;
  brandName: string;
  productName?: string;
  orderDate?: string;
  brandLogo?: string;
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function getShipments(
  filter?: 'preparing' | 'in_transit' | 'delivered'
): Promise<Shipment[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let q = supabase
    .from('shipments')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (filter === 'preparing') {
    q = q.in('status', ['ordered', 'processing']);
  } else if (filter === 'in_transit') {
    q = q.in('status', ['shipped', 'in_transit', 'out_for_delivery']);
  } else if (filter === 'delivered') {
    q = q.eq('status', 'delivered');
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(fromDb);
}

export async function getShipmentById(id: string): Promise<Shipment | null> {
  const { data, error } = await supabase
    .from('shipments')
    .select('*, shipment_events(*)')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) return null;

  const s = fromDb(data);
  s.events = (data.shipment_events ?? [])
    .map(eventFromDb)
    .sort((a: ShipmentEvent, b: ShipmentEvent) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  return s;
}

export async function getShipmentSummary(): Promise<ShipmentSummary> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { preparing: 0, in_transit: 0, delivered: 0, total_active: 0 };

  const { data, error } = await supabase.rpc('get_shipment_summary', {
    p_user_id: user.id,
  });

  if (error) throw error;
  return data as ShipmentSummary;
}

export async function addManualShipment(input: ManualShipmentInput): Promise<Shipment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Giriş gerekli');

  if (!validateTrackingNumber(input.carrier, input.trackingNumber)) {
    throw new Error('Kargo takip numarası formatı hatalı');
  }

  const { data, error } = await supabase
    .from('shipments')
    .insert({
      user_id: user.id,
      brand_name: input.brandName,
      brand_logo: input.brandLogo ?? null,
      order_number: `MAN-${Date.now()}`,
      tracking_number: input.trackingNumber,
      carrier: input.carrier,
      status: 'processing',
      status_label: 'Hazırlanıyor',
      estimated_delivery: '',
      last_location: '',
      products: input.productName
        ? [{ name: input.productName, image: '', quantity: 1 }]
        : [],
      total_amount: 0,
      currency: 'TL',
      source: 'manual',
      is_archived: false,
    })
    .select()
    .single();

  if (error) throw error;
  return fromDb(data);
}

export async function refreshShipment(shipmentId: string): Promise<Shipment> {
  // Mevcut shipment'ı al
  const { data: s, error: fetchErr } = await supabase
    .from('shipments')
    .select('*')
    .eq('id', shipmentId)
    .single();

  if (fetchErr || !s) throw new Error('Kargo bulunamadı');

  // Carrier API'sine sor
  const result = await trackShipment(s.carrier as CarrierCode, s.tracking_number);

  if (result.success && result.data) {
    const { status, statusLabel, currentLocation, estimatedDelivery, events } = result.data;

    // Shipment güncelle
    const { data: updated, error: updateErr } = await supabase
      .from('shipments')
      .update({
        status,
        status_label: statusLabel,
        last_location: currentLocation,
        estimated_delivery: estimatedDelivery ?? s.estimated_delivery,
        last_checked_at: new Date().toISOString(),
        check_failure_count: 0,
        raw_carrier_data: result.data.rawData ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', shipmentId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Yeni event'leri ekle
    if (events.length > 0) {
      const newEvents = events.map(e => ({
        shipment_id: shipmentId,
        description: e.description,
        location: e.location,
        status: e.status,
        timestamp: e.timestamp,
      }));
      await supabase.from('shipment_events').upsert(newEvents, {
        onConflict: 'shipment_id,timestamp',
        ignoreDuplicates: true,
      });
    }

    return fromDb(updated);
  } else {
    // Hata sayacını artır
    await supabase
      .from('shipments')
      .update({
        check_failure_count: (s.check_failure_count ?? 0) + 1,
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', shipmentId);

    throw new Error(result.error ?? 'Kargo bilgisi alınamadı');
  }
}

export async function archiveShipment(shipmentId: string): Promise<void> {
  const { error } = await supabase
    .from('shipments')
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq('id', shipmentId);

  if (error) throw error;
}

export async function deleteShipment(shipmentId: string): Promise<void> {
  const { error } = await supabase
    .from('shipments')
    .delete()
    .eq('id', shipmentId);

  if (error) throw error;
}

// ── Mapper ────────────────────────────────────────────────────────────────────

function fromDb(row: any): Shipment {
  return {
    id: row.id,
    userId: row.user_id,
    brandId: row.brand_id ?? undefined,
    brandName: row.brand_name,
    brandLogo: row.brand_logo ?? undefined,
    orderNumber: row.order_number,
    trackingNumber: row.tracking_number,
    carrier: (row.carrier ?? 'unknown') as CarrierCode,
    status: row.status,
    statusLabel: row.status_label ?? '',
    estimatedDelivery: row.estimated_delivery ?? '',
    lastLocation: row.last_location ?? '',
    products: row.products ?? [],
    totalAmount: row.total_amount ?? 0,
    currency: row.currency ?? 'TL',
    source: row.source ?? 'manual',
    isArchived: row.is_archived ?? false,
    lastCheckedAt: row.last_checked_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function eventFromDb(row: any): ShipmentEvent {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    description: row.description,
    location: row.location ?? '',
    status: row.status,
    timestamp: row.timestamp,
  };
}
