import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaFileType, Prisma } from '@prisma/client';
import { buildPaginatedResponse } from '../../common/pagination';
import { PrismaService } from '../../database/prisma.service';
import { PLAYER_TRANSLATION_FIELDS } from '../translation/translation-fields';
import { TranslationService } from '../translation/translation.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { PlayersQueryDto } from './dto/players-query.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { sanitizePlayerCreateInput, sanitizePlayerUpdateInput } from './utils/player-sanitizer';
import { generatePlayerSlug } from './utils/player-slug';

type TeamType = 'firstTeam' | 'u19';
type PlayerRecord = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  bio_sr?: string | null;
};
type PlayerDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  findFirst: (args: Record<string, unknown>) => Promise<PlayerRecord | null>;
  findUnique: (args: Record<string, unknown>) => Promise<PlayerRecord | null>;
  count: (args: Record<string, unknown>) => Promise<number>;
  create: (args: Record<string, unknown>) => Promise<unknown>;
  update: (args: Record<string, unknown>) => Promise<unknown>;
  delete: (args: Record<string, unknown>) => Promise<unknown>;
};

@Injectable()
export class PlayersService {
  private readonly publicPlayerSelect = {
    id: true,
    firstName: true,
    lastName: true,
    fullName: true,
    slug: true,
    position: true,
    shirtNumber: true,
    bio_sr: true,
    bio_en: true,
    bio_ru: true,
    imageUrl: true,
    image: {
      select: {
        url: true,
      },
    },
  } satisfies Prisma.PlayerSelect;

  private readonly adminPlayerSelect = {
    ...this.publicPlayerSelect,
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
  } satisfies Prisma.PlayerSelect;

  constructor(
    private readonly prisma: PrismaService,
    private readonly translationService: TranslationService,
  ) {}

  async findPublic(team: TeamType) {
    return this.delegate(team).findMany({
      where: { active: true },
      select: this.publicPlayerSelect,
      orderBy: this.defaultOrderBy(),
    });
  }

  async findPublicById(team: TeamType, id: string) {
    const player = await this.delegate(team).findFirst({
      where: { id, active: true },
      select: this.publicPlayerSelect,
    });

    if (!player) {
      throw new NotFoundException('Player not found.');
    }

    return player;
  }

  async findAdmin(team: TeamType, query: PlayersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);
    const delegate = this.delegate(team);

    const [items, total] = await Promise.all([
      delegate.findMany({
        where,
        select: this.adminPlayerSelect,
        orderBy: this.adminOrderBy(query.order),
        skip: (page - 1) * limit,
        take: limit,
      }),
      delegate.count({ where }),
    ]);

    return buildPaginatedResponse(items, total, page, limit);
  }

  async create(team: TeamType, dto: CreatePlayerDto) {
    const data = sanitizePlayerCreateInput(dto);
    const imageUrl = await this.resolveImageUrl(data.imageId, data.imageUrl);
    const fullName = this.buildFullName(data.firstName, data.lastName);
    const slug = await this.createUniqueSlug(team, fullName);
    const translations = await this.translatePlayerFields(team, { ...data });

    return this.delegate(team).create({
      data: {
        ...data,
        ...translations,
        fullName,
        slug,
        imageUrl,
        active: data.active ?? true,
        order: data.order ?? 0,
      },
      select: this.adminPlayerSelect,
    });
  }

  async update(team: TeamType, id: string, dto: UpdatePlayerDto) {
    const delegate = this.delegate(team);
    const existing = await delegate.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Player not found.');
    }

    const data = sanitizePlayerUpdateInput(dto);
    const firstName = data.firstName ?? existing.firstName;
    const lastName = data.lastName ?? existing.lastName;
    const fullName = this.buildFullName(firstName, lastName);
    const shouldUpdateSlug = fullName !== existing.fullName;
    const slug = shouldUpdateSlug ? await this.createUniqueSlug(team, fullName, id) : undefined;
    const imageUrl =
      data.imageId !== undefined ? await this.resolveImageUrl(data.imageId, data.imageUrl) : data.imageUrl;
    const translations = await this.translatePlayerFields(
      team,
      {
        ...data,
        bio_sr: data.bio_sr ?? existing.bio_sr ?? undefined,
      },
      existing,
    );

    return delegate.update({
      where: { id },
      data: {
        ...data,
        ...translations,
        fullName,
        ...(slug ? { slug } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
      },
      select: this.adminPlayerSelect,
    });
  }

  async remove(team: TeamType, id: string) {
    const delegate = this.delegate(team);
    const existing = await delegate.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Player not found.');
    }

    await delegate.delete({ where: { id } });

    return { success: true };
  }

  private delegate(team: TeamType): PlayerDelegate {
    return (team === 'firstTeam' ? this.prisma.player : this.prisma.u19Player) as unknown as PlayerDelegate;
  }

  private buildWhere(query: PlayersQueryDto): Prisma.PlayerWhereInput {
    const normalizedSearch = query.search?.trim();

    return {
      ...(query.active !== undefined ? { active: query.active } : {}),
      ...(query.position ? { position: { equals: query.position, mode: 'insensitive' } } : {}),
      ...(normalizedSearch
        ? {
            OR: [
              { firstName: { contains: normalizedSearch, mode: 'insensitive' } },
              { lastName: { contains: normalizedSearch, mode: 'insensitive' } },
              { fullName: { contains: normalizedSearch, mode: 'insensitive' } },
              { position: { contains: normalizedSearch, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private defaultOrderBy(): Prisma.PlayerOrderByWithRelationInput[] {
    return [{ order: 'asc' }, { shirtNumber: { sort: 'asc', nulls: 'last' } }, { fullName: 'asc' }];
  }

  private adminOrderBy(order: 'asc' | 'desc' = 'asc'): Prisma.PlayerOrderByWithRelationInput[] {
    return [{ order }, { shirtNumber: { sort: order, nulls: 'last' } }, { fullName: 'asc' }];
  }

  private buildFullName(firstName: string, lastName: string) {
    return `${firstName.trim()} ${lastName.trim()}`.trim();
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

  private async createUniqueSlug(team: TeamType, fullName: string, excludeId?: string) {
    const baseSlug = generatePlayerSlug(fullName);
    let slug = baseSlug;
    let suffix = 2;

    while (await this.slugExists(team, slug, excludeId)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private async slugExists(team: TeamType, slug: string, excludeId?: string) {
    const existing = await this.delegate(team).findUnique({
      where: { slug },
      select: { id: true },
    });

    return Boolean(existing && existing.id !== excludeId);
  }

  private translatePlayerFields(
    team: TeamType,
    source: Record<string, unknown>,
    current?: Record<string, unknown>,
  ) {
    return this.translationService.translateMissingFields({
      entityName: team === 'firstTeam' ? 'player' : 'u19 player',
      source,
      current,
      fields: PLAYER_TRANSLATION_FIELDS,
      targets: ['en', 'ru'],
    });
  }
}
