import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpResponse, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError, catchError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private isRefreshing: boolean = false; // Para evitar bucles infinitos

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Obtener el token del AuthService
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
    return next.handle(request).pipe(
      catchError((error: HttpResponse<any>) => {
        //Si el token expiró, intentamos refrescarlo
        if ((error.status === 401) && !this.isRefreshing) {
          console.log('Token expirado, intentando refrescar...');  
          this.isRefreshing = true;

          return this.authService.refreshToken().pipe(
            switchMap((res: any) => {
              console.log('Token refrescado:', res);
              this.isRefreshing = false;
              const newToken = res.token;
              localStorage.setItem('token', newToken);

              // Reintentar la petición original con el nuevo token
              const retryReq = request.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              console.log('Reintentando petición con nuevo token:', retryReq);
              return next.handle(retryReq);
            }),
            catchError(err => {
              if(err.status === 401){
              console.log('No se pudo refrescar el token, redirigiendo al login.', err);
              this.isRefreshing = false;
              this.authService.logout();
              return throwError(() => err);
              }
              return throwError(() => err);
              
            })
          );
          
        }
         if (error.status === 403) {
          console.warn('Acceso prohibido');
        }
        return throwError(() => error);
      })
    );
  }
}