import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { ListQuery, NewsletterSubscriber } from '../../../core/api/admin-api.models';
import { adminLoadGuard, formatDate, rowsOf, totalOf } from '../../shared/admin-ui';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-newsletter-admin',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="admin-page">
      <div class="admin-page-head">
        <div>
          <span class="admin-kicker">Newsletter</span>
          <h1>Subscribers</h1>
        </div>
        <button class="admin-button ghost" type="button" (click)="exportCsv()">Export CSV</button>
      </div>

      <div class="toolbar">
        <input type="search" placeholder="Email, ime, telefon..." [(ngModel)]="query.search" (keyup.enter)="load()" />
        <select [(ngModel)]="query.isActive" (change)="load()">
          <option value="">Svi</option>
          <option [ngValue]="true">Aktivni</option>
          <option [ngValue]="false">Neaktivni</option>
        </select>
        <input placeholder="Source" [(ngModel)]="query.source" (keyup.enter)="load()" />
        <button class="admin-button ghost" type="button" (click)="load()">Filtriraj</button>
      </div>

      <section class="admin-card table-card">
        @if (loading) {
          <div class="skeleton-lines"></div>
        } @else if (loadError) {
          <div class="empty-state">
            <b>{{ loadError }}</b>
            <button class="admin-button ghost" type="button" (click)="load()">Покушај поново</button>
          </div>
        } @else if (!items.length) {
          <div class="empty-state">Nema subscribera.</div>
        } @else {
          <div class="admin-table subscribers-table">
            <div class="table-row table-head">
              <span>Email</span><span>Ime</span><span>Source</span><span>Status</span><span>Datum</span><span>Akcije</span>
            </div>
            @for (item of items; track item.id) {
              <div class="table-row">
                <span><b>{{ item.email }}</b><small>{{ item.phone || 'Bez telefona' }}</small></span>
                <span>{{ fullName(item) }}</span>
                <span>{{ item.source || 'website' }}</span>
                <span class="pill" [class.good]="item.isActive" [class.warn]="!item.isActive">{{ item.isActive ? 'Active' : 'Inactive' }}</span>
                <span>{{ date(item.createdAt) }}</span>
                <span class="row-actions compact">
                  <button type="button" (click)="toggle(item)">{{ item.isActive ? 'Deactivate' : 'Activate' }}</button>
                  <button type="button" class="danger" (click)="remove(item)">Delete</button>
                </span>
              </div>
            }
          </div>
        }
      </section>

      <footer class="pagination">
        <span>{{ total }} subscribera</span>
        <button type="button" [disabled]="query.page === 1" (click)="page(-1)">Prethodna</button>
        <b>{{ query.page }}</b>
        <button type="button" [disabled]="items.length < query.limit!" (click)="page(1)">Sledeca</button>
      </footer>
    </section>
  `
})
export class NewsletterAdminComponent implements OnInit {
  private readonly toasts = inject(ToastService);

  loading = true;
  loadError = '';
  total = 0;
  items: NewsletterSubscriber[] = [];
  query: ListQuery = { page: 1, limit: 20, search: '', isActive: '', source: '' };

  constructor(private readonly api: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.api.newsletter(this.query).pipe(adminLoadGuard(), finalize(() => (this.loading = false))).subscribe({
      next: (response) => {
        this.items = rowsOf(response);
        this.total = totalOf(response);
      },
      error: () => {
        this.loadError = 'Newsletter lista nije ucitana.';
        this.toasts.error(this.loadError);
      }
    });
  }

  toggle(item: NewsletterSubscriber): void {
    this.api.updateSubscriber(item.id, { isActive: !item.isActive }).subscribe({
      next: () => {
        this.toasts.success('Newsletter subscriber je izmenjen.');
        this.load();
      },
      error: () => this.toasts.error('Izmena subscribera nije uspela.')
    });
  }

  remove(item: NewsletterSubscriber): void {
    if (!confirm(`Obrisati subscribera "${item.email}"?`)) {
      return;
    }
    this.api.deleteSubscriber(item.id).subscribe({
      next: () => {
        this.toasts.success('Newsletter subscriber je obrisan.');
        this.load();
      },
      error: () => this.toasts.error('Brisanje subscribera nije uspelo.')
    });
  }

  exportCsv(): void {
    const header = ['email', 'firstName', 'lastName', 'phone', 'source', 'isActive'];
    const csv = [header.join(','), ...this.items.map((item) => header.map((key) => JSON.stringify((item as unknown as Record<string, unknown>)[key] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'newsletter-subscribers.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.toasts.success('CSV export je spreman.');
  }

  fullName(item: NewsletterSubscriber): string {
    return [item.firstName, item.lastName].filter(Boolean).join(' ') || '-';
  }

  date(value?: string | null): string {
    return formatDate(value);
  }

  page(delta: number): void {
    this.query.page = Math.max(1, (this.query.page ?? 1) + delta);
    this.load();
  }
}
