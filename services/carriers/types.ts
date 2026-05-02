export type CarrierCode =
  | 'yurtici'
  | 'aras'
  | 'mng'
  | 'ptt'
  | 'surat'
  | 'sendeo'
  | 'hepsijet'
  | 'trendyolexpress'
  | 'unknown';

export type ShipmentStatusCode =
  | 'ordered'
  | 'processing'
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'returned'
  | 'failed';

export interface TrackingEvent {
  description: string;
  location: string;
  timestamp: string; // ISO string
  status: ShipmentStatusCode;
}

export interface TrackingResult {
  status: ShipmentStatusCode;
  statusLabel: string;
  currentLocation: string;
  estimatedDelivery?: string;
  events: TrackingEvent[];
  rawData?: Record<string, unknown>;
}

export interface TrackingResponse {
  success: boolean;
  data?: TrackingResult;
  error?: string;
}

export interface CarrierInfo {
  code: CarrierCode;
  name: string;
  trackingPattern: RegExp;
  trackingUrl: (trackingNumber: string) => string;
}

export interface CarrierAdapter extends CarrierInfo {
  validate(trackingNumber: string): boolean;
  track(trackingNumber: string): Promise<TrackingResponse>;
}
