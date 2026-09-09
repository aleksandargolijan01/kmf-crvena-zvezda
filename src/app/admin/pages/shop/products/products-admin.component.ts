import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AdminShopApiService } from '../../../../core/api/admin-shop-api.service';
import { AdminProduct, ProductAvailability, ProductImage, ProductQuery, ProductVariant, ProductWrite, availabilityLabels } from '../../../../core/api/shop-api.models';
import { MediaFile } from '../../../../core/api/admin-api.models';
import { formatRsd, minorToInput, parseRsd } from '../../../../core/shop/money';
import { adminLoadGuard, rowsOf, totalOf } from '../../../shared/admin-ui';
import { ToastService } from '../../../shared/toast.service';
import { MediaPickerComponent } from '../../../shared/media-picker/media-picker.component';

@Component({
  standalone: true, imports: [FormsModule, ReactiveFormsModule, MediaPickerComponent],
  templateUrl: './products-admin.component.html',
  styleUrl: './products-admin.component.scss'
})
export class ProductsAdminComponent implements OnInit {
  private readonly api = inject(AdminShopApiService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toasts = inject(ToastService);
  readonly labels = availabilityLabels;
  readonly availabilityOptions = Object.keys(availabilityLabels) as ProductAvailability[];
  readonly money = formatRsd;
  items: AdminProduct[] = [];
  total = 0;
  totalPages = 1;
  query: ProductQuery = { page: 1, limit: 10, search: '', order: 'asc' };
  filter = 'all';
  loading = false;
  saving = false;
  detailLoading = false;
  loadError = '';
  error = '';
  selected: AdminProduct | null = null;
  gallery: ProductImage[] = [];
  cover: AdminProduct['coverImage'] = null;
  pickerMode: 'cover' | 'gallery' | null = null;
  readonly form = this.fb.nonNullable.group({
    nameSr: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(180)]],
    nameEn: ['', Validators.maxLength(180)], nameRu: ['', Validators.maxLength(180)],
    descriptionSr: ['', [Validators.required, Validators.maxLength(20000)]],
    descriptionEn: ['', Validators.maxLength(20000)], descriptionRu: ['', Validators.maxLength(20000)],
    slug: ['', [Validators.maxLength(180), Validators.pattern(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    price: ['', Validators.required], compareAtPrice: [''], active: [false], featured: [false],
    displayOrder: [0, [Validators.min(0), Validators.max(2147483647), Validators.pattern(/^\d+$/)]],
    featuredOrder: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(2147483647), Validators.pattern(/^\d+$/)]),
    availability: ['AVAILABLE' as ProductAvailability], newUntil: [''],
    variants: this.fb.array<ReturnType<ProductsAdminComponent['variantForm']>>([])
  });
  get variants() { return this.form.controls.variants; }
  get busy() { return this.saving || this.detailLoading; }
  get pickerSelection() { return this.pickerMode === 'cover' ? (this.cover ? [this.cover.id] : []) : this.gallery.map((image) => image.mediaFileId); }

  ngOnInit() { this.load(); }

  load(reset = false) {
    if (this.loading) return;
    if (reset) this.query.page = 1;
    this.query.active = this.filter === 'active' ? true : this.filter === 'inactive' ? false : undefined;
    this.query.featured = this.filter === 'featured' ? true : undefined;
    this.query.availability = this.filter === 'soldOut' ? 'SOLD_OUT' : undefined;
    this.loading = true;
    this.loadError = '';
    this.api.list(this.query).pipe(adminLoadGuard(), takeUntilDestroyed(this.destroyRef), finalize(() => { this.loading = false; this.changeDetector.markForCheck(); })).subscribe({
      next: (response) => { this.items = rowsOf(response); this.total = totalOf(response); this.totalPages = Math.max(1, response.meta?.totalPages ?? 1); },
      error: () => this.loadError = 'Производи нису учитани. Покушајте поново.'
    });
  }

  page(delta: number) { this.query.page += delta; this.load(); }

  newProduct() {
    if (this.busy || !this.allowDiscard()) return;
    this.selected = null;
    this.cover = null;
    this.gallery = [];
    this.pickerMode = null;
    this.error = '';
    this.variants.clear();
    this.form.reset();
  }

