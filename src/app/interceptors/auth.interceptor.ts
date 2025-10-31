import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import {UserService} from "../services/user.service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const currentUser = this.authService.getCurrentUser();
    if (request.url.includes('/login')) {
      return next.handle(request);
    }
    const token = this.authService.getToken();
    console.log('Interceptando petición:', request.url);
    console.log('Token actual:', token);
    //Añadimos el header Authorization si hay token
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('Token añadido a la petición:', request);
    }

    return next.handle(request);
  }
}