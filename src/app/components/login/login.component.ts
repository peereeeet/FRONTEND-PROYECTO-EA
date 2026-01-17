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

  // New state variables
  loginStep: 'LOGIN' | 'FORGOT' | 'RESET' = 'LOGIN';
  
  // Forgot/Reset state
  forgotForm: FormGroup;
  resetForm: FormGroup;
  resetEmail: string = '';
  rateLimitSeconds: number = 0;
  rateLimitTimer: any;
  sending = false;

  // Unverified email state
  unverifiedEmail: string = '';

  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  showNewPassword: boolean = false;

  currentLang: 'es' | 'en' | 'cat' | 'fr' = (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;

  googleBirthdayOpen = false;
  private googleCredentialPending: string | null = null;
  googleBirthdayForm: FormGroup;
  googleBirthdayError = '';
  todayISO: string;

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
      email: ['', [Validators.required, Validators.email]],
    });

    this.resetForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    });

    this.googleBirthdayForm = this.fb.group({
      birthday: ['']
    });

    const t = new Date();
    this.todayISO = new Date(Date.UTC(
      t.getFullYear(),
      t.getMonth(),
      t.getDate()
    )).toISOString().slice(0, 10);

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
    this.googleBirthdayOpen = true;
    this.googleCredentialPending = res?.credential;
    this.googleBirthdayError = '';
    setTimeout(() => {
        this.googleBirthdayForm.setValue({ birthday: this.todayISO });
    }, 0);
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
      this.googleBirthdayError = 'Por favor, indica tu fecha de nacimiento.';
      return;
    }
    const birth = new Date(raw);
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    if (birth > today) {
      this.googleBirthdayError = 'La fecha de nacimiento no puede ser futura.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.loginWithGoogle(this.googleCredentialPending, raw)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (response) => {
          this.closeGoogleBirthdayModal();
          this.handleLoginSuccess(response);
        },
        error: (error) => {
          console.error('Error en login con Google:', error);
          this.googleBirthdayError =
            error.error?.message ||
            this.translate.instant('LOGIN.ERROR_GOOGLE');
        },
      });
  }

  private handleLoginSuccess(response: any): void {
    const role = response?.user?.rol;
    if (role === 'admin') {
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

  // --- LOGIN FLOW ---
  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.unverifiedEmail = '';

      const { username, password } = this.loginForm.value;

      this.authService.login(username, password)
        .pipe(finalize(() => this.isLoading = false))
        .subscribe({
          next: (response) => {
            this.handleLoginSuccess(response);
          },
          error: (error) => {
             const errCode = error.error?.error; 
             if (errCode === 'EMAIL_NOT_VERIFIED') {
                this.errorMessage = 'AUTH_ERRORS.EMAIL_NOT_VERIFIED';
                if (username.includes('@')) {
                    this.unverifiedEmail = username;
                } else {
                    this.unverifiedEmail = username; 
                }
             } else {
               this.errorMessage = error.error?.message || 'LOGIN.ERROR_GENERIC';
             }
          }
        });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  resendVerificationFromLogin() {
     if (!this.unverifiedEmail) return;
     this.isLoading = true;
     this.authService.resendVerification(this.unverifiedEmail).subscribe({
         next: () => {
             this.isLoading = false;
             alert('Código reenviado a ' + this.unverifiedEmail);
         },
         error: (err) => {
             this.isLoading = false;
             if (err.error?.error === 'RATE_LIMITED') {
                 alert('Por favor espera unos segundos antes de reenviar.');
             } else {
                 alert('Error al reenviar código.');
             }
         }
     });
  }

  goToVerifyFromLogin() {
      if (!this.unverifiedEmail) return;
      this.router.navigate(['/registrar'], { queryParams: { step: 'verify', email: this.unverifiedEmail } });
  }

  // --- FORGOT FLOW ---
  openForgot() {
    this.loginStep = 'FORGOT';
    this.forgotForm.reset();
    this.errorMessage = '';
  }

  closeForgot() {
    this.loginStep = 'LOGIN';
    this.errorMessage = '';
  }

  onForgotSubmit() {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }
    this.sending = true;
    this.errorMessage = '';
    const email = this.forgotForm.value.email;

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.sending = false;
        this.resetEmail = email;
        this.loginStep = 'RESET';
      },
      error: (err) => {
        this.sending = false;
        if (err.error?.error === 'RATE_LIMITED') {
           this.errorMessage = 'AUTH_ERRORS.RATE_LIMITED';
        } else {
           const code = err.error?.error;
           if (code === 'USER_NOT_FOUND') {
               this.errorMessage = 'AUTH_ERRORS.USER_NOT_FOUND';
           } else {
               this.errorMessage = 'COMMON.ERROR_GENERIC';
           }
        }
      }
    });
  }

  // --- RESET FLOW ---
  onResetSubmit() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }
    if (this.resetForm.value.newPassword !== this.resetForm.value.confirmPassword) {
      this.errorMessage = 'REGISTER.CONFIRM_PASSWORD_MISMATCH';
      return;
    }

    this.sending = true;
    this.errorMessage = '';
    
    // Updated: using otp
    const { otp, newPassword } = this.resetForm.value;

    this.authService.resetPassword(this.resetEmail, otp, newPassword).subscribe({
      next: () => {
        this.sending = false;
        this.loginStep = 'LOGIN';
        alert(this.translate.instant('LOGIN.RESET_SUCCESS'));
      },
      error: (err) => {
        this.sending = false;
        const e = err.error?.error;
        if (e === 'INVALID_CODE') this.errorMessage = 'AUTH_ERRORS.INVALID_CODE';
        else if (e === 'EXPIRED_CODE') this.errorMessage = 'AUTH_ERRORS.EXPIRED_CODE';
        else if (e === 'TOO_MANY_ATTEMPTS') this.errorMessage = 'AUTH_ERRORS.TOO_MANY_ATTEMPTS';
        else this.errorMessage = 'COMMON.ERROR_GENERIC';
      }
    });
  }

  // UI Helpers
  togglePassword() { this.showPassword = !this.showPassword; }
  toggleNewPassword() { this.showNewPassword = !this.showNewPassword; }
  toggleConfirmPassword() { this.showConfirmPassword = !this.showConfirmPassword; }

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

  goToRegister() {
    this.router.navigate(['/registrar']);
  }

  createAdmin(): void {
    this.authService.createAdminUser().subscribe({
      next: () => {
        alert('Admin created: admin/admin');
        this.loginForm.patchValue({ username: 'admin', password: 'admin' });
      },
      error: () => this.errorMessage = 'Error creating admin'
    });
  }

  // Getters
  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }
  
  sanitizeResetCode() {
    // Updated: using otp
    const control = this.resetForm.get('otp');
    if (control) {
      let val = control.value || '';
      // Keep only digits and max 6 chars
      val = val.replace(/\D/g, '').slice(0, 6);
      control.setValue(val, { emitEvent: false });
    }
  }
}
