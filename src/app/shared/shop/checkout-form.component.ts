import { ChangeDetectorRef, Component, DestroyRef, afterNextRender, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CheckoutApiService } from '../../core/api/checkout-api.service';
import { PublicShopApiService } from '../../core/api/public-shop-api.service';
import { CartService } from '../../core/shop/cart.service';
import { CheckoutSessionService } from '../../core/shop/checkout-session.service';
import { CartEntry, CatalogProduct, formatShopPrice } from '../../core/shop/public-shop.models';
import { OrderSource, Quote, Receipt, checkoutError, orderSourceLabels } from '../../core/shop/checkout.models';

@Component({ selector: 'app-checkout-form', standalone: true, imports: [ReactiveFormsModule, RouterLink], templateUrl: './checkout-form.component.html', styleUrl: './checkout-form.component.scss' })
export class CheckoutFormComponent {
  readonly manual = input(false);
  readonly cart = inject(CartService);
  private readonly api = inject(CheckoutApiService);
  private readonly catalogApi = inject(PublicShopApiService);
  private readonly session = inject(CheckoutSessionService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;
  private version = 0;
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly customerValid = signal(false);
  readonly recovering = signal(false);
  readonly uncertain = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly quote = signal<Quote | null>(null);
  readonly now = signal(Date.now());
  readonly ticketEnabled = signal(false);
  readonly ticketToken = signal<string | undefined>(undefined);
  readonly ticketBusy = signal(false);
  readonly ticketError = signal('');
  readonly products = signal<CatalogProduct[]>([]);
  readonly manualItems = signal<CartEntry[]>([]);
  readonly items = computed(() => this.manual() ? this.manualItems() : this.cart.items());
  readonly money = formatShopPrice;
  readonly sources = (['INSTAGRAM', 'PHONE', 'IN_PERSON', 'ADMIN'] as const).map(value => ({ value, label: orderSourceLabels[value] }));
  readonly source = this.fb.control<OrderSource>('ADMIN');
  readonly selection = this.fb.group({ variantId: ['', Validators.required], quantity: [1, [Validators.required, Validators.min(1), Validators.max(99), Validators.pattern(/^\d+$/)]] });
  readonly customer = this.fb.group({
    firstName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
    phone: ['', [Validators.required, Validators.pattern(/^(?=(?:\D*\d){7})\+?[0-9 ()-]{7,25}$/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    address: ['', [Validators.required, Validators.pattern(/\S.{2}/), Validators.maxLength(250)]],
    city: ['', [Validators.required, Validators.pattern(/\S./), Validators.maxLength(100)]],
    postalCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
    note: ['', Validators.maxLength(2000)]
  });
  readonly ticket = this.fb.group({ cardNumber: ['', [Validators.required, Validators.maxLength(100)]], verificationValue: ['', [Validators.required, Validators.maxLength(120)]] });
  readonly fields = [
    { key: 'firstName', label: 'Име', type: 'text', autocomplete: 'given-name', max: 100 },
    { key: 'lastName', label: 'Презиме', type: 'text', autocomplete: 'family-name', max: 100 },
    { key: 'phone', label: 'Телефон', type: 'tel', autocomplete: 'tel', max: 25 },
    { key: 'email', label: 'Имејл адреса', type: 'email', autocomplete: 'email', max: 254 },
    { key: 'address', label: 'Адреса и број', type: 'text', autocomplete: 'street-address', max: 250 },
    { key: 'city', label: 'Град', type: 'text', autocomplete: 'address-level2', max: 100 },
    { key: 'postalCode', label: 'Поштански број', type: 'text', autocomplete: 'postal-code', max: 5 }
  ] as const;
  constructor() {
    const destroy = inject(DestroyRef);
    const changes = inject(ChangeDetectorRef);
    const formEvents = [this.customer, this.ticket, this.selection, this.source].map(form => form.events.subscribe(() => changes.markForCheck()));
    const subscription = this.ticket.valueChanges.subscribe(() => { this.ticketToken.set(undefined); this.ticketError.set(''); });
    const validity = this.customer.statusChanges.subscribe(() => this.customerValid.set(this.customer.valid));
    destroy.onDestroy(() => { subscription.unsubscribe(); validity.unsubscribe(); formEvents.forEach(events => events.unsubscribe()); this.version++; });
    effect(() => {
      const ready = this.ready(), items = this.items(), enabled = this.ticketEnabled(), token = this.ticketToken();
      untracked(() => { if (ready) void this.refreshQuote(items, enabled, token); });
    });
    afterNextRender(() => {
      this.cart.initialize();
      const timer = setInterval(() => this.now.set(Date.now()), 1000);
      destroy.onDestroy(() => clearInterval(timer));
      void this.initialize();
    });
  }
  private async initialize() {
    await this.recover();
    if (this.manual()) {
      try { this.products.set(await firstValueFrom(this.catalogApi.catalog())); }
      catch { this.error.set('Понуда није учитана. Освежите страницу и покушајте поново.'); }
    }
    this.ready.set(true);
  }
  async recover() {
    const key = this.session.existing(this.manual());
    if (!key || this.recovering()) return;
    this.recovering.set(true);
    try {
      const receipt = await firstValueFrom(this.api.recover(key));
      this.uncertain.set(false);
      if (receipt.found) this.finish(receipt);
    } catch { this.uncertain.set(true); this.error.set('Потврда претходног покушаја није доступна. Проверите исход пре поновног слања.'); }
    finally { this.recovering.set(false); }
  }
  async refreshQuote(items = this.items(), enabled = this.ticketEnabled(), token = this.ticketToken()) {
    const version = ++this.version;
    this.quote.set(null); this.loading.set(false);
    if (!items.length || enabled && !token) return;
    this.loading.set(true);
    try {
      const quote = await firstValueFrom(this.api.quote(items, enabled ? token : undefined));
      if (version === this.version) this.quote.set(quote);
    } catch (error) { if (version === this.version) this.error.set(checkoutError(error)); }
    finally { if (version === this.version) this.loading.set(false); }
  }
  toggleTicket(enabled: boolean) { this.ticketEnabled.set(enabled); this.ticketToken.set(undefined); this.ticketError.set(''); this.ticket.reset(); }
  async validateTicket() {
    if (this.ticket.invalid || this.ticketBusy()) { this.ticket.markAllAsTouched(); return; }
    this.ticketBusy.set(true); this.ticketError.set('');
    const value = this.ticket.getRawValue();
    try {
      const result = await firstValueFrom(this.api.validateTicket(value.cardNumber.trim(), value.verificationValue.trim()));
      this.ticket.controls.verificationValue.reset('', { emitEvent: false });
      this.ticketToken.set(result.seasonTicketToken);
    } catch (error) { this.ticketToken.set(undefined); this.ticketError.set(checkoutError(error)); }
    finally { this.ticketBusy.set(false); }
  }
  addItem() {
    if (this.selection.invalid) return;
    const { variantId, quantity } = this.selection.getRawValue();
    const old = this.manualItems().find(item => item.variantId === variantId);
    if ((old?.quantity ?? 0) + quantity > 99 || !old && this.manualItems().length >= 100) { this.error.set('Највише 99 комада по величини и 100 ставки.'); return; }
    this.manualItems.update(items => old ? items.map(item => item.variantId === variantId ? { ...item, quantity: item.quantity + quantity } : item) : [...items, { variantId, quantity }]);
  }
  removeItem(id: string) { this.manualItems.update(items => items.filter(item => item.variantId !== id)); }
  itemName(id: string) {
    const product = this.products().find(product => product.variants.some(variant => variant.id === id));
    return product ? `${product.name.sr} — ${product.variants.find(variant => variant.id === id)?.size}` : 'Артикал';
  }
  get expired() { return !this.quote() || this.now() >= Date.parse(this.quote()!.expiresAt); }
  get canSubmit() { return this.customerValid() && !this.expired && !this.busy() && !this.loading() && !this.recovering() && !this.uncertain() && this.items().length > 0 && (!this.ticketEnabled() || !!this.ticketToken()); }
  async submit() {
    this.customer.markAllAsTouched();
    if (!this.canSubmit) return;
    this.busy.set(true); this.error.set('');
    try {
      // Recover before every retry; the key survives refresh without storing personal data.
      if (this.session.existing(this.manual())) {
        const existing = await firstValueFrom(this.api.recover(this.session.existing(this.manual())!));
        if (existing.found) { this.finish(existing); return; }
      }
      const receipt = await firstValueFrom(this.api.create({ items: this.items(), customer: this.customer.getRawValue(), quoteToken: this.quote()!.quoteToken, idempotencyKey: this.session.attempt(this.manual()), ...(this.ticketEnabled() ? { seasonTicketToken: this.ticketToken() } : {}), ...(this.manual() ? { source: this.source.value } : {}) }, this.manual()));
      this.finish(receipt);
    } catch (error) {
      const response = error as { status?: number; error?: { code?: string; quote?: Quote } };
      this.error.set(checkoutError(error));
      if (response.error?.code === 'PRICE_CHANGED' && response.error.quote) this.quote.set(response.error.quote);
      else if (response.error?.code === 'SEASON_TICKET_INVALID') { this.ticketToken.set(undefined); this.quote.set(null); }
      else if (['QUOTE_EXPIRED', 'VARIANT_UNAVAILABLE', 'PRODUCT_UNAVAILABLE'].includes(response.error?.code ?? '')) this.quote.set(null);
      if (!response.status || response.status >= 500 || response.error?.code === 'IDEMPOTENCY_CONFLICT') { this.uncertain.set(true); await this.recover(); }
    } finally { this.busy.set(false); }
  }
  private finish(receipt: Receipt) {
    this.session.complete(receipt, this.manual());
    if (this.manual()) { void this.router.navigate(['/admin/shop/orders'], { queryParams: { search: receipt.orderNumber } }); }
    else { this.cart.clear(); void this.router.navigateByUrl('/porudzbina/uspesno'); }
  }
}
