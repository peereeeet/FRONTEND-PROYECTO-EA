import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent  {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  private starInterval: any;
  private cometInterval: any;

  forgotOpen = false;
  resetOpen = false;

  forgotForm!: FormGroup;
  resetForm!: FormGroup;

  sending = false;
  resetting = false;

  forgotInfo = '';
  forgotError = '';
  resetInfo = '';
  resetError = '';

  get forgotTouchedInvalid() {
    const c = this.forgotForm?.get('identifier');
    return !!(c && c.touched && c.invalid);
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
  private userService: UserService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }
 ngOnInit(): void {
  const user = this.authService.getCurrentUser();
    if (this.authService.isLoggedIn() && user?.rol == 'admin') {
      this.router.navigate(['/home']);
    }
    else 
      this.router.navigate(['/menu'])
  }
  
  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { username, password } = this.loginForm.value;

      this.forgotForm = this.fb.group({
        identifier: ['', [Validators.required]],
      });
      this.resetForm = this.fb.group({
        token: ['', [Validators.required, Validators.minLength(16)]],
        newPassword: ['', [Validators.required, Validators.minLength(7)]],
      });

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
            // fallback por si en el futuro hay más roles
            this.router.navigate(['/home']);
          }
          },
          error: (error) => {
            console.error('Error en login:', error);
            this.errorMessage = error.error?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
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

  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }

  openForgot(){ this.forgotOpen = true; this.forgotInfo=''; this.forgotError=''; this.forgotForm.reset(); }
  closeForgot(){ this.forgotOpen = false; }

  openReset(){ this.resetOpen = true; this.resetInfo=''; this.resetError=''; this.resetForm.reset(); }
  closeReset(){ this.resetOpen = false; }

  onForgotSubmit(){
    if (this.forgotForm.invalid) { this.forgotForm.markAllAsTouched(); return; }
    this.sending = true; this.forgotInfo=''; this.forgotError='';
    const identifier = this.forgotForm.value.identifier?.trim();

    this.userService.requestPasswordReset(identifier).subscribe({
      next: (res:any) => {
        // En dev, el backend puede devolver devToken para probar sin email
        this.forgotInfo = res?.message || 'Si el usuario existe, te enviaremos un email con instrucciones.';
        if (res?.devToken) {
          this.forgotInfo += `  (Código de prueba: ${res.devToken})`;
        }
        this.sending = false;
      },
      error: (err:any) => {
        // Respuesta neutra para no filtrar si existe o no el usuario
        this.forgotInfo = 'Si el usuario existe, te enviaremos un email con instrucciones.';
        this.sending = false;
      }
    });
  }

  onResetSubmit(){
    if (this.resetForm.invalid) { this.resetForm.markAllAsTouched(); return; }
    this.resetting = true; this.resetError=''; this.resetInfo='';

    const { token, newPassword } = this.resetForm.value;
    this.userService.resetPassword(token, newPassword).subscribe({
      next: () => {
        this.resetInfo = 'Tu contraseña se ha actualizado correctamente. Ya puedes iniciar sesión.';
        this.resetting = false;
      },
      error: (err:any) => {
        this.resetError = err?.error?.message || 'El código no es válido o ha caducado.';
        this.resetting = false;
      }
    });
  }
}