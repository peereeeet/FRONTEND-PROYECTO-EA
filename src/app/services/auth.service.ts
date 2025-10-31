import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import {jwtDecode} from 'jwt-decode';


export interface User {
  _id: string;
  username: string;
  gmail: string;
  birthday: Date;
  eventos: string[];
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Verificar si hay un usuario en localStorage al inicializar
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
    return !!this.currentUserSubject.value;
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
  // Método para crear admin (solo desarrollo)
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