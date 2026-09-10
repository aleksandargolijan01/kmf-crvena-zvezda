import { TranslationService } from '../../i18n/translation.service';
import { Component, inject } from '@angular/core';
import { CheckoutFormComponent } from '../../shared/shop/checkout-form.component';
import { SeoService } from '../../core/seo/seo.service';
@Component({ standalone: true, imports: [CheckoutFormComponent], styleUrl: './shop.scss', template: `<main><header class="section shop-hero"><p class="eyebrow">{{ i18n.t('shop.zvezdaShop') }}</p><h1>{{ i18n.t('shop.completeOrder') }}</h1><p>{{ i18n.t('shop.checkoutIntro') }}</p></header><section class="section shop-content"><app-checkout-form /></section></main>` })
export class CheckoutPageComponent {
  readonly i18n = inject(TranslationService);
  constructor() { inject(SeoService).set({ title: '', description: '', titleKey: 'shop.checkoutTitle', descriptionKey: 'shop.checkoutDescription', path: '/porudzbina', robots: 'noindex, nofollow', schema: [] }); }
}
