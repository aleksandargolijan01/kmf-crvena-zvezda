export type LanguageCode = 'sr' | 'en' | 'ru';

export type TranslationKey =
  | 'nav.home'
  | 'nav.club'
  | 'nav.leadership'
  | 'nav.leadershipBoard'
  | 'nav.team'
  | 'nav.teamFirst'
  | 'nav.teamU19'
  | 'nav.news'
  | 'nav.friends'
  | 'nav.contact'
  | 'nav.openMenu'
  | 'nav.mainAria'
  | 'nav.openLeadershipMenu'
  | 'nav.leadershipMenuAria'
  | 'nav.openTeamMenu'
  | 'nav.teamMenuAria'
  | 'brand.name'
  | 'brand.subtitle'
  | 'brand.footerTagline'
  | 'common.backToTop'
  | 'common.readMore'
  | 'common.backToNews'
  | 'common.notFoundTitle'
  | 'common.notFoundText'
  | 'common.languageSelector'
  | 'common.selectLanguage'
  | 'common.linkComingSoon'
  | 'home.hero.eyebrow'
  | 'home.hero.title'
  | 'home.hero.tagline'
  | 'home.hero.cta'
  | 'home.sponsors.eyebrow'
  | 'home.sponsors.title'
  | 'home.statsAria'
  | 'home.sponsorMarqueeAria'
  | 'home.about.eyebrow'
  | 'home.about.title'
  | 'home.about.text'
  | 'home.about.mission.title'
  | 'home.about.mission.text'
  | 'home.about.tradition.title'
  | 'home.about.tradition.text'
  | 'home.about.values.title'
  | 'home.about.values.text'
  | 'home.gallery.eyebrow'
  | 'home.gallery.title'
  | 'home.team.eyebrow'
  | 'home.team.title'
  | 'home.team.text'
  | 'home.team.cta'
  | 'home.news.eyebrow'
  | 'home.news.title'
  | 'home.news.cta'
  | 'home.leadership.eyebrow'
  | 'home.leadership.title'
  | 'home.leadership.cta'
  | 'home.friends.eyebrow'
  | 'home.friends.title'
  | 'home.friends.cta'
  | 'leadership.hero.eyebrow'
  | 'leadership.hero.title'
  | 'leadership.hero.text'
  | 'leadership.hero.cardLabel'
  | 'leadership.hero.cardValue'
  | 'leadership.hero.cardText'
  | 'leadership.hero.cta'
  | 'leadership.section.eyebrow'
  | 'leadership.section.title'
  | 'board.hero.eyebrow'
  | 'board.hero.title'
  | 'board.hero.text'
  | 'board.hero.cardLabel'
  | 'board.hero.cardValue'
  | 'board.hero.cardText'
  | 'board.hero.cta'
  | 'board.section.eyebrow'
  | 'board.section.title'
  | 'team.hero.eyebrow'
  | 'team.hero.title'
  | 'team.hero.text'
  | 'team.hero.cardLabel'
  | 'team.hero.cardText'
  | 'team.players.eyebrow'
  | 'team.players.title'
  | 'team.staff.eyebrow'
  | 'team.staff.title'
  | 'news.hero.eyebrow'
  | 'news.hero.title'
  | 'news.hero.text'
  | 'news.hero.cardLabel'
  | 'news.hero.cardText'
  | 'news.section.eyebrow'
  | 'news.section.title'
  | 'news.related.eyebrow'
  | 'news.related.title'
  | 'news.article.sideLabel'
  | 'news.article.sideTitle'
  | 'news.article.sideText'
  | 'friends.hero.eyebrow'
  | 'friends.hero.title'
  | 'friends.hero.text'
  | 'friends.hero.cta'
  | 'friends.hero.packageLabel'
  | 'friends.hero.packageValue'
  | 'friends.hero.packageText'
  | 'friends.hero.supportLabel'
  | 'friends.hero.supportText'
  | 'friends.package.eyebrow'
  | 'friends.partnersDataAria'
  | 'footer.quickLinks'
  | 'footer.contact'
  | 'footer.socialAria'
  | 'footer.becomeSponsor'
  | 'footer.becomeSponsorText'
  | 'footer.copyright'
  | 'seo.home.title'
  | 'seo.home.description'
  | 'seo.news.title'
  | 'seo.news.description'
  | 'seo.articleNotFound.title'
  | 'seo.articleNotFound.description';

