import { Component, DestroyRef, OnInit, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SponsorLogoComponent } from '../../shared/sponsor-logo/sponsor-logo.component';
import { SponsorInquiryFormComponent } from '../../shared/sponsor-inquiry-form/sponsor-inquiry-form.component';
import { SeoService } from '../../core/seo/seo.service';
import { TranslationService } from '../../i18n/translation.service';
import { PublicSponsorCategory, PublicSponsorsService, PublicSponsorsState } from '../../core/api/public-sponsors.service';

@Component({
  selector: 'app-friends-page',
  standalone: true,
  imports: [RouterLink, SponsorLogoComponent, SponsorInquiryFormComponent],
  templateUrl: './friends-page.component.html'
})
export class FriendsPageComponent implements OnInit {
  readonly sponsorsState = signal<PublicSponsorsState>({ loading: true, error: false, categories: [] });
  readonly sponsorsCount = computed(() => this.sponsorsState().categories.reduce((total, category) => total + category.sponsors.length, 0));

  constructor(
    readonly i18n: TranslationService,
    private readonly seo: SeoService,
    private readonly publicSponsors: PublicSponsorsService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.seo.set({
      title: this.i18n.t('friends.hero.title') + ' | ' + this.i18n.t('brand.name'),
      description: this.i18n.t('friends.hero.text'),
      path: '/prijatelji-kluba',
      image: '/images/match-joy.jpg',
      schema: [
        this.seo.organizationSchema(),
        this.seo.breadcrumbSchema([
          { name: this.i18n.t('nav.home'), path: '/' },
          { name: this.i18n.t('nav.friends'), path: '/prijatelji-kluba' }
        ])
      ]
    });

    this.publicSponsors.groupedState()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.sponsorsState.set(state));
  }

  categoryTitle(category: PublicSponsorCategory): string {
    return this.i18n.text({ sr: category.name_sr, en: category.name_en || category.name_sr, ru: category.name_ru || category.name_sr });
  }

  categoryDescription(category: PublicSponsorCategory): string {
    return this.i18n.text({
      sr: category.description_sr || 'Партнери који подржавају развој клуба и црвено-белу футсал причу.',
      en: category.description_en || category.description_sr || 'Partners supporting the club and the red-and-white futsal story.',
      ru: category.description_ru || category.description_sr || 'Партнеры, поддерживающие развитие клуба.',
    });
  }
}
