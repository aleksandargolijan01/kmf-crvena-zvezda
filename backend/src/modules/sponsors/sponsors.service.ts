import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaFileType, Prisma } from '@prisma/client';
import { buildPaginatedResponse } from '../../common/pagination';
import { PrismaService } from '../../database/prisma.service';
import {
  SPONSOR_CATEGORY_TRANSLATION_FIELDS,
  SPONSOR_TRANSLATION_FIELDS,
} from '../translation/translation-fields';
import { TranslationService } from '../translation/translation.service';
import { CreateSponsorCategoryDto } from './dto/create-sponsor-category.dto';
import { CreateSponsorDto } from './dto/create-sponsor.dto';
import { SponsorCategoriesQueryDto } from './dto/sponsor-categories-query.dto';
import { SponsorsQueryDto } from './dto/sponsors-query.dto';
import { UpdateSponsorCategoryDto } from './dto/update-sponsor-category.dto';
import { UpdateSponsorDto } from './dto/update-sponsor.dto';
import {
  sanitizeSponsorCategoryCreateInput,
  sanitizeSponsorCategoryUpdateInput,
  sanitizeSponsorCreateInput,
  sanitizeSponsorUpdateInput,
} from './utils/sponsor-sanitizer';
import { generateSponsorSlug } from './utils/sponsor-slug';

@Injectable()
export class SponsorsService {
  private readonly publicCategorySelect = {
    id: true,
    name_sr: true,
    name_en: true,
    name_ru: true,
    slug: true,
    description_sr: true,
    description_en: true,
    description_ru: true,
    order: true,
    active: true,
  } satisfies Prisma.SponsorCategorySelect;

  private readonly categorySelect = {
    ...this.publicCategorySelect,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.SponsorCategorySelect;

  private readonly publicSponsorSelect = {
    id: true,
    name: true,
    slug: true,
    websiteUrl: true,
    logoUrl: true,
    description_sr: true,
    description_en: true,
    description_ru: true,
    featured: true,
    active: true,
    order: true,
    logo: {
      select: {
        url: true,
      },
    },
    category: {
      select: {
        id: true,
        name_sr: true,
        name_en: true,
        name_ru: true,
        slug: true,
        order: true,
        active: true,
      },
    },
  } satisfies Prisma.SponsorSelect;

  private readonly sponsorSelect = {
    ...this.publicSponsorSelect,
    logoId: true,
    categoryId: true,
    createdAt: true,
    updatedAt: true,
    logo: {
      select: {
        id: true,
        url: true,
        storagePath: true,
        mimeType: true,
        size: true,
      },
    },
    category: {
      select: {
        id: true,
        name_sr: true,
        name_en: true,
        name_ru: true,
        slug: true,
        order: true,
        active: true,
      },
    },
  } satisfies Prisma.SponsorSelect;

  constructor(
    private readonly prisma: PrismaService,
    private readonly translationService: TranslationService,
  ) {}

  async findPublicSponsors() {
    return this.prisma.sponsor.findMany({
      where: {
        active: true,
        OR: [{ categoryId: null }, { category: { active: true } }],
      },
      select: this.publicSponsorSelect,
      orderBy: this.sponsorOrderBy(),
    });
  }

  async findPublicCategories() {
    return this.prisma.sponsorCategory.findMany({
      where: { active: true },
      select: this.publicCategorySelect,
      orderBy: this.categoryOrderBy(),
    });
  }

  async findPublicGrouped() {
    const categories = await this.prisma.sponsorCategory.findMany({
      where: { active: true },
      select: {
        ...this.publicCategorySelect,
        sponsors: {
          where: { active: true },
          select: this.publicSponsorSelect,
          orderBy: this.sponsorOrderBy(),
        },
      },
      orderBy: this.categoryOrderBy(),
    });

    return categories.map((category) => ({
      ...category,
      sponsors: category.sponsors,
    }));
  }

  async findAdminCategories(query: SponsorCategoriesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildCategoryWhere(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.sponsorCategory.findMany({
        where,
        select: this.categorySelect,
        orderBy: this.categoryOrderBy(query.order),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sponsorCategory.count({ where }),
    ]);

    return buildPaginatedResponse(items, total, page, limit);
  }

  async createCategory(dto: CreateSponsorCategoryDto) {
    const data = sanitizeSponsorCategoryCreateInput(dto);
    const slug = await this.createUniqueCategorySlug(data.name_sr);
    const translations = await this.translateCategoryFields({ ...data });

    return this.prisma.sponsorCategory.create({
      data: {
        ...data,
        ...translations,
        slug,
        active: data.active ?? true,
        order: data.order ?? 0,
      },
      select: this.categorySelect,
    });
  }

  async updateCategory(id: string, dto: UpdateSponsorCategoryDto) {
    const existing = await this.prisma.sponsorCategory.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Sponsor category not found.');
    }

    const data = sanitizeSponsorCategoryUpdateInput(dto);
    const slug =
      data.name_sr && data.name_sr !== existing.name_sr
        ? await this.createUniqueCategorySlug(data.name_sr, id)
        : undefined;
    const translations = await this.translateCategoryFields(
      {
        ...data,
        name_sr: data.name_sr ?? existing.name_sr,
        description_sr: data.description_sr ?? existing.description_sr ?? undefined,
      },
      existing,
    );

    return this.prisma.sponsorCategory.update({
      where: { id },
      data: {
        ...data,
        ...translations,
        ...(slug ? { slug } : {}),
      },
      select: this.categorySelect,
    });
  }

  async removeCategory(id: string) {
    const existing = await this.prisma.sponsorCategory.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Sponsor category not found.');
    }

    const sponsorCount = await this.prisma.sponsor.count({ where: { categoryId: id } });
    if (sponsorCount > 0) {
      throw new ConflictException({
        message: 'Sponsor category has connected sponsors and cannot be deleted.',
        usage: {
          type: 'sponsor.category',
          count: sponsorCount,
        },
      });
    }

    await this.prisma.sponsorCategory.delete({ where: { id } });

    return { success: true };
  }

