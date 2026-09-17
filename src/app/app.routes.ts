import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { FriendsPageComponent } from './pages/friends-page/friends-page.component';
import { LeadershipPageComponent } from './pages/leadership-page/leadership-page.component';
import { NewsArticlePageComponent } from './pages/news-article-page/news-article-page.component';
import { NewsPageComponent } from './pages/news-page/news-page.component';
import { TeamPageComponent } from './pages/team-page/team-page.component';
import { U19TeamPageComponent } from './pages/u19-team-page/u19-team-page.component';
import { BoardPageComponent } from './pages/board-page/board-page.component';
import { NotFoundPageComponent } from './pages/not-found-page/not-found-page.component';

export const routes: Routes = [
  { path: 'porudzbina/uspesno', loadComponent: () => import('./pages/shop/order-success.component').then(m => m.OrderSuccessComponent) },
  { path: 'porudzbina', loadComponent: () => import('./pages/shop/checkout-page.component').then(m => m.CheckoutPageComponent) },
  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES)
  },
  { path: '', component: HomeComponent, title: 'KMF Crvena zvezda | Zvanični sajt futsal kluba Crvena zvezda' },
  { path: 'prodavnica', loadComponent: () => import('./pages/shop/catalog-page.component').then((m) => m.CatalogPageComponent), title: 'Продавница КМФ Црвена звезда | Званична колекција' },
  { path: 'prodavnica/:slug', loadComponent: () => import('./pages/shop/product-page.component').then((m) => m.ProductPageComponent) },
  { path: 'korpa', loadComponent: () => import('./pages/shop/cart-page.component').then((m) => m.CartPageComponent), title: 'Корпа | КМФ Црвена звезда' },
  { path: 'tim', component: TeamPageComponent, title: 'Nas tim | KMF Crvena Zvezda' },
  { path: 'u19-tim', component: U19TeamPageComponent, title: 'U19 Tim | KMF Crvena Zvezda' },
  { path: 'vesti', component: NewsPageComponent, title: 'Vesti | KMF Crvena Zvezda' },
  { path: 'vesti/:slug', component: NewsArticlePageComponent, title: 'Vest | KMF Crvena Zvezda' },
  { path: 'uprava', component: LeadershipPageComponent, title: 'Uprava kluba | KMF Crvena Zvezda' },
  { path: 'upravni-odbor', component: BoardPageComponent, title: 'Upravni odbor | KMF Crvena Zvezda' },
  { path: 'prijatelji-kluba', component: FriendsPageComponent, title: 'Партнери клуба | КМФ Црвена звезда' },
  { path: 'kontakt', component: HomeComponent, title: 'Kontakt | KMF Crvena Zvezda' },
  { path: '404', component: NotFoundPageComponent, title: '404 | KMF Crvena Zvezda' },
  { path: '**', component: NotFoundPageComponent, title: '404 | KMF Crvena Zvezda' }
];
