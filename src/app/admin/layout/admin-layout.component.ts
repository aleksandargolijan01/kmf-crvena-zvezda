import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../shared/toast.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [AsyncPipe, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="admin-shell" [class.sidebar-open]="sidebarOpen">
      <aside class="admin-sidebar">
        <a class="admin-brand" routerLink="/admin" (click)="sidebarOpen = false">
          <img src="/images/logo-kmf-crvena-zvezda.png" alt="KMF Crvena Zvezda" />
          <span>
            <strong>KMF CZV CMS</strong>
            <small>Club operations</small>
          </span>
        </a>

        <nav class="admin-nav" aria-label="Admin navigacija">
          @for (item of nav; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: item.route === '/admin' }" (click)="sidebarOpen = false">
              <span class="nav-icon">{{ item.icon }}</span>
              {{ item.label }}
            </a>
          }
          @if (auth.user$ | async; as user) {
            @if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
              <span class="admin-kicker" style="padding: 18px 14px 4px;">ПРОДАВНИЦА</span>
              @for (item of shopNav; track item.route) {
                <a [routerLink]="item.route" routerLinkActive="is-active" (click)="sidebarOpen = false">
                  <span class="nav-icon">{{ item.icon }}</span>{{ item.label }}
                </a>
              }
            }
          }
        </nav>
      </aside>

      <div class="admin-backdrop" (click)="sidebarOpen = false"></div>

      <section class="admin-workspace">
        <header class="admin-topbar">
          <button class="icon-button mobile-only" type="button" aria-label="Otvori navigaciju" (click)="sidebarOpen = true">☰</button>
          <div>
            <span class="admin-kicker">Admin panel</span>
            <strong>Crvena Zvezda futsal CMS</strong>
          </div>
          <div class="topbar-actions">
            @if (auth.user$ | async; as user) {
              <span class="admin-user">
                <b>{{ user.firstName || user.email }}</b>
                <small>{{ user.role }}</small>
              </span>
            }
            <button class="admin-button ghost" type="button" (click)="auth.logout()">Odjava</button>
          </div>
        </header>
        <main class="admin-main">
          <router-outlet />
        </main>
        <div class="toast-stack" aria-live="polite">
          @for (message of toasts.messages$ | async; track message.id) {
            <button class="toast" [class]="message.type" type="button" (click)="toasts.dismiss(message.id)">
              {{ message.text }}
            </button>
          }
        </div>
      </section>
    </div>
  `
})
export class AdminLayoutComponent {
  sidebarOpen = false;
  readonly shopNav: NavItem[] = [
    { label: 'Производи', route: '/admin/shop/products', icon: 'П' },
    { label: 'Поруџбине', route: '/admin/shop/orders', icon: 'Н' },
    { label: 'Сезонске карте', route: '/admin/shop/season-tickets', icon: 'К' }
  ];
  readonly nav: NavItem[] = [
    { label: 'Dashboard', route: '/admin', icon: 'D' },
    { label: 'Vesti', route: '/admin/news', icon: 'N' },
    { label: 'Media', route: '/admin/media', icon: 'M' },
    { label: 'Igraci', route: '/admin/players', icon: 'P' },
    { label: 'U19 igraci', route: '/admin/u19-players', icon: 'U19' },
    { label: 'Uprava', route: '/admin/management', icon: 'U' },
    { label: 'Upravni odbor', route: '/admin/board-members', icon: 'O' },
    { label: 'Стручни штаб', route: '/admin/staff', icon: 'SŠ' },
    { label: 'Sponzori', route: '/admin/sponsors', icon: 'S' },
    { label: 'Newsletter', route: '/admin/newsletter', icon: '@' }
  ];

  constructor(readonly auth: AuthService, readonly toasts: ToastService) {}
}
