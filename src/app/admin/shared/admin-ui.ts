import { PageResponse } from '../../core/api/admin-api.models';
import { MonoTypeOperatorFunction, retry, timeout, timer } from 'rxjs';

const adminRequestTimeoutMs = 12000;

export function rowsOf<T>(response: PageResponse<T> | T[] | null | undefined): T[] {
  if (!response) {
    return [];
  }
  return Array.isArray(response) ? response : response.data ?? [];
}

export function totalOf<T>(response: PageResponse<T> | T[] | null | undefined): number {
  if (!response) {
    return 0;
  }
  if (Array.isArray(response)) {
    return response.length;
  }
  return response.meta?.total ?? response.total ?? response.data?.length ?? 0;
}

export function formatDate(value?: string | null): string {
  return value ? new Intl.DateTimeFormat('sr-RS', { dateStyle: 'medium' }).format(new Date(value)) : 'Nije objavljeno';
}

export function fileSize(bytes = 0): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function adminLoadGuard<T>(): MonoTypeOperatorFunction<T> {
  return (source) =>
    source.pipe(
      timeout({ first: adminRequestTimeoutMs }),
      retry({ count: 1, delay: () => timer(350) })
    );
}
