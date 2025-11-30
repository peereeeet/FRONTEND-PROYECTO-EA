import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-registrar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './registrar.component.html',
  styleUrls: ['./registrar.component.css']
})
export class RegistrarComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private themeService = inject(ThemeService);
  
  theme = this.themeService.theme;

  username = '';
  email = '';
  birthday = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';
  
  errors: any = {};

  currentLang: 'es' | 'en' | 'cat' | 'fr' = (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;

  constructor(private userService: UserService, private router: Router, private translate: TranslateService) {
    const today = new Date();
    this.maxDate = today.toISOString().split('T')[0];
    this.translate.use(this.currentLang);
    const savedLang = (localStorage.getItem('lang') as 'es' | 'en') || 'es';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    this.errors = {};
    this.errorMessage = '';

    // Validaciones
    if (!this.username || this.username.trim().length < 3) {
      this.errors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
      return;
    }

    if (!this.email || !this.isValidEmail(this.email)) {
      this.errors.email = 'Introduce un email válido';
      return;
    }

    if (!this.password || this.password.length < 6) {
      this.errors.password = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    this.loading = true;

    this.authService.register({
      username: this.username.trim(),
      gmail: this.email.trim(),
      birthday: this.birthday || undefined,
      password: this.password
    }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Error al registrar usuario';
      }
    });
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  changeLanguage(lang: 'es' | 'en') {
    if (this.currentLang === lang) return;
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  toggleLangMenu() {
    this.showLangMenu = !this.showLangMenu;
  }

  selectLanguage(lang: 'es' | 'en' | 'cat' | 'fr'): void {
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
    this.showLangMenu = false;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}