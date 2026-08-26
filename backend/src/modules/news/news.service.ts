import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaFileType, Prisma, UserRole } from '@prisma/client';
import { buildPaginatedResponse } from '../../common/pagination';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { NEWS_TRANSLATION_FIELDS } from '../translation/translation-fields';
import { TranslationService } from '../translation/translation.service';
import { AdminNewsQueryDto } from './dto/admin-news-query.dto';
import { CreateNewsDto } from './dto/create-news.dto';
import { PublicNewsQueryDto } from './dto/public-news-query.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { sanitizeNewsCreateInput, sanitizeNewsUpdateInput } from './utils/news-sanitizer';
import { generateSlug } from './utils/slug';

@Injectable()
export class NewsService {
  private readonly publicNewsListSelect = {
    id: true,
    slug: true,
    title_sr: true,
    title_en: true,
    title_ru: true,
    excerpt_sr: true,
    excerpt_en: true,
    excerpt_ru: true,
    content_sr: true,
    content_en: true,
    content_ru: true,
    coverImage: true,
    publishedAt: true,
    featured: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.NewsSelect;

  private readonly publicNewsDetailSelect = {
    ...this.publicNewsListSelect,
    content_sr: true,
    content_en: true,
    content_ru: true,
  } satisfies Prisma.NewsSelect;

  private readonly adminNewsSelect = {
    ...this.publicNewsDetailSelect,
    published: true,
    authorId: true,
    coverImageId: true,
    author: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    },
    coverMedia: {
      select: {
        id: true,
        url: true,
        storagePath: true,
        mimeType: true,
        size: true,
      },
    },
  } satisfies Prisma.NewsSelect;

  constructor(
    private readonly prisma: PrismaService,
    private readonly translationService: TranslationService,
  ) {}