  edit(item: AdminProduct) {
    if (this.busy || !this.allowDiscard()) return;
    this.detailLoading = true;
    this.error = '';
    this.api.detail(item.id).pipe(adminLoadGuard(), takeUntilDestroyed(this.destroyRef), finalize(() => { this.detailLoading = false; this.changeDetector.markForCheck(); })).subscribe({
      next: (product) => this.applyProduct(product),
      error: () => { this.error = 'Детаљи производа нису учитани. Покушајте поново.'; this.toasts.error(this.error); }
    });
  }

  private applyProduct(product: AdminProduct) {
    this.selected = product;
    this.cover = product.coverImage;
    this.gallery = product.gallery.map((image) => ({ ...image }));
    this.pickerMode = null;
    this.variants.clear();
    product.variants.forEach((variant) => this.variants.push(this.variantForm(variant)));
    this.form.reset({
      nameSr: product.nameSr, nameEn: product.nameEn ?? '', nameRu: product.nameRu ?? '',
      descriptionSr: product.descriptionSr, descriptionEn: product.descriptionEn ?? '', descriptionRu: product.descriptionRu ?? '',
      slug: product.slug, price: minorToInput(product.priceMinor),
      compareAtPrice: product.compareAtPriceMinor === null ? '' : minorToInput(product.compareAtPriceMinor),
      active: product.active, featured: product.featured, displayOrder: product.displayOrder,
      featuredOrder: product.featuredOrder, availability: product.availability,
      newUntil: product.newUntil ? this.localDateTime(product.newUntil) : '',
      variants: product.variants.map((variant) => ({
        id: variant.id ?? '', size: variant.size, sku: variant.sku ?? '',
        active: variant.active, available: variant.available, stockQuantity: variant.stockQuantity ?? null
      }))
    });
  }

  variantForm(variant?: ProductVariant) {
    return this.fb.nonNullable.group({
      id: [variant?.id ?? ''], size: [variant?.size ?? '', [Validators.required, Validators.maxLength(40)]],
      sku: [variant?.sku ?? '', Validators.maxLength(100)], active: [variant?.active ?? true],
      available: [variant?.available ?? true], stockQuantity: this.fb.control<number | null>(variant?.stockQuantity ?? null)
    });
  }

  addVariant() { this.variants.push(this.variantForm()); this.form.markAsDirty(); }
  removeVariant(index: number) { this.variants.removeAt(index); this.form.markAsDirty(); }
  moveVariant(index: number, delta: number) {
    const control = this.variants.at(index);
    this.variants.removeAt(index);
    this.variants.insert(index + delta, control);
    this.form.markAsDirty();
  }
  pick(file: MediaFile) {
    if (this.pickerMode === 'cover') { this.cover = file; this.pickerMode = null; }
    else if (!this.gallery.some((image) => image.mediaFileId === file.id)) {
      if (this.gallery.length >= 50) { this.error = 'Галерија може да има највише 50 фотографија.'; return; }
      this.gallery.push({ mediaFileId: file.id, displayOrder: this.gallery.length, mediaFile: file, altSr: file.altText ?? '' });
    }
    this.form.markAsDirty();
  }
  removeCover() { this.cover = null; this.form.markAsDirty(); }
  removeImage(index: number) { this.gallery.splice(index, 1); this.form.markAsDirty(); }
  moveImage(index: number, delta: number) {
    const [image] = this.gallery.splice(index, 1);
    this.gallery.splice(index + delta, 0, image);
    this.form.markAsDirty();
  }