export type TranslationDictionary = Record<TranslationKey, string>;

const sr: TranslationDictionary = {
  'nav.home': 'Почетна',
  'nav.club': 'Клуб',
  'nav.leadership': 'Управа',
  'nav.leadershipBoard': 'Управни одбор',
  'nav.team': 'Тим',
  'nav.teamFirst': 'Први тим',
  'nav.teamU19': 'У19 Тим',
  'nav.news': 'Вести',
  'nav.friends': 'Пријатељи клуба',
  'nav.contact': 'Контакт',
  'nav.openMenu': 'Отвори навигациони мени',
  'nav.mainAria': 'Главна навигација',
  'nav.openLeadershipMenu': 'Отвори мени управе',
  'nav.leadershipMenuAria': 'Избор управе',
  'nav.openTeamMenu': 'Отвори мени тима',
  'nav.teamMenuAria': 'Избор тима',
  'brand.name': 'Црвена звезда',
  'brand.subtitle': 'Клуб малог фудбала',
  'brand.footerTagline': 'Једна звезда. Једна породица.',
  'common.backToTop': 'Назад на врх',
  'common.readMore': 'Прочитај више',
  'common.backToNews': 'Назад на вести',
  'common.notFoundTitle': 'Вест није пронађена',
  'common.notFoundText': 'Тражена вест није доступна или је адреса промењена. Вратите се на преглед свих вести.',
  'common.languageSelector': 'Избор језика',
  'common.selectLanguage': 'Изабери језик',
  'common.linkComingSoon': 'линк у припреми',
  'home.hero.eyebrow': 'Званични сајт клуба малог фудбала',
  'home.hero.title': 'КМФ ЦРВЕНА\nЗВЕЗДА',
  'home.hero.tagline': 'Једна звезда, једна породица!',
  'home.hero.cta': 'Сазнај више',
  'home.sponsors.eyebrow': 'Партнери',
  'home.sponsors.title': 'Главни спонзори',
  'home.statsAria': 'Статистика клуба',
  'home.sponsorMarqueeAria': 'Покретна трака спонзора',
  'home.about.eyebrow': 'Традиција. Страст. Победе.',
  'home.about.title': 'О КМФ Црвена звезда',
  'home.about.text': 'КМФ Црвена звезда окупља људе који верују у дисциплину, енергију и снагу заједништва. Клуб гради модеран спортски систем, негује црвено-белу традицију и ствара простор за развој играча, стручног кадра и футсал заједнице.',
  'home.about.mission.title': 'Мисија',
  'home.about.mission.text': 'Развој победничког тима и младих талената.',
  'home.about.tradition.title': 'Традиција',
  'home.about.tradition.text': 'Поштовање грба, навијача и историје клуба.',
  'home.about.values.title': 'Вредности',
  'home.about.values.text': 'Рад, лојалност, одговорност и тимски дух.',
  'home.gallery.eyebrow': 'Са утакмица',
  'home.gallery.title': 'Енергија која се памти.',
  'home.team.eyebrow': 'Наш тим',
  'home.team.title': 'Један тим.\nЈедан сан.',
  'home.team.text': 'Наш тим чине искусни играчи, млади таленти и стручни штаб који свакодневно раде на новим успесима и развоју малог фудбала.',
  'home.team.cta': 'Упознај тим',
  'home.news.eyebrow': 'Вести',
  'home.news.title': 'Актуелности',
  'home.news.cta': 'Све вести',
  'home.leadership.eyebrow': 'Управа клуба',
  'home.leadership.title': 'Озбиљан систем иза сваког резултата.',
  'home.leadership.cta': 'Погледај целу управу',
  'home.friends.eyebrow': 'Пријатељи клуба',
  'home.friends.title': 'Звездаши увек уз вас!',
  'home.friends.cta': 'Погледај све пријатеље клуба',
  'leadership.hero.eyebrow': 'Управа клуба',
  'leadership.hero.title': 'Људи који воде клуб',
  'leadership.hero.text': 'Управни одбор КМФ Црвена звезда окупља људе задужене за организацију, спортски развој, маркетинг, администрацију и омладинску школу клуба.',
  'leadership.hero.cardLabel': 'Управни одбор',
  'leadership.hero.cardValue': '6 чланова',
  'leadership.hero.cardText': 'од председника до спортског сектора',
  'leadership.hero.cta': 'Контактирај клуб',
  'leadership.section.eyebrow': 'Чланови управе',
  'leadership.section.title': 'Организација, одговорност и подршка тиму.',
  'board.hero.eyebrow': 'Управни одбор',
  'board.hero.title': 'Управни одбор',
  'board.hero.text': 'Чланови управног одбора који подржавају стратешки развој, стабилност и дугорочни рад клуба.',
  'board.hero.cardLabel': 'Одбор',
  'board.hero.cardValue': '3 члана',
  'board.hero.cardText': 'подршка систему и развоју клуба',
  'board.hero.cta': 'Контактирај клуб',
  'board.section.eyebrow': 'Чланови одбора',
  'board.section.title': 'Људи који учествују у одлукама, подршци и развоју клуба.',
  'team.hero.eyebrow': 'КМФ Црвена звезда',
  'team.hero.title': 'Наш тим',
  'team.hero.text': 'Играчи, стручни штаб и људи који носе црвено-бели футсал.',
  'team.hero.cardLabel': 'Први тим',
  'team.hero.cardText': 'играчи и стручни рад',
  'team.players.eyebrow': 'Први тим',
  'team.players.title': 'Екипа спремна за сваки дуел.',
  'team.staff.eyebrow': 'Стручни штаб',
  'team.staff.title': 'Људи који граде систем иза игре.',
  'news.hero.eyebrow': 'КМФ Црвена звезда',
  'news.hero.title': 'Вести',
  'news.hero.text': 'Најновије информације, резултати и дешавања из КМФ Црвена звезда.',
  'news.hero.cardLabel': 'Актуелности',
  'news.hero.cardText': 'вести из клуба',
  'news.section.eyebrow': 'Све вести',
  'news.section.title': 'Ритам клуба, резултати и приче са терена.',
  'news.related.eyebrow': 'Повезане вести',
  'news.related.title': 'Још из клуба',
  'news.article.sideLabel': 'КМФ Црвена звезда',
  'news.article.sideTitle': 'Вести',
  'news.article.sideText': 'званичне информације, резултати и приче из клуба',
  'friends.hero.eyebrow': 'Спонзори и партнери',
  'friends.hero.title': 'Пријатељи клуба',
  'friends.hero.text': 'Компаније и људи који подржавају развој КМФ Црвена звезда кроз спонзорске пакете, партнерске активације и дугорочну подршку клубу.',
  'friends.hero.cta': 'Постани спонзор',
  'friends.hero.packageLabel': 'Партнерство',
  'friends.hero.packageValue': '5 пакета',
  'friends.hero.packageText': 'од насловног спонзора до пријатеља клуба',
  'friends.hero.supportLabel': 'Подршка клубу',
  'friends.hero.supportText': 'партнера и пријатеља уз црвено-бели футсал',
  'friends.package.eyebrow': 'Спонзорски пакет',
  'friends.partnersDataAria': 'Подаци о партнерима',
  'footer.quickLinks': 'Брзи линкови',
  'footer.contact': 'Контакт',
  'footer.socialAria': 'Друштвене мреже',
  'footer.becomeSponsor': 'Постани спонзор',
  'footer.becomeSponsorText': 'Придружи се партнерима који граде озбиљну црвено-белу футсал причу.',
  'footer.copyright': '© 2026 КМФ Црвена звезда. Сва права задржана.',
  'seo.home.title': 'КМФ Црвена звезда | Званични сајт футсал клуба Црвена звезда',
  'seo.home.description': 'Званични сајт КМФ Црвена звезда из Београда. Најновије вести, први тим, У19, управа, резултати, историја клуба и информације о футсал клубу Црвена звезда.',
  'seo.news.title': 'Вести | КМФ Црвена звезда',
  'seo.news.description': 'Најновије вести, резултати и приче из КМФ Црвена звезда.',
  'seo.articleNotFound.title': 'Вест није пронађена | КМФ Црвена звезда',
  'seo.articleNotFound.description': 'Тражена вест није доступна.'
};

