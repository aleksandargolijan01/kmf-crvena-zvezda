export interface PublicSeoProduct { slug: string; active?: boolean; }
export function activeProducts<T extends PublicSeoProduct>(items: T[]): T[];
export function fetchActiveProducts(apiBaseUrl: string, fetchImpl?: typeof fetch): Promise<PublicSeoProduct[]>;
export function appendShopSitemap(newsSitemap: string, products: PublicSeoProduct[], siteUrl: string): string;
