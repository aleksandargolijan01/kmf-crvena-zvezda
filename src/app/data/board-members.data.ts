import { Leader, LocalizedText } from './site.models';

const lt = (sr: string, en: string, ru: string): LocalizedText => ({ sr, en, ru });

export const boardMembers: Leader[] = [
  {
    name: 'Име Презиме',
    role: lt('Члан управног одбора', 'Board member', 'Член правления'),
    description: lt(
      'Кратак опис члана управног одбора, његове улоге и подршке развоју клуба.',
      'Short placeholder description of the board member, their role and support for club development.',
      'Краткое описание члена правления, его роли и поддержки развития клуба.'
    ),
    image: '/images/match-family.jpg'
  },
  {
    name: 'Име Презиме',
    role: lt('Члан управног одбора', 'Board member', 'Член правления'),
    description: lt(
      'Кратак опис члана управног одбора и доприноса организацији клуба.',
      'Short placeholder description of the board member and their contribution to club organisation.',
      'Краткое описание члена правления и его вклада в организацию клуба.'
    ),
    image: '/images/match-trophy-team.jpg'
  },
  {
    name: 'Име Презиме',
    role: lt('Члан управног одбора', 'Board member', 'Член правления'),
    description: lt(
      'Кратак опис члана управног одбора, са фокусом на стабилност и дугорочни рад клуба.',
      'Short placeholder description focused on stability and long-term club work.',
      'Краткое описание члена правления с акцентом на стабильность и долгосрочную работу клуба.'
    ),
    image: '/images/match-celebration.jpg'
  }
];
