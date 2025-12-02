import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import {jwtDecode} from 'jwt-decode';
import { environment } from '../environments/environment';
import { logger } from '../utils/logger';


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
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      this.currentUserSubject.next(JSON.parse(savedUser));
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/user/auth/login`, {
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

  loginWithGoogle(credential: string): Observable<LoginResponse> {
  return this.http
    .post<LoginResponse>(`${this.apiUrl}/user/auth/google`, { credential })
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
    return this.http.post(`${this.apiUrl}/user/auth/register`, userData);
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
        logger.log("Error en el localStorage:", error);
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
    return this.http.post(`${this.apiUrl}/user/auth/create-admin`, {});
  }
  
  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');
    const currentUser = localStorage.getItem('currentUser');
    if (!refreshToken || !currentUser) {
      throw new Error('No refresh token or current user found');
    }
    const user = JSON.parse(currentUser);
    return this.http.post(`${this.apiUrl}/user/refresh`, { refreshToken, userId: user._id });
  }
}