  async findPublished(query: PublicNewsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const where: Prisma.NewsWhereInput = {
      published: true,
      ...(query.featured !== undefined ? { featured: query.featured } : {}),
      ...this.buildSearchWhere(query.search),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.news.findMany({
        where,
        select: this.publicNewsListSelect,
        orderBy: this.buildDateSort(query.order),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.news.count({ where }),
    ]);

    return buildPaginatedResponse(items, total, page, limit);
  }

  async findPublishedBySlug(slug: string) {
    const news = await this.prisma.news.findFirst({
      where: { slug, published: true },
      select: this.publicNewsDetailSelect,
    });

    if (!news) {
      throw new NotFoundException('News item not found.');
    }

    return news;
  }

  async findForAdmin(query: AdminNewsQueryDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.NewsWhereInput = {
      ...(user.role === UserRole.EDITOR ? { authorId: user.id } : {}),
      ...(query.published !== undefined ? { published: query.published } : {}),
      ...(query.featured !== undefined ? { featured: query.featured } : {}),
      ...this.buildSearchWhere(query.search),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.news.findMany({
        where,
        select: this.adminNewsSelect,
        orderBy: this.buildDateSort(query.order),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.news.count({ where }),
    ]);

    return buildPaginatedResponse(items, total, page, limit);
  }

  async create(createNewsDto: CreateNewsDto, user: AuthenticatedUser) {
    const data = sanitizeNewsCreateInput(createNewsDto);
    const canPublish = this.canPublish(user);

    if (data.published && !canPublish) {
      throw new ForbiddenException('Editors can only create draft news.');
    }

    const published = canPublish ? data.published ?? false : false;
    const slug = await this.createUniqueSlug(data.title_sr);
    const coverImage = await this.resolveCoverImage(data.coverImageId, data.coverImage);
    const translations = await this.translationService.translateMissingFields({
      entityName: 'news',
      source: { ...data },
      fields: NEWS_TRANSLATION_FIELDS,
      targets: ['en', 'ru'],
    });

    return this.prisma.news.create({
      data: {
        ...data,
        ...translations,
        coverImage,
        slug,
        published,
        publishedAt: published ? new Date() : null,
        authorId: user.id,
      },
      select: this.adminNewsSelect,
    });
  }

  async update(id: string, updateNewsDto: UpdateNewsDto, user: AuthenticatedUser) {
    const existing = await this.prisma.news.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('News item not found.');
    }

    const isEditor = user.role === UserRole.EDITOR;
    if (isEditor && (existing.authorId !== user.id || existing.published)) {
      throw new ForbiddenException('Editors can only edit their own draft news.');
    }

    const data = sanitizeNewsUpdateInput(updateNewsDto);
    if (isEditor && data.published) {
      throw new ForbiddenException('Editors cannot publish news.');
    }

    const published = this.resolvePublishedState(existing.published, data.published, user);
    const coverImage = await this.resolveCoverImage(data.coverImageId, data.coverImage);
    const slug =
      data.title_sr && data.title_sr !== existing.title_sr
        ? await this.createUniqueSlug(data.title_sr, id)
        : undefined;
    const translations = await this.translationService.translateMissingFields({
      entityName: 'news',
      source: this.buildTranslationSource(data, existing),
      current: this.buildCurrentTranslationValues(existing),
      fields: NEWS_TRANSLATION_FIELDS,
      targets: ['en', 'ru'],
    });

    return this.prisma.news.update({
      where: { id },
      data: {
        ...data,
        ...translations,
        ...(coverImage !== undefined ? { coverImage } : {}),
        slug,
        published,
        publishedAt: this.resolvePublishedAt(existing.published, published, existing.publishedAt),
      },
      select: this.adminNewsSelect,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.news.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('News item not found.');
    }

    await this.prisma.news.delete({ where: { id } });

    return { success: true };
  }

  private buildSearchWhere(search?: string): Prisma.NewsWhereInput {
    const normalizedSearch = search?.trim();

    if (!normalizedSearch) {
      return {};
    }

    return {
      OR: [
        { title_sr: { contains: normalizedSearch, mode: 'insensitive' } },
        { title_en: { contains: normalizedSearch, mode: 'insensitive' } },
        { title_ru: { contains: normalizedSearch, mode: 'insensitive' } },
      ],
    };
  }

  private buildDateSort(order: 'asc' | 'desc' = 'desc'): Prisma.NewsOrderByWithRelationInput[] {
    return [{ publishedAt: { sort: order, nulls: 'last' } }, { createdAt: order }];
  }

  private canPublish(user: AuthenticatedUser) {
    return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  }

  private resolvePublishedState(
    currentPublished: boolean,
    requestedPublished: boolean | undefined,
    user: AuthenticatedUser,
  ) {
    if (requestedPublished === undefined) {
      return currentPublished;
    }

    if (!this.canPublish(user)) {
      return false;
    }

    return requestedPublished;
  }

  private resolvePublishedAt(
    currentPublished: boolean,
    nextPublished: boolean,
    currentPublishedAt: Date | null,
  ) {
    if (!currentPublished && nextPublished) {
      return new Date();
    }

    if (currentPublished && !nextPublished) {
      return null;
    }

    return currentPublishedAt;
  }

  private async createUniqueSlug(title: string, excludeId?: string) {
    const baseSlug = generateSlug(title);
    let slug = baseSlug;
    let suffix = 2;

    while (await this.slugExists(slug, excludeId)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private async slugExists(slug: string, excludeId?: string) {
    const existing = await this.prisma.news.findUnique({
      where: { slug },
      select: { id: true },
    });

    return Boolean(existing && existing.id !== excludeId);
  }

  private async resolveCoverImage(coverImageId?: string, fallbackUrl?: string) {
    if (!coverImageId) {
      return fallbackUrl;
    }

    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: coverImageId },
      select: { url: true, type: true },
    });

    if (!mediaFile || mediaFile.type !== MediaFileType.IMAGE) {
      throw new NotFoundException('Cover image media file not found.');
    }

    return mediaFile.url;
  }

  private buildTranslationSource(data: UpdateNewsDto, existing: Prisma.NewsGetPayload<Record<string, never>>) {
    return {
      ...data,
      title_sr: data.title_sr ?? existing.title_sr,
      excerpt_sr: data.excerpt_sr ?? existing.excerpt_sr ?? undefined,
      content_sr: data.content_sr ?? existing.content_sr,
    };
  }

  private buildCurrentTranslationValues(existing: Prisma.NewsGetPayload<Record<string, never>>) {
    return {
      title_en: existing.title_en,
      title_ru: existing.title_ru,
      excerpt_en: existing.excerpt_en,
      excerpt_ru: existing.excerpt_ru,
      content_en: existing.content_en,
      content_ru: existing.content_ru,
    };
  }
}
