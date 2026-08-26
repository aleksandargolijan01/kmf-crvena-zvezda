import { LocalizedText, Player } from './site.models';

const lt = (sr: string, en: string, ru: string): LocalizedText => ({ sr, en, ru });

export const u19Players: Player[] = [
  {
    name: 'Андреј Петровић',
    position: lt('Голман', 'Goalkeeper', 'Вратарь'),
    number: '1',
    image: '/images/match-celebration.jpg',
    description: lt('Млади чувар мреже са брзом реакцијом, мирноћом и јасном комуникацијом са одбраном.', 'Young goalkeeper with quick reactions, calmness and clear communication with the defence.', 'Молодой вратарь с быстрой реакцией, спокойствием и ясной коммуникацией с защитой.')
  },
  {
    name: 'Лазар Јовановић',
    position: lt('Бек', 'Defender', 'Защитник'),
    number: '4',
    image: '/images/match-family.jpg',
    description: lt('Дисциплинован играч задње линије, сигуран у дуелу и одговоран у изласку из пресинга.', 'Disciplined back-line player, reliable in duels and responsible under pressure.', 'Дисциплинированный игрок обороны, надёжен в единоборствах и под давлением.')
  },
  {
    name: 'Вук Станковић',
    position: lt('Крило', 'Winger', 'Фланговый игрок'),
    number: '7',
    image: '/images/match-joy.jpg',
    description: lt('Брзина, промена ритма и директност у игри доносе енергију у сваком нападу.', 'Speed, rhythm changes and direct play bring energy to every attack.', 'Скорость, смена ритма и прямолинейность добавляют энергии каждой атаке.')
  },
  {
    name: 'Никола Марковић',
    position: lt('Пивот', 'Pivot', 'Пивот'),
    number: '9',
    image: '/images/match-trophy-team.jpg',
    description: lt('Снажан у игри леђима, добро чува лопту и отвара простор саиграчима.', 'Strong with his back to goal, protects the ball well and opens space for teammates.', 'Силен в игре спиной, хорошо сохраняет мяч и открывает пространство партнёрам.')
  },
  {
    name: 'Матеја Илић',
    position: lt('Капитен', 'Captain', 'Капитан'),
    number: '10',
    image: '/images/match-supporters.jpg',
    description: lt('Лидер генерације, повезује линије тима и држи висок интензитет кроз целу утакмицу.', 'A leader of the generation who connects the team lines and keeps intensity high throughout the match.', 'Лидер поколения, связывает линии команды и держит высокий темп весь матч.')
  },
  {
    name: 'Стефан Павловић',
    position: lt('Универзалац', 'Utility player', 'Универсал'),
    number: '11',
    image: '/images/match-rivals.jpg',
    description: lt('Флексибилан играч који може да одговори на више позиција и тактичких захтева.', 'A flexible player able to respond to several positions and tactical demands.', 'Гибкий игрок, способный закрывать несколько позиций и тактических задач.')
  }
];

