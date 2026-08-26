import { LocalizedText, NewsItem } from './site.models';

const lt = (sr: string, en: string, ru: string): LocalizedText => ({ sr, en, ru });

export const news: NewsItem[] = [
  {
    id: 'news-001',
    slug: 'crveno-beli-zapoceli-pripreme',
    date: '11.05.2026.',
    category: lt('Први тим', 'First team', 'Первая команда'),
    title: lt(
      'Црвено-бели започели припреме за нову сезону',
      'The red-and-whites begin preparations for the new season',
      'Красно-белые начали подготовку к новому сезону'
    ),
    excerpt: lt(
      'Екипа је одрадила први тренинг и отворила циклус рада са јасним циљевима.',
      'The squad completed its first training session and opened a focused work cycle.',
      'Команда провела первую тренировку и начала рабочий цикл с четкими целями.'
    ),
    image: '/images/match-trophy-team.jpg',
    featured: true,
    fullContent: [
      lt(
        'КМФ Црвена звезда започела је припреме за нову сезону окупљањем првог тима, стручног штаба и људи из клуба који су поставили јасан план рада за наредни период.',
        'KMF Crvena zvezda began preparations for the new season by bringing together the first team, coaching staff and club staff around a clear plan for the weeks ahead.',
        'КМФ Црвена звезда начала подготовку к новому сезону, собрав первую команду, тренерский штаб и сотрудников клуба вокруг четкого плана работы.'
      ),
      lt(
        'Фокус припрема биће на физичкој спреми, тактичкој дисциплини и стварању ритма који ће екипи омогућити да у сезону уђе са максималном концентрацијом.',
        'The focus will be on physical readiness, tactical discipline and building the rhythm needed to enter the season fully prepared.',
        'Главный акцент будет сделан на физической готовности, тактической дисциплине и игровом ритме перед стартом сезона.'
      ),
      lt(
        'Стручни штаб је нагласио да ће се радити постепено, уз пажљиво праћење оптерећења играча и високе захтеве који одговарају амбицијама клуба.',
        'The coaching staff stressed that the workload will be gradual, carefully monitored and aligned with the club’s ambitions.',
        'Тренерский штаб подчеркнул, что нагрузка будет расти постепенно, с внимательным контролем состояния игроков и высокими требованиями.'
      )
    ],
    galleryImages: [
      {
        src: '/images/match-family.jpg',
        alt: lt('Окупљање екипе КМФ Црвена звезда', 'KMF Crvena zvezda team gathering', 'Сбор команды КМФ Црвена звезда')
      },
      {
        src: '/images/match-celebration.jpg',
        alt: lt('Играчи КМФ Црвена звезда на терену', 'KMF Crvena zvezda players on the court', 'Игроки КМФ Црвена звезда на площадке')
      }
    ],
    relatedSlugs: ['trofejni-tim-gradi-pobednicki-ritam', 'velika-podrska-sa-tribina']
  },
  {
    id: 'news-002',
    slug: 'predstavljen-plan-razvoja-omladinskog-pogona',
    date: '04.05.2026.',
    category: lt('Омладинска школа', 'Youth academy', 'Молодежная школа'),
    title: lt(
      'Представљен план развоја омладинског погона',
      'Youth academy development plan presented',
      'Представлен план развития молодежной школы'
    ),
    excerpt: lt(
      'Клуб наставља улагање у младе играче и стручни рад на свим нивоима.',
      'The club continues investing in young players and professional work at every level.',
      'Клуб продолжает вкладываться в молодых игроков и профессиональную работу на всех уровнях.'
    ),
    image: '/images/match-family.jpg',
    featured: false,
    fullContent: [
      lt(
        'Клуб је представио смернице развоја омладинског погона, са посебним акцентом на континуитет рада и јасну везу између млађих категорија и првог тима.',
        'The club presented youth academy guidelines with a special focus on continuity and a clear pathway between younger categories and the first team.',
        'Клуб представил направления развития молодежной школы с акцентом на преемственность и понятный путь от младших категорий к первой команде.'
      ),
      lt(
        'План подразумева систематичан тренажни процес, праћење напретка играча и окружење у ком млади футсалери развијају технику, карактер и разумевање игре.',
        'The plan includes a systematic training process, player progress tracking and an environment where young futsal players develop technique, character and game understanding.',
        'План включает системный тренировочный процесс, отслеживание прогресса игроков и среду для развития техники, характера и понимания игры.'
      ),
      lt(
        'КМФ Црвена звезда жели да омладинска школа буде место где се не стварају само играчи, већ и људи који разумеју вредности клуба.',
        'KMF Crvena zvezda wants its academy to be a place that develops not only players, but people who understand the club’s values.',
        'КМФ Црвена звезда хочет, чтобы академия развивала не только игроков, но и людей, понимающих ценности клуба.'
      )
    ],
    galleryImages: [
      {
        src: '/images/match-supporters.jpg',
        alt: lt('Подршка младим играчима', 'Support for young players', 'Поддержка молодых игроков')
      },
      {
        src: '/images/match-trophy-team.jpg',
        alt: lt('Тимски рад КМФ Црвена звезда', 'KMF Crvena zvezda teamwork', 'Командная работа КМФ Црвена звезда')
      }
    ],
    relatedSlugs: ['crveno-beli-zapoceli-pripreme', 'crveno-bela-porodica-zajedno']
  },
  {
    id: 'news-003',
    slug: 'novi-partneri-uz-kmf-crvena-zvezda',
    date: '28.04.2026.',
    category: lt('Партнери', 'Partners', 'Партнеры'),
    title: lt(
      'Нови партнери уз КМФ Црвена звезда',
      'New partners join KMF Crvena zvezda',
      'Новые партнеры присоединились к КМФ Црвена звезда'
    ),
    excerpt: lt(
      'Мрежа пријатеља клуба шири се кроз сарадње са домаћим компанијама.',
      'The club friends network grows through cooperation with local companies.',
      'Сеть друзей клуба расширяется благодаря сотрудничеству с местными компаниями.'
    ),
    image: '/images/match-joy.jpg',
    featured: true,
    fullContent: [
      lt(
        'КМФ Црвена звезда наставља да развија партнерску мрежу и окупља компаније које препознају енергију, традицију и потенцијал црвено-белог футсала.',
        'KMF Crvena zvezda continues to grow its partner network by bringing in companies that recognise the energy, tradition and potential of red-and-white futsal.',
        'КМФ Црвена звезда продолжает развивать партнерскую сеть, объединяя компании, которые ценят энергию, традицию и потенциал красно-белого футзала.'
      ),
      lt(
        'Нова партнерства доносе подршку за свакодневни рад клуба, организацију догађаја и развој младих селекција.',
        'The new partnerships support the club’s everyday work, event organisation and youth development.',
        'Новые партнерства поддержат повседневную работу клуба, организацию мероприятий и развитие молодежных команд.'
      ),
      lt(
        'Клуб ће кроз наредне активности представити додатне погодности и заједничке кампање са партнерима.',
        'The club will present additional benefits and joint partner campaigns through upcoming activities.',
        'В ближайших активностях клуб представит дополнительные возможности и совместные кампании с партнерами.'
      )
    ],
    galleryImages: [
      {
        src: '/images/match-family.jpg',
        alt: lt('Партнери и пријатељи клуба', 'Club partners and friends', 'Партнеры и друзья клуба')
      },
      {
        src: '/images/match-joy.jpg',
        alt: lt('Црвено-бела атмосфера', 'Red-and-white atmosphere', 'Красно-белая атмосфера')
      }
    ],
    relatedSlugs: ['crveno-beli-zapoceli-pripreme', 'crveno-bela-porodica-zajedno']
  },
  {
    id: 'news-004',
    slug: 'velika-podrska-sa-tribina',
    date: '20.04.2026.',
    category: lt('Навијачи', 'Supporters', 'Болельщики'),
    title: lt(
      'Велика подршка са трибина',
      'Strong support from the stands',
      'Мощная поддержка с трибун'
    ),
    excerpt: lt(
      'Навијачи су још једном показали колико значе тиму у важним тренуцима.',
      'Supporters once again showed how much they mean to the team in important moments.',
      'Болельщики снова показали, насколько важна их поддержка в ключевые моменты.'
    ),
    image: '/images/match-supporters.jpg',
    featured: false,
    fullContent: [
      lt(
        'Подршка са трибина још једном је била један од најважнијих детаља утакмице, дајући екипи додатну снагу у тренуцима када се ломио резултат.',
        'Support from the stands was once again one of the defining details of the match, giving the team extra strength when the result was in the balance.',
        'Поддержка с трибун снова стала одной из ключевых деталей матча, дав команде дополнительную энергию в решающие моменты.'
      ),
      lt(
        'Играчи су после меча истакли да атмосфера коју праве навијачи представља огроман мотив и одговорност да се сваки дуел одигра до краја.',
        'After the match, the players said the atmosphere created by the supporters is both a huge motivation and a responsibility to fight until the end.',
        'После матча игроки отметили, что атмосфера, созданная болельщиками, является огромной мотивацией и ответственностью.'
      ),
      lt(
        'Клуб се захваљује свима који су били уз екипу и наставља да гради снажну везу између тима, трибина и футсал заједнице.',
        'The club thanks everyone who stood by the team and continues building a strong bond between the squad, the stands and the futsal community.',
        'Клуб благодарит всех, кто был рядом с командой, и продолжает укреплять связь между составом, трибунами и футзальным сообществом.'
      )
    ],
    galleryImages: [
      {
        src: '/images/match-rivals.jpg',
        alt: lt('Екипе на терену пред навијачима', 'Teams on the court in front of supporters', 'Команды на площадке перед болельщиками')
      },
      {
        src: '/images/match-celebration.jpg',
        alt: lt('Славље играча КМФ Црвена звезда', 'KMF Crvena zvezda player celebration', 'Празднование игроков КМФ Црвена звезда')
      }
    ],
    relatedSlugs: ['crveno-beli-zapoceli-pripreme', 'trofejni-tim-gradi-pobednicki-ritam']
  },
  {
    id: 'news-005',
    slug: 'crveno-bela-porodica-zajedno',
    date: '12.04.2026.',
    category: lt('Клуб', 'Club', 'Клуб'),
    title: lt(
      'Црвено-бела породица заједно после важног меча',
      'The red-and-white family together after an important match',
      'Красно-белая семья вместе после важного матча'
    ),
    excerpt: lt(
      'Играчи, стручни штаб и пријатељи клуба окупили су се после утакмице у духу заједништва.',
      'Players, staff and club friends gathered after the match in a spirit of unity.',
      'Игроки, штаб и друзья клуба собрались после матча в духе единства.'
    ),
    image: '/images/match-family.jpg',
    featured: false,
    fullContent: [
      lt(
        'После важног меча, играчи, стручни штаб, пријатељи клуба и навијачи окупили су се у атмосфери која најбоље показује шта значи црвено-бела породица.',
        'After an important match, players, staff, club friends and supporters gathered in an atmosphere that best shows what the red-and-white family means.',
        'После важного матча игроки, штаб, друзья клуба и болельщики собрались в атмосфере, которая лучше всего показывает смысл красно-белой семьи.'
      ),
      lt(
        'За КМФ Црвена звезда резултат је важан, али је подједнако важан и однос који се гради унутар клуба и око њега.',
        'For KMF Crvena zvezda, results matter, but so does the relationship built inside and around the club.',
        'Для КМФ Црвена звезда важен результат, но не менее важны отношения, которые строятся внутри клуба и вокруг него.'
      ),
      lt(
        'Црвено-бели настављају да граде систем у ком су тим, навијачи, партнери и управа део исте приче.',
        'The red-and-whites continue building a system where the team, supporters, partners and leadership are part of the same story.',
        'Красно-белые продолжают строить систему, где команда, болельщики, партнеры и руководство являются частью одной истории.'
      )
    ],
    galleryImages: [
      {
        src: '/images/match-trophy-team.jpg',
        alt: lt('Тим са пехаром', 'Team with a trophy', 'Команда с трофеем')
      },
      {
        src: '/images/match-joy.jpg',
        alt: lt('Радост играча на терену', 'Players celebrating on the court', 'Радость игроков на площадке')
      }
    ],
    relatedSlugs: ['novi-partneri-uz-kmf-crvena-zvezda', 'velika-podrska-sa-tribina']
  },
  {
    id: 'news-006',
    slug: 'trofejni-tim-gradi-pobednicki-ritam',
    date: '05.04.2026.',
    category: lt('Резултати', 'Results', 'Результаты'),
    title: lt(
      'Трофејни тим наставља да гради победнички ритам',
      'The trophy-winning team keeps building a winning rhythm',
      'Трофейная команда продолжает строить победный ритм'
    ),
    excerpt: lt(
      'Екипа наставља са радом, дисциплином и јасним амбицијама у наставку сезоне.',
      'The squad continues with work, discipline and clear ambitions for the rest of the season.',
      'Команда продолжает работать дисциплинированно и с ясными амбициями на продолжение сезона.'
    ),
    image: '/images/match-trophy-team.jpg',
    featured: false,
    fullContent: [
      lt(
        'КМФ Црвена звезда наставља да гради победнички ритам кроз стабилан рад, јасну структуру и високе стандарде на сваком тренингу и утакмици.',
        'KMF Crvena zvezda continues building a winning rhythm through steady work, clear structure and high standards in every training session and match.',
        'КМФ Црвена звезда продолжает строить победный ритм через стабильную работу, четкую структуру и высокие стандарты.'
      ),
      lt(
        'Трофејни карактер екипе не гради се само резултатима, већ и свакодневним односом према обавезама, саиграчима и клубу.',
        'A trophy-winning character is built not only through results, but through everyday commitment to responsibilities, teammates and the club.',
        'Трофейный характер команды строится не только результатами, но и ежедневным отношением к обязанностям, партнерам и клубу.'
      ),
      lt(
        'Амбиције остају високе, а фокус је на томе да екипа из меча у меч подиже ниво игре.',
        'Ambitions remain high, with the focus on raising the team’s level from match to match.',
        'Амбиции остаются высокими, а фокус направлен на то, чтобы команда повышала уровень игры от матча к матчу.'
      )
    ],
    galleryImages: [
      {
        src: '/images/match-celebration.jpg',
        alt: lt('Славље после гола', 'Celebration after a goal', 'Празднование после гола')
      },
      {
        src: '/images/match-family.jpg',
        alt: lt('Тимска фотографија КМФ Црвена звезда', 'KMF Crvena zvezda team photo', 'Командное фото КМФ Црвена звезда')
      }
    ],
    relatedSlugs: ['crveno-beli-zapoceli-pripreme', 'velika-podrska-sa-tribina']
  }
];
