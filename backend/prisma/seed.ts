import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const defaultSponsorCategories = [
  {
    name_sr: 'Насловни спонзор',
    name_en: 'Title sponsor',
    name_ru: 'Титульный спонсор',
    slug: 'naslovni-sponzor',
    order: 1,
  },
  {
    name_sr: 'Златни спонзори',
    name_en: 'Gold sponsors',
    name_ru: 'Золотые спонсоры',
    slug: 'zlatni-sponzori',
    order: 2,
  },
  {
    name_sr: 'Сребрни спонзори',
    name_en: 'Silver sponsors',
    name_ru: 'Серебряные спонсоры',
    slug: 'srebrni-sponzori',
    order: 3,
  },
  {
    name_sr: 'Бронзани спонзори',
    name_en: 'Bronze sponsors',
    name_ru: 'Бронзовые спонсоры',
    slug: 'bronzani-sponzori',
    order: 4,
  },
  {
    name_sr: 'Пријатељи клуба',
    name_en: 'Friends of the club',
    name_ru: 'Друзья клуба',
    slug: 'prijatelji-kluba',
    order: 5,
  },
];

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for Prisma seed.`);
  }

  return value;
}

function splitName(fullName: string) {
  const [firstName, ...rest] = fullName.trim().split(/\s+/);

  return {
    firstName: firstName || null,
    lastName: rest.length ? rest.join(' ') : null,
  };
}

async function main() {
  await seedSuperAdmin();
  await seedSponsorCategories();
}

async function seedSuperAdmin() {
  const email = getRequiredEnv('SUPER_ADMIN_EMAIL').toLowerCase().trim();
  const password = getRequiredEnv('SUPER_ADMIN_PASSWORD');
  const name = getRequiredEnv('SUPER_ADMIN_NAME');
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    console.log('Super admin user already exists. Skipping seed.');
    return;
  }

  const { firstName, lastName } = splitName(name);
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log('Super admin user created.');
}

async function seedSponsorCategories() {
  for (const category of defaultSponsorCategories) {
    await prisma.sponsorCategory.upsert({
      where: { slug: category.slug },
      update: {
        name_sr: category.name_sr,
        name_en: category.name_en,
        name_ru: category.name_ru,
        order: category.order,
        active: true,
      },
      create: {
        ...category,
        active: true,
      },
    });
  }

  console.log('Default sponsor categories seeded.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
