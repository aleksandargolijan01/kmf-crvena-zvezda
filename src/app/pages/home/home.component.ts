import { Component, DestroyRef, OnInit, computed, signal } from '@angular/core';
import { ShopCarouselComponent } from '../../shared/shop/shop-carousel.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { clubStats } from '../../data/club-stats.data';
import { galleryImages } from '../../data/gallery.data';
import { SponsorLogoComponent } from '../../shared/sponsor-logo/sponsor-logo.component';
import { leadership } from '../../data/leadership.data';
import { Leader } from '../../data/site.models';
import { TranslationService } from '../../i18n/translation.service';
import { SeoService } from '../../core/seo/seo.service';
import { ImageFallbackDirective } from '../../shared/image-fallback.directive';
import { PublicNewsResult, PublicNewsService } from '../../core/api/public-news.service';
import { PublicManagementService, PublicManagementState } from '../../core/api/public-management.service';
import { NewsletterFormComponent } from '../../shared/newsletter-form/newsletter-form.component';
import { PublicSponsor, PublicSponsorsService, PublicSponsorsState } from '../../core/api/public-sponsors.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, SponsorLogoComponent, ImageFallbackDirective, NewsletterFormComponent, ShopCarouselComponent],
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit {
  showShop = false;
  private readonly leadershipFallback = leadership.slice(0, 4);
  readonly leadershipState = signal<PublicManagementState>({ loading: true, error: false, members: this.leadershipFallback });
  readonly leadership = computed<Leader[]>(() => this.leadershipState().members.slice(0, 4));
  readonly newsState = signal<PublicNewsResult>({ loading: true, error: false, items: [], total: 0 });
  readonly sponsorsState = signal<PublicSponsorsState>({ loading: true, error: false, categories: [] });
  readonly publicSponsors = computed<PublicSponsor[]>(() => this.sponsorsState().categories.flatMap((category) => category.sponsors));
  readonly mainSponsors = computed(() => this.publicSponsors().slice(0, 6));
  readonly marqueeSponsors = computed(() => {
    const sponsors = this.publicSponsors();
    return sponsors.length ? [...sponsors, ...sponsors] : [];
  });
  readonly clubStats = clubStats;
  readonly galleryImages = galleryImages;

  constructor(
    readonly i18n: TranslationService,
    private readonly seo: SeoService,
    private readonly router: Router,
    private readonly publicNews: PublicNewsService,
    private readonly publicManagement: PublicManagementService,
    private readonly publicSponsorsService: PublicSponsorsService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    const isContactRoute = this.router.url.split('?')[0] === '/kontakt';
    this.showShop = !isContactRoute;
    this.seo.set({
      title: isContactRoute ? `${this.i18n.t('nav.contact')} | ${this.i18n.t('brand.name')}` : this.i18n.t('seo.home.title'),
      description: isContactRoute ? this.i18n.t('footer.becomeSponsorText') : this.i18n.t('seo.home.description'),
      titleKey: isContactRoute ? undefined : 'seo.home.title',
      descriptionKey: isContactRoute ? 'footer.becomeSponsorText' : 'seo.home.description',
      path: '/',
      robots: isContactRoute ? 'noindex, follow' : 'index, follow',
      image: '/images/social-share-default.png',
      schema: [
        this.seo.websiteSchema(),
        this.seo.organizationSchema()
      ]
    });

    combineLatest([
      this.publicNews.listState(1, 3, { featured: true }),
      this.publicNews.listState(1, 3)
    ]).pipe(
      map(([featured, latest]) => {
        const featuredItems = featured.items;
        const latestFill = latest.items.filter((item) => !featuredItems.some((featuredItem) => featuredItem.id === item.id));
        const items = [...featuredItems, ...latestFill].slice(0, 3);

        return {
          loading: featured.loading || latest.loading,
          error: featured.error && latest.error,
          items,
          total: Math.max(featured.total, latest.total, items.length)
        };
      }),
      takeUntilDestroyed(this.destroyRef)
    )
      .subscribe((state) => this.newsState.set(state));

    this.publicSponsorsService.groupedState()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.sponsorsState.set(state));

    this.publicManagement.managementState(this.leadershipFallback)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => this.leadershipState.set(state));
  }
}
