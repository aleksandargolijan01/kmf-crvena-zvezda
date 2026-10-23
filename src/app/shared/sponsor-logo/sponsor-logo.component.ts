import { Component, ElementRef, Input, OnChanges, SimpleChanges, afterRenderEffect, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-sponsor-logo',
  standalone: true,
  imports: [NgTemplateOutlet],
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
      @if (logoUrl && !failed()) {
        <img #logoImage [src]="logoUrl" [alt]="name" width="148" height="52" loading="lazy" decoding="async" (error)="failed.set(true)" />
      } @else {
        <span>{{ name }}</span>
      }
    </ng-template>
  `
})
export class SponsorLogoComponent implements OnChanges {
  @Input({ required: true }) name = '';
  @Input() logoUrl?: string | null;
  @Input() href?: string | null;
  @Input() dark = false;
  readonly failed = signal(false);
  private readonly logoImage = viewChild<ElementRef<HTMLImageElement>>('logoImage');

  constructor() {
    afterRenderEffect(() => {
      const image = this.logoImage()?.nativeElement;
      // A cached image can fail before Angular attaches its error listener.
      // Pending native lazy images (complete=false) must be left to the browser.
      if (image?.complete && image.naturalWidth === 0) this.failed.set(true);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['logoUrl']) this.failed.set(false);
  }
}
