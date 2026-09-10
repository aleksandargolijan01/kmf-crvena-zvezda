import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, Inject, NgZone, OnDestroy, OnInit, PLATFORM_ID, afterNextRender } from '@angular/core';
import { IsActiveMatchOptions, NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { fromEvent, Subscription, throttleTime } from 'rxjs';
import { TranslationService } from '../../i18n/translation.service';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher.component';
import { SocialLinksComponent } from '../../shared/social-links/social-links.component';
import { CartService } from '../../core/shop/cart.service';
import { ShopRouteService } from '../../core/shop/shop-route.service';

type NavDropdown = 'leadership' | 'team';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, SocialLinksComponent, LanguageSwitcherComponent],
  template: `
    <header
      class="site-header"
      [class.has-shop-cart]="shopRoutes.isShop()"
      [class.nav-open]="menuOpen"
      [class.header-hidden]="headerHidden && !menuOpen"
      [class.header-scrolled]="headerScrolled"
      [class.can-hover-nav]="usesHoverNavigation"
    >
      <a class="brand" routerLink="/" [attr.aria-label]="i18n.t('brand.name')" (click)="close()">
        <img class="brand-mark" src="/images/logo-kmf-crvena-zvezda.png" alt="" />
        <span class="brand-copy">
          <strong>{{ i18n.t('brand.name') }}</strong>
          <small>{{ i18n.t('brand.subtitle') }}</small>
        </span>
      </a>

      <button
        class="nav-toggle"
        type="button"
        [attr.aria-label]="i18n.t('nav.openMenu')"
        [attr.aria-expanded]="menuOpen"
        (click)="toggleMainMenu()"
      >
        <span></span><span></span><span></span>
      </button>

      <nav class="site-nav" [attr.aria-label]="i18n.t('nav.mainAria')">
        <a routerLink="/" fragment="pocetna" routerLinkActive="is-active" [routerLinkActiveOptions]="exactFragmentMatch" (click)="close()">{{ i18n.t('nav.home') }}</a>
        <a routerLink="/" fragment="klub" routerLinkActive="is-active" [routerLinkActiveOptions]="exactFragmentMatch" (click)="close()">{{ i18n.t('nav.club') }}</a>
        <div
          class="nav-dropdown"
          data-menu="leadership"
          routerLinkActive="is-active"
          #leadershipActive="routerLinkActive"
          [routerLinkActiveOptions]="dropdownRouteMatch"
          [class.is-open]="isDropdownOpen('leadership')"
          [class.is-active]="leadershipActive.isActive"
          (pointerenter)="onDropdownPointerEnter($event, 'leadership')"
          (pointerleave)="onDropdownPointerLeave($event, 'leadership')"
          (focusout)="onDropdownFocusOut($event, 'leadership')"
          (keydown.escape)="closeDropdown('leadership', true)"
        >
          <button
            class="nav-dropdown-trigger"
            type="button"
            [attr.aria-label]="i18n.t('nav.openLeadershipMenu')"
            aria-haspopup="true"
            [attr.aria-expanded]="isDropdownOpen('leadership')"
            [class.is-active]="leadershipActive.isActive"
            (click)="onDropdownTriggerClick($event, 'leadership')"
            (keydown.arrowdown)="focusDropdownLink($event, 'leadership', 0)"
          >
            {{ i18n.t('nav.leadership') }}
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
          <div class="nav-dropdown-menu" role="menu" [attr.aria-label]="i18n.t('nav.leadershipMenuAria')">
            <a role="menuitem" routerLink="/uprava" routerLinkActive="is-active" [routerLinkActiveOptions]="exactRouteMatch" (click)="close()" (keydown.arrowdown)="focusDropdownLink($event, 'leadership', 1)" (keydown.arrowup)="focusDropdownLink($event, 'leadership', 1)">{{ i18n.t('nav.leadership') }}</a>
            <a role="menuitem" routerLink="/upravni-odbor" routerLinkActive="is-active" [routerLinkActiveOptions]="exactRouteMatch" (click)="close()" (keydown.arrowdown)="focusDropdownLink($event, 'leadership', 0)" (keydown.arrowup)="focusDropdownLink($event, 'leadership', 0)">{{ i18n.t('nav.leadershipBoard') }}</a>
          </div>
        </div>
        <div
          class="nav-dropdown"
          data-menu="team"
          routerLinkActive="is-active"
          #teamActive="routerLinkActive"
          [routerLinkActiveOptions]="dropdownRouteMatch"
          [class.is-open]="isDropdownOpen('team')"
          [class.is-active]="teamActive.isActive"
          (pointerenter)="onDropdownPointerEnter($event, 'team')"
          (pointerleave)="onDropdownPointerLeave($event, 'team')"
          (focusout)="onDropdownFocusOut($event, 'team')"
          (keydown.escape)="closeDropdown('team', true)"
        >
          <button
            class="nav-dropdown-trigger"
            type="button"
            [attr.aria-label]="i18n.t('nav.openTeamMenu')"
            aria-haspopup="true"
            [attr.aria-expanded]="isDropdownOpen('team')"
            [class.is-active]="teamActive.isActive"
            (click)="onDropdownTriggerClick($event, 'team')"
            (keydown.arrowdown)="focusDropdownLink($event, 'team', 0)"
          >
            {{ i18n.t('nav.team') }}
            <svg aria-hidden="true" viewBox="0 0 16 16">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
          <div class="nav-dropdown-menu" role="menu" [attr.aria-label]="i18n.t('nav.teamMenuAria')">
            <a role="menuitem" routerLink="/tim" routerLinkActive="is-active" [routerLinkActiveOptions]="exactRouteMatch" (click)="close()" (keydown.arrowdown)="focusDropdownLink($event, 'team', 1)" (keydown.arrowup)="focusDropdownLink($event, 'team', 1)">{{ i18n.t('nav.teamFirst') }}</a>
            <a role="menuitem" routerLink="/u19-tim" routerLinkActive="is-active" [routerLinkActiveOptions]="exactRouteMatch" (click)="close()" (keydown.arrowdown)="focusDropdownLink($event, 'team', 0)" (keydown.arrowup)="focusDropdownLink($event, 'team', 0)">{{ i18n.t('nav.teamU19') }}</a>
          </div>
        </div>
        <a routerLink="/vesti" routerLinkActive="is-active" [routerLinkActiveOptions]="exactRouteMatch" (click)="close()">{{ i18n.t('nav.news') }}</a>
        <a routerLink="/prodavnica" routerLinkActive="is-active" (click)="close()">{{ i18n.t('shop.nav') }}</a>
        <a routerLink="/prijatelji-kluba" routerLinkActive="is-active" [routerLinkActiveOptions]="exactRouteMatch" (click)="close()">{{ i18n.t('nav.friends') }}</a>
        <a routerLink="/" fragment="kontakt" routerLinkActive="is-active" [routerLinkActiveOptions]="exactFragmentMatch" (click)="close()">{{ i18n.t('nav.contact') }}</a>
      </nav>

      @if (shopRoutes.isShop()) {
      <a class="header-cart" routerLink="/korpa" (click)="close()" [attr.aria-label]="i18n.t('shop.cartCount') + cart.count()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h2l2.5 12h11l2-8H6M9 20h.01M18 20h.01" /></svg>
        <span aria-hidden="true">{{ cart.count() }}</span>
      </a>

      }
      <div class="header-actions">
        <app-language-switcher />
        <app-social-links />
      </div>
    </header>
  `,
  styleUrl: './header-shop.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  menuOpen = false;
  activeDropdown: NavDropdown | null = null;
  usesHoverNavigation = false;
  headerHidden = false;
  headerScrolled = false;

  readonly exactRouteMatch: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored'
  };
  readonly exactFragmentMatch: IsActiveMatchOptions = {
    ...this.exactRouteMatch,
    fragment: 'exact'
  };
  readonly dropdownRouteMatch: IsActiveMatchOptions = {
    ...this.exactRouteMatch,
    paths: 'subset'
  };

  private readonly scrollThreshold = 16;
  private readonly topOffset = 24;
  private readonly hoverOpenDelay = 70;
  private readonly hoverCloseDelay = 150;
  private lastScrollY = 0;
  private hoverOpenTimer?: number;
  private hoverCloseTimer?: number;
  private scrollSubscription?: Subscription;
  private routerSubscription?: Subscription;
  private hoverMedia?: MediaQueryList;
  private hoverMediaListener?: (event: MediaQueryListEvent) => void;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly zone: NgZone,
    private readonly router: Router,
    readonly i18n: TranslationService,
    readonly cart: CartService,
    readonly shopRoutes: ShopRouteService
  ) { afterNextRender(() => this.cart.initialize()); }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    const activeMenu = this.getDropdownElement(this.activeDropdown);
    if (activeMenu && !activeMenu.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.lastScrollY = window.scrollY;
    this.headerScrolled = this.lastScrollY > this.topOffset;
    this.headerHidden = this.lastScrollY > this.topOffset;
    this.setupHoverMode();

    this.zone.runOutsideAngular(() => {
      this.scrollSubscription = fromEvent(window, 'scroll', { passive: true })
        .pipe(throttleTime(80, undefined, { leading: true, trailing: true }))
        .subscribe(() => this.updateHeaderState());
    });

    this.routerSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.close();
      }
    });
  }

  ngOnDestroy(): void {
    this.clearDropdownTimers();
    this.scrollSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();

    if (this.hoverMedia && this.hoverMediaListener) {
      this.hoverMedia.removeEventListener('change', this.hoverMediaListener);
    }
  }

  isDropdownOpen(menu: NavDropdown): boolean {
    return this.activeDropdown === menu;
  }

  toggleMainMenu(): void {
    this.menuOpen = !this.menuOpen;
    if (!this.menuOpen) {
      this.closeDropdown();
    }
  }

  close(): void {
    this.menuOpen = false;
    this.closeDropdown();
  }

  onDropdownPointerEnter(event: PointerEvent, menu: NavDropdown): void {
    if (!this.shouldUseHover(event)) {
      return;
    }

    this.clearCloseTimer();
    this.hoverOpenTimer = window.setTimeout(() => this.setActiveDropdown(menu), this.hoverOpenDelay);
  }

  onDropdownPointerLeave(event: PointerEvent, menu: NavDropdown): void {
    if (!this.shouldUseHover(event) || this.activeDropdown !== menu) {
      return;
    }

    this.clearOpenTimer();
    this.hoverCloseTimer = window.setTimeout(() => this.closeDropdown(), this.hoverCloseDelay);
  }

  onDropdownTriggerClick(event: Event, menu: NavDropdown): void {
    event.stopPropagation();
    this.setActiveDropdown(this.activeDropdown === menu ? null : menu);
  }

  onDropdownFocusOut(event: FocusEvent, menu: NavDropdown): void {
    const nextTarget = event.relatedTarget as Node | null;
    const dropdown = this.getDropdownElement(menu);

    if (dropdown && nextTarget && dropdown.contains(nextTarget)) {
      return;
    }

    this.closeDropdown();
  }

  focusDropdownLink(event: Event, menu: NavDropdown, index: number): void {
    event.preventDefault();
    this.setActiveDropdown(menu);

    window.setTimeout(() => {
      const links = this.getDropdownElement(menu)?.querySelectorAll<HTMLAnchorElement>('.nav-dropdown-menu a');
      links?.[index]?.focus();
    });
  }

  closeDropdown(menu?: NavDropdown, returnFocus = false): void {
    this.clearDropdownTimers();

    const menuToFocus = menu ?? this.activeDropdown;
    if (menu && this.activeDropdown !== menu) {
      return;
    }

    this.setActiveDropdown(null);

    if (returnFocus && menuToFocus) {
      window.setTimeout(() => this.getDropdownElement(menuToFocus)?.querySelector<HTMLButtonElement>('.nav-dropdown-trigger')?.focus());
    }
  }

  private setupHoverMode(): void {
    this.hoverMedia = window.matchMedia('(hover: hover) and (pointer: fine)');
    this.usesHoverNavigation = this.hoverMedia.matches;

    this.hoverMediaListener = (event: MediaQueryListEvent) => {
      this.zone.run(() => {
        this.usesHoverNavigation = event.matches;
        this.closeDropdown();
        this.changeDetector.markForCheck();
      });
    };

    this.hoverMedia.addEventListener('change', this.hoverMediaListener);
  }

  private shouldUseHover(event: PointerEvent): boolean {
    return this.usesHoverNavigation && !this.menuOpen && event.pointerType === 'mouse';
  }

  private setActiveDropdown(menu: NavDropdown | null): void {
    if (this.activeDropdown === menu) {
      return;
    }

    this.activeDropdown = menu;
    this.changeDetector.markForCheck();
  }

  private getDropdownElement(menu: NavDropdown | null): HTMLElement | null {
    if (!menu) {
      return null;
    }

    return this.elementRef.nativeElement.querySelector<HTMLElement>(`.nav-dropdown[data-menu="${menu}"]`);
  }

  private clearDropdownTimers(): void {
    this.clearOpenTimer();
    this.clearCloseTimer();
  }

  private clearOpenTimer(): void {
    if (this.hoverOpenTimer) {
      window.clearTimeout(this.hoverOpenTimer);
      this.hoverOpenTimer = undefined;
    }
  }

  private clearCloseTimer(): void {
    if (this.hoverCloseTimer) {
      window.clearTimeout(this.hoverCloseTimer);
      this.hoverCloseTimer = undefined;
    }
  }

  private updateHeaderState(): void {
    const currentScrollY = Math.max(window.scrollY, 0);
    const delta = currentScrollY - this.lastScrollY;

    if (Math.abs(delta) < this.scrollThreshold) {
      const scrolled = currentScrollY > this.topOffset;
      if (scrolled !== this.headerScrolled) {
        this.zone.run(() => {
          this.headerScrolled = scrolled;
          this.changeDetector.markForCheck();
        });
      }
      return;
    }

    const shouldHide = delta > 0 && currentScrollY > this.topOffset;
    const shouldBeScrolled = currentScrollY > this.topOffset;

    if (shouldHide === this.headerHidden && shouldBeScrolled === this.headerScrolled) {
      this.lastScrollY = currentScrollY;
      return;
    }

    this.zone.run(() => {
      this.headerHidden = shouldHide;
      this.headerScrolled = shouldBeScrolled;
      this.changeDetector.markForCheck();
    });

    this.lastScrollY = currentScrollY;
  }
}
