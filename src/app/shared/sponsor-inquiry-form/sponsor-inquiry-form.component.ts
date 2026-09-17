import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SponsorInquiriesService } from '../../core/api/sponsor-inquiries.service';
import { TranslationService } from '../../i18n/translation.service';
import { LanguageCode } from '../../i18n/translations';

type InquiryState = 'idle' | 'loading' | 'success' | 'error';

interface SponsorInquiryCopy {
  eyebrow: string;
  title: string;
  intro: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  sponsorshipPackage: string;
  packagePlaceholder: string;
  message: string;
  consent: string;
  submit: string;
  loading: string;
  success: string;
  error: string;
  emailRequired: string;
  emailInvalid: string;
  consentError: string;
  requiredFields: string;
  packages: string[];
}

const sponsorInquiryCopy: Record<LanguageCode, SponsorInquiryCopy> = {
  sr: {
    eyebrow: 'Партнерство',
    title: 'ПОСТАНИ ПАРТНЕР',
    intro: 'Пошаљите нам кратак упит и јавићемо вам се са предлогом партнерства који најбоље одговара вашој компанији.',
    fullName: 'Име и презиме',
    companyName: 'Назив фирме',
    email: 'Email',
    phone: 'Телефон',
    sponsorshipPackage: 'Пакет интересовања',
    packagePlaceholder: 'Изаберите пакет',
    message: 'Порука',
    consent: 'Сагласан/на сам да ме КМФ Црвена звезда контактира поводом овог упита.',
    submit: 'Пошаљи упит',
    loading: 'Слање...',
    success: 'Ваш упит је успешно послат. Контактираћемо вас у најкраћем року.',
    error: 'Упит тренутно није могуће послати. Покушајте поново касније.',
    emailRequired: 'Унесите email адресу.',
    emailInvalid: 'Унесите исправну email адресу.',
    consentError: 'Морате означити сагласност за слање упита.',
    requiredFields: 'Попуните сва обавезна поља пре слања.',
    packages: [
      'Главни партнер',
      'Премијум партнер',
      'Званични партнер',
      'Клупски партнери',
      'Нисам сигуран / желим више информација',
    ],
  },
  en: {
    eyebrow: 'Partnership',
    title: 'BECOME A PARTNER',
    intro: 'Send us a short inquiry and we will get back to you with a partnership proposal that best fits your company.',
    fullName: 'Full name',
    companyName: 'Company name',
    email: 'Email',
    phone: 'Phone',
    sponsorshipPackage: 'Package of interest',
    packagePlaceholder: 'Choose a package',
    message: 'Message',
    consent: 'I agree that KMF Crvena Zvezda may contact me regarding this inquiry.',
    submit: 'Send inquiry',
    loading: 'Sending...',
    success: 'Your inquiry has been sent successfully. We will contact you as soon as possible.',
    error: 'Your inquiry cannot be sent at the moment. Please try again later.',
    emailRequired: 'Enter your email address.',
    emailInvalid: 'Enter a valid email address.',
    consentError: 'You must confirm consent before sending the inquiry.',
    requiredFields: 'Please complete all required fields before sending.',
    packages: [
      'Main partner',
      'Premium partner',
      'Official partner',
      'Club partners',
      'Not sure / I would like more information',
    ],
  },
  ru: {
    eyebrow: 'Партнёрство',
    title: 'СТАТЬ ПАРТНЁРОМ',
    intro: 'Отправьте нам короткий запрос, и мы свяжемся с вами с предложением партнерства, которое лучше всего подходит вашей компании.',
    fullName: 'Имя и фамилия',
    companyName: 'Название компании',
    email: 'Email',
    phone: 'Телефон',
    sponsorshipPackage: 'Интересующий пакет',
    packagePlaceholder: 'Выберите пакет',
    message: 'Сообщение',
    consent: 'Я согласен/согласна, чтобы КМФ Црвена звезда связался со мной по этому запросу.',
    submit: 'Отправить запрос',
    loading: 'Отправка...',
    success: 'Ваш запрос успешно отправлен. Мы свяжемся с вами в ближайшее время.',
    error: 'Сейчас невозможно отправить запрос. Попробуйте позже.',
    emailRequired: 'Введите email адрес.',
    emailInvalid: 'Введите корректный email адрес.',
    consentError: 'Необходимо подтвердить согласие перед отправкой запроса.',
    requiredFields: 'Заполните все обязательные поля перед отправкой.',
    packages: [
      'Главный партнёр',
      'Премиум-партнёр',
      'Официальный партнёр',
      'Клубные партнёры',
      'Не уверен / хочу больше информации',
    ],
  },
};

