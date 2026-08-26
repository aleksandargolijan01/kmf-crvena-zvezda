import { NgTemplateOutlet } from '@angular/common';
import { Component } from '@angular/core';
import { socialLinks } from '../../data/social-links.data';
import { TranslationService } from '../../i18n/translation.service';

@Component({
  selector: 'app-social-links',
  standalone: true,
  imports: [NgTemplateOutlet],
  host: { class: 'social-cluster' },
  template: `
    @for (link of links; track link.name) {
      @if (link.url) {
        <a [href]="link.url" target="_blank" rel="noopener noreferrer" [attr.aria-label]="link.name">
          <ng-container [ngTemplateOutlet]="iconTemplate" [ngTemplateOutletContext]="{ icon: link.icon }" />
        </a>
      } @else {
        <span class="social-link is-disabled" [attr.aria-label]="link.name + ' ' + i18n.t('common.linkComingSoon')" aria-disabled="true">
          <ng-container [ngTemplateOutlet]="iconTemplate" [ngTemplateOutletContext]="{ icon: link.icon }" />
        </span>
      }
    }

    <ng-template #iconTemplate let-icon="icon">
      @switch (icon) {
        @case ('instagram') {
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="4" width="16" height="16" rx="5" />
            <circle cx="12" cy="12" r="3.5" />
            <circle cx="17" cy="7" r="0.8" />
          </svg>
        }
        @case ('facebook') {
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M14 8h2V5h-2.4C10.9 5 10 6.7 10 8.8V11H8v3h2v5h3v-5h2.4l.6-3h-3V9c0-.7.3-1 1-1Z" />
          </svg>
        }
        @case ('youtube') {
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12s0-3.2-.4-4.5c-.2-.8-.8-1.4-1.6-1.6C17.6 5.5 12 5.5 12 5.5s-5.6 0-7 .4c-.8.2-1.4.8-1.6 1.6C3 8.8 3 12 3 12s0 3.2.4 4.5c.2.8.8 1.4 1.6 1.6 1.4.4 7 .4 7 .4s5.6 0 7-.4c.8-.2 1.4-.8 1.6-1.6.4-1.3.4-4.5.4-4.5Z" />
            <path d="m10.5 9.4 4.4 2.6-4.4 2.6V9.4Z" />
          </svg>
        }
      }
    </ng-template>
  `
})
export class SocialLinksComponent {
  readonly links = socialLinks;

  constructor(readonly i18n: TranslationService) {}
}
