import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MediaFileType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import WebSocket from 'ws';
import { buildPaginatedResponse } from '../../common/pagination';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { MediaQueryDto } from './dto/media-query.dto';
import {
  ALLOWED_IMAGE_EXTENSIONS_BY_MIME_TYPE,
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_EXTENSION_BY_MIME_TYPE,
  MAX_IMAGE_SIZE_BYTES,
} from './utils/media.constants';
import { slugifyFileName } from './utils/media-path';

@Injectable()
export class MediaService implements OnModuleInit {
  private readonly logger = new Logger(MediaService.name);
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;
  private readonly mediaSelect = {
    id: true,
    bucket: true,
    storagePath: true,
    url: true,
    originalName: true,
    fileName: true,
    mimeType: true,
    size: true,
    type: true,
    altText: true,
    uploadedById: true,
    createdAt: true,
    updatedAt: true,
    uploadedBy: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    },
    _count: {
      select: {
        newsCover: true,
        playerImages: true,
        u19PlayerImages: true,
        managementImages: true,
        boardImages: true,
        staffImages: true,
        sponsorLogos: true,
        productCovers: true,
        productImages: true,
      },
    },
  } satisfies Prisma.MediaFileSelect;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.bucket = this.configService.getOrThrow<string>('SUPABASE_STORAGE_BUCKET');
    this.supabase = createClient(
      this.normalizeSupabaseUrl(this.configService.getOrThrow<string>('SUPABASE_URL')),
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        realtime: {
          transport: WebSocket as any,
        },
      },
    );
  }

  onModuleInit() {
    this.validateStorageConfig();
  }

  async uploadImage(file: Express.Multer.File | undefined, user: AuthenticatedUser) {
    this.validateImage(file);

    const originalName = this.sanitizeOriginalFileName(file.originalname);
    const storagePath = this.createStoragePath(file, originalName);
    const fileName = storagePath.split('/').at(-1) ?? storagePath;

    const { error } = await this.supabase.storage.from(this.bucket).upload(storagePath, file.buffer, {
      cacheControl: '31536000',
      contentType: file.mimetype,
      upsert: false,
    });

    if (error) {
      this.logSupabaseStorageError('Supabase image upload failed', error, {
        storagePath,
        mimeType: file.mimetype,
        fileSize: file.size,
      });
      throw new InternalServerErrorException('Image upload failed.');
    }

    const { data } = this.supabase.storage.from(this.bucket).getPublicUrl(storagePath);
    const publicUrl = data.publicUrl;

    if (!publicUrl) {
      this.logger.error(
        `Supabase public URL generation failed: bucket=${this.bucket}, storagePath=${storagePath}`,
      );
      await this.removeUploadedFileAfterDatabaseFailure(storagePath);
      throw new InternalServerErrorException('Image upload failed.');
    }

    try {
      return await this.prisma.mediaFile.create({
        data: {
          bucket: this.bucket,
          storagePath,
          url: publicUrl,
          originalName,
          fileName,
          mimeType: file.mimetype,
          size: file.size,
          type: MediaFileType.IMAGE,
          uploadedById: user.id,
        },
        select: {
          id: true,
          url: true,
          storagePath: true,
          mimeType: true,
          size: true,
          originalName: true,
          fileName: true,
          createdAt: true,
        },
      });
    } catch (error) {
      await this.removeUploadedFileAfterDatabaseFailure(storagePath);
      this.logger.error(`Media database record creation failed: ${this.formatError(error)}`);
      throw new InternalServerErrorException('Image upload failed.');
    }
  }

  async getStorageHealth() {
    const result = {
      supabaseClientConfigured: true,
      bucket: this.bucket,
      bucketExists: false,
      bucketAccessible: false,
      bucketPublic: false as boolean | null,
      publicUrlStrategy: 'public bucket with getPublicUrl',
      status: 'unhealthy' as 'healthy' | 'unhealthy',
      message: '',
    };

    try {
      const { data, error } = await this.supabase.storage.getBucket(this.bucket);

      if (error) {
        this.logSupabaseStorageError('Supabase storage health check failed', error, {
          storagePath: null,
          mimeType: null,
          fileSize: null,
        });

        return {
          ...result,
          message: `Bucket "${this.bucket}" was not found or is not accessible.`,
        };
      }

      const bucketPublic = data.public ?? null;

      return {
        ...result,
        bucketExists: true,
        bucketAccessible: true,
        bucketPublic,
        status: bucketPublic === true ? 'healthy' : 'unhealthy',
        message:
          bucketPublic === true
            ? 'Supabase Storage bucket is accessible and public URLs can be used.'
            : 'Bucket is accessible but not public. Media images should use a public bucket or a signed URL strategy.',
      };
    } catch (error) {
      this.logger.error(`Supabase storage health check crashed: ${this.formatError(error)}`);

      return {
        ...result,
        message: 'Supabase Storage health check failed.',
      };
    }
  }

  async findAll(query: MediaQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.MediaFileWhereInput = {
      ...(query.mimeType ? { mimeType: query.mimeType } : {}),
      ...this.buildSearchWhere(query.search),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mediaFile.findMany({
        where,
        select: this.mediaSelect,
        orderBy: { createdAt: query.order ?? 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mediaFile.count({ where }),
    ]);

    return buildPaginatedResponse(items, total, page, limit);
  }

  async findOne(id: string) {
    const mediaFile = await this.prisma.mediaFile.findUnique({
      where: { id },
      select: this.mediaSelect,
    });

    if (!mediaFile) {
      throw new NotFoundException('Media file not found.');
    }

    const usage = await this.getUsage(id);

    return {
      ...mediaFile,
      usage,
    };
  }

  async remove(id: string) {
    // Reserve deletion before storage I/O. Shop attachments acquire the same row lock
    // and reject this marker. A failed storage deletion remains retryable.
    const mediaFile = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "MediaFile" WHERE "id" = ${id} FOR UPDATE`;
      const file = await tx.mediaFile.findUnique({ where: { id } });
      if (!file) throw new NotFoundException('Media file not found.');
      const usage = await this.getUsage(id, tx);
      if (usage.inUse) {
        throw new ConflictException({
          message: usage.references.some((reference) => reference.type.startsWith('product.'))
            ? 'Фотографију користи производ и не може да се обрише.'
            : 'Media file is in use and cannot be deleted.',
          usage,
        });
      }
      await tx.mediaFile.update({
        where: { id }, data: { deletingAt: file.deletingAt ?? new Date() },
      });
      return file;
    });

    const { error } = await this.supabase.storage
      .from(mediaFile.bucket)
      .remove([mediaFile.storagePath]);

    if (error) {
      throw new InternalServerErrorException('Media file deletion from storage failed.');
    }

    await this.prisma.mediaFile.deleteMany({ where: { id, deletingAt: { not: null } } });
    this.logger.log(`Media file deleted: id=${mediaFile.id}, storagePath=${mediaFile.storagePath}`);

    return { success: true };
  }

  private validateImage(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Image file is required.');
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG and WEBP images are allowed.');
    }

    if (!this.hasAllowedImageExtension(file.originalname, file.mimetype)) {
      throw new BadRequestException('Image file extension does not match the declared file type.');
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new BadRequestException('Image must be 5MB or smaller.');
    }

    if (!this.matchesImageSignature(file.buffer, file.mimetype)) {
      throw new BadRequestException('Image content does not match the declared file type.');
    }
  }

  private matchesImageSignature(buffer: Buffer, mimeType: string) {
    if (mimeType === 'image/jpeg') {
      return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    if (mimeType === 'image/png') {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      return buffer.length >= pngSignature.length && buffer.subarray(0, 8).equals(pngSignature);
    }

    if (mimeType === 'image/webp') {
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }

    return false;
  }

  private createStoragePath(file: Express.Multer.File, originalName: string) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const extension = IMAGE_EXTENSION_BY_MIME_TYPE[file.mimetype] ?? 'bin';
    const safeName = slugifyFileName(originalName);

    return `uploads/${year}/${month}/${randomUUID()}-${safeName}.${extension}`;
  }

  private hasAllowedImageExtension(originalName: string, mimeType: string) {
    const extension = originalName.split('.').at(-1)?.toLowerCase();
    const allowedExtensions = ALLOWED_IMAGE_EXTENSIONS_BY_MIME_TYPE[mimeType] ?? [];

    return Boolean(extension && allowedExtensions.includes(extension));
  }

  private sanitizeOriginalFileName(originalName: string) {
    const fileName = originalName
      .split(/[\\/]/)
      .at(-1)
      ?.replace(/[\u0000-\u001f\u007f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180);

    return fileName || 'image';
  }

  private buildSearchWhere(search?: string): Prisma.MediaFileWhereInput {
    const normalizedSearch = search?.trim();

    if (!normalizedSearch) {
      return {};
    }

    return {
      OR: [
        { originalName: { contains: normalizedSearch, mode: 'insensitive' } },
        { fileName: { contains: normalizedSearch, mode: 'insensitive' } },
      ],
    };
  }

  private async getUsage(id: string, client: Prisma.TransactionClient = this.prisma) {
    const [
      newsCoverCount,
      playerImageCount,
      u19PlayerImageCount,
      managementImageCount,
      boardImageCount,
      staffImageCount,
      sponsorLogoCount,
      productCoverCount,
      productImageCount,
    ] = await Promise.all([
      client.news.count({ where: { coverImageId: id } }),
      client.player.count({ where: { imageId: id } }),
      client.u19Player.count({ where: { imageId: id } }),
      client.managementMember.count({ where: { imageId: id } }),
      client.boardMember.count({ where: { imageId: id } }),
      client.staffMember.count({ where: { imageId: id } }),
      client.sponsor.count({ where: { logoId: id } }),
      client.product.count({ where: { coverImageId: id } }),
      client.productImage.count({ where: { mediaFileId: id } }),
    ]);

    const references = [
      { type: 'product.coverImage', count: productCoverCount },
      { type: 'product.gallery', count: productImageCount },
      {
        type: 'news.coverImage',
        count: newsCoverCount,
      },
      {
        type: 'player.image',
        count: playerImageCount,
      },
      {
        type: 'u19Player.image',
        count: u19PlayerImageCount,
      },
      {
        type: 'managementMember.image',
        count: managementImageCount,
      },
      {
        type: 'boardMember.image',
        count: boardImageCount,
      },
      {
        type: 'staffMember.image',
        count: staffImageCount,
      },
      {
        type: 'sponsor.logo',
        count: sponsorLogoCount,
      },
    ].filter((reference) => reference.count > 0);

    return {
      inUse: references.length > 0,
      references,
    };
  }

  private normalizeSupabaseUrl(value: string) {
    const trimmedValue = value.trim();

    try {
      const url = new URL(trimmedValue);
      return url.origin;
    } catch {
      return trimmedValue;
    }
  }

  private async removeUploadedFileAfterDatabaseFailure(storagePath: string) {
    const { error } = await this.supabase.storage.from(this.bucket).remove([storagePath]);

    if (error) {
      this.logger.warn(
        `Failed to remove orphaned upload after database error (${storagePath}): ${error.message}`,
      );
    }
  }

  private formatError(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  private validateStorageConfig() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL')?.trim();
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')?.trim();
    const bucket = this.configService.get<string>('SUPABASE_STORAGE_BUCKET')?.trim();

    if (!supabaseUrl || !this.isValidHttpsUrl(supabaseUrl)) {
      this.logger.error('SUPABASE_URL must be a valid https URL.');
    } else if (new URL(supabaseUrl).pathname !== '/') {
      this.logger.warn(
        'SUPABASE_URL should be the Supabase project root, for example https://PROJECT_ID.supabase.co. Path segments will be ignored for Storage client setup.',
      );
    }

    if (!serviceRoleKey) {
      this.logger.error('SUPABASE_SERVICE_ROLE_KEY must be configured.');
    }

    if (!bucket) {
      this.logger.error('SUPABASE_STORAGE_BUCKET must be configured.');
    }
  }

  private isValidHttpsUrl(value: string) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private logSupabaseStorageError(
    message: string,
    error: { message?: string; statusCode?: string | number; status?: string | number },
    context: {
      storagePath: string | null;
      mimeType: string | null;
      fileSize: number | null;
    },
  ) {
    const statusCode = error.statusCode ?? error.status ?? 'unknown';
    const errorMessage = error.message ?? 'unknown';

    this.logger.error(
      `${message}: errorMessage=${errorMessage}, statusCode=${statusCode}, bucket=${this.bucket}, storagePath=${context.storagePath ?? 'n/a'}, mimeType=${context.mimeType ?? 'n/a'}, fileSize=${context.fileSize ?? 'n/a'}`,
    );
  }
}
