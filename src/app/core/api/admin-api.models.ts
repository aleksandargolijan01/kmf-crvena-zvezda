export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
export type Lang = 'sr' | 'en' | 'ru';

export interface AdminUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: AdminRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AdminUser;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PageResponse<T> {
  data: T[];
  meta?: PageMeta;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export interface ListQuery {
  page?: number;
  limit?: number;
  search?: string;
  order?: 'asc' | 'desc';
  active?: boolean | '';
  published?: boolean | '';
  featured?: boolean | '';
  categoryId?: string;
  position?: string;
  source?: string;
  isActive?: boolean | '';
  mimeType?: string;
  teamType?: 'FIRST_TEAM' | 'U19_TEAM' | '';
}

export interface MediaFile {
  id: string;
  url: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  altText?: string | null;
  createdAt: string;
  newsCover?: unknown[];
  playerImages?: unknown[];
  u19PlayerImages?: unknown[];
  managementImages?: unknown[];
  boardImages?: unknown[];
  sponsorLogos?: unknown[];
  _count?: {
    newsCover: number;
    playerImages: number;
    u19PlayerImages: number;
    managementImages: number;
    boardImages: number;
    staffImages: number;
    sponsorLogos: number;
    productCovers: number;
    productImages: number;
  };
  usage?: {
    inUse: boolean;
    references: { type: string; count: number }[];
  };
}

export interface NewsItem {
  id: string;
  slug: string;
  title_sr: string;
  title_en?: string | null;
  title_ru?: string | null;
  excerpt_sr?: string | null;
  excerpt_en?: string | null;
  excerpt_ru?: string | null;
  content_sr: string;
  content_en?: string | null;
  content_ru?: string | null;
  coverImage?: string | null;
  coverImageId?: string | null;
  published: boolean;
  featured: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  author?: AdminUser | null;
}

export interface PlayerItem {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  position?: string | null;
  shirtNumber?: number | null;
  bio_sr?: string | null;
  bio_en?: string | null;
  bio_ru?: string | null;
  imageUrl?: string | null;
  imageId?: string | null;
  active: boolean;
  order: number;
}

export interface ManagementItem {
  id: string;
  fullName: string;
  role_sr: string;
  role_en?: string | null;
  role_ru?: string | null;
  bio_sr?: string | null;
  bio_en?: string | null;
  bio_ru?: string | null;
  imageUrl?: string | null;
  imageId?: string | null;
  active: boolean;
  order: number;
}

export interface StaffAdminItem {
  id: string;
  fullName: string;
  role_sr: string;
  role_en?: string | null;
  role_ru?: string | null;
  bio_sr?: string | null;
  bio_en?: string | null;
  bio_ru?: string | null;
  imageUrl?: string | null;
  imageId?: string | null;
  teamType: 'FIRST_TEAM' | 'U19_TEAM';
  active: boolean;
  order: number;
}

export interface SponsorCategory {
  id: string;
  name_sr: string;
  name_en?: string | null;
  name_ru?: string | null;
  description_sr?: string | null;
  description_en?: string | null;
  description_ru?: string | null;
  active: boolean;
  order: number;
}

export interface SponsorItem {
  id: string;
  name: string;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  logoId?: string | null;
  categoryId?: string | null;
  category?: SponsorCategory | null;
  description_sr?: string | null;
  description_en?: string | null;
  description_ru?: string | null;
  featured: boolean;
  active: boolean;
  order: number;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  source?: string | null;
  consent: boolean;
  isActive: boolean;
  createdAt: string;
  unsubscribedAt?: string | null;
}
