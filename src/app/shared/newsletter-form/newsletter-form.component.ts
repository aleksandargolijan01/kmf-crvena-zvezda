import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NewsletterService, NewsletterSource } from '../../core/api/newsletter.service';
import { TranslationService } from '../../i18n/translation.service';
import { LanguageCode } from '../../i18n/translations';

type SubmitState = 'idle' | 'loading' | 'success' | 'already' | 'error';

interface NewsletterCopy {
  eyebrow: string;
  title: string;
  subtitle: string;
  firstNameLabel: string;
  firstNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  consent: string;
  consentError: string;
  submit: string;
  loading: string;
  success: string;
  already: string;
  error: string;
  emailRequired: string;
  emailInvalid: string;
}

const newsletterCopy: Record<LanguageCode, NewsletterCopy> = {
  sr: {
    eyebrow: 'Newsletter',
    title: 'Пријавите се на нашу листу',
    subtitle: 'Будите у току са најновијим вестима клуба.',
    firstNameLabel: 'Име',
    firstNamePlaceholder: 'Ваше име',
    emailLabel: 'Email',
    emailPlaceholder: 'ime@domen.rs',
    consent: 'Сагласан/на сам да ми КМФ Црвена звезда шаље новости и обавештења.',
    consentError: 'Морате означити сагласност за пријаву.',
    submit: 'Пријави се',
    loading: 'Пријављивање...',
    success: 'Успешно сте се пријавили на листу.',
    already: 'Већ сте пријављени на нашу листу.',
    error: 'Пријава тренутно није успела. Покушајте поново.',
    emailRequired: 'Унесите email адресу.',
    emailInvalid: 'Унесите исправну email адресу.',
  },
  en: {
    eyebrow: 'Newsletter',
    title: 'Join our mailing list',
    subtitle: 'Stay up to date with the latest club news.',
    firstNameLabel: 'First name',
    firstNamePlaceholder: 'Your first name',
    emailLabel: 'Email',
    emailPlaceholder: 'name@domain.com',
    consent: 'I agree to receive news and updates from KMF Crvena Zvezda.',
    consentError: 'You must confirm your consent to subscribe.',
    submit: 'Subscribe',
    loading: 'Subscribing...',
    success: 'You have successfully joined the mailing list.',
    already: 'You are already subscribed to our mailing list.',
    error: 'Subscription is currently unavailable. Please try again.',
    emailRequired: 'Enter your email address.',
    emailInvalid: 'Enter a valid email address.',
  },
  ru: {
    eyebrow: 'Newsletter',
    title: 'Подпишитесь на нашу рассылку',
    subtitle: 'Будьте в курсе последних новостей клуба.',
    firstNameLabel: 'Имя',
    firstNamePlaceholder: 'Ваше имя',
    emailLabel: 'Email',
    emailPlaceholder: 'name@domain.com',
    consent: 'Я согласен/согласна получать новости и уведомления от КМФ Црвена звезда.',
    consentError: 'Необходимо подтвердить согласие на подписку.',
    submit: 'Подписаться',
    loading: 'Подписка...',
    success: 'Вы успешно подписались на рассылку.',
    already: 'Вы уже подписаны на нашу рассылку.',
    error: 'Подписка сейчас недоступна. Попробуйте еще раз.',
    emailRequired: 'Введите email адрес.',
    emailInvalid: 'Введите корректный email адрес.',
  },
};

@Component({
  selector: 'app-newsletter-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="newsletter-box" [class.newsletter-box--compact]="variant === 'compact'" [attr.aria-labelledby]="headingId">
      <div class="newsletter-copy">
        <p class="eyebrow">{{ copy().eyebrow }}</p>
        <h3 [id]="headingId">{{ copy().title }}</h3>
        <p>{{ copy().subtitle }}</p>
      </div>

      <form class="newsletter-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <input class="newsletter-honeypot" type="text" formControlName="website" tabindex="-1" autocomplete="off" aria-hidden="true" />

        <div class="newsletter-fields">
          <label>
            <span>{{ copy().firstNameLabel }}</span>
            <input type="text" formControlName="firstName" autocomplete="given-name" [placeholder]="copy().firstNamePlaceholder" />
          </label>

          <label>
            <span>{{ copy().emailLabel }}</span>
            <input
              type="email"
              formControlName="email"
              autocomplete="email"
              [placeholder]="copy().emailPlaceholder"
              [attr.aria-invalid]="emailInvalid()"
              [attr.aria-describedby]="emailInvalid() ? emailErrorId : null"
              required
            />
          </label>
        </div>

        @if (emailInvalid()) {
          <p class="newsletter-error" [id]="emailErrorId">{{ emailError() }}</p>
        }

        <label class="newsletter-consent">
          <input type="checkbox" formControlName="consent" [attr.aria-invalid]="consentInvalid()" />
          <span>{{ copy().consent }}</span>
        </label>

        @if (consentInvalid()) {
          <p class="newsletter-error">{{ copy().consentError }}</p>
        }

        <div class="newsletter-actions">
          <button class="btn btn-primary" type="submit" [disabled]="state() === 'loading'">
            {{ state() === 'loading' ? copy().loading : copy().submit }}
          </button>
          @if (statusMessage()) {
            <p class="newsletter-status" [class.newsletter-status--error]="state() === 'error'" aria-live="polite">{{ statusMessage() }}</p>
          }
        </div>
      </form>
    </section>
  `
})
export class NewsletterFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly newsletter = inject(NewsletterService);
  private readonly i18n = inject(TranslationService);

  @Input({ required: true }) source!: NewsletterSource;
  @Input() variant: 'compact' | 'wide' = 'wide';

  private readonly instanceId = Math.random().toString(36).slice(2);
  readonly headingId = `newsletter-heading-${this.instanceId}`;
  readonly emailErrorId = `newsletter-email-error-${this.instanceId}`;
  readonly state = signal<SubmitState>('idle');
  readonly submitted = signal(false);
  readonly copy = computed(() => newsletterCopy[this.i18n.currentLanguage()]);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    consent: [false, [Validators.requiredTrue]],
    website: ['']
  });

  readonly statusMessage = computed(() => {
    const copy = this.copy();

    switch (this.state()) {
      case 'success':
        return copy.success;
      case 'already':
        return copy.already;
      case 'error':
        return copy.error;
      default:
        return '';
    }
  });

  emailInvalid(): boolean {
    const control = this.form.controls.email;
    return control.invalid && (control.touched || this.submitted());
  }

  emailError(): string {
    const control = this.form.controls.email;
    return control.hasError('required') ? this.copy().emailRequired : this.copy().emailInvalid;
  }

  consentInvalid(): boolean {
    const control = this.form.controls.consent;
    return control.invalid && (control.touched || this.submitted());
  }

  submit(): void {
    this.submitted.set(true);

    if (this.form.invalid || this.state() === 'loading') {
      this.form.markAllAsTouched();
      return;
    }

    this.state.set('loading');
    const value = this.form.getRawValue();

    this.newsletter.subscribe({
      email: value.email.trim(),
      firstName: value.firstName.trim() || undefined,
      consent: true,
      source: this.source,
      website: value.website.trim() || undefined
    }).subscribe({
      next: (response) => {
        this.state.set(response.status === 'already_subscribed' ? 'already' : 'success');
        this.form.controls.email.reset('');
        this.form.controls.firstName.reset('');
        this.form.controls.consent.reset(false);
        this.form.controls.website.reset('');
        this.submitted.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.state.set(error.status === 409 ? 'already' : 'error');
      }
    });
  }
}
