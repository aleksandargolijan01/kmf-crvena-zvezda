import { TranslationService } from '../../i18n/translation.service';
import { Component, DestroyRef, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CartService } from '../../core/shop/cart.service';
import { CartPresentationService } from '../../core/shop/cart-presentation.service';
import { ShopRouteService } from '../../core/shop/shop-route.service';

@Component({
  selector: 'app-floating-cart', standalone: true,
  templateUrl: './floating-cart.component.html',
  styleUrl: './floating-cart.component.scss'
})
export class FloatingCartComponent {
  readonly i18n = inject(TranslationService);
  readonly cart = inject(CartService);
  private readonly presentation = inject(CartPresentationService);
  private readonly routes = inject(ShopRouteService);
  private readonly router = inject(Router);
  readonly visible = computed(() => this.presentation.ready() && !this.presentation.dismissed()
    && this.cart.count() > 0 && this.routes.context() === 'public');
  readonly dragging = signal(false);
  readonly inTarget = signal(false);
  readonly closing = signal(false);
  readonly position = signal('translate3d(0, 0, 0)');
  readonly target = viewChild<ElementRef<HTMLElement>>('target');
  private pointer?: { id: number; x: number; y: number; cx: number; cy: number; element: HTMLElement };
  private holdTimer?: ReturnType<typeof setTimeout>;
  private closeTimer?: ReturnType<typeof setTimeout>;
  private suppressClickUntil = 0;

  constructor() {
    effect(() => { if (!this.visible()) this.cancel(); });
    inject(DestroyRef).onDestroy(() => { clearTimeout(this.holdTimer); clearTimeout(this.closeTimer); });
  }

  open(): void {
    if (Date.now() >= this.suppressClickUntil && !this.closing()) void this.router.navigateByUrl('/korpa');
  }

  down(event: PointerEvent): void {
    if (event.pointerType === 'mouse' || !event.isPrimary || this.pointer || this.closing()) return;
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2, element };
    element.setPointerCapture(event.pointerId);
    this.holdTimer = setTimeout(() => this.dragging.set(true), 180);
  }

  move(event: PointerEvent): void {
    const start = this.pointer;
    if (!start || event.pointerId !== start.id) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) {
      clearTimeout(this.holdTimer);
      this.dragging.set(true);
    }
    if (!this.dragging()) return;
    event.preventDefault();
    let cx = Math.max(28, Math.min(innerWidth - 28, start.cx + event.clientX - start.x));
    let cy = Math.max(28, Math.min(innerHeight - 28, start.cy + event.clientY - start.y));
    const rect = this.target()?.nativeElement.getBoundingClientRect();
    const near = !!rect && Math.hypot(cx - rect.x - rect.width / 2, cy - rect.y - rect.height / 2) <= 64;
    this.inTarget.set(near);
    if (near && rect) { cx = rect.x + rect.width / 2; cy = rect.y + rect.height / 2; }
    this.position.set(`translate3d(${cx - start.cx}px, ${cy - start.cy}px, 0)`);
  }

  up(event: PointerEvent): void {
    if (event.pointerId !== this.pointer?.id) return;
    const dragged = this.dragging();
    const dismiss = dragged && this.inTarget();
    if (dragged) { event.preventDefault(); this.suppressClickUntil = Date.now() + 500; }
    this.release();
    if (dismiss) this.dismiss();
    else this.reset();
  }

  cancel(): void {
    if (this.pointer) this.suppressClickUntil = Date.now() + 500;
    this.release();
    this.reset();
  }

  dismiss(): void {
    if (this.closing()) return;
    this.closing.set(true);
    this.dragging.set(false);
    this.closeTimer = setTimeout(() => {
      this.presentation.dismiss();
      this.closing.set(false);
      this.reset();
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200);
  }

  private release(): void {
    clearTimeout(this.holdTimer);
    const pointer = this.pointer;
    this.pointer = undefined;
    if (pointer?.element.hasPointerCapture(pointer.id)) pointer.element.releasePointerCapture(pointer.id);
  }

  private reset(): void {
    this.dragging.set(false);
    this.inTarget.set(false);
    this.position.set('translate3d(0, 0, 0)');
  }
}
