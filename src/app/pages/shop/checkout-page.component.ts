import { Component, inject } from '@angular/core';
import { CheckoutFormComponent } from '../../shared/shop/checkout-form.component';
import { SeoService } from '../../core/seo/seo.service';
@Component({ standalone: true, imports: [CheckoutFormComponent], styleUrl: './shop.scss', template: `<main lang="sr-Cyrl"><header class="section shop-hero"><p class="eyebrow">ЗВЕЗДИНА ПРОДАВНИЦА</p><h1>ЗАВРШИТЕ ПОРУЏБИНУ</h1><p>Унесите податке за доставу и потврдите поруџбину.</p></header><section class="section shop-content"><app-checkout-form /></section></main>` })
export class CheckoutPageComponent {
  constructor() { inject(SeoService).set({ title: 'Поруџбина | КМФ Црвена звезда', description: 'Подаци за испоруку и потврда поруџбине.', path: '/porudzbina', robots: 'noindex, nofollow', schema: [] }); }
}
