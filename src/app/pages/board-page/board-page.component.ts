import { Component, DestroyRef, OnInit, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { PublicManagementService, PublicManagementState } from '../../core/api/public-management.service';
import { SeoService } from '../../core/seo/seo.service';
import { boardMembers } from '../../data/board-members.data';
import { TranslationService } from '../../i18n/translation.service';
import { ImageFallbackDirective } from '../../shared/image-fallback.directive';

@Component({
  selector: 'app-board-page',
  standalone: true,
  imports: [RouterLink, ImageFallbackDirective],
  templateUrl: './board-page.component.html'
})
export class BoardPageComponent implements OnInit {
  readonly membersState = signal<PublicManagementState>({ loading: true, error: false, members: boardMembers });
  readonly members = computed(() => this.membersState().members);
  readonly memberCount = computed(() => this.members().length);
  readonly memberCountLabel = computed(() => {
    const count = this.memberCount();
    const language = this.i18n.currentLanguage();

    if (language === 'en') {
      return `${count} ${count === 1 ? 'member' : 'members'}`;
    }

    if (language === 'ru') {
      const suffix = count % 10 === 1 && count % 100 !== 11
        ? 'участник'
        : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14)
          ? 'участника'
          : 'участников';
      return `${count} ${suffix}`;
    }

    return `${count} ${count === 1 ? 'члан' : 'чланова'}`;
  });

  constructor(
    readonly i18n: TranslationService,
    private readonly seo: SeoService,
    private readonly publicManagement: PublicManagementService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.seo.set({
      title: this.i18n.t('board.hero.title') + ' | ' + this.i18n.t('brand.name'),
      description: this.i18n.t('board.hero.text'),
      path: '/upravni-odbor',
      image: '/images/match-supporters.jpg',
      schema: [
        this.seo.organizationSchema(),
        this.seo.breadcrumbSchema([
          { name: this.i18n.t('nav.home'), path: '/' },
          { name: this.i18n.t('nav.leadershipBoard'), path: '/upravni-odbor' }
        ])
      ]
    });

    this.publicManagement.boardState(boardMembers)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.membersState.set(state));
  }
}
