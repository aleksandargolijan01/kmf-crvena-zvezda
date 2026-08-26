import { Component, DestroyRef, OnInit, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublicPlayersService, PublicPlayersState } from '../../core/api/public-players.service';
import { PublicStaffService, PublicStaffState } from '../../core/api/public-staff.service';
import { SeoService } from '../../core/seo/seo.service';
import { players } from '../../data/players.data';
import { TranslationService } from '../../i18n/translation.service';
import { ImageFallbackDirective } from '../../shared/image-fallback.directive';

@Component({
  selector: 'app-team-page',
  standalone: true,
  imports: [ImageFallbackDirective],
  templateUrl: './team-page.component.html'
})
export class TeamPageComponent implements OnInit {
  readonly playersState = signal<PublicPlayersState>({ loading: true, error: false, players });
  readonly staffState = signal<PublicStaffState>({ loading: true, error: false, members: [] });
  readonly players = computed(() => this.playersState().players);
  readonly staff = computed(() => this.staffState().members);

  constructor(
    readonly i18n: TranslationService,
    private readonly seo: SeoService,
    private readonly publicPlayers: PublicPlayersService,
    private readonly publicStaff: PublicStaffService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.seo.set({
      title: this.i18n.t('team.hero.title') + ' | ' + this.i18n.t('brand.name'),
      description: this.i18n.t('team.hero.text'),
      path: '/tim',
      image: '/images/match-trophy-team.jpg',
      schema: [
        this.seo.organizationSchema(),
        this.seo.breadcrumbSchema([
          { name: this.i18n.t('nav.home'), path: '/' },
          { name: this.i18n.t('nav.teamFirst'), path: '/tim' }
        ])
      ]
    });

    this.publicPlayers.firstTeamState(players)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.playersState.set(state));

    this.publicStaff.state('FIRST_TEAM')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.staffState.set(state));
  }
}
