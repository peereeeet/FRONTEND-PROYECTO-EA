import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class authGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    const rol = this.authService.getUserRole();

    if (rol === 'admin') {
      return true;
    }

    // Si no es admin, redirigimos a otra página (por ejemplo home)
    this.router.navigate(['/']);
    return false;
  }
}
