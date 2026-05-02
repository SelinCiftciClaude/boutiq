import type { ProductAdapter, ScrapeResult, StockStatus } from './types';

// Shopify mağazaları /products/{handle}.json endpoint'i sunar — en temiz yol
export class ShopifyAdapter implements ProductAdapter {
  canHandle(url: string): boolean {
    // myshopify.com domain'i veya /products/ path'i olan Shopify siteleri
    return url.includes('myshopify.com') || this.looksLikeShopify(url);
  }

  private looksLikeShopify(url: string): boolean {
    return url.includes('/products/') && !url.includes('woocommerce');
  }

  async scrape(url: string): Promise<ScrapeResult> {
    try {
      const jsonUrl = this.toJsonUrl(url);
      const res = await fetch(jsonUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Butika/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

      const { product } = await res.json();
      if (!product) return { success: false, error: 'Ürün bulunamadı' };

      // İlk varyantı kullan
      const variant = product.variants?.[0];
      if (!variant) return { success: false, error: 'Varyant yok' };

      const price = parseFloat(variant.price);
      const comparePrice = parseFloat(variant.compare_at_price || '0');
      const available = variant.available ?? true;
      const inventory = variant.inventory_quantity;

      let stockStatus: StockStatus = 'in_stock';
      if (!available) stockStatus = 'out_of_stock';
      else if (inventory !== null && inventory <= 3) stockStatus = 'low_stock';

      return {
        success: true,
        data: {
          price,
          originalPrice: comparePrice > price ? comparePrice : undefined,
          isOnSale: comparePrice > price,
          stockStatus,
          stockCount: inventory ?? undefined,
          title: product.title,
          imageUrl: product.images?.[0]?.src,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private toJsonUrl(url: string): string {
    // https://store.com/products/slug → https://store.com/products/slug.json
    const clean = url.split('?')[0].replace(/\/$/, '');
    return clean.endsWith('.json') ? clean : `${clean}.json`;
  }
}
