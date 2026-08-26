import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { TranslationService } from '../../i18n/translation.service';
import { LanguageCode } from '../../i18n/translations';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  template: `
    <div class="language-switcher" [class.is-open]="isOpen()" [attr.aria-label]="i18n.t('common.languageSelector')">
      <button
        class="language-trigger"
        type="button"
        [attr.aria-label]="i18n.t('common.selectLanguage')"
        aria-haspopup="listbox"
        [attr.aria-expanded]="isOpen()"
        (click)="toggle()"
        (keydown)="onTriggerKeydown($event)"
      >
        <span>{{ currentLanguageLabel }}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      <div class="language-menu" role="listbox" [attr.aria-activedescendant]="'language-' + i18n.currentLanguage()">
        @for (language of languageOptions; track language.code) {
          <button
            [id]="'language-' + language.code"
            type="button"
            role="option"
            [class.is-active]="i18n.currentLanguage() === language.code"
            [attr.aria-selected]="i18n.currentLanguage() === language.code"
            (click)="setLanguage(language.code)"
            (keydown)="onOptionKeydown($event)"
          >
            <span>{{ language.code.toUpperCase() }}</span>
            <small>{{ language.name }}</small>
          </button>
        }
      </div>
    </div>
  `
})
export class LanguageSwitcherComponent {
  readonly i18n = inject(TranslationService);
  readonly isOpen = signal(false);

  readonly languageOptions: Array<{ code: LanguageCode; name: string }> = [
    { code: 'sr', name: 'Српски' },
    { code: 'en', name: 'English' },
    { code: 'ru', name: 'Русский' }
  ];

  private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);

  get currentLanguageLabel(): string {
    return this.i18n.currentLanguage().toUpperCase();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.isOpen.set(false);
  }

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  setLanguage(language: LanguageCode): void {
    this.i18n.setLanguage(language);
    this.isOpen.set(false);
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.isOpen.set(true);
      this.focusOption(0);
    }
  }

  onOptionKeydown(event: KeyboardEvent): void {
    const options = this.getOptions();
    const currentIndex = options.indexOf(event.currentTarget as HTMLButtonElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      options[(currentIndex + 1) % options.length]?.focus();
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      options[(currentIndex - 1 + options.length) % options.length]?.focus();
    }
  }

  private focusOption(index: number): void {
    window.setTimeout(() => this.getOptions()[index]?.focus());
  }

  private getOptions(): HTMLButtonElement[] {
    return Array.from(this.elementRef.nativeElement.querySelectorAll<HTMLButtonElement>('.language-menu button'));
  }
}
