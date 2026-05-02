import type { CarrierAdapter, TrackingResponse, ShipmentStatusCode, TrackingEvent } from './types';

export class YurticiAdapter implements CarrierAdapter {
  code = 'yurtici' as const;
  name = 'Yurtiçi Kargo';
  trackingPattern = /^\d{10,12}$/;

  trackingUrl(trackingNumber: string) {
    return `https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code=${trackingNumber}`;
  }

  validate(trackingNumber: string): boolean {
    return this.trackingPattern.test(trackingNumber.replace(/\s/g, ''));
  }

  async track(trackingNumber: string): Promise<TrackingResponse> {
    try {
      // Yurtiçi JSON API endpoint (web sayfasının kullandığı)
      const url = `https://api.yurticikargo.com/TrackingService/ByParcelNo?parcelNo=${trackingNumber}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Butika/1.0 (kargo takip)',
          'Referer': 'https://www.yurticikargo.com/',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}` };
      }

      const json = await res.json();
      return this.parseResponse(json);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private parseResponse(json: any): TrackingResponse {
    try {
      // Yurtiçi API yapısı — birden fazla format dönebilir
      const movements = json?.queryResult?.movements
        ?? json?.Movements
        ?? json?.movements
        ?? [];

      const lastStatus = json?.queryResult?.lastStatus
        ?? json?.LastStatus
        ?? json?.lastStatus
        ?? '';

      const location = json?.queryResult?.currentLocation
        ?? json?.CurrentLocation
        ?? '';

      const estimatedDelivery = json?.queryResult?.deliveryDate
        ?? json?.EstimatedDeliveryDate
        ?? '';

      const events: TrackingEvent[] = movements.map((m: any) => ({
        description: m.description ?? m.Description ?? m.eventDescription ?? '',
        location: m.location ?? m.Location ?? m.unitName ?? '',
        timestamp: this.parseDate(m.date ?? m.Date ?? m.eventDate ?? ''),
        status: this.mapStatus(m.description ?? m.Description ?? ''),
      }));

      return {
        success: true,
        data: {
          status: this.mapStatus(lastStatus),
          statusLabel: this.statusLabel(this.mapStatus(lastStatus)),
          currentLocation: location,
          estimatedDelivery: estimatedDelivery,
          events: events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
          rawData: json,
        },
      };
    } catch {
      return { success: false, error: 'Yanıt ayrıştırılamadı' };
    }
  }

  private parseDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString();
    // "24.04.2026 14:32" → ISO
    const m = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/);
    if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00`).toISOString();
    return new Date(dateStr).toISOString();
  }

  mapStatus(raw: string): ShipmentStatusCode {
    const s = raw.toLowerCase();
    if (/teslim edildi|teslim/i.test(s))           return 'delivered';
    if (/dağıtıma çıktı|dağıtımda/i.test(s))       return 'out_for_delivery';
    if (/yolda|transfer|aktarma|hub|iade transit/i.test(s)) return 'in_transit';
    if (/kargoya verildi|şubeye|teslim alındı/i.test(s)) return 'shipped';
    if (/hazırlanıyor|kabul edildi|sipariş/i.test(s)) return 'processing';
    if (/iade/i.test(s))                            return 'returned';
    return 'processing';
  }

  private statusLabel(status: ShipmentStatusCode): string {
    const map: Record<ShipmentStatusCode, string> = {
      ordered: 'Sipariş Alındı',
      processing: 'Hazırlanıyor',
      shipped: 'Kargoya Verildi',
      in_transit: 'Yolda',
      out_for_delivery: 'Dağıtımda',
      delivered: 'Teslim Edildi',
      returned: 'İade',
      failed: 'Başarısız',
    };
    return map[status] ?? 'Bilinmiyor';
  }
}
