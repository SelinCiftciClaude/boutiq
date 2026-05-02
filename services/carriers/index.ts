import { YurticiAdapter } from './YurticiAdapter';
import type { CarrierAdapter, CarrierCode, CarrierInfo, TrackingResponse } from './types';

export type { CarrierCode, CarrierInfo, TrackingResponse, ShipmentStatusCode, TrackingEvent } from './types';

// Kayıtlı carrier'lar — V2'de Aras, MNG, PTT eklenecek
const ADAPTERS: CarrierAdapter[] = [
  new YurticiAdapter(),
];

// Tüm desteklenen carrier'ların bilgisi (dropdown için)
export const CARRIER_LIST: CarrierInfo[] = [
  {
    code: 'yurtici',
    name: 'Yurtiçi Kargo',
    trackingPattern: /^\d{10,12}$/,
    trackingUrl: (n) => `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${n}`,
  },
  {
    code: 'aras',
    name: 'Aras Kargo',
    trackingPattern: /^\d{10,13}$/,
    trackingUrl: (n) => `https://kargotakip.araskargo.com.tr/mainpage.aspx?code=${n}`,
  },
  {
    code: 'mng',
    name: 'MNG Kargo',
    trackingPattern: /^\d{10,12}$/,
    trackingUrl: (n) => `https://www.mngkargo.com.tr/gonderi-takibi?q=${n}`,
  },
  {
    code: 'ptt',
    name: 'PTT Kargo',
    trackingPattern: /^[A-Z]{2}\d{9}[A-Z]{2}$|^\d{12,13}$/,
    trackingUrl: (n) => `https://gonderitakip.ptt.gov.tr/track/sorgu?q=${n}`,
  },
  {
    code: 'surat',
    name: 'Sürat Kargo',
    trackingPattern: /^\d{10,12}$/,
    trackingUrl: (n) => `https://www.suratkargo.com.tr/KargoTakip/Default.aspx?KargoTakipNo=${n}`,
  },
  {
    code: 'sendeo',
    name: 'Sendeo',
    trackingPattern: /^\d{10,12}$/,
    trackingUrl: (n) => `https://www.sendeo.com.tr/kargo-takip?q=${n}`,
  },
  {
    code: 'hepsijet',
    name: 'HepsiJet',
    trackingPattern: /^HJ\d{10,12}$|^\d{10,12}$/,
    trackingUrl: (n) => `https://www.hepsijet.com/kargo-takip?q=${n}`,
  },
  {
    code: 'trendyolexpress',
    name: 'Trendyol Express',
    trackingPattern: /^T\d{12,15}$|^\d{12,15}$/,
    trackingUrl: (n) => `https://www.trendyol.com/kargo-takip?q=${n}`,
  },
];

// Tracking number'dan carrier otomatik tespit et
export function detectCarrier(trackingNumber: string): CarrierCode {
  const n = trackingNumber.trim().toUpperCase();
  if (/^HJ/.test(n)) return 'hepsijet';
  if (/^T\d/.test(n) && n.length >= 13) return 'trendyolexpress';
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(n)) return 'ptt';
  // Uzunluğa göre en iyi tahmin (ek bilgi yoksa)
  return 'unknown';
}

// Tracking number format doğrulama
export function validateTrackingNumber(carrier: CarrierCode, trackingNumber: string): boolean {
  const info = CARRIER_LIST.find(c => c.code === carrier);
  if (!info) return true; // bilinmeyen carrier — format kontrolü yapma
  return info.trackingPattern.test(trackingNumber.trim());
}

// Kargo sorgulama
export async function trackShipment(
  carrier: CarrierCode,
  trackingNumber: string
): Promise<TrackingResponse> {
  const adapter = ADAPTERS.find(a => a.code === carrier);
  if (!adapter) {
    // Adapter henüz yazılmamış (Aras, MNG vb.) — şimdilik mock döner
    return {
      success: false,
      error: `${carrier} kargo firması için otomatik takip yakında eklenecek`,
    };
  }
  return adapter.track(trackingNumber);
}
