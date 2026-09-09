import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  standalone: true, imports: [RouterLink],
  template: `<section class="admin-page">
    <div class="admin-page-head"><div><span class="admin-kicker">ПРОДАВНИЦА</span><h1>{{ title }}</h1></div></div>
    <section class="admin-card"><div class="empty-state">
      <p>Овај одељак биће доступан у наредној фази.</p>
      <a class="admin-button primary" routerLink="/admin/shop/products">Производи</a>
    </div></section>
  </section>`
})
export class ShopPlaceholderComponent {
  readonly title = inject(ActivatedRoute).snapshot.data['label'] as string;
}
