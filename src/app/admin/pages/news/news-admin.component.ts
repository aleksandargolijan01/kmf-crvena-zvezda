import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { ListQuery, MediaFile, NewsItem } from '../../../core/api/admin-api.models';
import { adminLoadGuard, formatDate, rowsOf, totalOf } from '../../shared/admin-ui';
import { ToastService } from '../../shared/toast.service';

type Lang = 'sr' | 'en' | 'ru';

@Component({
  selector: 'app-news-admin',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  template: `
    <section class="admin-page">
      <div class="admin-page-head">
        <div>
          <span class="admin-kicker">News CMS</span>
          <h1>Vesti</h1>
        </div>
        <button class="admin-button primary" type="button" (click)="newItem()">Nova vest</button>
      </div>

      <div class="toolbar">
        <input type="search" placeholder="Pretraga vesti..." [(ngModel)]="query.search" (keyup.enter)="load()" />
        <select [(ngModel)]="query.published" (change)="load()">
          <option value="">Sve objave</option>
          <option [ngValue]="true">Published</option>
          <option [ngValue]="false">Draft</option>
        </select>
        <select [(ngModel)]="query.featured" (change)="load()">
          <option value="">Sve</option>
          <option [ngValue]="true">Featured</option>
          <option [ngValue]="false">Standard</option>
        </select>
        <button class="admin-button ghost" type="button" (click)="load()">Filtriraj</button>
      </div>

      <div class="admin-split">
        <section class="admin-card table-card">
          @if (loading) {
            <div class="skeleton-lines"></div>
          } @else if (loadError) {
            <div class="empty-state">
              <b>{{ loadError }}</b>
              <button class="admin-button ghost" type="button" (click)="load()">Покушај поново</button>
            </div>
          } @else if (!items.length) {
            <div class="empty-state">Nema vesti u CMS-u.</div>
          } @else {
            <div class="admin-table">
              <div class="table-row table-head">
                <span>Vest</span>
                <span>Status</span>
                <span>Prevodi</span>
                <span>Akcije</span>
              </div>
              @for (item of items; track item.id) {
                <button class="table-row row-button" type="button" [class.is-selected]="item.id === selected?.id" (click)="edit(item)">
                  <span>
                    <b>{{ item.title_sr }}</b>
                    <small>{{ item.slug }} · {{ date(item.updatedAt) }}</small>
                    @if (item.featured) {
                      <em class="featured-badge">Featured</em>
                    }
                  </span>
                  <span class="pill" [class.good]="item.published" [class.warn]="!item.published">{{ item.published ? 'Published' : 'Draft' }}</span>
                  <span class="translation-dots">
                    <i class="done">SR</i>
                    <i [class.done]="item.title_en && item.content_en">EN</i>
                    <i [class.done]="item.title_ru && item.content_ru">RU</i>
                  </span>
                  <span class="row-actions compact">
                    <button type="button" [disabled]="isStatusPending(item, 'published')" (click)="toggle(item, 'published'); $event.stopPropagation()">{{ item.published ? 'Unpublish' : 'Publish' }}</button>
                    <button type="button" [disabled]="isStatusPending(item, 'featured')" (click)="toggle(item, 'featured'); $event.stopPropagation()">{{ item.featured ? 'Unfeature' : 'Feature' }}</button>
                    <button type="button" class="danger" (click)="remove(item); $event.stopPropagation()">Delete</button>
                  </span>
                </button>
              }
            </div>
          }
          <footer class="pagination">
            <span>{{ total }} vesti</span>
            <button type="button" [disabled]="query.page === 1" (click)="page(-1)">Prethodna</button>
            <b>{{ query.page }}</b>
            <button type="button" [disabled]="items.length < query.limit!" (click)="page(1)">Sledeca</button>
          </footer>
        </section>

        <section class="admin-card editor-card">
          <div class="card-head">
            <h2>{{ selected?.id ? 'Izmena vesti' : 'Nova vest' }}</h2>
            <button class="admin-button ghost" type="button" (click)="preview = !preview">{{ preview ? 'Forma' : 'Preview' }}</button>
          </div>

          @if (preview) {
            <article class="preview-pane">
              @if (form.controls.coverImage.value) {
                <img [src]="form.controls.coverImage.value" alt="" />
              }
              <span class="admin-kicker">{{ form.controls.featured.value ? 'Featured' : 'News' }}</span>
              <h3>{{ form.controls.title_sr.value || 'Naslov vesti' }}</h3>
              <p>{{ form.controls.excerpt_sr.value || 'Kratak opis vesti...' }}</p>
            </article>
          } @else {
            <form [formGroup]="form" (ngSubmit)="save()" class="admin-form">
              <div class="lang-tabs">
                @for (lang of langs; track lang) {
                  <button type="button" [class.is-active]="activeLang === lang" (click)="activeLang = lang">{{ lang.toUpperCase() }}</button>
                }
              </div>

              @if (activeLang === 'sr') {
                <label>Naslov SR <input formControlName="title_sr" /></label>
                <label>Excerpt SR <textarea rows="3" formControlName="excerpt_sr"></textarea></label>
                <label class="content-editor-field">
                  <span class="field-head">
                    Content SR
                    <button class="admin-button ghost inline-tool" type="button" (click)="insertLink('content_sr', contentSr)">Dodaj link</button>
                  </span>
                  <textarea #contentSr rows="9" class="rich-field" formControlName="content_sr"></textarea>
                </label>
              }
              @if (activeLang === 'en') {
                <label>Title EN <input formControlName="title_en" /></label>
                <label>Excerpt EN <textarea rows="3" formControlName="excerpt_en"></textarea></label>
                <label class="content-editor-field">
                  <span class="field-head">
                    Content EN
                    <button class="admin-button ghost inline-tool" type="button" (click)="insertLink('content_en', contentEn)">Dodaj link</button>
                  </span>
                  <textarea #contentEn rows="9" class="rich-field" formControlName="content_en"></textarea>
                </label>
              }
              @if (activeLang === 'ru') {
                <label>Title RU <input formControlName="title_ru" /></label>
                <label>Excerpt RU <textarea rows="3" formControlName="excerpt_ru"></textarea></label>
                <label class="content-editor-field">
                  <span class="field-head">
                    Content RU
                    <button class="admin-button ghost inline-tool" type="button" (click)="insertLink('content_ru', contentRu)">Dodaj link</button>
                  </span>
                  <textarea #contentRu rows="9" class="rich-field" formControlName="content_ru"></textarea>
                </label>
              }

              <div class="image-picker">
                <label>Cover URL <input formControlName="coverImage" placeholder="https://..." (input)="clearCoverId()" /></label>
                <button class="admin-button ghost" type="button" (click)="loadMedia()">Ucitaj media</button>
              </div>
              @if (media.length) {
                <div class="media-picker-row">
                  @for (file of media; track file.id) {
                    <button type="button" (click)="pickCover(file)" [class.is-selected]="file.id === form.controls.coverImageId.value">
                      <img [src]="file.url" [alt]="file.originalName" />
                    </button>
                  }
                </div>
              }

              <div class="switch-row">
                <label><input type="checkbox" formControlName="published" /> Published</label>
                <label><input type="checkbox" formControlName="featured" /> Featured</label>
                <span class="autosave-note">Autosave ready: forma je izolovana i spremna za debounce draft servis.</span>
              </div>

              @if (error) {
                <div class="admin-error">{{ error }}</div>
              }
              @if (form.invalid && form.touched) {
                <div class="admin-error">Naslov SR i Content SR su obavezni. Naslov mora imati najmanje 3 karaktera, a content najmanje 10.</div>
              }
              <button class="admin-button primary full" type="submit" [disabled]="form.invalid || saving">{{ saving ? 'Cuvanje...' : 'Sacuvaj vest' }}</button>
            </form>
          }
        </section>
      </div>
    </section>
  `
})
export class NewsAdminComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(ToastService);

  loading = true;
  saving = false;
  preview = false;
  error = '';
  loadError = '';
  total = 0;
  items: NewsItem[] = [];
  media: MediaFile[] = [];
  selected: NewsItem | null = null;
  activeLang: Lang = 'sr';
  readonly pendingStatus = new Set<string>();
  readonly langs: Lang[] = ['sr', 'en', 'ru'];
  query: ListQuery = { page: 1, limit: 10, search: '', published: '', featured: '' };

  readonly form = this.fb.group({
    title_sr: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(180)]],
    title_en: [''],
    title_ru: [''],
    excerpt_sr: [''],
    excerpt_en: [''],
    excerpt_ru: [''],
    content_sr: ['', [Validators.required, Validators.minLength(10)]],
    content_en: [''],
    content_ru: [''],
    coverImage: [''],
    coverImageId: [''],
    published: [false],
    featured: [false]
  });

  ngOnInit(): void {
    this.load();
    this.loadMedia();
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.api.news(this.query).pipe(adminLoadGuard(), finalize(() => (this.loading = false))).subscribe({
      next: (response) => {
        this.items = rowsOf(response);
        this.total = totalOf(response);
      },
      error: () => {
        this.loadError = 'Vesti nisu ucitane.';
        this.toasts.error(this.loadError);
      }
    });
  }

  loadMedia(): void {
    this.api.media({ page: 1, limit: 12 }).pipe(adminLoadGuard()).subscribe((response) => (this.media = rowsOf(response)));
  }

  newItem(): void {
    this.selected = null;
    this.form.reset({ published: false, featured: false });
  }

  edit(item: NewsItem): void {
    this.selected = item;
    this.form.patchValue(item);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.activeLang = 'sr';
      return;
    }
    this.saving = true;
    this.error = '';
    const payload = this.cleanPayload(this.form.getRawValue()) as Partial<NewsItem>;
    const request = this.selected?.id ? this.api.updateNews(this.selected.id, payload) : this.api.createNews(payload);
    request.subscribe({
      next: () => {
        this.saving = false;
        this.toasts.success('Vest je sacuvana.');
        this.newItem();
        this.load();
      },
      error: () => {
        this.error = 'Cuvanje nije uspelo. Proveri obavezna polja i backend validaciju.';
        this.toasts.error(this.error);
        this.saving = false;
      }
    });
  }

  toggle(item: NewsItem, key: 'published' | 'featured'): void {
    const pendingKey = this.statusKey(item, key);
    if (this.pendingStatus.has(pendingKey)) {
      return;
    }

    this.pendingStatus.add(pendingKey);
    this.api.updateNews(item.id, { [key]: !item[key] }).subscribe({
      next: (updated) => {
        this.pendingStatus.delete(pendingKey);
        this.items = this.items.map((current) => current.id === updated.id ? updated : current);
        if (this.selected?.id === updated.id) {
          this.selected = updated;
          this.form.patchValue(updated);
        }
        this.toasts.success('Status vesti je izmenjen.');
      },
      error: () => {
        this.pendingStatus.delete(pendingKey);
        this.toasts.error('Status vesti nije izmenjen.');
      }
    });
  }

  isStatusPending(item: NewsItem, key: 'published' | 'featured'): boolean {
    return this.pendingStatus.has(this.statusKey(item, key));
  }

  remove(item: NewsItem): void {
    if (!confirm(`Obrisati vest "${item.title_sr}"?`)) {
      return;
    }
    this.api.deleteNews(item.id).subscribe({
      next: () => {
        this.toasts.success('Vest je obrisana.');
        if (this.selected?.id === item.id) {
          this.newItem();
        }
        this.load();
      },
      error: () => this.toasts.error('Brisanje vesti nije uspelo.')
    });
  }

  pickCover(file: MediaFile): void {
    this.form.patchValue({ coverImage: file.url, coverImageId: file.id });
  }

  clearCoverId(): void {
    this.form.patchValue({ coverImageId: '' }, { emitEvent: false });
  }

  page(delta: number): void {
    this.query.page = Math.max(1, (this.query.page ?? 1) + delta);
    this.load();
  }

  date(value?: string | null): string {
    return formatDate(value);
  }

  insertLink(controlName: 'content_sr' | 'content_en' | 'content_ru', textarea: HTMLTextAreaElement): void {
    const control = this.form.controls[controlName];
    const currentValue = control.value ?? '';
    const rawHref = window.prompt('Unesi URL linka');

    if (!rawHref) {
      return;
    }

    const href = rawHref.trim();
    if (!this.isAllowedEditorHref(href)) {
      this.error = 'Link mora poceti sa http://, https://, mailto: ili /.';
      this.toasts.error(this.error);
      return;
    }

    const selectionStart = textarea.selectionStart ?? currentValue.length;
    const selectionEnd = textarea.selectionEnd ?? selectionStart;
    const selectedText = currentValue.slice(selectionStart, selectionEnd).trim();
    const label = selectedText || href;
    const anchor = `<a href="${this.escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(label)}</a>`;
    const nextValue = `${currentValue.slice(0, selectionStart)}${anchor}${currentValue.slice(selectionEnd)}`;

    control.setValue(nextValue);
    control.markAsDirty();
    control.markAsTouched();
    window.setTimeout(() => textarea.focus());
  }

  private cleanPayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ) as Partial<T>;
  }

  private isAllowedEditorHref(href: string): boolean {
    const trimmed = href.trim();

    if (/[\u0000-\u001f\u007f\s]/.test(trimmed)) {
      return false;
    }

    return /^(https?:\/\/|mailto:)/i.test(trimmed) || (trimmed.startsWith('/') && !trimmed.startsWith('//'));
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value).replace(/`/g, '&#096;');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private statusKey(item: NewsItem, key: 'published' | 'featured'): string {
    return `${item.id}:${key}`;
  }
}
