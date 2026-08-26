import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { AdminApiService } from '../../../core/api/admin-api.service';
import {
  ListQuery,
  ManagementItem,
  MediaFile,
  PageResponse,
  PlayerItem,
  StaffAdminItem
} from '../../../core/api/admin-api.models';
import { adminLoadGuard, rowsOf, totalOf } from '../../shared/admin-ui';
import { ToastService } from '../../shared/toast.service';

type Collection = 'firstTeam' | 'u19' | 'management' | 'board' | 'staff';
type PeopleItem = PlayerItem | ManagementItem | StaffAdminItem;
type PeoplePageResponse = PageResponse<PlayerItem> | PageResponse<ManagementItem> | PageResponse<StaffAdminItem>;

@Component({
  selector: 'app-people-admin',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  template: `
    <section class="admin-page">
      <div class="admin-page-head">
        <div>
          <span class="admin-kicker">{{ modeTitle }} CMS</span>
          <h1>{{ pageTitle }}</h1>
        </div>
        <button class="admin-button primary" type="button" (click)="newItem()">Novi unos</button>
      </div>

      @if (mode !== 'staff') {
        <div class="lang-tabs collection-tabs">
          @for (tab of tabs; track tab.key) {
            <button type="button" [class.is-active]="collection === tab.key" (click)="setCollection(tab.key)">{{ tab.label }}</button>
          }
        </div>
      }

      <div class="toolbar">
        <input type="search" placeholder="Pretraga..." [(ngModel)]="query.search" (keyup.enter)="load()" />
        @if (mode === 'staff') {
          <select [(ngModel)]="query.teamType" (change)="load()">
            <option value="">Svi timovi</option>
            <option value="FIRST_TEAM">Први тим</option>
            <option value="U19_TEAM">У19 тим</option>
          </select>
        }
        <select [(ngModel)]="query.active" (change)="load()">
          <option value="">Svi</option>
          <option [ngValue]="true">Aktivni</option>
          <option [ngValue]="false">Neaktivni</option>
        </select>
        <button class="admin-button ghost" type="button" (click)="load()">Filtriraj</button>
      </div>

      <div class="admin-split">
        <section class="admin-card">
          @if (loading) {
            <div class="skeleton-lines"></div>
          } @else if (loadError) {
            <div class="empty-state">
              <b>{{ loadError }}</b>
              <button class="admin-button ghost" type="button" (click)="load()">Покушај поново</button>
            </div>
          } @else if (!items.length) {
            <div class="empty-state">Nema unosa.</div>
          } @else {
            <div class="people-grid">
              @for (item of items; track item.id) {
                <button class="person-admin-card" type="button" [class.is-selected]="item.id === selected?.id" (click)="edit(item)">
                  <img [src]="imageOf(item)" [alt]="nameOf(item)" loading="lazy" />
                  <span>
                    <b>{{ nameOf(item) }}</b>
                    <small>{{ subtitleOf(item) }} · order {{ item.order }}</small>
                  </span>
                  <i [class.good]="item.active" [class.warn]="!item.active">{{ item.active ? 'Active' : 'Hidden' }}</i>
                </button>
              }
            </div>
          }
          <footer class="pagination">
            <span>{{ total }} unosa</span>
            <button type="button" [disabled]="query.page === 1" (click)="page(-1)">Prethodna</button>
            <b>{{ query.page }}</b>
            <button type="button" [disabled]="items.length < query.limit!" (click)="page(1)">Sledeca</button>
          </footer>
        </section>

        <section class="admin-card editor-card">
          <div class="card-head">
            <h2>{{ selected?.id ? 'Izmena' : 'Novi unos' }}</h2>
            <div class="row-actions compact">
              @if (selected) {
                <button type="button" class="danger" (click)="remove()">Delete</button>
              }
              <button class="admin-button ghost" type="button" (click)="loadMedia()">Media</button>
            </div>
          </div>

          <form [formGroup]="form" (ngSubmit)="save()" class="admin-form">
            @if (isPlayerCollection) {
              <div class="form-grid two-cols">
                <label>Ime <input formControlName="firstName" /></label>
                <label>Prezime <input formControlName="lastName" /></label>
              </div>
              <div class="form-grid two-cols">
                <label>Pozicija <input formControlName="position" /></label>
                <label>Broj <input type="number" min="0" max="99" formControlName="shirtNumber" /></label>
              </div>
            } @else {
              <label>Ime i prezime <input formControlName="fullName" /></label>
              @if (mode === 'staff') {
                <label>Тим
                  <select formControlName="teamType">
                    <option value="FIRST_TEAM">Први тим</option>
                    <option value="U19_TEAM">У19 тим</option>
                  </select>
                </label>
              }
              <div class="lang-tabs">
                @for (lang of langs; track lang) {
                  <button type="button" [class.is-active]="activeLang === lang" (click)="activeLang = lang">{{ lang.toUpperCase() }}</button>
                }
              </div>
              @if (activeLang === 'sr') { <label>Uloga SR <input formControlName="role_sr" /></label> }
              @if (activeLang === 'en') { <label>Role EN <input formControlName="role_en" /></label> }
              @if (activeLang === 'ru') { <label>Role RU <input formControlName="role_ru" /></label> }
            }

            <div class="lang-tabs">
              @for (lang of langs; track lang) {
                <button type="button" [class.is-active]="activeLang === lang" (click)="activeLang = lang">{{ lang.toUpperCase() }} bio</button>
              }
            </div>
            @if (activeLang === 'sr') { <label>Bio SR <textarea rows="5" formControlName="bio_sr"></textarea></label> }
            @if (activeLang === 'en') { <label>Bio EN <textarea rows="5" formControlName="bio_en"></textarea></label> }
            @if (activeLang === 'ru') { <label>Bio RU <textarea rows="5" formControlName="bio_ru"></textarea></label> }

            <div class="form-grid two-cols">
              <label>Order <input type="number" min="0" formControlName="order" /></label>
              <label>Image URL <input formControlName="imageUrl" (input)="clearImageId()" /></label>
            </div>
            @if (mode === 'staff' && (form.controls.imageUrl.value || form.controls.imageId.value)) {
              <button class="admin-button ghost" type="button" (click)="removeImage()">Ukloni sliku</button>
            }
            @if (media.length) {
              <div class="media-picker-row">
                @for (file of media; track file.id) {
                  <button type="button" (click)="pickImage(file)" [class.is-selected]="file.id === form.controls.imageId.value">
                    <img [src]="file.url" [alt]="file.originalName" />
                  </button>
                }
              </div>
            }
            <div class="switch-row">
              <label><input type="checkbox" formControlName="active" /> Active</label>
              <span>Ordering je spreman za drag/drop update kada backend dobije batch reorder endpoint.</span>
            </div>
            @if (error) {
              <div class="admin-error">{{ error }}</div>
            }
            @if (form.invalid && form.touched) {
              <div class="admin-error">{{ isPlayerCollection ? 'Ime i prezime su obavezni.' : 'Ime i prezime i uloga SR su obavezni.' }}</div>
            }
            <button class="admin-button primary full" type="submit" [disabled]="form.invalid || saving">{{ saving ? 'Cuvanje...' : 'Sacuvaj' }}</button>
          </form>
        </section>
      </div>
    </section>
  `
})
export class PeopleAdminComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  mode: 'players' | 'management' | 'staff' = 'players';
  collection: Collection = 'firstTeam';
  loading = true;
  saving = false;
  error = '';
  loadError = '';
  total = 0;
  items: PeopleItem[] = [];
  media: MediaFile[] = [];
  selected: PeopleItem | null = null;
  activeLang: 'sr' | 'en' | 'ru' = 'sr';
  readonly langs = ['sr', 'en', 'ru'] as const;
  query: ListQuery = { page: 1, limit: 20, search: '', active: '' };

  readonly form = this.fb.group({
    firstName: [''],
    lastName: [''],
    fullName: [''],
    position: [''],
    shirtNumber: [null as number | null],
    role_sr: [''],
    role_en: [''],
    role_ru: [''],
    bio_sr: [''],
    bio_en: [''],
    bio_ru: [''],
    imageUrl: [''],
    imageId: [''],
    teamType: ['FIRST_TEAM' as 'FIRST_TEAM' | 'U19_TEAM'],
    active: [true],
    order: [0, [Validators.min(0)]]
  });

  get modeTitle(): string {
    if (this.mode === 'players') {
      return 'Players';
    }

    return this.mode === 'staff' ? 'Стручни штаб' : 'Management';
  }

  get pageTitle(): string {
    if (this.mode === 'players') {
      return 'Igraci';
    }

    return this.mode === 'staff' ? 'Стручни штаб' : 'Uprava i odbor';
  }

  get tabs() {
    return this.mode === 'players'
      ? [{ key: 'firstTeam' as Collection, label: 'Prvi tim' }, { key: 'u19' as Collection, label: 'U19' }]
      : [{ key: 'management' as Collection, label: 'Uprava' }, { key: 'board' as Collection, label: 'Upravni odbor' }];
  }

  get isPlayerCollection(): boolean {
    return this.collection === 'firstTeam' || this.collection === 'u19';
  }

  ngOnInit(): void {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.mode = data['section'] === 'management' ? 'management' : data['section'] === 'staff' ? 'staff' : 'players';
      this.collection = data['collection'] ?? (this.mode === 'players' ? 'firstTeam' : this.mode === 'staff' ? 'staff' : 'management');
      this.query = { page: 1, limit: 20, search: '', active: '' };
      this.newItem();
      this.load();
    });
    this.loadMedia();
  }

  setCollection(collection: Collection): void {
    this.collection = collection;
    this.query.page = 1;
    this.newItem();
    this.load();
  }

  load(): void {
    this.loading = true;
    this.loadError = '';
    this.listRequest().pipe(adminLoadGuard()).subscribe({
      next: (response) => {
        const typedResponse = response as PageResponse<PeopleItem>;
        this.items = rowsOf(typedResponse);
        this.total = totalOf(typedResponse);
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Podaci nisu ucitani.';
        this.toasts.error(this.loadError);
        this.loading = false;
      }
    });
  }

  loadMedia(): void {
    this.api.media({ page: 1, limit: 12 }).pipe(adminLoadGuard()).subscribe((response) => (this.media = rowsOf(response)));
  }

  newItem(): void {
    this.selected = null;
    this.form.reset({ active: true, order: 0, teamType: 'FIRST_TEAM' });
  }

  edit(item: PeopleItem): void {
    this.selected = item;
    this.form.patchValue(item as Partial<typeof this.form.value>);
  }

  save(): void {
    if (!this.validateCurrentForm()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.error = '';
    const raw = this.form.getRawValue();
    this.saveRequest(raw, this.selected?.id).subscribe({
      next: () => {
        this.saving = false;
        this.toasts.success('Unos je sacuvan.');
        this.newItem();
        this.load();
      },
      error: () => {
        this.error = 'Cuvanje nije uspelo.';
        this.toasts.error(this.error);
        this.saving = false;
      }
    });
  }

  remove(): void {
    if (!this.selected || !confirm(`Obrisati unos "${this.nameOf(this.selected)}"?`)) {
      return;
    }
    const id = this.selected.id;
    const request = this.mode === 'staff'
      ? this.api.deleteStaff(id)
      : this.isPlayerCollection
        ? this.api.deletePlayer(this.collection as 'firstTeam' | 'u19', id)
        : this.api.deleteManagement(this.collection as 'management' | 'board', id);
    request.subscribe({
      next: () => {
        this.toasts.success('Unos je obrisan.');
        this.newItem();
        this.load();
      },
      error: () => this.toasts.error('Brisanje nije uspelo.')
    });
  }

  pickImage(file: MediaFile): void {
    this.form.patchValue({ imageUrl: file.url, imageId: file.id });
  }

  clearImageId(): void {
    this.form.patchValue({ imageId: '' }, { emitEvent: false });
  }

  removeImage(): void {
    this.form.patchValue({ imageUrl: '', imageId: null });
  }

  imageOf(item: PeopleItem): string {
    return item.imageUrl || '/images/logo-kmf-crvena-zvezda.png';
  }

  nameOf(item: PeopleItem): string {
    return this.isPlayerItem(item) ? `${item.firstName} ${item.lastName}` : item.fullName;
  }

  subtitleOf(item: PeopleItem): string {
    const teamLabel = this.isStaffItem(item)
      ? item.teamType === 'FIRST_TEAM'
        ? 'Први тим'
        : 'У19 тим'
      : '';
    const subtitle = this.isPlayerItem(item) ? item.position || 'Igrac' : item.role_sr;
    return teamLabel ? `${subtitle} · ${teamLabel}` : subtitle;
  }

  page(delta: number): void {
    this.query.page = Math.max(1, (this.query.page ?? 1) + delta);
    this.load();
  }

  private playerPayload(raw: typeof this.form.value): Partial<PlayerItem> {
    return this.cleanPayload({
      firstName: raw.firstName,
      lastName: raw.lastName,
      position: raw.position,
      shirtNumber: raw.shirtNumber,
      bio_sr: raw.bio_sr,
      bio_en: raw.bio_en,
      bio_ru: raw.bio_ru,
      imageId: raw.imageId,
      imageUrl: raw.imageUrl,
      active: raw.active,
      order: raw.order
    }) as Partial<PlayerItem>;
  }

  private listRequest(): Observable<PeoplePageResponse> {
    if (this.mode === 'staff') {
      return this.api.staff(this.query);
    }

    if (this.isPlayerCollection) {
      return this.api.players(this.collection as 'firstTeam' | 'u19', this.query);
    }

    return this.api.management(this.collection as 'management' | 'board', this.query);
  }

  private saveRequest(raw: typeof this.form.value, id?: string): Observable<PeopleItem> {
    if (this.mode === 'staff') {
      return this.api.saveStaff(this.staffPayload(raw), id);
    }

    if (this.isPlayerCollection) {
      return this.api.savePlayer(this.collection as 'firstTeam' | 'u19', this.playerPayload(raw), id);
    }

    return this.api.saveManagement(this.collection as 'management' | 'board', this.managementPayload(raw), id);
  }

  private isPlayerItem(item: PeopleItem): item is PlayerItem {
    return 'firstName' in item;
  }

  private isStaffItem(item: PeopleItem): item is StaffAdminItem {
    return 'teamType' in item;
  }

  private validateCurrentForm(): boolean {
    const raw = this.form.getRawValue();
    const hasPlayerName = Boolean(raw.firstName?.trim() && raw.lastName?.trim());
    const hasManagementFields = Boolean(raw.fullName?.trim() && raw.role_sr?.trim());
    const hasStaffTeam = raw.teamType === 'FIRST_TEAM' || raw.teamType === 'U19_TEAM';

    if (this.isPlayerCollection && !hasPlayerName) {
      this.error = 'Ime i prezime su obavezni.';
      return false;
    }

    if (!this.isPlayerCollection && (!hasManagementFields || (this.mode === 'staff' && !hasStaffTeam))) {
      this.error = this.mode === 'staff'
        ? 'Ime i prezime, uloga SR i tim su obavezni.'
        : 'Ime i prezime i uloga SR su obavezni.';
      return false;
    }

    if (this.form.invalid) {
      this.error = 'Proveri numericka polja i validaciju forme.';
      return false;
    }

    return true;
  }

  private managementPayload(raw: typeof this.form.value): Partial<ManagementItem> {
    return this.cleanPayload({
      fullName: raw.fullName,
      role_sr: raw.role_sr,
      role_en: raw.role_en,
      role_ru: raw.role_ru,
      bio_sr: raw.bio_sr,
      bio_en: raw.bio_en,
      bio_ru: raw.bio_ru,
      imageId: raw.imageId,
      imageUrl: raw.imageUrl,
      active: raw.active,
      order: raw.order
    }) as Partial<ManagementItem>;
  }

  private staffPayload(raw: typeof this.form.value): Partial<StaffAdminItem> {
    const payload = this.cleanPayload({
      fullName: raw.fullName,
      role_sr: raw.role_sr,
      role_en: raw.role_en,
      role_ru: raw.role_ru,
      bio_sr: raw.bio_sr,
      bio_en: raw.bio_en,
      bio_ru: raw.bio_ru,
      imageId: raw.imageId,
      imageUrl: raw.imageUrl,
      teamType: raw.teamType,
      active: raw.active,
      order: raw.order
    }) as Partial<StaffAdminItem>;

    if (raw.imageId === null) {
      payload.imageId = null;
    }

    return payload;
  }

  private cleanPayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ) as Partial<T>;
  }
}
