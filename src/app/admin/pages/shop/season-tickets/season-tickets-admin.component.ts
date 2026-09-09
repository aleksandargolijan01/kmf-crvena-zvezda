import { ChangeDetectorRef, Component, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CheckoutApiService } from '../../../../core/api/checkout-api.service';
import { SeasonTicket, VerificationMethod, checkoutError } from '../../../../core/shop/checkout.models';
@Component({ standalone: true, imports: [DatePipe, FormsModule, ReactiveFormsModule], templateUrl: './season-tickets-admin.component.html', styleUrl: '../shop-operations.scss' })
export class SeasonTicketsAdminComponent {
  private readonly api = inject(CheckoutApiService);
  private readonly fb = inject(FormBuilder).nonNullable;
  readonly tickets = signal<SeasonTicket[]>([]);
  readonly selected = signal<SeasonTicket | null>(null);
  readonly editing = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly page = signal(1);
  readonly pages = signal(1);
  search = '';
  readonly methods: Record<VerificationMethod, string> = { LAST_NAME: 'Презиме', PHONE_LAST4: 'Последње четири цифре телефона', PIN: 'ПИН' };
  readonly methodKeys = Object.keys(this.methods) as VerificationMethod[];
  readonly form = this.fb.group({ cardNumber: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]], seasonKey: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]], active: false, validFrom: '', validUntil: '', verificationMethod: this.fb.control<VerificationMethod | ''>(''), verificationValue: ['', Validators.maxLength(120)] });
  constructor() { const changes = inject(ChangeDetectorRef); this.form.events.pipe(takeUntilDestroyed()).subscribe(() => changes.markForCheck()); afterNextRender(() => { void this.load(); }); }
  async load(page = 1) {
    this.busy.set(true); this.error.set('');
    try { const result = await firstValueFrom(this.api.tickets(page, this.search.trim())); this.tickets.set(result.data); this.page.set(page); this.pages.set(result.meta?.totalPages ?? 1); }
    catch (error) { this.error.set(checkoutError(error)); }
    finally { this.busy.set(false); }
  }
  edit(ticket: SeasonTicket | null) {
    this.selected.set(ticket); this.editing.set(true); this.error.set(''); this.notice.set('');
    const local = (date: string | null) => { if (!date) return ''; const value = new Date(date); return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
    this.form.reset({ cardNumber: ticket?.cardNumber ?? '', seasonKey: ticket?.seasonKey ?? '', active: ticket?.active ?? false, validFrom: local(ticket?.validFrom ?? null), validUntil: local(ticket?.validUntil ?? null), verificationMethod: ticket?.verificationMethod ?? '', verificationValue: '' });
  }
  close() { this.form.reset(); this.selected.set(null); this.editing.set(false); }
  async save() {
    this.form.markAllAsTouched(); if (this.form.invalid || this.busy()) return;
    const data = this.form.getRawValue(), previous = this.selected();
    if (data.validFrom && data.validUntil && data.validUntil < data.validFrom) { this.error.set('Крај важења мора бити после почетка.'); return; }
    if ((data.active && !data.verificationMethod) || (data.verificationMethod && (!previous || previous.verificationMethod !== data.verificationMethod) && !data.verificationValue.trim())) { this.error.set('Изаберите метод и унесите нови податак за потврду.'); return; }
    this.busy.set(true); this.error.set('');
    try {
      await firstValueFrom(this.api.saveTicket({ ...data, validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : null, validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : null, verificationMethod: data.verificationMethod || null, verificationValue: data.verificationValue.trim() }, previous?.id));
      this.close(); this.notice.set('Сезонска карта је сачувана.'); await this.load(this.page());
    } catch (error) { this.error.set(checkoutError(error)); }
    finally { this.form.controls.verificationValue.reset(''); this.busy.set(false); }
  }
}
