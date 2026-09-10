import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, PRIMARY_OUTLET, Router, UrlTree } from '@angular/router';
import { filter, map } from 'rxjs';

export function shopRouteContext(tree: UrlTree): 'shop' | 'public' | 'admin' {
  const parts = tree.root.children[PRIMARY_OUTLET]?.segments.map(segment => segment.path).filter(Boolean) ?? [];
  if (parts[0] === 'admin') return 'admin';
  if ((parts[0] === 'prodavnica' && parts.length <= 2)
    || (parts[0] === 'korpa' && parts.length === 1)
    || (parts[0] === 'porudzbina' && (parts.length === 1 || (parts.length === 2 && parts[1] === 'uspesno')))) return 'shop';
  return 'public';
}

@Injectable({ providedIn: 'root' })
export class ShopRouteService {
  private readonly router = inject(Router);
  readonly context = toSignal(this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map(event => shopRouteContext(this.router.parseUrl(event.urlAfterRedirects)))
  ), { initialValue: shopRouteContext(this.router.parseUrl(this.router.url)) });
  readonly isShop = computed(() => this.context() === 'shop');
}
