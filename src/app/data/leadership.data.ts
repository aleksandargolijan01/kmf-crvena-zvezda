import { Leader, LocalizedText } from './site.models';

const lt = (sr: string, en: string, ru: string): LocalizedText => ({ sr, en, ru });

export const leadership: Leader[] = [
  {
    name: 'Боројевић Бранислав',
    role: lt('Председник', 'President', 'Президент'),
    description: lt(
      'Води рад Управног одбора, стратешки развој и дугорочну стабилност клуба.',
      'Leads the board, strategic development and long-term club stability.',
      'Руководит правлением, стратегическим развитием и долгосрочной стабильностью клуба.'
    ),
    image: '/images/borojevic.jpg'
  },
  {
    name: 'Голијан Борис',
    role: lt('Генерални директор', 'General director', 'Генеральный директор'),
    description: lt(
      'Координира оперативни рад клуба, организацију и свакодневно функционисање система.',
      'Coordinates club operations, organisation and daily system management.',
      'Координирует операционную работу клуба, организацию и ежедневное функционирование системы.'
    ),
    image: '/images/boris-golijan.jpg'
  },
  {
    name: 'Васиљевић Никола',
    role: lt('Спортски директор', 'Sporting director', 'Спортивный директор'),
    description: lt(
      'Брине о спортском плану, селекцији играча и развоју стручног штаба.',
      'Oversees sporting planning, player selection and staff development.',
      'Отвечает за спортивный план, подбор игроков и развитие штаба.'
    ),
    image: '/images/match-joy.jpg'
  },
  {
    name: 'Васиљевић Бошко',
    role: lt('Генерални секретар', 'General secretary', 'Генеральный секретарь'),
    description: lt(
      'Брине о административним процесима, документацији и комуникацији клуба.',
      'Manages administration, documentation and club communication.',
      'Отвечает за административные процессы, документацию и коммуникацию клуба.'
    ),
    image: '/images/bosko-vasiljevic.jpg'
  },
  {
    name: 'Басановић Јована',
    role: lt('Директор маркетинга', 'Marketing director', 'Директор по маркетингу'),
    description: lt(
      'Развија маркетиншке активности, видљивост клуба и односе са партнерима.',
      'Develops marketing activities, club visibility and partner relations.',
      'Развивает маркетинг, узнаваемость клуба и отношения с партнёрами.'
    ),
    image: '/images/match-family.jpg'
  },
  {
    name: 'Нинковић Никола',
    role: lt('Директор омладинске школе', 'Youth academy director', 'Директор молодёжной школы'),
    description: lt(
      'Води развој омладинске школе, рад са младима и талентима клуба.',
      'Leads youth academy development and work with young talents.',
      'Руководит развитием молодёжной школы и работой с талантами.'
    ),
    image: '/images/match-celebration.jpg'
  }
];
