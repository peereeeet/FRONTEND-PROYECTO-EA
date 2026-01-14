import { Component, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-registrar',
  standalone: true,            
  imports: [CommonModule, FormsModule, TranslateModule], 
  templateUrl: './registrar.component.html',
  styleUrls: ['./registrar.component.css']
})
export class RegistrarComponent {
  nuevoUsuario: User = {
    username: '',
    gmail: '',
    password: '',
    birthday: new Date(),
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

  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  // New state variables
  registrarStep: 'FORM' | 'VERIFY' = 'FORM';
  verificationCode: string = '';
  registeredEmail: string = '';
  rateLimitSeconds: number = 0;
  rateLimitTimer: any;

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

  constructor(
    private userService: UserService, 
    private authService: AuthService,
    private router: Router, 
    private translate: TranslateService,
    private route: ActivatedRoute
  ) {
    const today = new Date();
    // maxDate = hoy - 13 años (para que el calendario NO deje seleccionar menores)
    const maxDateObj = new Date();
    maxDateObj.setFullYear(today.getFullYear() - 13);
    this.maxDate = maxDateObj.toISOString().split('T')[0];
    
    // minDate = 1900-01-01 (para permitir gente mayor)
    this.minDate = '1900-01-01';
    
    this.translate.use(this.currentLang);
    const savedLang = (localStorage.getItem('lang') as 'es' | 'en') || 'es';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const step = params['step'];
      const email = params['email'];
      if (step === 'verify' && email) {
        this.registrarStep = 'VERIFY';
        this.registeredEmail = email;
      }
    });
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
    
    // Simple regex
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    this.emailValidations.format = emailRegex.test(email);
    
    if (email) {
      const domain = email.split('@')[1]?.toLowerCase();
      this.emailValidations.notTemporary = !this.temporaryDomains.includes(domain);
    } else {
      this.emailValidations.notTemporary = false;
    }
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
      this.birthdayStr !== ''
    );
  }

  onSubmit(form: any) {
    if (this.registrarStep === 'VERIFY') {
      this.verifyCode();
      return;
    }

    this.formSubmitted = true;
    this.errorMessage = '';

    if (!this.isFormValid()) {
        // Detailed validation error messages
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

    this.performRegister();
  }

  performRegister() {
     this.isSubmitting = true;
     const newUser: User = {
       username: this.nuevoUsuario.username.trim(),
       gmail: this.nuevoUsuario.gmail.trim(),
       password: this.nuevoUsuario.password?.trim(),
       birthday: new Date(this.birthdayStr),
       // eventos: [], rol: 'usuario' etc handled by backend defaults
     } as any; // Using any cast because User interface has _id which is server generated

     // We call authService.register instead of userService.addUser
     // because userService.addUser was likely the old endpoint.
     // The prompt says: "submit register: authService.register(payload)"
     this.authService.register({
       username: newUser.username,
       gmail: newUser.gmail,
       birthday: this.birthdayStr,
       password: newUser.password!
     }).subscribe({
       next: (response) => {
         this.isSubmitting = false;
         // "si response.pendingVerification true -> step VERIFY"
         if (response && response.pendingVerification) {
           this.registrarStep = 'VERIFY';
           this.registeredEmail = newUser.gmail;
           this.errorMessage = ''; 
           // Display "Te hemos enviado un código a tu correo" probably as subtitle or just implicit in UI
         } else {
           // Fallback if no pendingVerification returned (e.g. no verification needed?)
           // Prompt implies mandatory: "Registro con verificación por código obligatorio"
           // If backend returns immediate success (weird), go to login
           this.router.navigate(['/login']);
         }
       },
       error: (err) => {
         this.isSubmitting = false;
         this.handleError(err);
       }
     });
  }

  verifyCode() {
    if (!this.verificationCode || this.verificationCode.length !== 6) {
      this.errorMessage = 'LOGIN.CODE_REQUIRED'; // or translation key
      return;
    }
    this.isSubmitting = true;
    this.authService.verifyEmail(this.registeredEmail, this.verificationCode).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/login'], { queryParams: { verified: 'true' } });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.handleError(err);
      }
    });
  }

  resendCode() {
    if (this.rateLimitTimer) return;

    this.isSubmitting = true;
    this.authService.resendVerification(this.registeredEmail).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.startRateLimit(60);
      },
      error: (err) => {
        this.isSubmitting = false;
        if (err.error?.error === 'RATE_LIMITED') {
           this.startRateLimit(60);
        } else {
           this.handleError(err);
        }
      }
    });
  }

  startRateLimit(seconds: number) {
     this.rateLimitSeconds = seconds;
     this.rateLimitTimer = setInterval(() => {
       this.rateLimitSeconds--;
       if (this.rateLimitSeconds <= 0) {
         clearInterval(this.rateLimitTimer);
         this.rateLimitTimer = null;
       }
     }, 1000);
  }

  handleError(err: any){
     const code = err.error?.error || err.error?.message;
     if (code === 'INVALID_CODE') this.errorMessage = 'AUTH_ERRORS.INVALID_CODE';
     else if (code === 'EXPIRED_CODE') this.errorMessage = 'AUTH_ERRORS.EXPIRED_CODE';
     else if (code === 'TOO_MANY_ATTEMPTS') this.errorMessage = 'AUTH_ERRORS.TOO_MANY_ATTEMPTS';
     else if (code === 'RATE_LIMITED') this.errorMessage = 'AUTH_ERRORS.RATE_LIMITED';
     else if (code === 'EMAIL_EXISTS' || code === 'EMAIL_ALREADY_EXISTS') this.errorMessage = 'REGISTER.EMAIL_EXISTS';
     else if (code === 'USERNAME_EXISTS' || code === 'USERNAME_ALREADY_EXISTS') this.errorMessage = 'REGISTER.USERNAME_EXISTS';
     else this.errorMessage = code || 'COMMON.ERROR_GENERIC';
  }

  changeEmail() {
    this.registrarStep = 'FORM';
    this.errorMessage = '';
    this.verificationCode = '';
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