  async findAdminSponsors(query: SponsorsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildSponsorWhere(query);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.sponsor.findMany({
        where,
        select: this.sponsorSelect,
        orderBy: this.sponsorOrderBy(query.order),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sponsor.count({ where }),
    ]);

    return buildPaginatedResponse(items, total, page, limit);
  }

  async createSponsor(dto: CreateSponsorDto) {
    const data = sanitizeSponsorCreateInput(dto);
    await this.ensureCategoryExists(data.categoryId);
    const logoUrl = await this.resolveLogoUrl(data.logoId, data.logoUrl);
    const slug = await this.createUniqueSponsorSlug(data.name);
    const translations = await this.translateSponsorFields({ ...data });

    return this.prisma.sponsor.create({
      data: {
        ...data,
        ...translations,
        slug,
        logoUrl,
        featured: data.featured ?? false,
        active: data.active ?? true,
        order: data.order ?? 0,
      },
      select: this.sponsorSelect,
    });
  }

  async updateSponsor(id: string, dto: UpdateSponsorDto) {
    const existing = await this.prisma.sponsor.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Sponsor not found.');
    }

    const data = sanitizeSponsorUpdateInput(dto);
    await this.ensureCategoryExists(data.categoryId);
    const slug =
      data.name && data.name !== existing.name
        ? await this.createUniqueSponsorSlug(data.name, id)
        : undefined;
    const logoUrl =
      data.logoId !== undefined ? await this.resolveLogoUrl(data.logoId, data.logoUrl) : data.logoUrl;
    const translations = await this.translateSponsorFields(
      {
        ...data,
        description_sr: data.description_sr ?? existing.description_sr ?? undefined,
      },
      existing,
    );

    return this.prisma.sponsor.update({
      where: { id },
      data: {
        ...data,
        ...translations,
        ...(slug ? { slug } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
      },
      select: this.sponsorSelect,
    });
  }

  async removeSponsor(id: string) {
    const existing = await this.prisma.sponsor.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Sponsor not found.');
    }

    await this.prisma.sponsor.delete({ where: { id } });

    return { success: true };
  }

  private buildCategoryWhere(query: SponsorCategoriesQueryDto): Prisma.SponsorCategoryWhereInput {
    const search = query.search?.trim();

    return {
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(search
        ? {
            OR: [
              { name_sr: { contains: search, mode: 'insensitive' } },
              { name_en: { contains: search, mode: 'insensitive' } },
              { name_ru: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private buildSponsorWhere(query: SponsorsQueryDto): Prisma.SponsorWhereInput {
    const search = query.search?.trim();

    return {
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.featured !== undefined ? { featured: query.featured } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description_sr: { contains: search, mode: 'insensitive' } },
              { description_en: { contains: search, mode: 'insensitive' } },
              { description_ru: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private categoryOrderBy(order: 'asc' | 'desc' = 'asc'): Prisma.SponsorCategoryOrderByWithRelationInput[] {
    return [{ order }, { name_sr: 'asc' }];
  }

  private sponsorOrderBy(order: 'asc' | 'desc' = 'asc'): Prisma.SponsorOrderByWithRelationInput[] {
    return [
      { category: { order: order } },
      { order },
      { name: 'asc' },
    ];
  }

  private async ensureCategoryExists(categoryId?: string | null) {
    if (categoryId === undefined || categoryId === null) {
      return;
    }

    const category = await this.prisma.sponsorCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new NotFoundException('Sponsor category not found.');
    }
  }

  private async resolveLogoUrl(logoId?: string | null, fallbackUrl?: string) {
    if (logoId === undefined) {
      return fallbackUrl;
    }

    if (logoId === null) {
      return null;
    }

    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: logoId },
      select: { url: true, type: true },
    });

    if (!mediaFile) {
      throw new NotFoundException('Logo media file not found.');
    }

    if (mediaFile.type !== MediaFileType.IMAGE) {
      throw new BadRequestException('Selected media file is not an image.');
    }

    return mediaFile.url;
  }

  private async createUniqueCategorySlug(name: string, excludeId?: string) {
    return this.createUniqueSlug(name, (slug) =>
      this.prisma.sponsorCategory.findUnique({ where: { slug }, select: { id: true } }),
    excludeId);
  }

  private async createUniqueSponsorSlug(name: string, excludeId?: string) {
    return this.createUniqueSlug(name, (slug) =>
      this.prisma.sponsor.findUnique({ where: { slug }, select: { id: true } }),
    excludeId);
  }

  private async createUniqueSlug(
    value: string,
    findBySlug: (slug: string) => Promise<{ id: string } | null>,
    excludeId?: string,
  ) {
    const baseSlug = generateSponsorSlug(value);
    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await findBySlug(slug);
      if (!existing || existing.id === excludeId) {
        return slug;
      }

      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  private translateCategoryFields(source: Record<string, unknown>, current?: Record<string, unknown>) {
    return this.translationService.translateMissingFields({
      entityName: 'sponsor category',
      source,
      current,
      fields: SPONSOR_CATEGORY_TRANSLATION_FIELDS,
      targets: ['en', 'ru'],
    });
  }

  private translateSponsorFields(source: Record<string, unknown>, current?: Record<string, unknown>) {
    return this.translationService.translateMissingFields({
      entityName: 'sponsor',
      source,
      current,
      fields: SPONSOR_TRANSLATION_FIELDS,
      targets: ['en', 'ru'],
    });
  }
}
