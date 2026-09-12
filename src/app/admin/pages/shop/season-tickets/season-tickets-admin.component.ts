import { ChangeDetectorRef, Component, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { CheckoutApiService } from '../../../../core/api/checkout-api.service';
import { SeasonTicket, checkoutError } from '../../../../core/shop/checkout.models';
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
  readonly form = this.fb.group({ fullName: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(200)]], cardNumber: ['', [Validators.required, Validators.pattern(/^[0-9]+(?![\s\S])/), Validators.maxLength(100)]], seasonKey: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(80)]], active: false, validFrom: '', validUntil: '' });
  needsUpdate(ticket: SeasonTicket) { return !ticket.fullName?.trim() || !/^[0-9]+(?![\s\S])/.test(ticket.cardNumber) || ticket.verificationMethod !== 'FULL_NAME'; }
  constructor() { const changes = inject(ChangeDetectorRef); this.form.events.pipe(takeUntilDestroyed()).subscribe(() => changes.markForCheck()); afterNextRender(() => { void this.load(); }); }
  async load(page = 1) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { const result = await firstValueFrom(this.api.tickets(page, this.search.trim())); this.tickets.set(result.data); this.page.set(page); this.pages.set(result.meta?.totalPages ?? 1); }
    catch (error) { this.error.set(checkoutError(error)); }
    finally { this.busy.set(false); }
  }
  edit(ticket: SeasonTicket | null) {
    this.selected.set(ticket); this.editing.set(true); this.error.set(''); this.notice.set('');
    const local = (date: string | null) => { if (!date) return ''; const value = new Date(date); return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
    this.form.reset({ fullName: ticket?.fullName ?? '', cardNumber: ticket?.cardNumber ?? '', seasonKey: ticket?.seasonKey ?? '', active: ticket?.active ?? false, validFrom: local(ticket?.validFrom ?? null), validUntil: local(ticket?.validUntil ?? null) });
  }
  close() { this.form.reset(); this.selected.set(null); this.editing.set(false); }
  async save() {
    this.form.markAllAsTouched(); if (this.form.invalid || this.busy()) return;
    const data = this.form.getRawValue(), previous = this.selected();
    if (data.validFrom && data.validUntil && data.validUntil < data.validFrom) { this.error.set('Крај важења мора бити после почетка.'); return; }
    this.busy.set(true); this.error.set('');
    try {
      await firstValueFrom(this.api.saveTicket({ ...data, fullName: data.fullName.trim(), validFrom: data.validFrom ? new Date(data.validFrom).toISOString() : null, validUntil: data.validUntil ? new Date(data.validUntil).toISOString() : null }, previous?.id));
      this.close(); this.notice.set('Сезонска карта је сачувана.'); this.busy.set(false); await this.load(this.page());
    } catch (error) { this.error.set(checkoutError(error)); }
    finally { this.busy.set(false); }
  }
  async remove(ticket: SeasonTicket) {
    if (this.busy() || !confirm('Да ли сте сигурни да желите трајно да обришете ову сезонску карту? Ова радња се не може поништити.')) return;
    this.busy.set(true); this.error.set(''); this.notice.set('');
    try {
      await firstValueFrom(this.api.removeTicket(ticket.id));
      this.tickets.update(rows => rows.filter(row => row.id !== ticket.id));
      if (this.selected()?.id === ticket.id) this.close();
      this.notice.set('Сезонска карта је обрисана.');
      const page = this.tickets().length ? this.page() : Math.max(1, this.page() - 1);
      this.busy.set(false); await this.load(page);
    } catch (error) {
      this.error.set((error as { status?: number }).status === 404 ? 'Сезонска карта не постоји. Освежите листу.' : 'Брисање сезонске карте није успело. Покушајте поново.');
    } finally { this.busy.set(false); }
  }
}
