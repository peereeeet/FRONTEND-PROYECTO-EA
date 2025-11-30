import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private themeService = inject(ThemeService);
  theme = this.themeService.theme;

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  forgotOpen = false;
  sending = false;
  forgotForm!: FormGroup;

  showPassword: boolean = false;
  showDirectPassword: boolean = false;

  directOpen = false;
  directForm!: FormGroup;
  foundUserId: string | null = null;
  foundUserLabel = '';
  directSaving = false;

  currentLang: 'es' | 'en' | 'cat' | 'fr' = (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;

  get forgotTouchedInvalid() {
    const c = this.forgotForm?.get('identifier');
    return !!(c && c.touched && c.invalid);
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private translate: TranslateService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });

    this.forgotForm = this.fb.group({
      identifier: ['', [Validators.required]],
    });
    this.directForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(7)]],
    });

    this.translate.use(this.currentLang);
    this.translate.addLangs(['es', 'en']);
    this.translate.setDefaultLang('es');

    const stored = (localStorage.getItem('lang') as 'es' | 'en' | null);
    const browserLang = this.translate.getBrowserLang();
    const langToUse: 'es' | 'en' =
      stored || (browserLang === 'en' ? 'en' : 'es');

    this.currentLang = langToUse;
    this.translate.use(langToUse);
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (this.authService.isLoggedIn() && user?.rol == 'admin') {
      this.router.navigate(['/home']);
    } else {
      this.router.navigate(['/menu']);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  changeLanguage(lang: 'es' | 'en') {
    if (this.currentLang === lang) return;
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { username, password } = this.loginForm.value;

      this.authService.login(username, password)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (response) => {
            const role = response.user.rol;
            if (role === 'admin') {
              this.router.navigate(['/home']);
            } else if (role === 'usuario') {
              this.router.navigate(['/menu']);
            } else {
              this.router.navigate(['/home']);
            }
          },
          error: (error) => {
            console.error('Error en login:', error);
            this.errorMessage =
              error.error?.message ||
              this.translate.instant('LOGIN.ERROR_GENERIC');
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  createAdmin(): void {
    this.authService.createAdminUser().subscribe({
      next: (response) => {
        console.log('Admin creado:', response);
        alert('Usuario admin creado exitosamente. Ahora puedes iniciar sesión con usuario: "admin" y contraseña: "admin"');

        this.loginForm.patchValue({
          username: 'admin',
          password: 'admin'
        });
      },
      error: (error) => {
        console.error('Error creando admin:', error);
        this.errorMessage = 'Error creando usuario admin';
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/registrar']);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      this.loginForm.get(key)?.markAsTouched();
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleDirectPassword() {
    this.showDirectPassword = !this.showDirectPassword;
  }

  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }

  openForgot() {
    this.forgotOpen = true;
    this.foundUserId = null;
    this.directOpen = false;
    this.forgotForm.reset();
  }
  closeForgot() { this.forgotOpen = false; }

  openDirect() {
    this.directOpen = true;
    this.directForm.reset();
  }
  closeDirect() {
    this.directOpen = false;
    this.foundUserId = null;
  }

  onForgotSubmit() {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }
    this.sending = true;

    const identifier = (this.forgotForm.value.identifier || '').trim();
    this.userService.checkUserExistsForReset(identifier).subscribe({
      next: (res: any) => {
        this.sending = false;

        const exists = !!(res?.exists || res?.exist);
        const userId = res?.userId || res?._id || res?.id || null;

        if (exists && userId) {
          this.foundUserId = userId;
          const u = (res?.username || '').trim();
          const g = (res?.gmail || '').trim();
          this.foundUserLabel = (u && g) ? `${u} (${g})` : (u || g || '');

          this.forgotOpen = false;
          this.directOpen = true;

          this.directForm.reset();
          setTimeout(() => {
            const el = document.getElementById('newPasswordDirect') as HTMLInputElement | null;
            if (el) el.focus();
          }, 0);
        } else {
          alert('No existe un usuario con ese email o nombre de usuario.');
        }
      },
      error: (err) => {
        this.sending = false;
        alert('No se pudo comprobar el usuario.');
        console.error('checkUserExistsForReset error:', err);
      }
    });
  }

  onDirectResetSubmit() {
    if (this.directForm.invalid || !this.foundUserId) {
      this.directForm.markAllAsTouched();
      return;
    }
    this.directSaving = true;
    const pwd = this.directForm.value.newPassword;

    this.userService.directResetPassword(this.foundUserId, pwd).subscribe({
      next: () => {
        this.directSaving = false;
        this.closeDirect();
        alert('Contraseña actualizada. Ya puedes iniciar sesión.');
      },
      error: (err: any) => {
        this.directSaving = false;
        alert(err?.error?.message || 'No se pudo actualizar la contraseña.');
      }
    });
  }

  toggleLangMenu(): void {
    this.showLangMenu = !this.showLangMenu;
  }

  selectLanguage(lang: 'es' | 'en' | 'cat' | 'fr'): void {
    this.currentLang = lang;
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
    this.showLangMenu = false;
  }
}