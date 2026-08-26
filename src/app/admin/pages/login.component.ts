import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <main class="admin-login">
      <section class="login-panel">
        <div class="login-brand">
          <img src="/images/logo-kmf-crvena-zvezda.png" alt="KMF Crvena Zvezda" />
          <span>KMF Crvena Zvezda CMS</span>
        </div>
        <h1>Admin prijava</h1>
        <p>Centralno mesto za vesti, igrace, upravu, sponzore, media biblioteku i newsletter.</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <label>
            Email
            <input type="email" formControlName="email" autocomplete="email" />
          </label>
          <label>
            Lozinka
            <input type="password" formControlName="password" autocomplete="current-password" />
          </label>
          @if (error) {
            <div class="admin-error">{{ error }}</div>
          }
          <button class="admin-button primary full" type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Prijava...' : 'Prijavi se' }}
          </button>
        </form>
      </section>
    </main>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  loading = false;
  error = '';
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.getRawValue();
    this.auth.login(email.trim().toLowerCase(), password).subscribe({
      next: () => void this.router.navigate(['/admin']),
      error: () => {
        this.error = 'Email ili lozinka nisu ispravni.';
        this.loading = false;
      }
    });
  }
}
