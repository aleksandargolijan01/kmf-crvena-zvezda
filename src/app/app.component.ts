import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, NgZone, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { auditTime, filter, fromEvent, Subscription } from 'rxjs';
import { HeaderComponent } from './layout/header/header.component';
import { FooterComponent } from './layout/footer/footer.component';
import { TranslationService } from './i18n/translation.service';
import { SeoService } from './core/seo/seo.service';
import { FloatingCartComponent } from './shared/shop/floating-cart.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, FloatingCartComponent],
  template: `
    @if (!isAdminRoute) {
      <app-header />
    }
    <router-outlet />
    @if (!isAdminRoute) {
      <app-footer />
      <app-floating-cart />
      <button
        class="scroll-top"
        [class.is-visible]="showScrollTop"
        type="button"
        [attr.aria-label]="i18n.t('common.backToTop')"
        [attr.title]="i18n.t('common.backToTop')"
        [attr.aria-hidden]="!showScrollTop"
        [attr.tabindex]="showScrollTop ? 0 : -1"
        (click)="scrollToTop()"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
      </button>
    }
  `
})
export class AppComponent implements OnInit, OnDestroy {
  showScrollTop = false;
  isAdminRoute = false;

  private readonly scrollThreshold = 300;
  private scrollSubscription?: Subscription;
  private routeSubscription?: Subscription;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly zone: NgZone,
    private readonly router: Router,
    private readonly seo: SeoService,
    readonly i18n: TranslationService
  ) {}

  ngOnInit(): void {
    this.updateRouteMode(this.router.url);
    this.routeSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updateRouteMode(event.urlAfterRedirects));

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.updateScrollTopVisibility();

    this.zone.runOutsideAngular(() => {
      this.scrollSubscription = fromEvent(window, 'scroll', { passive: true })
        .pipe(auditTime(80))
        .subscribe(() => this.updateScrollTopVisibility());
    });
  }

  ngOnDestroy(): void {
    this.scrollSubscription?.unsubscribe();
    this.routeSubscription?.unsubscribe();
  }

  scrollToTop(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private updateScrollTopVisibility(): void {
    const shouldShow = window.scrollY > this.scrollThreshold;

    if (shouldShow === this.showScrollTop) {
      return;
    }

    this.zone.run(() => {
      this.showScrollTop = shouldShow;
      this.changeDetector.markForCheck();
    });
  }

  private updateRouteMode(url: string): void {
    this.isAdminRoute = url.startsWith('/admin');
    if (this.isAdminRoute) {
      this.seo.set({
        title: 'KMF Crvena zvezda CMS',
        description: 'Administrativni dio sajta KMF Crvena zvezda.',
        path: url.split('?')[0],
        robots: 'noindex, nofollow',
        schema: []
      });
    }
    this.changeDetector.markForCheck();
  }
}
