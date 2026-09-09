import { ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { MediaFile } from '../../../core/api/admin-api.models';
import { adminLoadGuard, rowsOf, totalOf } from '../admin-ui';

@Component({
  selector: 'app-media-picker', standalone: true, imports: [FormsModule],
  template: `
    <section class="admin-card" aria-label="Избор фотографије">
      <div class="toolbar compact">
        <label>Претрага фотографија <input type="search" [(ngModel)]="search" (keyup.enter)="load(1)" /></label>
        <button class="admin-button ghost" type="button" (click)="load(1)" [disabled]="loading">Претражи</button>
        <label class="admin-button ghost">Додај фотографију
          <input type="file" accept="image/jpeg,image/png,image/webp" (change)="upload($event)" [disabled]="uploading" />
        </label>
      </div>
      <p>ЈПГ, ПНГ или ВебП, највише 5 МБ.</p>
      @if (loading) { <div class="skeleton-lines" aria-label="Учитавање фотографија"></div> }
      @if (uploading) { <p role="status">Отпремање фотографије…</p> }
      @if (error) { <div class="admin-error" role="alert">{{ error }}</div> }
      @if (!loading && !files.length && !error) { <div class="empty-state">Нема фотографија.</div> }
      <div class="media-picker-row">
        @for (file of files; track file.id) {
          <button type="button" (click)="picked.emit(file)" [class.is-selected]="selectedIds.includes(file.id)" [attr.aria-label]="'Изабери фотографију: ' + file.originalName" [attr.aria-pressed]="selectedIds.includes(file.id)">
            <img [src]="file.url" [alt]="file.altText || file.originalName" loading="lazy" />
          </button>
        }
      </div>
      <footer class="pagination">
        <button type="button" [disabled]="page <= 1 || loading" (click)="load(page - 1)">Претходна</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button type="button" [disabled]="page >= totalPages || loading" (click)="load(page + 1)">Следећа</button>
      </footer>
    </section>
  `,
  styles: [`:host { display: block; } input[type=file] { max-width: 220px; } .admin-card { padding: 16px; } p { color: var(--admin-muted); font-size: 13px; }`]
})
export class MediaPickerComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  @Input() selectedIds: string[] = [];
  @Output() picked = new EventEmitter<MediaFile>();
  files: MediaFile[] = [];
  search = '';
  page = 1;
  totalPages = 1;
  loading = false;
  uploading = false;
  error = '';

  ngOnInit() { this.load(); }
  load(page = this.page) {
    if (this.loading) return;
    this.loading = true;
    this.page = page;
    this.error = '';
    this.api.media({ page, limit: 12, search: this.search }).pipe(adminLoadGuard(), takeUntilDestroyed(this.destroyRef), finalize(() => { this.loading = false; this.changeDetector.markForCheck(); })).subscribe({
      next: (response) => { this.files = rowsOf(response); this.totalPages = Math.max(1, Math.ceil(totalOf(response) / 12)); },
      error: () => this.error = 'Фотографије нису учитане. Покушајте поново.'
    });
  }
  upload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploading) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.error = 'Изаберите ЈПГ, ПНГ или ВебП фотографију до 5 МБ.';
      return;
    }
    this.uploading = true;
    this.error = '';
    this.api.upload(file).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.uploading = false; this.changeDetector.markForCheck(); })).subscribe({
      next: (media) => { this.picked.emit(media); this.load(1); },
      error: () => this.error = 'Отпремање није успело. Покушајте поново.'
    });
  }
}
