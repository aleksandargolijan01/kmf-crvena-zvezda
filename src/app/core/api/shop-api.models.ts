import { MediaFile } from './admin-api.models';

export type ProductAvailability = 'AVAILABLE' | 'SOLD_OUT' | 'MADE_TO_ORDER';
export const availabilityLabels: Record<ProductAvailability, string> = {
  AVAILABLE: 'Доступно', SOLD_OUT: 'Распродато', MADE_TO_ORDER: 'Израда по поруџбини'
};

export interface ProductVariant {
  id?: string;
  size: string;
  sku?: string | null;
  active: boolean;
  available: boolean;
  displayOrder: number;
  stockQuantity?: number | null;
}

export interface ProductImage {
  id?: string;
  mediaFileId: string;
  displayOrder: number;
  altSr?: string | null;
  altEn?: string | null;
  altRu?: string | null;
  mediaFile?: Pick<MediaFile, 'id' | 'url' | 'altText'>;
}

export interface ProductWrite {
  slug?: string;
  nameSr: string;
  nameEn?: string | null;
  nameRu?: string | null;
  descriptionSr: string;
  descriptionEn?: string | null;
  descriptionRu?: string | null;
  priceMinor: number;
  compareAtPriceMinor: number | null;
  active: boolean;
  featured: boolean;
  displayOrder: number;
  featuredOrder: number | null;
  availability: ProductAvailability;
  newUntil: string | null;
  coverImageId: string | null;
  gallery: ProductImage[];
  variants: ProductVariant[];
}

export interface AdminProduct extends ProductWrite {
  id: string;
  slug: string;
  coverImage: Pick<MediaFile, 'id' | 'url' | 'altText'> | null;
  createdAt: string;
  updatedAt: string;
  canDelete: boolean;
}

export interface ProductQuery {
  page: number;
  limit: number;
  search?: string;
  active?: boolean;
  featured?: boolean;
  availability?: ProductAvailability;
  order?: 'asc' | 'desc';
}
