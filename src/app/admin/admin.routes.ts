import { Routes } from '@angular/router';
import { adminAuthGuard } from '../core/auth/auth.guard';
import { roleGuard } from '../core/auth/role.guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { LoginComponent } from './pages/login.component';

export const ADMIN_ROUTES: Routes = [
  { path: 'login', component: LoginComponent, title: 'Admin prijava | KMF Crvena Zvezda' },
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [adminAuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Dashboard | KMF Admin'
      },
      {
        path: 'forbidden',
        loadComponent: () => import('./pages/forbidden.component').then((m) => m.ForbiddenComponent),
        title: 'Forbidden | KMF Admin'
      },
      {
        path: 'news',
        loadComponent: () => import('./pages/news/news-admin.component').then((m) => m.NewsAdminComponent),
        title: 'Vesti | KMF Admin'
      },
      {
        path: 'media',
        loadComponent: () => import('./pages/media/media-admin.component').then((m) => m.MediaAdminComponent),
        title: 'Media Library | KMF Admin'
      },
      {
        path: 'players',
        loadComponent: () => import('./pages/people/people-admin.component').then((m) => m.PeopleAdminComponent),
        title: 'Igraci | KMF Admin',
        data: { section: 'players' }
      },
      {
        path: 'u19-players',
        loadComponent: () => import('./pages/people/people-admin.component').then((m) => m.PeopleAdminComponent),
        title: 'U19 igraci | KMF Admin',
        data: { section: 'players', collection: 'u19' }
      },
      {
        path: 'management',
        loadComponent: () => import('./pages/people/people-admin.component').then((m) => m.PeopleAdminComponent),
        title: 'Uprava | KMF Admin',
        data: { section: 'management' }
      },
      {
        path: 'board-members',
        loadComponent: () => import('./pages/people/people-admin.component').then((m) => m.PeopleAdminComponent),
        title: 'Upravni odbor | KMF Admin',
        data: { section: 'management', collection: 'board' }
      },
      {
        path: 'staff',
        loadComponent: () => import('./pages/people/people-admin.component').then((m) => m.PeopleAdminComponent),
        title: 'Strucni stab | KMF Admin',
        data: { section: 'staff', collection: 'staff' }
      },
      {
        path: 'sponsors',
        loadComponent: () => import('./pages/sponsors/sponsors-admin.component').then((m) => m.SponsorsAdminComponent),
        title: 'Sponzori | KMF Admin'
      },
      {
        path: 'sponsor-categories',
        redirectTo: 'sponsors',
        pathMatch: 'full'
      },
      {
        path: 'newsletter',
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'EDITOR'] },
        loadComponent: () => import('./pages/newsletter/newsletter-admin.component').then((m) => m.NewsletterAdminComponent),
        title: 'Newsletter | KMF Admin'
      }
    ]
  }
];
