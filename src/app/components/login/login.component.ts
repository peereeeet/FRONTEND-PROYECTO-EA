import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';
import { environment } from '../../environments/environment';

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

  googleBirthdayOpen = false;
  googleRegisterOpen = false;
  private googleCredentialPending: string | null = null;
  googleBirthdayForm: FormGroup;
  googleRegisterForm: FormGroup;
  googleBirthdayError = '';
  googleRegisterError = '';
  suggestedUsername = '';
  todayISO: string;
  minBirthdayISO: string;

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

    this.googleBirthdayForm = this.fb.group({
      birthday: ['', [Validators.required]]
    });

    this.googleRegisterForm = this.fb.group({
      username: ['', [
        Validators.required, 
        Validators.minLength(3),
        Validators.maxLength(30),
        Validators.pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/)
      ]],
      birthday: ['', [Validators.required]]
    });

    const t = new Date();
    this.todayISO = new Date(Date.UTC(
      t.getFullYear(),
      t.getMonth(),
      t.getDate()
    )).toISOString().slice(0, 10);

    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 13);
    this.minBirthdayISO = new Date(Date.UTC(
      minDate.getFullYear(),
      minDate.getMonth(),
      minDate.getDate()
    )).toISOString().slice(0, 10);

    this.translate.use(this.currentLang);
    this.translate.addLangs(['es', 'en', 'cat', 'fr']);
    this.translate.setDefaultLang('es');

    const stored = (localStorage.getItem('lang') as 'es' | 'en' | 'cat' | 'fr' | null);
    const browserLang = this.translate.getBrowserLang();
    const langToUse: 'es' | 'en' | 'cat' | 'fr' =
      stored || (browserLang === 'en' ? 'en' : 'es');

    this.currentLang = langToUse;
    this.translate.use(langToUse);
  }

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (this.authService.isLoggedIn() && user?.rol == 'admin') {
      this.router.navigate(['/home']);
    } else if (this.authService.isLoggedIn()) {
      this.router.navigate(['/menu']);
    }
  }

  ngAfterViewInit(): void {
    this.initGoogleSignIn();
  }

  private initGoogleSignIn(): void {
    const render = () => {
      const g = (window as any).google;
      if (!g || !g.accounts || !g.accounts.id) {
        return false;
      }

      const locale = this.mapLocale(this.currentLang);
      g.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: any) => this.handleGoogleCredentialResponse(response),
        context: 'signin',
        locale
      });

      const btn = document.getElementById('googleSignInDiv');
      if (btn) {
        btn.innerHTML = '';
        g.accounts.id.renderButton(btn, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
        });
      }
      return true;
    };

    if (render()) return;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (render() || attempts > 20) {
        clearInterval(interval);
      }
    }, 300);
  }

  private mapLocale(lang: string): string {
    switch (lang) {
      case 'es': return 'es';
      case 'en': return 'en';
      case 'cat': return 'ca';
      case 'fr': return 'fr';
      default:   return 'en';
    }
  }

  private handleGoogleCredentialResponse(res: any): void {
    const credential = res?.credential;
    if (!credential) return;

    this.googleCredentialPending = credential;

    this.authService.checkGoogleUser(credential).subscribe({
      next: (result) => {
        if (result.exists && !result.needsData) {
          this.isLoading = true;
          this.authService.loginWithGoogle(credential)
            .pipe(finalize(() => (this.isLoading = false)))
            .subscribe({
              next: (response) => this.handleLoginSuccess(response),
              error: (error) => {
                this.errorMessage = error.error?.message || 'Error al iniciar sesión';
              }
            });
        } else if (!result.exists) {
          this.suggestedUsername = result.suggestedUsername || '';
          this.googleRegisterOpen = true;
          this.googleRegisterForm.patchValue({
            username: this.suggestedUsername,
            birthday: this.minBirthdayISO
          });
        } else if (result.needsData && !result.hasBirthday) {
          this.googleBirthdayOpen = true;
          this.googleBirthdayForm.setValue({ birthday: this.minBirthdayISO });
        }
      },
      error: (error) => {
        console.error('Error al verificar usuario:', error);
        this.errorMessage = 'Error al verificar la cuenta de Google';
      }
    });
  }

  private validateUsernameFormat(username: string): boolean {
    if (username.length < 3 || username.length > 30) return false;
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!usernameRegex.test(username)) return false;
    const reserved = ['admin', 'root', 'system', 'null', 'undefined'];
    if (reserved.includes(username.toLowerCase())) return false;
    return true;
  }

  private isTooYoung(birthdayStr: string): boolean {
    if (!birthdayStr) return false;
    const birthday = new Date(birthdayStr);
    const today = new Date();
    const age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate()) 
      ? age - 1 
      : age;
    return actualAge < 13;
  }

  private isFutureDate(birthdayStr: string): boolean {
    if (!birthdayStr) return false;
    const selected = new Date(birthdayStr);
    const today = new Date();
    return selected > today;
  }

  closeGoogleRegisterModal(): void {
    this.googleRegisterOpen = false;
    this.googleRegisterError = '';
    this.googleCredentialPending = null;
  }

  onGoogleRegisterSubmit(): void {
    if (this.googleRegisterForm.invalid || !this.googleCredentialPending) {
      this.googleRegisterForm.markAllAsTouched();
      return;
    }

    const { username, birthday } = this.googleRegisterForm.value;
    
    if (!this.validateUsernameFormat(username)) {
      this.googleRegisterError = this.translate.instant('REGISTER.USERNAME_VALID_CHARS') || 
        'El nombre de usuario debe empezar con una letra y solo contener letras, números y guiones bajos';
      return;
    }

    if (this.isTooYoung(birthday)) {
      this.googleRegisterError = this.translate.instant('REGISTER.BIRTHDAY_MIN_AGE') || 
        'Debes tener al menos 13 años para registrarte';
      return;
    }

    if (this.isFutureDate(birthday)) {
      this.googleRegisterError = this.translate.instant('REGISTER.BIRTHDAY_FUTURE') || 
        'La fecha de nacimiento no puede ser futura';
      return;
    }
    
    this.isLoading = true;
    this.googleRegisterError = '';

    this.authService.loginWithGoogle(this.googleCredentialPending, birthday, username)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.googleRegisterOpen = false;
          this.googleCredentialPending = null;
          this.handleLoginSuccess(response);
        },
        error: (error) => {
          if (error.error?.message === 'USERNAME_EXISTS') {
            this.googleRegisterError = this.translate.instant('LOGIN.USERNAME_EXISTS') || 
              'Este nombre de usuario ya está en uso';
          } else {
            this.googleRegisterError = error.error?.message || 'Error al registrar';
          }
        }
      });
  }

  closeGoogleBirthdayModal(): void {
    this.googleBirthdayOpen = false;
    this.googleBirthdayError = '';
    this.googleCredentialPending = null;
  }

  onGoogleBirthdaySubmit(): void {
    this.googleBirthdayError = '';

    if (!this.googleCredentialPending) {
      this.closeGoogleBirthdayModal();
      return;
    }

    const raw = this.googleBirthdayForm.value.birthday as string | null;
    if (!raw) {
      this.googleBirthdayError = this.translate.instant('LOGIN.BIRTHDAY_REQUIRED');
      return;
    }

    if (this.isTooYoung(raw)) {
      this.googleBirthdayError = this.translate.instant('REGISTER.BIRTHDAY_MIN_AGE') || 
        'Debes tener al menos 13 años';
      return;
    }

    if (this.isFutureDate(raw)) {
      this.googleBirthdayError = this.translate.instant('REGISTER.BIRTHDAY_FUTURE') || 
        'La fecha de nacimiento no puede ser futura';
      return;
    }

    const birth = new Date(raw);
    if (Number.isNaN(birth.getTime())) {
      this.googleBirthdayError = 'La fecha de nacimiento no es válida.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.loginWithGoogle(this.googleCredentialPending, raw)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.googleBirthdayOpen = false;
          this.googleCredentialPending = null;
          this.googleBirthdayError = '';
          this.handleLoginSuccess(response);
        },
        error: (error) => {
          console.error('Error en login con Google:', error);
          this.googleBirthdayError =
            error.error?.message ||
            this.translate.instant('LOGIN.ERROR_GOOGLE') ||
            'Error al iniciar sesión con Google';
        },
      });
  }

  private handleLoginSuccess(response: any): void {
    const role = response?.user?.rol;
    if (role === 'admin') {
      this.router.navigate(['/home']);
    } else if (role === 'usuario') {
      this.router.navigate(['/menu']);
    } else {
      this.router.navigate(['/home']);
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  changeLanguage(lang: 'es' | 'en' | 'cat' | 'fr') {
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
            this.handleLoginSuccess(response);
          },
          error: (error) => {
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
        alert('Usuario admin creado exitosamente. Ahora puedes iniciar sesión con usuario: "admin" y contraseña: "admin"');

        this.loginForm.patchValue({
          username: 'admin',
          password: 'admin'
        });
      },
      error: (error) => {
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
    setTimeout(() => {
      this.initGoogleSignIn();
    }, 0);
  }
}