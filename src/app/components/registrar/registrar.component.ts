import { Component, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { AuthService, RegisterData } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';
import { InterestSelectorComponent } from '../interest-selector/interest-selector.component';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-registrar',
  standalone: true,            
  imports: [CommonModule, FormsModule, TranslateModule, ReactiveFormsModule, InterestSelectorComponent], 
  templateUrl: './registrar.component.html',
  styleUrls: ['./registrar.component.css']
})
export class RegistrarComponent implements OnDestroy {
  nuevoUsuario: User = {
    username: '',
    gmail: '',
    password: '',
    birthday: new Date(),
    interests: [],
  };

  private themeService = inject(ThemeService);
  theme = this.themeService.theme;

  confirmarPassword = '';
  birthdayStr = '';
  maxDate: string;
  minDate: string;
  formSubmitted = false;
  errorMessage = '';
  isSubmitting = false;
  emailExists: boolean = false;
  isCheckingEmail: boolean = false;
  isCheckingUsername = false;
  usernameExists = false;

  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  registrarStep: 'FORM' | 'VERIFY' = 'FORM';
  otpControl = new FormControl('', [
    Validators.required, 
    Validators.pattern(/^\d{6}$/)
  ]);

  resendCooldown: number = 0;
  resendTimer: any;

  showInterestsModal: boolean = false
  selectedInterests: string[] = [];

  passwordStrength = 0;
  passwordValidations = {
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  };

  emailValidations = {
    format: false,
    notTemporary: false
  };

  currentLang: 'es' | 'en' | 'cat' | 'fr' = (localStorage.getItem('lang') as any) || 'es';
  showLangMenu = false;

  private temporaryDomains = [
    'tempmail.com', '10minutemail.com', 'guerrillamail.com', 
    'mailinator.com', 'throwaway.email', 'temp-mail.org'
  ];


