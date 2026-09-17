import { isRetiredSponsorCategory, sponsorCategoryLabel } from '../../../data/sponsor-category-labels';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import { ListQuery, MediaFile, SponsorCategory, SponsorItem } from '../../../core/api/admin-api.models';
import { adminLoadGuard, rowsOf, totalOf } from '../../shared/admin-ui';
import { ToastService } from '../../shared/toast.service';

@Component({
  selector: 'app-sponsors-admin',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  template: `
    <section class="admin-page">
      <div class="admin-page-head">
        <div>
          <span class="admin-kicker">Partners CMS</span>
          <h1>Партнери</h1>
        </div>
        <button class="admin-button primary" type="button" (click)="newSponsor()">Нови партнер</button>
      </div>

      <div class="lang-tabs admin-section-tabs">
        <button type="button" [class.is-active]="activePanel === 'sponsors'" (click)="activePanel = 'sponsors'">Партнери</button>
        <button type="button" [class.is-active]="activePanel === 'categories'" (click)="activePanel = 'categories'">Kategorije</button>
      </div>

      @if (activePanel === 'categories') {
        <section class="admin-card sponsor-category-panel">
          <div class="card-head">
            <h2>Kategorije</h2>
            <div class="row-actions compact">
              @if (selectedCategory) {
                <button type="button" class="danger" (click)="removeCategory()">Delete</button>
              }
              <button type="button" (click)="newCategory()">Nova</button>
            </div>
          </div>
          <form [formGroup]="categoryForm" (ngSubmit)="saveCategory()" class="compact-form">
            <input placeholder="Naziv SR" formControlName="name_sr" />
            <input placeholder="Naziv EN" formControlName="name_en" />
            <input placeholder="Naziv RU" formControlName="name_ru" />
            <input type="number" min="0" placeholder="Order" formControlName="order" />
            <label><input type="checkbox" formControlName="active" /> Active</label>
            <button class="admin-button primary" type="submit" [disabled]="categoryForm.invalid">Sacuvaj</button>
          </form>
          <div class="category-list">
            @for (cat of categories; track cat.id) {
              <button type="button" (click)="editCategory(cat)" [class.is-selected]="cat.id === selectedCategory?.id">
                <b>{{ categoryLabel(cat) }}</b><small>order {{ cat.order }} · {{ cat.active ? 'active' : 'hidden' }}</small>
              </button>
            }
            @if (!categoriesLoading && !categories.length && !categoriesError) {
              <div class="empty-state">Нема категорија партнера.</div>
            }
          </div>
          @if (categoriesLoading) {
            <div class="skeleton-lines"></div>
          }
          @if (categoriesError) {
            <div class="empty-state">
              <b>{{ categoriesError }}</b>
              <button class="admin-button ghost" type="button" (click)="loadCategories()">Покушај поново</button>
            </div>
          }
        </section>

      } @else {
        <section class="admin-card">
          <div class="card-head"><h2>Партнери</h2><span>{{ total }} ukupno</span></div>
          <div class="toolbar compact">
            <input type="search" placeholder="Pretraga..." [(ngModel)]="query.search" (keyup.enter)="loadSponsors()" />
            <select [(ngModel)]="query.categoryId" (change)="loadSponsors()">
              <option value="">Sve kategorije</option>
              @for (cat of categories; track cat.id) {
                <option [value]="cat.id">{{ categoryLabel(cat) }}</option>
              }
            </select>
          </div>
          @if (sponsorsLoading) {
            <div class="skeleton-lines"></div>
          } @else if (sponsorsError) {
            <div class="empty-state">
              <b>{{ sponsorsError }}</b>
              <button class="admin-button ghost" type="button" (click)="loadSponsors()">Покушај поново</button>
            </div>
          } @else if (!sponsors.length) {
            <div class="empty-state">Нема партнера за изабране услове.</div>
          }
          <div class="sponsor-list">
            @for (sponsor of sponsors; track sponsor.id) {
              <button type="button" (click)="editSponsor(sponsor)" [class.is-selected]="sponsor.id === selectedSponsor?.id">
                <img [src]="sponsor.logoUrl || '/images/logo-kmf-crvena-zvezda.png'" [alt]="sponsor.name" />
                <span><b>{{ sponsor.name }}</b><small>{{ sponsor.category ? categoryLabel(sponsor.category) : 'Без категорије' }} · order {{ sponsor.order }}</small></span>
                <i [class.good]="sponsor.active" [class.warn]="!sponsor.active">{{ sponsor.featured ? 'Featured' : 'Standard' }}</i>
              </button>
            }
          </div>
          <footer class="pagination">
            <button type="button" [disabled]="query.page === 1" (click)="page(-1)">Prethodna</button>
            <b>{{ query.page }}</b>
            <button type="button" [disabled]="sponsors.length < query.limit!" (click)="page(1)">Sledeca</button>
          </footer>
        </section>
      }

      <section class="admin-card editor-card wide">
        <div class="card-head">
          <h2>{{ selectedSponsor?.id ? 'Измена партнера' : 'Нови партнер' }}</h2>
          <div class="row-actions compact">
            @if (selectedSponsor) {
              <button type="button" class="danger" (click)="removeSponsor()">Delete</button>
            }
            <button class="admin-button ghost" type="button" (click)="loadMedia()">Logo picker</button>
          </div>
        </div>
        <form [formGroup]="sponsorForm" (ngSubmit)="saveSponsor()" class="admin-form">
          <div class="form-grid two-cols">
            <label>Naziv <input formControlName="name" /></label>
            <label>Website <input formControlName="websiteUrl" placeholder="https://..." /></label>
          </div>
          <div class="form-grid two-cols">
            <label>Kategorija
              <select formControlName="categoryId">
                <option value="">Bez kategorije</option>
                @for (cat of assignableCategories; track cat.id) { <option [value]="cat.id">{{ categoryLabel(cat) }}</option> }
              </select>
            </label>
            <label>Order <input type="number" min="0" formControlName="order" /></label>
          </div>
          <div class="form-grid three-cols">
            <label>Opis SR <textarea rows="4" formControlName="description_sr"></textarea></label>
            <label>Opis EN <textarea rows="4" formControlName="description_en"></textarea></label>
            <label>Opis RU <textarea rows="4" formControlName="description_ru"></textarea></label>
          </div>
          <label>Logo URL <input formControlName="logoUrl" (input)="clearLogoId()" /></label>
          @if (media.length) {
            <div class="media-picker-row">
              @for (file of media; track file.id) {
                <button type="button" (click)="pickLogo(file)" [class.is-selected]="file.id === sponsorForm.controls.logoId.value">
                  <img [src]="file.url" [alt]="file.originalName" />
                </button>
              }
            </div>
          }
          <div class="switch-row">
            <label><input type="checkbox" formControlName="active" /> Active</label>
            <label><input type="checkbox" formControlName="featured" /> Featured</label>
            <span>Drag ordering arhitektura: svaki entitet vec cuva order, UI je spreman za reorder endpoint.</span>
          </div>
          @if (error) { <div class="admin-error">{{ error }}</div> }
          <button class="admin-button primary full" type="submit" [disabled]="sponsorForm.invalid || saving">{{ saving ? 'Cuvanje...' : 'Сачувај партнера' }}</button>
        </form>
      </section>
    </section>
  `
})
export class SponsorsAdminComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(ToastService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly categoryLabel = sponsorCategoryLabel;
  get assignableCategories() {
    return this.categories.filter(category => !isRetiredSponsorCategory(category) || category.id === this.selectedSponsor?.categoryId);
  }

  saving = false;
  sponsorsLoading = true;
  categoriesLoading = true;
  error = '';
  sponsorsError = '';
  categoriesError = '';
  total = 0;
  activePanel: 'sponsors' | 'categories' = 'sponsors';
  categories: SponsorCategory[] = [];
  sponsors: SponsorItem[] = [];
  media: MediaFile[] = [];
  selectedCategory: SponsorCategory | null = null;
  selectedSponsor: SponsorItem | null = null;
  query: ListQuery = { page: 1, limit: 50, search: '', categoryId: '' };

  readonly categoryForm = this.fb.group({
    name_sr: ['', [Validators.required, Validators.minLength(2)]],
    name_en: [''],
    name_ru: [''],
    description_sr: [''],
    description_en: [''],
    description_ru: [''],
    order: [0],
    active: [true]
  });

  readonly sponsorForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    websiteUrl: ['', [Validators.pattern(/^$|^https?:\/\/.+/)]],
    logoUrl: [''],
    logoId: [''],
    categoryId: [''],
    description_sr: [''],
    description_en: [''],
    description_ru: [''],
    featured: [false],
    active: [true],
    order: [0]
  });

  ngOnInit(): void {
    this.loadCategories();
    this.loadSponsors();
    this.loadMedia();
  }

  loadCategories(): void {
    this.categoriesLoading = true;
    this.categoriesError = '';
    this.api.sponsorCategories({ page: 1, limit: 100 }).pipe(adminLoadGuard(), finalize(() => this.changeDetector.markForCheck())).subscribe({
      next: (response) => {
        this.categories = rowsOf(response);
        this.categoriesLoading = false;
      },
      error: () => {
        this.categoriesError = 'Kategorije nisu ucitane.';
        this.toasts.error(this.categoriesError);
        this.categoriesLoading = false;
      }
    });
  }

  loadSponsors(): void {
    this.sponsorsLoading = true;
    this.sponsorsError = '';
    this.api.sponsors(this.query).pipe(adminLoadGuard(), finalize(() => this.changeDetector.markForCheck())).subscribe({
      next: (response) => {
        this.sponsors = rowsOf(response);
        this.total = totalOf(response);
        this.sponsorsLoading = false;
      },
      error: () => {
        this.sponsorsError = 'Партнери нису учитани.';
        this.toasts.error(this.sponsorsError);
        this.sponsorsLoading = false;
      }
    });
  }

  loadMedia(): void {
    this.api.media({ page: 1, limit: 12 }).pipe(adminLoadGuard(), finalize(() => this.changeDetector.markForCheck())).subscribe({
      next: (response) => (this.media = rowsOf(response)),
      error: () => this.toasts.error('Media fajlovi nisu ucitani.')
    });
  }

  newCategory(): void {
    this.selectedCategory = null;
    this.categoryForm.reset({ active: true, order: 0 });
  }

  editCategory(category: SponsorCategory): void {
    this.selectedCategory = category;
    this.categoryForm.patchValue({ ...category, name_sr: sponsorCategoryLabel(category, 'sr'), name_en: sponsorCategoryLabel(category, 'en'), name_ru: sponsorCategoryLabel(category, 'ru') });
  }

  saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      this.error = 'Naziv SR kategorije je obavezan.';
      return;
    }
    this.error = '';
    const payload = this.cleanPayload(this.categoryForm.getRawValue()) as Partial<SponsorCategory>;
    // Display aliases must not rename stored categories when unrelated fields are saved.
    if (this.selectedCategory) {
      for (const lang of ['sr', 'en', 'ru'] as const) {
        const field = `name_${lang}` as const;
        if (payload[field] === sponsorCategoryLabel(this.selectedCategory, lang)) delete payload[field];
      }
    }
    this.api.saveSponsorCategory(payload, this.selectedCategory?.id).subscribe({
      next: () => {
        this.newCategory();
        this.toasts.success('Kategorija je sacuvana.');
        this.loadCategories();
      },
      error: () => {
        this.error = 'Kategorija nije sacuvana.';
        this.toasts.error(this.error);
      }
    });
  }

  removeCategory(): void {
    if (!this.selectedCategory || !confirm(`Obrisati kategoriju "${this.categoryLabel(this.selectedCategory)}"?`)) {
      return;
    }
    this.api.deleteSponsorCategory(this.selectedCategory.id).subscribe({
      next: () => {
        this.toasts.success('Kategorija je obrisana.');
        this.newCategory();
        this.loadCategories();
        this.loadSponsors();
      },
      error: () => this.toasts.error('Brisanje kategorije nije uspelo.')
    });
  }

  newSponsor(): void {
    this.selectedSponsor = null;
    this.sponsorForm.reset({ active: true, featured: false, order: 0 });
  }

  editSponsor(sponsor: SponsorItem): void {
    this.selectedSponsor = sponsor;
    this.sponsorForm.patchValue(sponsor);
  }

  saveSponsor(): void {
    if (this.sponsorForm.invalid) {
      this.sponsorForm.markAllAsTouched();
      this.error = 'Назив партнера је обавезан, а веб-адреса мора имати пун URL са протоколом.';
      return;
    }
    this.saving = true;
    this.error = '';
    this.api.saveSponsor(this.cleanPayload(this.sponsorForm.getRawValue()) as Partial<SponsorItem>, this.selectedSponsor?.id).subscribe({
      next: () => {
        this.saving = false;
        this.toasts.success('Партнер је сачуван.');
        this.newSponsor();
        this.loadSponsors();
      },
      error: () => {
        this.error = 'Партнер није сачуван.';
        this.toasts.error(this.error);
        this.saving = false;
      }
    });
  }

  removeSponsor(): void {
    if (!this.selectedSponsor || !confirm(`Обрисати партнера "${this.selectedSponsor.name}"?`)) {
      return;
    }
    this.api.deleteSponsor(this.selectedSponsor.id).subscribe({
      next: () => {
        this.toasts.success('Партнер је обрисан.');
        this.newSponsor();
        this.loadSponsors();
      },
      error: () => this.toasts.error('Брисање партнера није успело.')
    });
  }

  pickLogo(file: MediaFile): void {
    this.sponsorForm.patchValue({ logoUrl: file.url, logoId: file.id });
  }

  clearLogoId(): void {
    this.sponsorForm.patchValue({ logoId: '' }, { emitEvent: false });
  }

  page(delta: number): void {
    this.query.page = Math.max(1, (this.query.page ?? 1) + delta);
    this.loadSponsors();
  }

  private cleanPayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ) as Partial<T>;
  }
}
