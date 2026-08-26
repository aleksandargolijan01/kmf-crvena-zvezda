import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-forbidden',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="admin-page">
      <div class="empty-state forbidden-state">
        <strong>Nemate dozvolu za ovu sekciju.</strong>
        <span>Kontaktirajte super admina ako vam treba pristup.</span>
        <a class="admin-button primary" routerLink="/admin">Nazad na dashboard</a>
      </div>
    </section>
  `
})
export class ForbiddenComponent {}