  private usernameSubject = new Subject<string>();
  private emailSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private userService: UserService, private authService: AuthService, private router: Router, private translate: TranslateService) {
    const t = new Date();
    this.maxDate = new Date(Date.UTC(
      t.getFullYear(),
      t.getMonth(),
      t.getDate()
    )).toISOString().split('T')[0];
    
    this.minDate = '1900-01-01';
    
    this.birthdayStr = '';
    
    this.translate.use(this.currentLang);
    const savedLang = (localStorage.getItem('lang') as 'es' | 'en' | 'cat' | 'fr') || 'es';
    this.currentLang = savedLang;
    this.translate.use(savedLang);

    this.usernameSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(username => {
      if (username && username.length >= 3 && this.validateUsername()) {
        this.checkUsernameAvailability(username);
      }
    });

    this.emailSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(email => {
      if (email && this.emailValidations.format) {
        this.checkEmailAvailability(email);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }

  isTooYoung(): boolean {
    if (!this.birthdayStr) return false;
    const birthday = new Date(this.birthdayStr);
    const today = new Date();
    const age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate()) 
      ? age - 1 
      : age;
    return actualAge < 13;
  }

  isFutureDate(): boolean {
    if (!this.birthdayStr) return false;
    const selected = new Date(this.birthdayStr);
    const today = new Date();
    return selected > today;
  }

  validateEmail(): void {
    const email = this.nuevoUsuario.gmail.trim();
    
    const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
    this.emailValidations.format = emailRegex.test(email);
    
    if (email) {
      const domain = email.split('@')[1]?.toLowerCase();
      this.emailValidations.notTemporary = !this.temporaryDomains.includes(domain);
      
      if (this.emailValidations.format && this.emailValidations.notTemporary) {
        this.emailSubject.next(email);
      }
    } else {
      this.emailValidations.notTemporary = false;
    }
  }

  onUsernameInput(): void {
    const username = this.nuevoUsuario.username.trim();
    this.usernameExists = false;
    if (username.length >= 3) {
      this.usernameSubject.next(username);
    }
  }

  checkUsernameAvailability(username: string): void {
    this.isCheckingUsername = true;
    this.userService.checkUsernameExists(username).subscribe({
      next: (res) => {
        this.usernameExists = res.exists;
        this.isCheckingUsername = false;
      },
      error: () => {
        this.isCheckingUsername = false;
      }
    });
  }

  checkEmailAvailability(email: string): void {
    this.isCheckingEmail = true;
    this.userService.checkEmailExists(email).subscribe({
      next: (res) => {
        this.emailExists = res.exists;
        this.isCheckingEmail = false;
      },
      error: () => {
        this.isCheckingEmail = false;
      }
    });
  }

  validatePassword(): void {
    const pwd = this.nuevoUsuario.password || '';
    this.passwordValidations.length = pwd.length >= 8;   
    this.passwordValidations.uppercase = /[A-Z]/.test(pwd); 
    this.passwordValidations.lowercase = /[a-z]/.test(pwd);
    this.passwordValidations.number = /[0-9]/.test(pwd);
    this.passwordValidations.special = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
    this.passwordStrength = Object.values(this.passwordValidations).filter(v => v).length;
  }

  getPasswordStrengthClass(): string {
    if (this.passwordStrength <= 1) return 'strength-weak';
    if (this.passwordStrength <= 3) return 'strength-medium';
    return 'strength-strong';
  }

  getPasswordStrengthText(): string {
    if (this.passwordStrength === 0) return '';
    if (this.passwordStrength <= 2) return 'WEAK';
    if (this.passwordStrength <= 4) return 'MEDIUM';
    return 'STRONG';
  }

  validateUsername(): boolean {
    const username = this.nuevoUsuario.username.trim();
    
    if (username.length < 3 || username.length > 30) return false;
    
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!usernameRegex.test(username)) return false;
    
    const reserved = ['admin', 'root', 'system', 'null', 'undefined'];
    if (reserved.includes(username.toLowerCase())) return false;
    
    return true;
  }

  passwordsMatch(): boolean {
    return this.nuevoUsuario.password === this.confirmarPassword;
  }

  isFormValid(): boolean {
    return (
      this.validateUsername() &&
      this.emailValidations.format &&
      this.emailValidations.notTemporary &&
      this.passwordStrength === 5 &&
      this.passwordsMatch() &&
      !this.isTooYoung() &&
      !this.isFutureDate() &&
      this.birthdayStr !== '' &&
      !this.usernameExists &&
      !this.emailExists
    );
  }

  openInterestsModal(): void {
    this.showInterestsModal = true;
  }

  closeInterestsModal(): void {
    this.showInterestsModal = false;
  }

  onInterestsChange(interests: string[]): void {
    this.selectedInterests = interests;
    this.nuevoUsuario.interests = interests;
  }

  onSubmit(form: any) {
    this.formSubmitted = true;
    this.errorMessage = '';
    this.emailExists = false;

    if (!this.isFormValid()) {
      if (!this.validateUsername()) {
        this.errorMessage = 'El nombre de usuario no es válido.';
      } else if (!this.emailValidations.format) {
        this.errorMessage = 'El formato del correo electrónico no es válido.';
      } else if (!this.emailValidations.notTemporary) {
        this.errorMessage = 'No se permiten correos electrónicos temporales.';
      } else if (this.passwordStrength !== 5) {
        this.errorMessage = 'La contraseña debe cumplir todos los requisitos de seguridad.';
      } else if (!this.passwordsMatch()) {
        this.errorMessage = 'Las contraseñas no coinciden.';
      } else if (this.isTooYoung()) {
        this.errorMessage = 'Debes tener al menos 13 años para registrarte.';
      } else if (this.isFutureDate()) {
        this.errorMessage = 'La fecha de nacimiento no puede ser futura.';
      } else {
        this.errorMessage = 'Por favor, revisa los campos del formulario.';
      }
      return;
    }

    this.isSubmitting = true;

    const [y, m, d] = this.birthdayStr.split('-').map(x => parseInt(x, 10));
    const correctBirthday = new Date(Date.UTC(y, m - 1, d));

    const registerPayload: RegisterData = {
      username: this.nuevoUsuario.username.trim(),
      gmail: this.nuevoUsuario.gmail.trim(),
      password: this.nuevoUsuario.password?.trim() || '',
      birthday: correctBirthday.toISOString(),
      interests: this.selectedInterests
    };

    this.authService.register(registerPayload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.pendingEmail = this.nuevoUsuario.gmail; 
        this.registrarStep = 'VERIFY';
        this.startResendTimer();
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message || err?.error?.error || 'Ha ocurrido un error al registrar el usuario.';
        this.errorMessage = msg;
      }
    });
  }

  pendingEmail = '';
  
  onVerify() {
    if (this.otpControl.invalid) {
      this.otpControl.markAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = '';

    const otpValue = this.otpControl.value || '';
    
    this.authService.verifyEmail(this.pendingEmail, otpValue).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/login']);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message;
        if (msg === 'INVALID_CODE') {
           this.errorMessage = 'El código es incorrecto.';
        } else if (msg === 'EXPIRED_CODE') {
           this.errorMessage = 'El código ha expirado. Solicita uno nuevo.';
        } else {
           this.errorMessage = msg || 'Error al verificar el código.';
        }
      }
    });
  }

  onResend() {
    if (this.resendCooldown > 0) return;
    
    this.errorMessage = '';
    this.authService.resendVerification(this.pendingEmail).subscribe({
      next: () => {
        this.startResendTimer();
        alert('Código reenviado. Revisa tu correo.');
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'No se pudo reenviar el código.';
      }
    });
  }

  startResendTimer() {
    this.resendCooldown = 60;
    if (this.resendTimer) clearInterval(this.resendTimer);
    this.resendTimer = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) {
        clearInterval(this.resendTimer);
      }
    }, 1000);
  }

  sanitizeOtp(input: any) {
    let val = input.target.value.replace(/[^0-9]/g, '');
    if (val.length > 6) val = val.substring(0, 6);
    this.otpControl.setValue(val);
  }

  backToRegister() {
    this.registrarStep = 'FORM';
    this.errorMessage = '';
    this.otpControl.reset();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
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

  goToLogin() {
    this.router.navigate(['/login']);
  }
  
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  usernameStartsWithLetter(): boolean {
    return /^[a-zA-Z]/.test(this.nuevoUsuario.username);
  }

  usernameHasValidChars(): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(this.nuevoUsuario.username);
  }
}