const en: TranslationDictionary = {
  'nav.home': 'Home',
  'nav.club': 'Club',
  'nav.leadership': 'Leadership',
  'nav.leadershipBoard': 'Board',
  'nav.team': 'Team',
  'nav.teamFirst': 'First Team',
  'nav.teamU19': 'U19 Team',
  'nav.news': 'News',
  'nav.friends': 'Club Friends',
  'nav.contact': 'Contact',
  'nav.openMenu': 'Open navigation menu',
  'nav.mainAria': 'Main navigation',
  'nav.openLeadershipMenu': 'Open leadership menu',
  'nav.leadershipMenuAria': 'Leadership selection',
  'nav.openTeamMenu': 'Open team menu',
  'nav.teamMenuAria': 'Team selection',
  'brand.name': 'Crvena zvezda',
  'brand.subtitle': 'Futsal Club',
  'brand.footerTagline': 'One star. One family.',
  'common.backToTop': 'Back to top',
  'common.readMore': 'Read more',
  'common.backToNews': 'Back to news',
  'common.notFoundTitle': 'News item not found',
  'common.notFoundText': 'The requested news item is unavailable or the address has changed. Return to the full news overview.',
  'common.languageSelector': 'Language selector',
  'common.selectLanguage': 'Select language',
  'common.linkComingSoon': 'link coming soon',
  'home.hero.eyebrow': 'Futsal Club',
  'home.hero.title': 'CRVENA\nZVEZDA',
  'home.hero.tagline': 'One star, one family!',
  'home.hero.cta': 'Learn more',
  'home.sponsors.eyebrow': 'Partners',
  'home.sponsors.title': 'Main sponsors',
  'home.statsAria': 'Club statistics',
  'home.sponsorMarqueeAria': 'Sponsor marquee',
  'home.about.eyebrow': 'About the club',
  'home.about.title': 'Tradition. Passion. Victories.',
  'home.about.text': 'KMF Crvena zvezda brings together people who believe in discipline, energy and the power of unity. The club builds a modern sports system, nurtures the red-and-white tradition and creates space for the development of players, staff and the futsal community.',
  'home.about.mission.title': 'Mission',
  'home.about.mission.text': 'Developing a winning team and young talent.',
  'home.about.tradition.title': 'Tradition',
  'home.about.tradition.text': 'Respect for the crest, supporters and club history.',
  'home.about.values.title': 'Values',
  'home.about.values.text': 'Work, loyalty, responsibility and team spirit.',
  'home.gallery.eyebrow': 'Match moments',
  'home.gallery.title': 'Energy that stays with you.',
  'home.team.eyebrow': 'Our team',
  'home.team.title': 'One team.\nOne dream.',
  'home.team.text': 'Our team brings together experienced players, young talents and a coaching staff working every day on new achievements and futsal development.',
  'home.team.cta': 'Meet the team',
  'home.news.eyebrow': 'News',
  'home.news.title': 'Latest updates',
  'home.news.cta': 'All news',
  'home.leadership.eyebrow': 'Club leadership',
  'home.leadership.title': 'A serious system behind every result.',
  'home.leadership.cta': 'View full leadership',
  'home.friends.eyebrow': 'Club friends',
  'home.friends.title': 'Red Star supporters are always with you!',
  'home.friends.cta': 'View all club friends',
  'leadership.hero.eyebrow': 'Club leadership',
  'leadership.hero.title': 'The people leading the club',
  'leadership.hero.text': 'The board of KMF Crvena zvezda brings together people responsible for organisation, sporting development, marketing, administration and the club youth academy.',
  'leadership.hero.cardLabel': 'Board',
  'leadership.hero.cardValue': '6 members',
  'leadership.hero.cardText': 'from president to sporting sector',
  'leadership.hero.cta': 'Contact the club',
  'leadership.section.eyebrow': 'Leadership members',
  'leadership.section.title': 'Organisation, responsibility and support for the team.',
  'board.hero.eyebrow': 'Board',
  'board.hero.title': 'Board',
  'board.hero.text': 'Board members supporting the club’s strategic development, stability and long-term work.',
  'board.hero.cardLabel': 'Board',
  'board.hero.cardValue': '3 members',
  'board.hero.cardText': 'support for the club system and development',
  'board.hero.cta': 'Contact the club',
  'board.section.eyebrow': 'Board members',
  'board.section.title': 'People involved in decisions, support and club development.',
  'team.hero.eyebrow': 'KMF Crvena zvezda',
  'team.hero.title': 'Our team',
  'team.hero.text': 'Players, coaching staff and people who carry the red-and-white futsal identity.',
  'team.hero.cardLabel': 'First team',
  'team.hero.cardText': 'players and professional work',
  'team.players.eyebrow': 'First team',
  'team.players.title': 'A squad ready for every duel.',
  'team.staff.eyebrow': 'Coaching staff',
  'team.staff.title': 'The people building the system behind the game.',
  'news.hero.eyebrow': 'KMF Crvena zvezda',
  'news.hero.title': 'News',
  'news.hero.text': 'Latest information, results and events from KMF Crvena zvezda.',
  'news.hero.cardLabel': 'Updates',
  'news.hero.cardText': 'club news',
  'news.section.eyebrow': 'All news',
  'news.section.title': 'Club rhythm, results and stories from the court.',
  'news.related.eyebrow': 'Related news',
  'news.related.title': 'More from the club',
  'news.article.sideLabel': 'KMF Crvena zvezda',
  'news.article.sideTitle': 'News',
  'news.article.sideText': 'official information, results and stories from the club',
  'friends.hero.eyebrow': 'Sponsors and partners',
  'friends.hero.title': 'Club friends',
  'friends.hero.text': 'Companies and people supporting the development of KMF Crvena zvezda through sponsorship packages, partner activations and long-term support for the club.',
  'friends.hero.cta': 'Become a sponsor',
  'friends.hero.packageLabel': 'Partnership',
  'friends.hero.packageValue': '5 packages',
  'friends.hero.packageText': 'from title sponsor to club friend',
  'friends.hero.supportLabel': 'Club support',
  'friends.hero.supportText': 'partners and friends with red-and-white futsal',
  'friends.package.eyebrow': 'Sponsorship package',
  'friends.partnersDataAria': 'Partner information',
  'footer.quickLinks': 'Quick links',
  'footer.contact': 'Contact',
  'footer.socialAria': 'Social networks',
  'footer.becomeSponsor': 'Become a sponsor',
  'footer.becomeSponsorText': 'Join the partners building a serious red-and-white futsal story.',
  'footer.copyright': '© 2026 KMF Crvena zvezda. All rights reserved.',
  'seo.home.title': 'KMF Crvena zvezda | Futsal Club',
  'seo.home.description': 'Official website of KMF Crvena zvezda: team, news, leadership, partners and the futsal community.',
  'seo.news.title': 'News | KMF Crvena zvezda',
  'seo.news.description': 'Latest news, results and stories from KMF Crvena zvezda.',
  'seo.articleNotFound.title': 'News item not found | KMF Crvena zvezda',
  'seo.articleNotFound.description': 'The requested news item is unavailable.'
};

