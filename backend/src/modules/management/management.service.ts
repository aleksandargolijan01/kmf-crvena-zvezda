import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaFileType, Prisma } from '@prisma/client';
import { buildPaginatedResponse } from '../../common/pagination';
import { PrismaService } from '../../database/prisma.service';
import { MANAGEMENT_TRANSLATION_FIELDS } from '../translation/translation-fields';
import { TranslationService } from '../translation/translation.service';
import { CreateManagementMemberDto } from './dto/create-management-member.dto';
import { ManagementQueryDto } from './dto/management-query.dto';
import { UpdateManagementMemberDto } from './dto/update-management-member.dto';
import {
  sanitizeManagementCreateInput,
  sanitizeManagementUpdateInput,
} from './utils/management-sanitizer';
import { generateManagementSlug } from './utils/management-slug';

type ManagementType = 'management' | 'board';
type ManagementRecord = {
  id: string;
  fullName: string;
  role_sr: string;
  bio_sr?: string | null;
};
type ManagementDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  findFirst: (args: Record<string, unknown>) => Promise<ManagementRecord | null>;
  findUnique: (args: Record<string, unknown>) => Promise<ManagementRecord | null>;
  count: (args: Record<string, unknown>) => Promise<number>;
  create: (args: Record<string, unknown>) => Promise<unknown>;
  update: (args: Record<string, unknown>) => Promise<unknown>;
  delete: (args: Record<string, unknown>) => Promise<unknown>;
};

@Injectable()
export class ManagementService {
  private readonly publicMemberSelect = {
    id: true,
    fullName: true,
    slug: true,
    role_sr: true,
    role_en: true,
    role_ru: true,
    bio_sr: true,
    bio_en: true,
    bio_ru: true,
    imageUrl: true,
    image: {
      select: {
        url: true,
      },
    },
  } satisfies Prisma.ManagementMemberSelect;

  private readonly adminMemberSelect = {
    ...this.publicMemberSelect,
    imageId: true,
    active: true,
    order: true,
    createdAt: true,
    updatedAt: true,
    image: {
      select: {
        id: true,
        url: true,
        storagePath: true,
        mimeType: true,
        size: true,
      },
    },
  } satisfies Prisma.ManagementMemberSelect;

  constructor(
    private readonly prisma: PrismaService,
    private readonly translationService: TranslationService,
  ) {}

  async findPublic(type: ManagementType) {
    return this.delegate(type).findMany({
      where: { active: true },
      select: this.publicMemberSelect,
      orderBy: this.defaultOrderBy(),
    });
  }

  async findPublicById(type: ManagementType, id: string) {
    const member = await this.delegate(type).findFirst({
      where: { id, active: true },
      select: this.publicMemberSelect,
    });

    if (!member) {
      throw new NotFoundException('Management member not found.');
    }

    return member;
  }

  async findAdmin(type: ManagementType, query: ManagementQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);
    const delegate = this.delegate(type);

    const [items, total] = await Promise.all([
      delegate.findMany({
        where,
        select: this.adminMemberSelect,
        orderBy: this.adminOrderBy(query.order),
        skip: (page - 1) * limit,
        take: limit,
      }),
      delegate.count({ where }),
    ]);

    return buildPaginatedResponse(items, total, page, limit);
  }

  async create(type: ManagementType, dto: CreateManagementMemberDto) {
    const data = sanitizeManagementCreateInput(dto);
    const imageUrl = await this.resolveImageUrl(data.imageId, data.imageUrl);
    const slug = await this.createUniqueSlug(type, data.fullName);
    const translations = await this.translateMemberFields(type, { ...data });

    return this.delegate(type).create({
      data: {
        ...data,
        ...translations,
        slug,
        imageUrl,
        active: data.active ?? true,
        order: data.order ?? 0,
      },
      select: this.adminMemberSelect,
    });
  }

  async update(type: ManagementType, id: string, dto: UpdateManagementMemberDto) {
    const delegate = this.delegate(type);
    const existing = await delegate.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Management member not found.');
    }

    const data = sanitizeManagementUpdateInput(dto);
    const slug =
      data.fullName && data.fullName !== existing.fullName
        ? await this.createUniqueSlug(type, data.fullName, id)
        : undefined;
    const imageUrl =
      data.imageId !== undefined ? await this.resolveImageUrl(data.imageId, data.imageUrl) : data.imageUrl;
    const translations = await this.translateMemberFields(
      type,
      {
        ...data,
        role_sr: data.role_sr ?? existing.role_sr,
        bio_sr: data.bio_sr ?? existing.bio_sr ?? undefined,
      },
      existing,
    );

    return delegate.update({
      where: { id },
      data: {
        ...data,
        ...translations,
        ...(slug ? { slug } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
      },
      select: this.adminMemberSelect,
    });
  }

  async remove(type: ManagementType, id: string) {
    const delegate = this.delegate(type);
    const existing = await delegate.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Management member not found.');
    }

    await delegate.delete({ where: { id } });

    return { success: true };
  }

  private delegate(type: ManagementType): ManagementDelegate {
    return (type === 'management'
      ? this.prisma.managementMember
      : this.prisma.boardMember) as unknown as ManagementDelegate;
  }

  private buildWhere(query: ManagementQueryDto): Prisma.ManagementMemberWhereInput {
    const normalizedSearch = query.search?.trim();

    return {
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(normalizedSearch
        ? {
            OR: [
              { fullName: { contains: normalizedSearch, mode: 'insensitive' } },
              { role_sr: { contains: normalizedSearch, mode: 'insensitive' } },
              { role_en: { contains: normalizedSearch, mode: 'insensitive' } },
              { role_ru: { contains: normalizedSearch, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private defaultOrderBy(): Prisma.ManagementMemberOrderByWithRelationInput[] {
    return [{ order: 'asc' }, { fullName: 'asc' }];
  }

  private adminOrderBy(order: 'asc' | 'desc' = 'asc'): Prisma.ManagementMemberOrderByWithRelationInput[] {
    return [{ order }, { fullName: 'asc' }];
  }

  private async resolveImageUrl(imageId?: string | null, fallbackUrl?: string) {
    if (imageId === undefined) {
      return fallbackUrl;
    }

    if (imageId === null) {
      return null;
    }

    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id: imageId },
      select: { url: true, type: true },
    });

    if (!mediaFile) {
      throw new NotFoundException('Image media file not found.');
    }

    if (mediaFile.type !== MediaFileType.IMAGE) {
      throw new BadRequestException('Selected media file is not an image.');
    }

    return mediaFile.url;
  }

  private async createUniqueSlug(type: ManagementType, fullName: string, excludeId?: string) {
    const baseSlug = generateManagementSlug(fullName);
    let slug = baseSlug;
    let suffix = 2;

    while (await this.slugExists(type, slug, excludeId)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private async slugExists(type: ManagementType, slug: string, excludeId?: string) {
    const existing = await this.delegate(type).findUnique({
      where: { slug },
      select: { id: true },
    });

    return Boolean(existing && existing.id !== excludeId);
  }

  private translateMemberFields(
    type: ManagementType,
    source: Record<string, unknown>,
    current?: Record<string, unknown>,
  ) {
    return this.translationService.translateMissingFields({
      entityName: type === 'management' ? 'management member' : 'board member',
      source,
      current,
      fields: MANAGEMENT_TRANSLATION_FIELDS,
      targets: ['en', 'ru'],
    });
  }
}
