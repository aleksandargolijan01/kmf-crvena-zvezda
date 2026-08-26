import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../i18n/translation.service';
import { NewsletterFormComponent } from '../../shared/newsletter-form/newsletter-form.component';
import { SocialLinksComponent } from '../../shared/social-links/social-links.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, SocialLinksComponent, NewsletterFormComponent],
  template: `
    <footer class="site-footer" id="kontakt">
      <div class="footer-brand">
        <a class="brand" routerLink="/">
          <img class="brand-mark" src="/images/logo-kmf-crvena-zvezda.png" alt="" />
          <span class="brand-copy">
            <strong>{{ i18n.t('brand.name') }}</strong>
            <small>{{ i18n.t('brand.footerTagline') }}</small>
          </span>
        </a>
        <app-social-links class="socials" [attr.aria-label]="i18n.t('footer.socialAria')" />
      </div>

      <div>
        <h3>{{ i18n.t('footer.quickLinks') }}</h3>
        <a routerLink="/" fragment="klub">{{ i18n.t('nav.club') }}</a>
        <a routerLink="/uprava">{{ i18n.t('nav.leadership') }}</a>
        <a routerLink="/tim">{{ i18n.t('nav.team') }}</a>
        <a routerLink="/vesti">{{ i18n.t('nav.news') }}</a>
        <a routerLink="/prijatelji-kluba">{{ i18n.t('nav.friends') }}</a>
      </div>

      <div class="footer-contact">
        <h3>{{ i18n.t('footer.contact') }}</h3>
        <p class="footer-contact-item">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M12 21s7-5.15 7-11a7 7 0 1 0-14 0c0 5.85 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          <span>Љутице Богдана 1а, Београд</span>
        </p>
        <a class="footer-contact-item" href="mailto:kmfcrvenazvezda@gmail.com">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m4 7 8 6 8-6" />
          </svg>
          <span>kmfcrvenazvezda@gmail.com</span>
        </a>
        <a class="footer-contact-item" href="tel:+381601919494">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.35 1.9.66 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.23a2 2 0 0 1 2.11-.45c.91.31 1.85.53 2.81.66A2 2 0 0 1 22 16.92Z" />
          </svg>
          <span>+381601919494</span>
        </a>
      </div>

      <div>
        <h3>{{ i18n.t('footer.becomeSponsor') }}</h3>
        <p>{{ i18n.t('footer.becomeSponsorText') }}</p>
        <a
          class="footer-friends-cta"
          routerLink="/prijatelji-kluba"
          fragment="sponsor-form"
          aria-label="Постаните пријатељ клуба - отворите форму на страници Пријатељи клуба"
        >
          ПОСТАНИТЕ ПРИЈАТЕЉ КЛУБА
        </a>
      </div>

      <app-newsletter-form class="footer-newsletter" source="footer" variant="compact" />

      <p class="copyright">{{ i18n.t('footer.copyright') }}</p>
    </footer>
  `
})
export class FooterComponent {
  constructor(readonly i18n: TranslationService) {}
}
