export type LocalizedText = {
  sr: string;
  en?: string;
  ru?: string;
};

export interface Sponsor {
  name: string;
  tier: SponsorTier;
}

export type SponsorTier =
  | 'Насловни спонзор'
  | 'Златни спонзори'
  | 'Сребрни спонзори'
  | 'Бронзани спонзори'
  | 'Пријатељи клуба';

export interface SponsorPackage {
  title: SponsorTier;
  titleLabel?: LocalizedText;
  description: LocalizedText | string;
}

export interface Leader {
  name: string;
  role: LocalizedText | string;
  description: LocalizedText | string;
  image: string;
}

export interface Player {
  name: string;
  position: LocalizedText | string;
  number: string;
  image: string;
  description: LocalizedText | string;
}

export interface StaffMember {
  name: string;
  role: LocalizedText | string;
  image: string;
  description: LocalizedText | string;
}

export interface ClubStat {
  icon: 'calendar' | 'star' | 'trophy' | 'supporters' | 'club';
  value: LocalizedText | string;
  label: LocalizedText | string;
}

export interface GalleryImage {
  src: string;
  alt: LocalizedText | string;
}

export interface SocialLink {
  name: string;
  icon: 'instagram' | 'facebook' | 'youtube';
  url?: string;
}

export interface NewsItem {
  id: string;
  slug: string;
  date: string;
  publishedAt?: string;
  updatedAt?: string;
  category: LocalizedText | string;
  title: LocalizedText | string;
  excerpt: LocalizedText | string;
  image: string;
  fullContent: LocalizedText[];
  galleryImages: GalleryImage[];
  featured: boolean;
  relatedSlugs?: string[];
}
