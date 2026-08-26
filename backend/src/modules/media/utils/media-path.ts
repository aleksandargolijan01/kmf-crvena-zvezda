export function slugifyFileName(originalName: string) {
  const withoutExtension = originalName.replace(/\.[^/.]+$/, '');
  const slug = withoutExtension
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'dj')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);

  return slug || 'image';
}
