import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaFileType, Prisma, ProductAvailability } from '@prisma/client';
import sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../../database/prisma.service';
import { buildPaginatedResponse } from '../../common/pagination';
import { generateSlug } from '../news/utils/slug';
import { AdminProductsQueryDto, ProductsQueryDto } from './dto/products-query.dto';
import { CreateProductDto, UpdateProductDto } from './dto/product-write.dto';
import { ProductVariantDto } from './dto/product-parts.dto';
import { assertMinor } from './utils/money';

const mediaSelect = { id: true, url: true, altText: true } satisfies Prisma.MediaFileSelect;
const relations = {
  coverImage: { select: mediaSelect },
  gallery: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], include: { mediaFile: { select: mediaSelect } } },
  variants: { orderBy: [{ displayOrder: 'asc' }, { id: 'asc' }], include: { _count: { select: { orderItems: true } } } },
  _count: { select: { orderItems: true } },
} satisfies Prisma.ProductInclude;
type ProductRecord = Prisma.ProductGetPayload<{ include: typeof relations }>;

const plain = (value: string) => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
const content = (value: string) => sanitizeHtml(value, {
  allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
  allowedAttributes: { a: ['href'] }, allowedSchemes: ['http', 'https', 'mailto'], allowProtocolRelative: false,
}).trim();

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(query: ProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ProductWhereInput = { active: true, ...this.filters(query) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, include: relations, orderBy: this.sort(query), skip: (page - 1) * limit, take: limit }),
      this.prisma.product.count({ where }),
    ]);
    return buildPaginatedResponse(items.map((item) => this.toPublic(item)), total, page, limit);
  }

  async findPublicBySlug(slug: string) {
    const item = await this.prisma.product.findFirst({ where: { slug, active: true }, include: relations });
    if (!item) throw new NotFoundException('Производ није пронађен.');
    return this.toPublic(item);
  }

  async findAdmin(query: AdminProductsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.ProductWhereInput = {
      ...this.filters(query),
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.search?.trim() ? { OR: ['nameSr', 'nameEn', 'nameRu'].map((key) => ({ [key]: { contains: query.search!.trim(), mode: 'insensitive' } })) } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({ where, include: relations, orderBy: this.sort(query), skip: (page - 1) * limit, take: limit }),
      this.prisma.product.count({ where }),
    ]);
    return buildPaginatedResponse(items.map((item) => this.toAdmin(item)), total, page, limit);
  }

  async findAdminById(id: string) {
    return this.toAdmin(await this.requireProduct(this.prisma, id));
  }

  async create(dto: CreateProductDto) {
    return this.write(dto);
  }

  async update(id: string, dto: UpdateProductDto) {
    return this.write(dto, id);
  }

  async remove(id: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockProduct(tx, id);
        const existing = await this.requireProduct(tx, id);
        if (existing.active) throw new ConflictException('Прво деактивирајте производ.');
        const usage = await tx.orderItem.count({ where: { OR: [{ productId: id }, { variant: { productId: id } }] } });
        if (usage) throw new ConflictException('Производ је коришћен у поруџбинама. Може само да се деактивира.');
        await tx.product.delete({ where: { id } });
        return { success: true };
      });
    } catch (error) {
      return this.databaseError(error);
    }
  }

  private async write(dto: CreateProductDto | UpdateProductDto, id?: string) {
    const normalized = this.normalize(dto);
    // The unique index is authoritative; retry generated slugs even on simultaneous creates.
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const item = await this.prisma.$transaction(async (tx) => {
          if (id) await this.lockProduct(tx, id);
          const existing = id ? await this.requireProduct(tx, id) : undefined;
          const data = { ...normalized.data };
          if (!existing && (!data.nameSr || !data.descriptionSr || data.priceMinor === undefined)) {
            throw new BadRequestException('Назив, опис и цена су обавезни.');
          }
          const price = data.priceMinor ?? existing!.priceMinor;
          const compare = data.compareAtPriceMinor !== undefined ? data.compareAtPriceMinor : existing?.compareAtPriceMinor;
          if (compare !== null && compare !== undefined && compare <= price) {
            throw new BadRequestException('Претходна цена мора бити већа од тренутне.');
          }
          const slug = dto.slug ?? existing?.slug ?? await this.uniqueSlug(tx, data.nameSr!);
          const coverImageId = data.coverImageId !== undefined ? data.coverImageId : existing?.coverImageId;
          const mediaIds = [coverImageId, ...(normalized.gallery ?? existing?.gallery ?? []).map((image) => image.mediaFileId)]
            .filter((value): value is string => !!value);
          await this.lockMedia(tx, mediaIds);
          const product = existing
            ? await tx.product.update({ where: { id }, data: { ...data, slug } })
            : await tx.product.create({ data: { ...data, slug } as Prisma.ProductUncheckedCreateInput });
          if (normalized.gallery !== undefined) {
            await tx.productImage.deleteMany({ where: { productId: product.id } });
            await tx.productImage.createMany({ data: normalized.gallery.map((image) => ({ ...image, productId: product.id })) });
          }
          if (normalized.variants !== undefined) {
            await this.saveVariants(tx, product.id, normalized.variants, existing?.variants ?? []);
          }
          return this.requireProduct(tx, product.id);
        });
        return this.toAdmin(item);
      } catch (error) {
        if (!dto.slug && !id && this.isUnique(error, 'slug')) continue;
        return this.databaseError(error);
      }
    }
    throw new ConflictException('Није могуће доделити јединствену адресу производа. Покушајте поново.');
  }

  private normalize(dto: CreateProductDto | UpdateProductDto) {
    const { variants, gallery, newUntil, ...fields } = dto;
    const data: Prisma.ProductUncheckedUpdateInput & { nameSr?: string; descriptionSr?: string; priceMinor?: number; compareAtPriceMinor?: number | null; coverImageId?: string | null } = { ...fields };
    if (dto.nameSr !== undefined) data.nameSr = plain(dto.nameSr);
    if (dto.descriptionSr !== undefined) data.descriptionSr = content(dto.descriptionSr);
    for (const key of ['nameEn', 'nameRu'] as const) {
      if (dto[key] !== undefined) data[key] = dto[key] === null ? null : plain(dto[key]!);
    }
    for (const key of ['descriptionEn', 'descriptionRu'] as const) {
      if (dto[key] !== undefined) data[key] = dto[key] === null ? null : content(dto[key]!);
    }
    if (dto.nameSr !== undefined && (!data.nameSr || data.nameSr.length < 2)) throw new BadRequestException('Назив мора имати најмање два знака.');
    if (dto.descriptionSr !== undefined && (!data.descriptionSr || !plain(data.descriptionSr))) throw new BadRequestException('Опис је обавезан.');
    try {
      if (dto.priceMinor !== undefined) assertMinor(dto.priceMinor);
      if (dto.compareAtPriceMinor !== undefined && dto.compareAtPriceMinor !== null) assertMinor(dto.compareAtPriceMinor);
    } catch { throw new BadRequestException('Цена није исправна.'); }
    if (newUntil !== undefined) data.newUntil = newUntil === null ? null : new Date(newUntil);
    const cleanVariants = variants?.map((variant, index) => ({
      ...variant, size: plain(variant.size).normalize('NFKC').toUpperCase(),
      sku: variant.sku === undefined ? undefined : variant.sku === null ? null : plain(variant.sku) || null,
      displayOrder: variant.displayOrder ?? index,
    }));
    if (cleanVariants?.some((variant) => !variant.size)) throw new BadRequestException('Величина не може бити празна.');
    if (cleanVariants && new Set(cleanVariants.map((variant) => variant.size)).size !== cleanVariants.length) throw new BadRequestException('Величине не смеју да се понављају.');
    const ids = cleanVariants?.flatMap((variant) => variant.id ? [variant.id] : []) ?? [];
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Иста варијанта је послата више пута.');
    if (gallery && new Set(gallery.map((image) => image.mediaFileId)).size !== gallery.length) throw new BadRequestException('Фотографија је већ у галерији.');
    return {
      data,
      variants: cleanVariants,
      gallery: gallery?.map((image, index) => ({
        mediaFileId: image.mediaFileId, displayOrder: image.displayOrder ?? index,
        altSr: image.altSr ? plain(image.altSr) : null,
        altEn: image.altEn ? plain(image.altEn) : null,
        altRu: image.altRu ? plain(image.altRu) : null,
      })),
    };
  }

  private async saveVariants(tx: Prisma.TransactionClient, productId: string, incoming: ProductVariantDto[], existing: ProductRecord['variants']) {
    const resolved = incoming.map((variant) => {
      const previous = variant.id ? existing.find((entry) => entry.id === variant.id) : existing.find((entry) => entry.size === variant.size);
      if (variant.id && !previous) throw new BadRequestException('Варијанта не припада овом производу.');
      return { variant, previous };
    });
    const retained = resolved.flatMap(({ previous }) => previous ? [previous.id] : []);
    if (new Set(retained).size !== retained.length) throw new BadRequestException('Иста варијанта је послата више пута.');
    const removed = existing.filter((entry) => !retained.includes(entry.id)).map((entry) => entry.id);
    if (removed.length) {
      if (await tx.orderItem.count({ where: { variantId: { in: removed } } })) throw new ConflictException('Коришћену величину деактивирајте уместо брисања.');
      await tx.productVariant.deleteMany({ where: { id: { in: removed }, productId } });
    }
    // Temporary unique labels permit swapping sizes/SKUs without replacing stable IDs.
    for (const { previous } of resolved) {
      if (previous) await tx.productVariant.update({ where: { id: previous.id }, data: { size: `__edit-${previous.id}`, sku: null } });
    }
    for (const { variant, previous } of resolved) {
      const values = { size: variant.size, sku: variant.sku, active: variant.active, available: variant.available, displayOrder: variant.displayOrder, stockQuantity: variant.stockQuantity };
      const data = { ...values, sku: values.sku === undefined ? previous?.sku ?? null : values.sku };
      if (previous) await tx.productVariant.update({ where: { id: previous.id }, data });
      else await tx.productVariant.create({ data: { ...data, productId } });
    }
  }

  private async lockMedia(tx: Prisma.TransactionClient, ids: string[]) {
    const uniqueIds = [...new Set(ids)].sort();
    if (!uniqueIds.length) return;
    const files = await tx.$queryRaw<Array<{ id: string; type: MediaFileType; deletingAt: Date | null }>>`
      SELECT "id", "type", "deletingAt" FROM "MediaFile"
      WHERE "id" IN (${Prisma.join(uniqueIds)}) ORDER BY "id" FOR UPDATE
    `;
    if (files.length !== uniqueIds.length || files.some((file) => file.type !== MediaFileType.IMAGE || file.deletingAt)) {
      throw new BadRequestException('Изабрана фотографија не постоји или се брише.');
    }
  }

  private async lockProduct(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${id} FOR UPDATE`;
  }

  private async uniqueSlug(tx: Prisma.TransactionClient, name: string) {
    const base = generateSlug(name).slice(0, 160).replace(/-+$/, '');
    let slug = base;
    let suffix = 2;
    while (await tx.product.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${suffix++}`;
    return slug;
  }

  private async requireProduct(tx: Prisma.TransactionClient, id: string) {
    const item = await tx.product.findUnique({ where: { id }, include: relations });
    if (!item) throw new NotFoundException('Производ није пронађен.');
    return item;
  }

  private filters(query: ProductsQueryDto): Prisma.ProductWhereInput {
    return {
      ...(query.featured !== undefined ? { featured: query.featured } : {}),
      ...(query.availability ? { availability: query.availability } : {}),
    };
  }

  private sort(query: ProductsQueryDto): Prisma.ProductOrderByWithRelationInput[] {
    const order = query.order ?? 'asc';
    return [...(query.featured === true ? [{ featuredOrder: { sort: order, nulls: 'last' as const } }] : []), { displayOrder: order }, { id: order }];
  }

  private toAdmin(item: ProductRecord) {
    const { _count, ...product } = item;
    return {
      ...product,
      variants: item.variants.map(({ _count: usage, ...variant }) => {
        void usage;
        return variant;
      }),
      canDelete: !item.active && _count.orderItems === 0 && item.variants.every((variant) => variant._count.orderItems === 0),
    };
  }

  private toPublic(item: ProductRecord) {
    const localized = (sr: string, en: string | null, ru: string | null) => ({ sr, en: en || sr, ru: ru || sr });
    const variants = item.variants.filter((variant) => variant.active).map((variant) => ({
      id: variant.id, size: variant.size,
      available: variant.available && item.availability !== ProductAvailability.SOLD_OUT,
    }));
    return {
      id: item.id, slug: item.slug,
      name: localized(item.nameSr, item.nameEn, item.nameRu),
      description: localized(item.descriptionSr, item.descriptionEn, item.descriptionRu),
      priceMinor: item.priceMinor, compareAtPriceMinor: item.compareAtPriceMinor, currency: 'RSD',
      availability: item.availability, featured: item.featured,
      isNew: !!item.newUntil && item.newUntil > new Date(),
      coverImage: item.coverImage,
      gallery: item.gallery.map((image) => ({
        id: image.id, url: image.mediaFile.url,
        alt: localized(image.altSr || image.mediaFile.altText || item.nameSr, image.altEn, image.altRu),
      })),
      variants, availableForOrder: variants.some((variant) => variant.available),
    };
  }

  private isUnique(error: unknown, field: string) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && Array.isArray(error.meta?.target) && error.meta.target.includes(field);
  }

  private databaseError(error: unknown): never {
    if (this.isUnique(error, 'slug')) throw new ConflictException('Ова адреса производа је већ заузета.');
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Величина или шифра артикла већ постоји.');
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') throw new ConflictException('Запис је повезан са другим подацима и не може да се обрише.');
    throw error;
  }
}
