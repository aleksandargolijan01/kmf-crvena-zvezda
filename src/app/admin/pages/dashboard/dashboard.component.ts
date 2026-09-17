import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, catchError, finalize, forkJoin, of } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { MediaFile, NewsItem, PageResponse } from '../../../core/api/admin-api.models';
import { adminLoadGuard, formatDate, rowsOf, totalOf } from '../../shared/admin-ui';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="admin-page">
      <div class="admin-page-head">
        <div>
          <span class="admin-kicker">Pregled sistema</span>
          <h1>Dashboard</h1>
        </div>
        <div class="admin-actions">
          <a class="admin-button primary" routerLink="/admin/news">Nova vest</a>
          <a class="admin-button ghost" routerLink="/admin/media">Upload media</a>
        </div>
      </div>

      @if (loading) {
        <div class="admin-grid four">
          @for (_ of skeletons; track $index) {
            <article class="admin-card skeleton-card"></article>
          }
        </div>
      } @else if (error) {
        <section class="admin-card admin-state-card">
          <h2>Dashboard trenutno nije ucitan.</h2>
          <p>{{ error }}</p>
          <button class="admin-button primary" type="button" (click)="load()">Покушај поново</button>
        </section>
      } @else {
        <div class="admin-grid four">
          @for (metric of metrics; track metric.label) {
            <article class="metric-card">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <small>{{ metric.hint }}</small>
            </article>
          }
        </div>

        <div class="admin-grid two">
          <section class="admin-card">
            <div class="card-head">
              <h2>Najnovije vesti</h2>
              <a routerLink="/admin/news">Otvori</a>
            </div>
            @if (latestNews.length) {
              <div class="activity-list">
                @for (item of latestNews; track item.id) {
                  <article>
                    <span [class.good]="item.published" [class.warn]="!item.published">{{ item.published ? 'Published' : 'Draft' }}</span>
                    <div>
                      <strong>{{ item.title_sr }}</strong>
                      <small>{{ date(item.updatedAt) }}</small>
                    </div>
                  </article>
                }
              </div>
            } @else {
              <div class="empty-state">Nema vesti za prikaz.</div>
            }
          </section>

          <section class="admin-card">
            <div class="card-head">
              <h2>Media statistika</h2>
              <a routerLink="/admin/media">Biblioteka</a>
            </div>
            <div class="media-strip">
              @for (item of mediaPreview; track item.id) {
                <img [src]="item.url" [alt]="item.originalName" loading="lazy" />
              }
            </div>
            <div class="quick-actions">
              <a routerLink="/admin/players">Igraci</a>
              <a routerLink="/admin/sponsors">Партнери</a>
              <a routerLink="/admin/newsletter">Newsletter</a>
            </div>
          </section>
        </div>
      }
    </section>
  `
})
export class DashboardComponent implements OnInit {
  loading = true;
  error = '';
  metrics = [
    { label: 'Vesti', value: 0, hint: 'ukupno u CMS-u' },
    { label: 'Igraci', value: 0, hint: 'prvi tim + U19' },
    { label: 'Партнери', value: 0, hint: 'aktivni partneri' },
    { label: 'Newsletter', value: 0, hint: 'subscribers' }
  ];
  latestNews: NewsItem[] = [];
  mediaPreview: MediaFile[] = [];
  readonly skeletons = Array.from({ length: 4 });

  constructor(private readonly api: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    forkJoin({
      news: this.safePage(this.api.news({ page: 1, limit: 5 })),
      players: this.safePage(this.api.players('firstTeam', { page: 1, limit: 1 })),
      u19: this.safePage(this.api.players('u19', { page: 1, limit: 1 })),
      sponsors: this.safePage(this.api.sponsors({ page: 1, limit: 1 })),
      newsletter: this.safePage(this.api.newsletter({ page: 1, limit: 1 })),
      media: this.safePage(this.api.media({ page: 1, limit: 6 }))
    }).pipe(finalize(() => (this.loading = false))).subscribe({
      next: (data) => {
        this.metrics = [
          { label: 'Vesti', value: totalOf(data.news), hint: 'ukupno u CMS-u' },
          { label: 'Igraci', value: totalOf(data.players) + totalOf(data.u19), hint: 'prvi tim + U19' },
          { label: 'Партнери', value: totalOf(data.sponsors), hint: 'aktivni partneri' },
          { label: 'Newsletter', value: totalOf(data.newsletter), hint: 'subscribers' }
        ];
        this.latestNews = rowsOf(data.news);
        this.mediaPreview = rowsOf(data.media);
      },
      error: () => {
        this.error = 'Proverite konekciju sa backendom i pokusajte ponovo.';
      }
    });
  }

  private safePage<T>(request: Observable<PageResponse<T>>): Observable<PageResponse<T>> {
    return request.pipe(
      adminLoadGuard(),
      catchError(() => of({ data: [], total: 0 }))
    );
  }

  date(value?: string | null): string {
    return formatDate(value);
  }
}
