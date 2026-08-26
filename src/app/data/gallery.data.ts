import { GalleryImage, LocalizedText } from './site.models';

const lt = (sr: string, en: string, ru: string): LocalizedText => ({ sr, en, ru });

export const galleryImages: GalleryImage[] = [
  {
    src: '/images/match-family.jpg',
    alt: lt(
      'КМФ Црвена звезда са навијачима и породицама после утакмице',
      'KMF Crvena zvezda with supporters and families after a match',
      'КМФ Црвена звезда с болельщиками и семьями после матча'
    )
  },
  {
    src: '/images/match-rivals.jpg',
    alt: lt(
      'Заједничка фотографија екипа после футсал утакмице',
      'Teams together after a futsal match',
      'Общее фото команд после футзального матча'
    )
  },
  {
    src: '/images/match-supporters.jpg',
    alt: lt(
      'Тим КМФ Црвена звезда испред трибине са навијачима',
      'KMF Crvena zvezda team in front of the supporters stand',
      'Команда КМФ Црвена звезда перед трибуной с болельщиками'
    )
  }
];
