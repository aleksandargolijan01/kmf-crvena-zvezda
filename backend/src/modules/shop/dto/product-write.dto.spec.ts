import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto, UpdateProductDto } from './product-write.dto';
import { AdminProductsQueryDto, ProductsQueryDto } from './products-query.dto';

const valid = { nameSr: 'Мајица', descriptionSr: 'Памучна мајица', priceMinor: 320000 };
const options = { whitelist: true, forbidNonWhitelisted: true };

describe('product DTO validation', () => {
  it.each([-1, 0.5, '320000', null, 2147483648])('rejects invalid price %s', async (priceMinor) => {
    expect(await validate(plainToInstance(CreateProductDto, { ...valid, priceMinor }), options)).not.toHaveLength(0);
  });
  it('requires name, description and price on create but supports a real partial update', async () => {
    expect(await validate(new CreateProductDto(), options)).not.toHaveLength(0);
    expect(await validate(plainToInstance(UpdateProductDto, { active: false }), options)).toHaveLength(0);
    expect(await validate(plainToInstance(UpdateProductDto, { nameSr: null }), options)).not.toHaveLength(0);
  });
  it('validates nested sizes, unknown fields, orders and slugs', async () => {
    for (const extra of [{ variants: [{ size: ' ' }] }, { variants: [{ size: 'M', available: 'yes' }] }, { gallery: [{}] }, { gallery: null }, { displayOrder: -1 }, { slug: '../bad' }, { discountPercent: 20 }]) {
      expect(await validate(plainToInstance(CreateProductDto, { ...valid, ...extra }), options)).not.toHaveLength(0);
    }
  });
  it('accepts free-form size and nullable clearable fields', async () => {
    expect(await validate(plainToInstance(CreateProductDto, { ...valid, featuredOrder: null, newUntil: null, variants: [{ size: '3XL' }, { size: '128' }, { size: 'UNI' }] }), options)).toHaveLength(0);
  });
  it('does not allow public callers to request inactive products', async () => {
    expect(await validate(plainToInstance(ProductsQueryDto, { active: false }), options)).not.toHaveLength(0);
    const query = plainToInstance(AdminProductsQueryDto, { active: 'false', featured: 'true', page: '2' });
    expect(await validate(query, options)).toHaveLength(0);
    expect(query.active).toBe(false);
    expect(query.featured).toBe(true);
    expect(query.page).toBe(2);
  });
});
