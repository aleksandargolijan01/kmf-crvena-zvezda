import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaFileType, Prisma } from '@prisma/client';
import { buildPaginatedResponse } from '../../common/pagination';
import { PrismaService } from '../../database/prisma.service';
import { STAFF_TRANSLATION_FIELDS } from '../translation/translation-fields';
import { TranslationService } from '../translation/translation.service';
import { CreateStaffMemberDto } from './dto/create-staff-member.dto';
import { StaffQueryDto } from './dto/staff-query.dto';
import { UpdateStaffMemberDto } from './dto/update-staff-member.dto';
import { sanitizeStaffCreateInput, sanitizeStaffUpdateInput } from './utils/staff-sanitizer';

@Injectable()
export class StaffService {
  private readonly publicStaffSelect = {
    id: true,
    fullName: true,
    role_sr: true,
    role_en: true,
    role_ru: true,
    bio_sr: true,
    bio_en: true,
    bio_ru: true,
    imageUrl: true,
    teamType: true,
    image: {
      select: {
        url: true,
      },
    },
  } satisfies Prisma.StaffMemberSelect;

  private readonly adminStaffSelect = {
    ...this.publicStaffSelect,
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
  } satisfies Prisma.StaffMemberSelect;

  constructor(
    private readonly prisma: PrismaService,
    private readonly translationService: TranslationService,
  ) {}

  async findPublic(query: StaffQueryDto) {
    return this.prisma.staffMember.findMany({
      where: {
        active: true,
        ...(query.teamType ? { teamType: query.teamType } : {}),
      },
      select: this.publicStaffSelect,
      orderBy: this.defaultOrderBy(),
    });
  }

  async findPublicById(id: string) {
    const member = await this.prisma.staffMember.findFirst({
      where: { id, active: true },
      select: this.publicStaffSelect,
    });

    if (!member) {
      throw new NotFoundException('Staff member not found.');
    }

    return member;
  }

  async findAdmin(query: StaffQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);

    const [items, total] = await Promise.all([
      this.prisma.staffMember.findMany({
        where,
        select: this.adminStaffSelect,
        orderBy: this.adminOrderBy(query.order),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.staffMember.count({ where }),
    ]);

    return buildPaginatedResponse(items, total, page, limit);
  }

  async create(dto: CreateStaffMemberDto) {
    const data = sanitizeStaffCreateInput(dto);
    const imageUrl = await this.resolveImageUrl(data.imageId, data.imageUrl);
    const translations = await this.translateStaffFields({ ...data });

    return this.prisma.staffMember.create({
      data: {
        ...data,
        ...translations,
        imageUrl,
        active: data.active ?? true,
        order: data.order ?? 0,
      },
      select: this.adminStaffSelect,
    });
  }

  async update(id: string, dto: UpdateStaffMemberDto) {
    const existing = await this.prisma.staffMember.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Staff member not found.');
    }

    const data = sanitizeStaffUpdateInput(dto);
    const imageUrl =
      data.imageId !== undefined ? await this.resolveImageUrl(data.imageId, data.imageUrl) : data.imageUrl;
    const translations = await this.translateStaffFields(
      {
        ...data,
        role_sr: data.role_sr ?? existing.role_sr,
        bio_sr: data.bio_sr ?? existing.bio_sr ?? undefined,
      },
      existing,
    );

    return this.prisma.staffMember.update({
      where: { id },
      data: {
        ...data,
        ...translations,
        ...(imageUrl !== undefined ? { imageUrl } : {}),
      },
      select: this.adminStaffSelect,
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.staffMember.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Staff member not found.');
    }

    await this.prisma.staffMember.delete({ where: { id } });

    return { success: true };
  }

  private buildWhere(query: StaffQueryDto): Prisma.StaffMemberWhereInput {
    const normalizedSearch = query.search?.trim();

    return {
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.teamType ? { teamType: query.teamType } : {}),
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

  private defaultOrderBy(): Prisma.StaffMemberOrderByWithRelationInput[] {
    return [{ order: 'asc' }, { fullName: 'asc' }];
  }

  private adminOrderBy(order: 'asc' | 'desc' = 'asc'): Prisma.StaffMemberOrderByWithRelationInput[] {
    return [{ order }, { fullName: 'asc' }];
  }

  private async resolveImageUrl(imageId?: string | null, fallbackUrl?: string | null) {
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

  private translateStaffFields(source: Record<string, unknown>, current?: Record<string, unknown>) {
    return this.translationService.translateMissingFields({
      entityName: 'staff member',
      source,
      current,
      fields: STAFF_TRANSLATION_FIELDS,
      targets: ['en', 'ru'],
    });
  }
}
