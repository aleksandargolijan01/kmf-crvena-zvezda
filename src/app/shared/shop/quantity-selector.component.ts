import { TranslationService } from '../../i18n/translation.service';
import { inject, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-quantity-selector', standalone: true,
  template: `<div class="quantity" role="group" [attr.aria-label]="label() || i18n.t('shop.quantity')">
    <button type="button" [disabled]="disabled() || value() <= 1" (click)="quantityChange.emit(value() - 1)" [attr.aria-label]="i18n.t('shop.decreaseQuantity')">−</button>
    <output aria-live="polite">{{ value() }}</output>
    <button type="button" [disabled]="disabled() || value() >= 99" (click)="quantityChange.emit(value() + 1)" [attr.aria-label]="i18n.t('shop.increaseQuantity')">+</button>
  </div>`,
  styles: [`:host { display: inline-block; } .quantity { display: inline-flex; align-items: center; border: 1px solid var(--line); border-radius: var(--radius-sm); background: white; } button { width: 44px; height: 44px; border: 0; background: transparent; font-size: 23px; cursor: pointer; } button:disabled { color: #777; cursor: not-allowed; } output { min-width: 34px; text-align: center; font-weight: 700; } button:focus-visible { outline: 3px solid var(--red); outline-offset: 2px; }`]
})
export class QuantitySelectorComponent {
  readonly i18n = inject(TranslationService);
  readonly value = input(1);
  readonly disabled = input(false);
  readonly label = input('');
  readonly quantityChange = output<number>();
}
