import { LocalizedText, Player } from './site.models';

const lt = (sr: string, en: string, ru: string): LocalizedText => ({ sr, en, ru });

export const players: Player[] = [
  {
    name: 'Алекса Станковић',
    position: lt('Голман', 'Goalkeeper', 'Вратарь'),
    number: '1',
    image: '/images/match-celebration.jpg',
    description: lt(
      'Сигуран ослонац последње линије и играч који даје мирноћу тиму.',
      'A reliable last line of defence and a player who brings calm to the team.',
      'Надежная последняя линия обороны и игрок, который придает команде спокойствие.'
    )
  },
  {
    name: 'Милош Радуловић',
    position: lt('Капитен', 'Captain', 'Капитан'),
    number: '10',
    image: '/images/match-trophy-team.jpg',
    description: lt(
      'Лидер на терену, покретач енергије и пример црвено-беле борбе.',
      'A leader on the court, a source of energy and an example of red-and-white commitment.',
      'Лидер на площадке, источник энергии и пример красно-белой самоотдачи.'
    )
  },
  {
    name: 'Стефан Павловић',
    position: lt('Пивот', 'Pivot', 'Пивот'),
    number: '9',
    image: '/images/match-family.jpg',
    description: lt(
      'Нападачки фокус тима, увек спреман да отвори простор и заврши акцију.',
      'The attacking focal point, always ready to create space and finish the move.',
      'Ключевая фигура атаки, всегда готовая открыть пространство и завершить эпизод.'
    )
  },
  {
    name: 'Лука Васић',
    position: lt('Бек', 'Defender', 'Защитник'),
    number: '7',
    image: '/images/match-joy.jpg',
    description: lt(
      'Брзина, дисциплина и рад у оба правца као основа модерног футсала.',
      'Speed, discipline and two-way work as the foundation of modern futsal.',
      'Скорость, дисциплина и работа в обе стороны как основа современного футзала.'
    )
  }
];
