import { Component, Input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ImageFallbackDirective } from '../image-fallback.directive';

@Component({
  selector: 'app-sponsor-logo',
  standalone: true,
  imports: [ImageFallbackDirective, NgTemplateOutlet],
  template: `
    @if (href) {
      <a class="sponsor-logo" [class.sponsor-logo--dark]="dark" [href]="href" target="_blank" rel="noopener noreferrer">
        <ng-container [ngTemplateOutlet]="content" />
      </a>
    } @else {
      <article class="sponsor-logo" [class.sponsor-logo--dark]="dark">
        <ng-container [ngTemplateOutlet]="content" />
      </article>
    }

    <ng-template #content>
      @if (logoUrl) {
        <img appImageFallback [src]="logoUrl" [alt]="name" loading="lazy" decoding="async" />
      } @else {
        <span>{{ name }}</span>
      }
    </ng-template>
  `
})
export class SponsorLogoComponent {
  @Input({ required: true }) name = '';
  @Input() logoUrl?: string | null;
  @Input() href?: string | null;
  @Input() dark = false;
}
