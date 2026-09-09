import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CheckoutFormComponent } from '../../../../shared/shop/checkout-form.component';
@Component({ standalone: true, imports: [CheckoutFormComponent, RouterLink], styleUrl: '../shop-operations.scss', template: `<section class="operations" lang="sr-Cyrl"><header><h1>Ручни унос поруџбине</h1><a routerLink="/admin/shop/orders">НАЗАД НА ПОРУЏБИНЕ</a></header><app-checkout-form [manual]="true" /></section>` })
export class ManualOrderComponent {}
