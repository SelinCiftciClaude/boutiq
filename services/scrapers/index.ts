import { ShopifyAdapter } from './ShopifyAdapter';
import { GenericAdapter } from './GenericAdapter';
import type { ScrapeResult } from './types';

export type { ScrapedProduct, ScrapeResult, StockStatus } from './types';

const adapters = [
  new ShopifyAdapter(),
  new GenericAdapter(), // fallback — her zaman en sonda
];

// URL'ye bakarak doğru adapter'ı seçer, sonucu döner
export async function scrapeProductUrl(url: string): Promise<ScrapeResult> {
  if (!url || !url.startsWith('http')) {
    return { success: false, error: 'Geçersiz URL' };
  }

  const adapter = adapters.find(a => a.canHandle(url)) ?? new GenericAdapter();
  return adapter.scrape(url);
}