  save() {
    if (this.busy) return;
    this.form.markAllAsTouched();
    this.error = '';
    const value = this.form.getRawValue();
    const priceMinor = parseRsd(value.price);
    const compareAtPriceMinor = value.compareAtPrice.trim() ? parseRsd(value.compareAtPrice) : null;
    if (priceMinor === null || (value.compareAtPrice.trim() && compareAtPriceMinor === null)) {
      this.error = 'Унесите исправну цену без раздвајања хиљада, на пример 3200,00.'; return;
    }
    if (compareAtPriceMinor !== null && compareAtPriceMinor <= priceMinor) {
      this.error = 'Претходна цена мора бити већа од тренутне.'; return;
    }
    if (this.form.invalid || !value.nameSr.trim() || !value.descriptionSr.trim()) {
      this.error = 'Проверите назив, опис, редослед и величине. Обавезна поља морају бити исправно попуњена.'; return;
    }
    const sizes = value.variants.map((variant) => variant.size.trim().normalize('NFKC').toUpperCase());
    if (sizes.some((size) => !size) || new Set(sizes).size !== sizes.length) { this.error = 'Величине не смеју бити празне или дуплиране.'; return; }
    const payload: ProductWrite = {
      nameSr: value.nameSr.trim(), nameEn: value.nameEn.trim() || null, nameRu: value.nameRu.trim() || null,
      descriptionSr: value.descriptionSr, descriptionEn: value.descriptionEn.trim() || null, descriptionRu: value.descriptionRu.trim() || null,
      ...(value.slug.trim() ? { slug: value.slug.trim() } : {}), priceMinor, compareAtPriceMinor,
      active: value.active, featured: value.featured, displayOrder: value.displayOrder, featuredOrder: value.featuredOrder,
      availability: value.availability, newUntil: value.newUntil ? new Date(value.newUntil).toISOString() : null,
      coverImageId: this.cover?.id ?? null,
      gallery: this.gallery.map((image, displayOrder) => ({ mediaFileId: image.mediaFileId, displayOrder, altSr: image.altSr ?? null, altEn: image.altEn ?? null, altRu: image.altRu ?? null })),
      variants: value.variants.map((variant, displayOrder) => ({
        ...(variant.id ? { id: variant.id } : {}), size: sizes[displayOrder], sku: variant.sku.trim() || null,
        active: variant.active, available: variant.available, displayOrder, stockQuantity: variant.stockQuantity
      }))
    };
    this.saving = true;
    const request = this.selected ? this.api.update(this.selected.id, payload) : this.api.create(payload);
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.saving = false; this.changeDetector.markForCheck(); })).subscribe({
      next: (product) => { this.applyProduct(product); this.toasts.success('Производ је успешно сачуван.'); this.load(); },
      error: (error: HttpErrorResponse) => { this.error = this.errorMessage(error); this.toasts.error(this.error); }
    });
  }

  toggle(item: AdminProduct) {
    if (this.busy || !this.allowDiscard()) return;
    this.saving = true;
    this.api.update(item.id, { active: !item.active }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.saving = false; this.changeDetector.markForCheck(); })).subscribe({
      next: (product) => {
        if (this.selected?.id === item.id) this.applyProduct(product);
        this.toasts.success(product.active ? 'Производ је активиран.' : 'Производ је деактивиран.');
        this.load();
      },
      error: (error: HttpErrorResponse) => this.toasts.error(this.errorMessage(error))
    });
  }

  remove(item: AdminProduct) {
    if (this.busy || !item.canDelete || !this.allowDiscard() || !confirm(`Обрисати производ „${item.nameSr}“?`)) return;
    this.saving = true;
    this.api.remove(item.id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => { this.saving = false; this.changeDetector.markForCheck(); })).subscribe({
      next: () => {
        if (this.selected?.id === item.id) { this.selected = null; this.form.reset(); this.variants.clear(); this.gallery = []; this.cover = null; }
        this.toasts.success('Производ је обрисан.');
        if (this.items.length === 1 && this.query.page > 1) this.query.page--;
        this.load();
      },
      error: (error: HttpErrorResponse) => this.toasts.error(this.errorMessage(error))
    });
  }

  private allowDiscard() { return !this.form.dirty || confirm('Одбацити несачуване измене?'); }
  private errorMessage(error: HttpErrorResponse) {
    const message: unknown = error.error?.message;
    return typeof message === 'string' && /[А-Яа-яЂђЋћЈјЉљЊњЏџ]/.test(message)
      ? message : error.status === 429 ? 'Превише захтева. Сачекајте и покушајте поново.' : 'Чување није успело. Проверите податке и покушајте поново.';
  }
  private localDateTime(value: string) {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
}
