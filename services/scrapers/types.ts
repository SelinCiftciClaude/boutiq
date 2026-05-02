export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface ScrapedProduct {
  price: number;
  originalPrice?: number;
  isOnSale: boolean;
  stockStatus: StockStatus;
  stockCount?: number;
  title?: string;
  imageUrl?: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: ScrapedProduct;
  error?: string;
}

export interface ProductAdapter {
  canHandle(url: string): boolean;
  scrape(url: string): Promise<ScrapeResult>;
}
