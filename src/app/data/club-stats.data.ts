import { ClubStat, LocalizedText } from './site.models';

const lt = (sr: string, en: string, ru: string): LocalizedText => ({ sr, en, ru });

export const clubStats: ClubStat[] = [
  {
    icon: 'trophy',
    value: '1',
    label: lt('Шампион Србије', 'Serbian champion', 'Чемпион Сербии')
  },
  {
    icon: 'star',
    value: '1',
    label: lt('Учешће у УЕФА Лиги шампиона', 'UEFA Champions League appearance', 'Участие в Лиге чемпионов УЕФА')
  },
  {
    icon: 'trophy',
    value: '1',
    label: lt('Куп Београда', 'Belgrade Cup', 'Кубок Белграда')
  },
  {
    icon: 'supporters',
    value: '1000+',
    label: lt('Навијача', 'Supporters', 'Болельщиков')
  },
  {
    icon: 'calendar',
    value: '2008',
    label: lt('Година оснивања', 'Founded', 'Год основания')
  },
  {
    icon: 'club',
    value: lt('1 клуб', '1 club', '1 клуб'),
    label: lt('Једна породица', 'One family', 'Одна семья')
  }
];
