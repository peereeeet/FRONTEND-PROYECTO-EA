import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';
import { InterestSelectorComponent } from '../interest-selector/interest-selector.component';

@Component({
  selector: 'app-registrar',
  standalone: true,            
  imports: [CommonModule, FormsModule, TranslateModule, InterestSelectorComponent], 
  templateUrl: './registrar.component.html',
  styleUrls: ['./registrar.component.css']
})
export class RegistrarComponent {
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

  constructor(private userService: UserService, private router: Router, private translate: TranslateService) {
    const t = new Date();
    this.maxDate = new Date(Date.UTC(
      t.getFullYear(),
      t.getMonth(),
      t.getDate()
    )).toISOString().split('T')[0];
    
    const minDateCalc = new Date();
    minDateCalc.setFullYear(minDateCalc.getFullYear() - 13);
    this.minDate = new Date(Date.UTC(
      minDateCalc.getFullYear(),
      minDateCalc.getMonth(),
      minDateCalc.getDate()
    )).toISOString().split('T')[0];
    
    this.birthdayStr = this.minDate;
    
    this.translate.use(this.currentLang);
    const savedLang = (localStorage.getItem('lang') as 'es' | 'en' | 'cat' | 'fr') || 'es';
    this.currentLang = savedLang;
    this.translate.use(savedLang);
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

    this.isCheckingEmail = true;
    this.userService.checkEmailExists(this.nuevoUsuario.gmail).subscribe({
      next: (res) => {
        this.isCheckingEmail = false;
        if (res.exists) {
          this.emailExists = true;
          this.errorMessage = 'Este correo ya está registrado.';
          return;
        }
        
        this.isCheckingUsername = true;
        this.userService.checkUsernameExists(this.nuevoUsuario.username).subscribe({
          next: (res) => {
            this.isCheckingUsername = false;
            if (res.exists) {
              this.usernameExists = true;
              this.errorMessage = 'Este nombre de usuario ya está en uso.';
              return;
            }

            this.isSubmitting = true;

            const newUser: User = {
              username: this.nuevoUsuario.username.trim(),
              gmail: this.nuevoUsuario.gmail.trim(),
              password: this.nuevoUsuario.password?.trim(),
              birthday: new Date(this.birthdayStr),
              interests: this.selectedInterests,
            };

            this.userService.addUser(newUser).subscribe({
              next: () => {
                this.isSubmitting = false;
                this.router.navigate(['/login']);
              },
              error: (err) => {
                this.isSubmitting = false;
                this.errorMessage =
                  err?.error?.message ||
                  'Ha ocurrido un error al registrar el usuario. Inténtalo nuevamente.';
              }
            });
          },
          error: () => {
            this.isCheckingUsername = false;
            this.errorMessage = 'Error al verificar el nombre de usuario.';
          }
        });
      },
      error: () => {
        this.isCheckingEmail = false;
        this.errorMessage = 'Error al verificar el correo.';
      }
    });
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