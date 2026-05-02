import type { ProductAdapter, ScrapeResult, StockStatus } from './types';

// JSON-LD structured data veya meta tag'lardan fiyat/stok okur
// Shopify/WooCommerce yakalanmazsa fallback olarak devreye girer
export class GenericAdapter implements ProductAdapter {
  canHandle(_url: string): boolean {
    return true; // Her URL için fallback
  }

  async scrape(url: string): Promise<ScrapeResult> {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Butika/1.0 (price tracker)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

      const html = await res.text();
      return this.parseHtml(html);
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private parseHtml(html: string): ScrapeResult {
    // 1. JSON-LD Product schema dene
    const ldMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (ldMatch) {
      for (const block of ldMatch) {
        try {
          const json = JSON.parse(block.replace(/<[^>]+>/g, ''));
          const product = Array.isArray(json) ? json.find(j => j['@type'] === 'Product') : json['@type'] === 'Product' ? json : null;
          if (product) {
            const offer = product.offers || product.Offers;
            const price = parseFloat(offer?.price || offer?.lowPrice || '0');
            if (price > 0) {
              const avail = (offer?.availability || '').toLowerCase();
              let stockStatus: StockStatus = 'in_stock';
              if (avail.includes('outofstock') || avail.includes('discontinued')) stockStatus = 'out_of_stock';
              return { success: true, data: { price, isOnSale: false, stockStatus, title: product.name, imageUrl: product.image } };
            }
          }
        } catch {}
      }
    }

    // 2. OGP / meta tag fiyat
    const priceMatch = html.match(/property="product:price:amount"\s+content="([\d.,]+)"/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1].replace(',', '.'));
      const avail = html.match(/property="product:availability"\s+content="([^"]+)"/) ;
      const stockStatus: StockStatus = avail?.[1]?.toLowerCase().includes('out') ? 'out_of_stock' : 'in_stock';
      return { success: true, data: { price, isOnSale: false, stockStatus } };
    }

    return { success: false, error: 'Fiyat bilgisi bulunamadı' };
  }
}
