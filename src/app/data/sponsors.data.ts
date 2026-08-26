import { LocalizedText, Sponsor, SponsorPackage } from './site.models';

const lt = (sr: string, en: string, ru: string): LocalizedText => ({ sr, en, ru });

export const sponsors: Sponsor[] = [
  { name: 'Генерални партнер', tier: 'Насловни спонзор' },
  { name: 'Ред стар енерџи', tier: 'Златни спонзори' },
  { name: 'Арена спорт лаб', tier: 'Златни спонзори' },
  { name: 'Београд драјв', tier: 'Сребрни спонзори' },
  { name: 'Урбан фит', tier: 'Сребрни спонзори' },
  { name: 'Нова банка', tier: 'Бронзани спонзори' },
  { name: 'Макс медија', tier: 'Бронзани спонзори' },
  { name: 'Студио 5', tier: 'Пријатељи клуба' },
  { name: 'Кафе Трибина', tier: 'Пријатељи клуба' },
  { name: 'Про гир', tier: 'Пријатељи клуба' },
  { name: 'Медик тим', tier: 'Пријатељи клуба' },
  { name: 'Сити принт', tier: 'Пријатељи клуба' }
];

export const sponsorPackages: SponsorPackage[] = [
  {
    title: 'Насловни спонзор',
    titleLabel: lt('Насловни спонзор', 'Title sponsor', 'Титульный спонсор'),
    description: lt(
      'Највиши ниво партнерства са доминантном видљивошћу кроз све клупске канале.',
      'The highest partnership level with dominant visibility across all club channels.',
      'Высший уровень партнерства с максимальной видимостью на всех клубных каналах.'
    )
  },
  {
    title: 'Златни спонзори',
    titleLabel: lt('Златни спонзори', 'Gold sponsors', 'Золотые спонсоры'),
    description: lt(
      'Премијум пакет за компаније које желе снажно присуство уз први тим и догађаје.',
      'A premium package for companies seeking strong visibility around the first team and events.',
      'Премиальный пакет для компаний, которым нужна заметная представленность рядом с первой командой и событиями.'
    )
  },
  {
    title: 'Сребрни спонзори',
    titleLabel: lt('Сребрни спонзори', 'Silver sponsors', 'Серебряные спонсоры'),
    description: lt(
      'Стабилна сезонска подршка са јасном видљивошћу на дигиталним и клупским материјалима.',
      'Stable season-long support with clear visibility in digital and club materials.',
      'Стабильная поддержка на сезон с заметным присутствием в цифровых и клубных материалах.'
    )
  },
  {
    title: 'Бронзани спонзори',
    titleLabel: lt('Бронзани спонзори', 'Bronze sponsors', 'Бронзовые спонсоры'),
    description: lt(
      'Приступачан пакет за локалне бизнисе и компаније које желе да буду уз клуб.',
      'An accessible package for local businesses and companies that want to support the club.',
      'Доступный пакет для местного бизнеса и компаний, которые хотят быть рядом с клубом.'
    )
  },
  {
    title: 'Пријатељи клуба',
    titleLabel: lt('Пријатељи клуба', 'Club friends', 'Друзья клуба'),
    description: lt(
      'Мрежа људи и брендова који помажу развој заједнице и свакодневни рад клуба.',
      'A network of people and brands supporting community growth and the club’s everyday work.',
      'Сеть людей и брендов, которые помогают развитию сообщества и повседневной работе клуба.'
    )
  }
];
