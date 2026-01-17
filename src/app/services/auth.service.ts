import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import {jwtDecode} from 'jwt-decode';
import { environment } from '../environments/environment';


export interface User {
  _id: string;
  username: string;
  gmail: string;
  birthday: Date;
  eventos: string[];
  rol: 'admin' | 'usuario';
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
  refreshToken: string;
}

export interface RegisterData {
  username: string;
  gmail: string;
  birthday?: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Base URL is http://localhost:3000/api
  private apiUrl = environment.apiUrl; 
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  // Helper to standardise endpoints to /api/auth/... 
  // If environment.apiUrl is '.../api', we append '/auth/...'
  // Result: .../api/auth/register
  private getAuthUrl(endpoint: string): string {
    return `${this.apiUrl}/auth/${endpoint}`;
  }

  login(username: string, password: string): Observable<LoginResponse> {
    // POST /api/auth/login
    return this.http.post<LoginResponse>(this.getAuthUrl('login'), {
      username,
      password
    }).pipe(
      tap(response => {
        if (response.user) {
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          this.currentUserSubject.next(response.user);
          localStorage.setItem('token', response.token);
          localStorage.setItem('refreshToken', response.refreshToken);
        }
      })
    );
  }

  loginWithGoogle(credential: string, birthday?: string): Observable<LoginResponse> {
     // This one might be different, keeping previous logic or adapting? 
     // The prompt didn't specify changing google login path, but general instruction was "Centraliza llamadas...". 
     // I'll assume standard google login remains or uses /api/auth/google if available? 
     // Existing was /user/auth/google. 
     // User request: "el backend expone endpoints bajo /api/auth".
     // I will migrate google to /api/auth/google as well to be consistent.
    return this.http
      .post<LoginResponse>(this.getAuthUrl('google'), { credential, birthday })
      .pipe(
        tap(response => {
          if (response.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
            localStorage.setItem('token', response.token);
            localStorage.setItem('refreshToken', response.refreshToken);
          }
        })
      );
  }

  register(userData: RegisterData): Observable<any> {
    // POST /api/auth/register
    return this.http.post(this.getAuthUrl('register'), userData);
  }

  verifyEmail(email: string, otp: string): Observable<any> {
    // POST /api/auth/verify-email
    return this.http.post(this.getAuthUrl('verify-email'), { email, otp });
  }

  resendVerification(email: string): Observable<any> {
    // POST /api/auth/resend-verification
    return this.http.post(this.getAuthUrl('resend-verification'), { email });
  }

  forgotPassword(email: string): Observable<any> {
    // POST /api/auth/forgot-password
    return this.http.post(this.getAuthUrl('forgot-password'), { email });
  }

  resetPassword(email: string, otp: string, newPassword: string): Observable<any> {
    // POST /api/auth/reset-password
    return this.http.post(this.getAuthUrl('reset-password'), { email, otp, newPassword });
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    this.currentUserSubject.next(null);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
  
  isLoggedIn(): boolean {
    const user = localStorage.getItem('currentUser')
    if (!user)
      return false
      try {
          const userData = JSON.parse(user);
          const token = localStorage.getItem('token');

          if (!token){
            this.logout();
            return false;
          }

          const decoded: any = jwtDecode(token);
          if (decoded.exp && Date.now() >= decoded.exp * 1000) {
           this.logout();
           return false;
          }

         return !!userData.isActive;
        } 
      catch (error) {
        console.log("Error en el localStorage:", error);
        return false;
      }
  }
  
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserRole(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    try {
    const decoded: any = jwtDecode(token);
    return decoded.payload?.rol || null;
  } catch (error) {
    console.error('Error al decodificar token', error);
    return null;
  }
  }
  
  createAdminUser(): Observable<any> {
     // Assumed /api/auth/create-admin
    return this.http.post(this.getAuthUrl('create-admin'), {});
  }
  
  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');
    const currentUser = localStorage.getItem('currentUser');
    if (!refreshToken || !currentUser) {
      throw new Error('No refresh token or current user found');
    }
    const user = JSON.parse(currentUser);
    // Assumed /api/auth/refresh? Or /api/user/refresh? 
    // The previous code had /user/refresh. 
    // I will try to keep it consistent under /auth if possible, but maybe refresh is special.
    // The prompt didn't strictly forbid other endpoints, but said "Centraliza llamadas HTTP...".
    // I'll assume /api/auth/refresh for consistency if "user/refresh" was "user/auth/refresh"?
    // Actually the previous code was `${this.apiUrl}/user/refresh`. 
    // I will optimize to /api/auth/refresh for now.
    return this.http.post(this.getAuthUrl('refresh'), { refreshToken, userId: user._id });
  }
}