import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { ListQuery, MediaFile } from '../../../core/api/admin-api.models';
import { adminLoadGuard, fileSize, rowsOf, totalOf } from '../../shared/admin-ui';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-media-admin',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="admin-page">
      <div class="admin-page-head">
        <div>
          <span class="admin-kicker">Assets</span>
          <h1>Media library</h1>
        </div>
        <label class="admin-button primary upload-button" [class.is-disabled]="uploading">
          {{ uploading ? 'Uploading...' : 'Upload' }}
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple (change)="upload($event)" />
        </label>
      </div>

      <div class="toolbar">
        <input type="search" placeholder="Pretraga fajlova..." [(ngModel)]="query.search" (keyup.enter)="load()" />
        <select [(ngModel)]="query.mimeType" (change)="load()">
          <option value="">Svi tipovi</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/png">PNG</option>
          <option value="image/webp">WEBP</option>
        </select>
        <button class="admin-button ghost" type="button" (click)="load()">Filtriraj</button>
      </div>

      <label
        class="drop-zone"
        [class.is-dragging]="dragging"
        (dragover)="dragging = true; $event.preventDefault()"
        (dragleave)="dragging = false"
        (drop)="drop($event)"
      >
        <input type="file" accept="image/png,image/jpeg,image/webp" multiple (change)="upload($event)" />
        <strong>{{ uploading ? 'Upload je u toku...' : 'Prevuci slike ovde' }}</strong>
        <span>JPEG, PNG ili WEBP, kroz backend upload endpoint.</span>
      </label>

      @if (error) {
        <div class="admin-error">{{ error }}</div>
      }

      @if (loading) {
        <div class="admin-grid media-grid">
          @for (_ of skeletons; track $index) {
            <article class="admin-card skeleton-card media-tile"></article>
          }
        </div>
      } @else if (loadError) {
        <div class="empty-state">
          <b>{{ loadError }}</b>
          <button class="admin-button ghost" type="button" (click)="load()">Покушај поново</button>
        </div>
      } @else if (!items.length) {
        <div class="empty-state">Nema media fajlova.</div>
      } @else {
        <div class="admin-grid media-grid">
          @for (item of items; track item.id) {
            <article class="media-card">
              <img [src]="item.url" [alt]="item.originalName" loading="lazy" />
              <div>
                <strong>{{ item.originalName }}</strong>
                <small>{{ item.mimeType }} · {{ size(item.size) }} · {{ usageLabel(item) }}</small>
                <div class="row-actions">
                  <button type="button" (click)="copy(item.url)">Copy URL</button>
                  <button type="button" class="danger" [disabled]="usage(item) > 0" [title]="deleteTitle(item)" (click)="remove(item)">Delete</button>
                </div>
              </div>
            </article>
          }
        </div>
      }

      <footer class="pagination">
        <span>{{ total }} fajlova</span>
        <button type="button" [disabled]="query.page === 1" (click)="page(-1)">Prethodna</button>
        <b>{{ query.page }}</b>
        <button type="button" [disabled]="items.length < query.limit!" (click)="page(1)">Sledeca</button>
      </footer>
    </section>
  `
})
export class MediaAdminComponent implements OnInit {
  private readonly toasts = inject(ToastService);

  loading = true;
  uploading = false;
  dragging = false;
  error = '';
  loadError = '';
  total = 0;
  items: MediaFile[] = [];
  readonly skeletons = Array.from({ length: 8 });
  query: ListQuery = { page: 1, limit: 20, search: '', mimeType: '' };

  constructor(private readonly api: AdminApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.api.media(this.query).pipe(adminLoadGuard(), finalize(() => (this.loading = false))).subscribe({
      next: (response) => {
        this.items = rowsOf(response);
        this.total = totalOf(response);
      },
      error: () => {
        this.loadError = 'Media fajlovi nisu ucitani.';
        this.toasts.error(this.loadError);
      }
    });
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFiles(input.files);
    input.value = '';
  }

  drop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    this.uploadFiles(event.dataTransfer?.files ?? null);
  }

  uploadFiles(files: FileList | null): void {
    if (!files?.length) {
      return;
    }
    this.uploading = true;
    let remaining = files.length;
    Array.from(files).forEach((file) => {
      this.api.upload(file).pipe(
        finalize(() => {
          remaining -= 1;
          this.uploading = remaining > 0;
        })
      ).subscribe({
        next: () => {
          this.toasts.success('Slika je uploadovana.');
          this.load();
        },
        error: () => {
          this.error = 'Upload nije uspeo. Proveri storage konfiguraciju na backendu.';
          this.toasts.error(this.error);
        }
      });
    });
  }

  remove(item: MediaFile): void {
    if (confirm(`Obrisati ${item.originalName}?`)) {
      this.api.deleteMedia(item.id).subscribe({
        next: () => {
          this.toasts.success('Media fajl je obrisan.');
          this.load();
        },
        error: (error: HttpErrorResponse) => {
          this.error = this.deleteErrorMessage(error);
          this.toasts.error(this.error);
        }
      });
    }
  }

  copy(url: string): void {
    void navigator.clipboard?.writeText(url);
    this.toasts.success('URL je kopiran.');
  }

  usage(item: MediaFile): number {
    if (item._count) {
      return Object.values(item._count).reduce((sum, value) => sum + value, 0);
    }

    if (item.usage) {
      return item.usage.references.reduce((sum, reference) => sum + reference.count, 0);
    }

    return ['newsCover', 'playerImages', 'u19PlayerImages', 'managementImages', 'boardImages', 'sponsorLogos']
      .map((key) => ((item as unknown as Record<string, unknown[]>)[key] ?? []).length)
      .reduce((sum, value) => sum + value, 0);
  }

  usageLabel(item: MediaFile): string {
    const totalUsage = this.usage(item);
    return totalUsage > 0 ? `u upotrebi ${totalUsage}` : 'nije u upotrebi';
  }

  deleteTitle(item: MediaFile): string {
    return this.usage(item) > 0 ? 'Slika se koristi na sajtu. Prvo je ukloni iz povezanog sadrzaja.' : 'Obrisi media fajl';
  }

  size(bytes: number): string {
    return fileSize(bytes);
  }

  page(delta: number): void {
    this.query.page = Math.max(1, (this.query.page ?? 1) + delta);
    this.load();
  }

  private deleteErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 409) {
      return 'Slika se koristi na sajtu. Prvo je ukloni iz vesti, igraca, uprave ili partnera, pa je onda obrisi.';
    }

    const message = typeof error.error?.message === 'string' ? error.error.message : '';
    return message || 'Brisanje nije uspelo.';
  }
}