@Component({
  selector: 'app-sponsor-inquiry-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="sponsor-inquiry-panel" id="sponsor-form" aria-labelledby="sponsor-inquiry-title">
      <div class="sponsor-inquiry-copy">
        <p class="eyebrow">{{ copy().eyebrow }}</p>
        <h2 id="sponsor-inquiry-title">{{ copy().title }}</h2>
        <p>{{ copy().intro }}</p>
      </div>

      <form class="sponsor-inquiry-form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <input class="sponsor-inquiry-honeypot" type="text" formControlName="website" tabindex="-1" autocomplete="off" aria-hidden="true" />

        <div class="sponsor-inquiry-grid">
          <label>
            <span>{{ copy().fullName }}</span>
            <input type="text" formControlName="fullName" autocomplete="name" [attr.aria-invalid]="invalid('fullName')" />
          </label>

          <label>
            <span>{{ copy().companyName }}</span>
            <input type="text" formControlName="companyName" autocomplete="organization" [attr.aria-invalid]="invalid('companyName')" />
          </label>

          <label>
            <span>{{ copy().email }}</span>
            <input type="email" formControlName="email" autocomplete="email" [attr.aria-invalid]="invalid('email')" />
          </label>

          <label>
            <span>{{ copy().phone }}</span>
            <input type="tel" formControlName="phone" autocomplete="tel" />
          </label>
        </div>

        <div class="sponsor-inquiry-field sponsor-package-field">
          <span [id]="packageLabelId">{{ copy().sponsorshipPackage }}</span>
          <div class="sponsor-package-select" [class.is-open]="packageDropdownOpen()">
            <button
              class="sponsor-package-trigger"
              type="button"
              [attr.aria-labelledby]="packageLabelId"
              [attr.aria-expanded]="packageDropdownOpen()"
              [attr.aria-controls]="packageListId"
              aria-haspopup="listbox"
              (click)="togglePackageDropdown()"
              (keydown)="onPackageKeydown($event)"
            >
              <span [class.is-placeholder]="!form.controls.sponsorshipPackage.value">{{ selectedPackageLabel() }}</span>
              <span class="sponsor-package-chevron" aria-hidden="true">⌄</span>
            </button>

            @if (packageDropdownOpen()) {
              <div class="sponsor-package-menu" [id]="packageListId" role="listbox" [attr.aria-labelledby]="packageLabelId">
                @for (option of packageOptions(); track option; let index = $index) {
                  <button
                    class="sponsor-package-option"
                    type="button"
                    role="option"
                    [id]="packageOptionId(index)"
                    [class.is-active]="activePackageIndex() === index"
                    [class.is-selected]="form.controls.sponsorshipPackage.value === option"
                    [attr.aria-selected]="form.controls.sponsorshipPackage.value === option"
                    (click)="selectPackage(option)"
                    (mouseenter)="activePackageIndex.set(index)"
                  >
                    {{ option }}
                  </button>
                }
              </div>
            }
          </div>
        </div>

        <label>
          <span>{{ copy().message }}</span>
          <textarea formControlName="message" rows="6" [attr.aria-invalid]="invalid('message')"></textarea>
        </label>

        @if (validationMessage()) {
          <p class="sponsor-inquiry-error">{{ validationMessage() }}</p>
        }

        <label class="sponsor-inquiry-consent">
          <input type="checkbox" formControlName="consent" [attr.aria-invalid]="invalid('consent')" />
          <span>{{ copy().consent }}</span>
        </label>

        <div class="sponsor-inquiry-actions">
          <button class="btn btn-primary" type="submit" [disabled]="state() === 'loading'">
            {{ state() === 'loading' ? copy().loading : copy().submit }}
          </button>
          @if (statusMessage()) {
            <p class="sponsor-inquiry-status" [class.sponsor-inquiry-status--error]="state() === 'error'" aria-live="polite">{{ statusMessage() }}</p>
          }
        </div>
      </form>
    </section>
  `
})
export class SponsorInquiryFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly sponsorInquiries = inject(SponsorInquiriesService);
  private readonly i18n = inject(TranslationService);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly state = signal<InquiryState>('idle');
  readonly submitted = signal(false);
  readonly copy = computed(() => sponsorInquiryCopy[this.i18n.currentLanguage()]);
  readonly packageOptions = computed(() => this.copy().packages);
  readonly packageDropdownOpen = signal(false);
  readonly activePackageIndex = signal(0);
  readonly selectedPackageLabel = () => {
    const value = this.form.controls.sponsorshipPackage.value;
    const source = Object.values(sponsorInquiryCopy).find(copy => copy.packages.includes(value));
    return source ? this.copy().packages[source.packages.indexOf(value)] : value || this.copy().packagePlaceholder;
  };

  private readonly packageInstanceId = Math.random().toString(36).slice(2);
  readonly packageLabelId = `sponsor-package-label-${this.packageInstanceId}`;
  readonly packageListId = `sponsor-package-list-${this.packageInstanceId}`;

  readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    companyName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(140)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(160)]],
    phone: ['', [Validators.maxLength(40)]],
    sponsorshipPackage: [''],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(3000)]],
    consent: [false, [Validators.requiredTrue]],
    website: [''],
  });

  readonly statusMessage = computed(() => {
    if (this.state() === 'success') {
      return this.copy().success;
    }

    if (this.state() === 'error') {
      return this.copy().error;
    }

    return '';
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closePackageDropdown();
    }
  }

  packageOptionId(index: number): string {
    return `${this.packageListId}-option-${index}`;
  }

  togglePackageDropdown(): void {
    if (this.packageDropdownOpen()) {
      this.closePackageDropdown();
      return;
    }

    this.openPackageDropdown();
  }

  openPackageDropdown(): void {
    const selectedIndex = this.packageOptions().indexOf(this.form.controls.sponsorshipPackage.value);
    this.activePackageIndex.set(selectedIndex >= 0 ? selectedIndex : 0);
    this.packageDropdownOpen.set(true);
  }

  closePackageDropdown(): void {
    this.packageDropdownOpen.set(false);
  }

  selectPackage(option: string): void {
    this.form.controls.sponsorshipPackage.setValue(option);
    this.form.controls.sponsorshipPackage.markAsDirty();
    this.form.controls.sponsorshipPackage.markAsTouched();
    this.closePackageDropdown();
  }

  onPackageKeydown(event: KeyboardEvent): void {
    const options = this.packageOptions();
    const lastIndex = options.length - 1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.packageDropdownOpen()) {
        this.openPackageDropdown();
        return;
      }

      this.openPackageDropdown();
      this.activePackageIndex.update((index) => Math.min(index + 1, lastIndex));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.packageDropdownOpen()) {
        this.openPackageDropdown();
        this.activePackageIndex.set(lastIndex);
        return;
      }

      this.openPackageDropdown();
      this.activePackageIndex.update((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();

      if (!this.packageDropdownOpen()) {
        this.openPackageDropdown();
        return;
      }

      this.selectPackage(options[this.activePackageIndex()]);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closePackageDropdown();
    }
  }

  invalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.touched || this.submitted());
  }

  validationMessage(): string {
    if (!this.submitted() && !Object.values(this.form.controls).some((control) => control.touched && control.invalid)) {
      return '';
    }

    if (this.invalid('email')) {
      return this.form.controls.email.hasError('required') ? this.copy().emailRequired : this.copy().emailInvalid;
    }

    if (this.invalid('consent')) {
      return this.copy().consentError;
    }

    if (this.form.invalid) {
      return this.copy().requiredFields;
    }

    return '';
  }

  submit(): void {
    this.submitted.set(true);

    if (this.form.invalid || this.state() === 'loading') {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.state.set('loading');

    this.sponsorInquiries.send({
      fullName: value.fullName.trim(),
      companyName: value.companyName.trim(),
      email: value.email.trim(),
      phone: value.phone.trim() || undefined,
      sponsorshipPackage: value.sponsorshipPackage || undefined,
      message: value.message.trim(),
      consent: true,
      website: value.website.trim() || undefined,
    }).subscribe({
      next: () => {
        this.state.set('success');
        this.submitted.set(false);
        this.form.reset();
      },
      error: () => {
        this.state.set('error');
      },
    });
  }
}
