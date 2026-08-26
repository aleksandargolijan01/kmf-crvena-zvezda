import { Directive, HostListener, Input } from '@angular/core';

@Directive({
  selector: 'img[appImageFallback]',
  standalone: true
})
export class ImageFallbackDirective {
  @Input() appImageFallback = '/images/social-share-default.png';
  private failed = false;

  @HostListener('error', ['$event'])
  onError(event: Event): void {
    if (this.failed) {
      return;
    }

    this.failed = true;
    const image = event.target as HTMLImageElement;
    image.src = this.appImageFallback;
  }
}