const ru: TranslationDictionary = {
  'nav.home': 'Главная',
  'nav.club': 'Клуб',
  'nav.leadership': 'Руководство',
  'nav.leadershipBoard': 'Правление',
  'nav.team': 'Команда',
  'nav.teamFirst': 'Первая команда',
  'nav.teamU19': 'Команда U19',
  'nav.news': 'Новости',
  'nav.friends': 'Друзья клуба',
  'nav.contact': 'Контакты',
  'nav.openMenu': 'Открыть меню навигации',
  'nav.mainAria': 'Главная навигация',
  'nav.openLeadershipMenu': 'Открыть меню руководства',
  'nav.leadershipMenuAria': 'Выбор руководства',
  'nav.openTeamMenu': 'Открыть меню команды',
  'nav.teamMenuAria': 'Выбор команды',
  'brand.name': 'Црвена звезда',
  'brand.subtitle': 'Мини-футбольный клуб',
  'brand.footerTagline': 'Одна звезда. Одна семья.',
  'common.backToTop': 'Наверх',
  'common.readMore': 'Подробнее',
  'common.backToNews': 'Назад к новостям',
  'common.notFoundTitle': 'Новость не найдена',
  'common.notFoundText': 'Запрошенная новость недоступна или адрес был изменен. Вернитесь к обзору всех новостей.',
  'common.languageSelector': 'Выбор языка',
  'common.selectLanguage': 'Выбрать язык',
  'common.linkComingSoon': 'ссылка скоро появится',
  'home.hero.eyebrow': 'Мини-футбольный клуб',
  'home.hero.title': 'ЦРВЕНА\nЗВЕЗДА',
  'home.hero.tagline': 'Одна звезда, одна семья!',
  'home.hero.cta': 'Узнать больше',
  'home.sponsors.eyebrow': 'Партнеры',
  'home.sponsors.title': 'Главные спонсоры',
  'home.statsAria': 'Статистика клуба',
  'home.sponsorMarqueeAria': 'Лента спонсоров',
  'home.about.eyebrow': 'О клубе',
  'home.about.title': 'Традиция. Страсть. Победы.',
  'home.about.text': 'КМФ Црвена звезда объединяет людей, которые верят в дисциплину, энергию и силу единства. Клуб строит современную спортивную систему, бережет красно-белую традицию и создает пространство для развития игроков, штаба и футзального сообщества.',
  'home.about.mission.title': 'Миссия',
  'home.about.mission.text': 'Развитие победной команды и молодых талантов.',
  'home.about.tradition.title': 'Традиция',
  'home.about.tradition.text': 'Уважение к эмблеме, болельщикам и истории клуба.',
  'home.about.values.title': 'Ценности',
  'home.about.values.text': 'Труд, верность, ответственность и командный дух.',
  'home.gallery.eyebrow': 'Матчевые моменты',
  'home.gallery.title': 'Энергия, которая запоминается.',
  'home.team.eyebrow': 'Наша команда',
  'home.team.title': 'Одна команда.\nОдна мечта.',
  'home.team.text': 'Наша команда объединяет опытных игроков, молодых талантов и тренерский штаб, который каждый день работает над новыми успехами и развитием футзала.',
  'home.team.cta': 'Познакомиться с командой',
  'home.news.eyebrow': 'Новости',
  'home.news.title': 'Актуальное',
  'home.news.cta': 'Все новости',
  'home.leadership.eyebrow': 'Руководство клуба',
  'home.leadership.title': 'Серьезная система за каждым результатом.',
  'home.leadership.cta': 'Посмотреть руководство',
  'home.friends.eyebrow': 'Друзья клуба',
  'home.friends.title': 'Звездаши всегда рядом с вами!',
  'home.friends.cta': 'Посмотреть всех друзей клуба',
  'leadership.hero.eyebrow': 'Руководство клуба',
  'leadership.hero.title': 'Люди, которые ведут клуб',
  'leadership.hero.text': 'Правление КМФ Црвена звезда объединяет людей, отвечающих за организацию, спортивное развитие, маркетинг, администрацию и молодежную школу клуба.',
  'leadership.hero.cardLabel': 'Правление',
  'leadership.hero.cardValue': '6 членов',
  'leadership.hero.cardText': 'от президента до спортивного сектора',
  'leadership.hero.cta': 'Связаться с клубом',
  'leadership.section.eyebrow': 'Члены руководства',
  'leadership.section.title': 'Организация, ответственность и поддержка команды.',
  'board.hero.eyebrow': 'Правление',
  'board.hero.title': 'Правление',
  'board.hero.text': 'Члены правления, поддерживающие стратегическое развитие, стабильность и долгосрочную работу клуба.',
  'board.hero.cardLabel': 'Правление',
  'board.hero.cardValue': '3 члена',
  'board.hero.cardText': 'поддержка системы и развития клуба',
  'board.hero.cta': 'Связаться с клубом',
  'board.section.eyebrow': 'Члены правления',
  'board.section.title': 'Люди, участвующие в решениях, поддержке и развитии клуба.',
  'team.hero.eyebrow': 'КМФ Црвена звезда',
  'team.hero.title': 'Наша команда',
  'team.hero.text': 'Игроки, тренерский штаб и люди, которые несут красно-белую футзальную идентичность.',
  'team.hero.cardLabel': 'Первая команда',
  'team.hero.cardText': 'игроки и профессиональная работа',
  'team.players.eyebrow': 'Первая команда',
  'team.players.title': 'Состав, готовый к каждому поединку.',
  'team.staff.eyebrow': 'Тренерский штаб',
  'team.staff.title': 'Люди, которые строят систему за игрой.',
  'news.hero.eyebrow': 'КМФ Црвена звезда',
  'news.hero.title': 'Новости',
  'news.hero.text': 'Последняя информация, результаты и события из КМФ Црвена звезда.',
  'news.hero.cardLabel': 'Актуальное',
  'news.hero.cardText': 'клубные новости',
  'news.section.eyebrow': 'Все новости',
  'news.section.title': 'Ритм клуба, результаты и истории с площадки.',
  'news.related.eyebrow': 'Похожие новости',
  'news.related.title': 'Еще из клуба',
  'news.article.sideLabel': 'КМФ Црвена звезда',
  'news.article.sideTitle': 'Новости',
  'news.article.sideText': 'официальная информация, результаты и истории из клуба',
  'friends.hero.eyebrow': 'Спонсоры и партнеры',
  'friends.hero.title': 'Друзья клуба',
  'friends.hero.text': 'Компании и люди, поддерживающие развитие КМФ Црвена звезда через спонсорские пакеты, партнерские активации и долгосрочную поддержку клуба.',
  'friends.hero.cta': 'Стать спонсором',
  'friends.hero.packageLabel': 'Партнерство',
  'friends.hero.packageValue': '5 пакетов',
  'friends.hero.packageText': 'от титульного спонсора до друга клуба',
  'friends.hero.supportLabel': 'Поддержка клуба',
  'friends.hero.supportText': 'партнеры и друзья вместе с красно-белым футзалом',
  'friends.package.eyebrow': 'Спонсорский пакет',
  'friends.partnersDataAria': 'Информация о партнерах',
  'footer.quickLinks': 'Быстрые ссылки',
  'footer.contact': 'Контакты',
  'footer.socialAria': 'Социальные сети',
  'footer.becomeSponsor': 'Стать спонсором',
  'footer.becomeSponsorText': 'Присоединяйтесь к партнерам, которые строят серьезную красно-белую футзальную историю.',
  'footer.copyright': '© 2026 КМФ Црвена звезда. Все права защищены.',
  'seo.home.title': 'КМФ Црвена звезда | Мини-футбольный клуб',
  'seo.home.description': 'Официальный сайт КМФ Црвена звезда: команда, новости, руководство, партнеры и футзальное сообщество.',
  'seo.news.title': 'Новости | КМФ Црвена звезда',
  'seo.news.description': 'Последние новости, результаты и истории из КМФ Црвена звезда.',
  'seo.articleNotFound.title': 'Новость не найдена | КМФ Црвена звезда',
  'seo.articleNotFound.description': 'Запрошенная новость недоступна.'
};

export const translations: Record<LanguageCode, TranslationDictionary> = {
  sr,
  en,
  ru
};
