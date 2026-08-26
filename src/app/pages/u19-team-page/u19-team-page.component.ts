import { Component, DestroyRef, OnInit, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicPlayersService, PublicPlayersState } from '../../core/api/public-players.service';
import { PublicStaffService, PublicStaffState } from '../../core/api/public-staff.service';
import { SeoService } from '../../core/seo/seo.service';
import { LocalizedText } from '../../data/site.models';
import { u19Players } from '../../data/u19-team.data';
import { TranslationService } from '../../i18n/translation.service';
import { ImageFallbackDirective } from '../../shared/image-fallback.directive';

const lt = (sr: string, en: string, ru: string): LocalizedText => ({ sr, en, ru });

@Component({
  selector: 'app-u19-team-page',
  standalone: true,
  imports: [ImageFallbackDirective],
  templateUrl: './u19-team-page.component.html'
})
export class U19TeamPageComponent implements OnInit {
  readonly playersState = signal<PublicPlayersState>({ loading: true, error: false, players: u19Players });
  readonly staffState = signal<PublicStaffState>({ loading: true, error: false, members: [] });
  readonly players = computed(() => this.playersState().players);
  readonly staff = computed(() => this.staffState().members);
  readonly copy = {
    heroEyebrow: lt('КМФ Црвена звезда', 'KMF Crvena zvezda', 'КМФ Црвена звезда'),
    heroTitle: lt('У19 Тим', 'U19 Team', 'Команда U19'),
    heroText: lt(
      'Омладинска селекција клуба окупља играче који кроз рад, дисциплину и црвено-бели карактер граде пут ка првом тиму.',
      'The club youth selection brings together players who build their path toward the first team through work, discipline and red-and-white character.',
      'Молодежная команда клуба объединяет игроков, которые через труд, дисциплину и красно-белый характер строят путь к первой команде.'
    ),
    cardLabel: lt('Омладинска селекција', 'Youth selection', 'Молодежная команда'),
    cardText: lt('играча у развојном тиму', 'players in the development team', 'игроков в команде развития'),
    playersEyebrow: lt('У19 играчи', 'U19 players', 'Игроки U19'),
    playersTitle: lt(
      'Генерација која расте кроз систем, рад и такмичарски ритам.',
      'A generation growing through the system, work and competitive rhythm.',
      'Поколение, которое растет через систему, работу и соревновательный ритм.'
    ),
    staffEyebrow: lt('Стручни штаб', 'Coaching staff', 'Тренерский штаб'),
    staffTitle: lt(
      'Људи који воде развој, припрему и свакодневни рад У19 тима.',
      'The people leading the development, preparation and everyday work of the U19 team.',
      'Люди, которые ведут развитие, подготовку и ежедневную работу команды U19.'
    )
  };

  constructor(
    readonly i18n: TranslationService,
    private readonly seo: SeoService,
    private readonly publicPlayers: PublicPlayersService,
    private readonly publicStaff: PublicStaffService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.seo.set({
      title: this.copy.heroTitle,
      description: this.copy.heroText,
      path: '/u19-tim',
      image: '/images/match-family.jpg',
      schema: [
        this.seo.organizationSchema(),
        this.seo.breadcrumbSchema([
          { name: this.i18n.t('nav.home'), path: '/' },
          { name: this.i18n.t('nav.teamU19'), path: '/u19-tim' }
        ])
      ]
    });

    this.publicPlayers.u19State(u19Players)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.playersState.set(state));

    this.publicStaff.state('U19_TEAM')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.staffState.set(state));
  }
}
