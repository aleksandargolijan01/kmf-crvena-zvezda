import { Injectable, afterNextRender, effect, inject, signal, untracked } from '@angular/core';
import { CartService } from './cart.service';

const DISMISSED_KEY = 'kmf_floating_cart_dismissed';
type CartQuantity = { variantId: string; quantity: number };

export function cartGrew(previous: readonly CartQuantity[], current: readonly CartQuantity[]): boolean {
  return current.some(item => item.quantity > (previous.find(old => old.variantId === item.variantId)?.quantity ?? 0));
}

/** Presentation only: never writes to cart contents or cart persistence. */
@Injectable({ providedIn: 'root' })
export class CartPresentationService {
  private readonly cart = inject(CartService);
  private previous: readonly CartQuantity[] = [];
  readonly ready = signal(false);
  readonly dismissed = signal(false);

  constructor() {
    afterNextRender(() => {
      this.cart.initialize();
      this.previous = this.cart.items();
      try { this.dismissed.set(sessionStorage.getItem(DISMISSED_KEY) === '1'); } catch { /* Memory fallback. */ }
      this.ready.set(true);
    });
    effect(() => {
      const items = this.cart.items();
      if (!this.ready()) return;
      untracked(() => {
        if (cartGrew(this.previous, items)) this.setDismissed(false);
        this.previous = items;
      });
    });
  }

  dismiss(): void { this.setDismissed(true); }

  private setDismissed(value: boolean): void {
    this.dismissed.set(value);
    try {
      if (value) sessionStorage.setItem(DISMISSED_KEY, '1');
      else sessionStorage.removeItem(DISMISSED_KEY);
    } catch { /* Keep the in-memory preference if storage is unavailable. */ }
  }
}
