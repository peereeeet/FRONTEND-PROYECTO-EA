import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:3000/api/user';

  constructor(private http: HttpClient) {}

  getUsers(page: number = 1, limit: number = 10): Observable<{ data: User[]; page: number; totalPages: number; totalItems: number; }> {
    return this.http.get<{ data: User[]; page: number; totalPages: number; totalItems: number; }>(
      `${this.apiUrl}?page=${page}&limit=${limit}`
    );
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  addUser(user: User): Observable<User> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<User>(this.apiUrl, user, { headers });
  }

  updateUser(user: User): Observable<User> {
    if (!user._id) throw new Error('Falta _id del usuario a actualizar');
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<User>(`${this.apiUrl}/${user._id}`, user, { headers });
  }

  disableUser(id: string): Observable<User> {
  return this.http.patch<User>(`${this.apiUrl}/${id}/disable`, {});
}

  addEventToUser(userId: string, eventId: string): Observable<User> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<User>(`${this.apiUrl}/${userId}/addEvent`, { eventId }, { headers });
  }

  checkEmailExists(gmail: string, userId?: string): Observable<{ exists: boolean }> {
    const body = userId ? { gmail, userId } : { gmail };
    return this.http.post<{ exists: boolean }>(`${this.apiUrl}/check-email`, body);
  }

  checkUsernameExists(username: string, userId?: string): Observable<{ exists: boolean }> {
    const body = userId ? { username, userId } : { username };
    return this.http.post<{ exists: boolean }>(`${this.apiUrl}/check-username`, body);
  }

  updateUserRole(id: string, role: 'admin' | 'usuario'): Observable<User> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<User>(`${this.apiUrl}/${id}/role`, { role }, { headers });
  }
}