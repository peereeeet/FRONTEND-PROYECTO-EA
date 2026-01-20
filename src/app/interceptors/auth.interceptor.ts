import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpResponse, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError, catchError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private isRefreshing: boolean = false;

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (request.url.includes('/login')) {
      return next.handle(request);
    }
    const token = this.authService.getToken();
    if (token) {
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    return next.handle(request).pipe(
      catchError((error: HttpResponse<any>) => {
        if ((error.status === 401) && !this.isRefreshing) {
          this.isRefreshing = true;

          return this.authService.refreshToken().pipe(
            switchMap((res: any) => {
              this.isRefreshing = false;
              const newToken = res.token;
              localStorage.setItem('token', newToken);

              const retryReq = request.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next.handle(retryReq);
            }),
            catchError(err => {
              if(err.status === 401){
              this.isRefreshing = false;
              this.authService.logout();
              return throwError(() => err);
              }
              return throwError(() => err);
              
            })
          );
          
        }
        return throwError(() => error);
      })
    );
  }
}