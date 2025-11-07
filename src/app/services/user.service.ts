import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { User } from '../models/user.model';

export interface Page<T> {
  data: T[];
  page: number;
  totalPages: number;
  totalItems: number;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:3000/api/user';

  constructor(private http: HttpClient) {}

  getUsers(page = 1, limit = 20, q = ''): Observable<Page<User>> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(q ? { q } : {})
    }).toString();
    return this.http.get<Page<User>>(`${this.apiUrl}?${params}`);
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

  updateUserRole(id: string, rol: 'admin' | 'usuario'): Observable<User> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<User>(`${this.apiUrl}/${id}/rol`, { rol }, { headers });
  }

  heartbeat(userId: string): Observable<{ _id: string; username: string; online: boolean; lastSeen: string }> {
    return this.http.post<{ _id: string; username: string; online: boolean; lastSeen: string }>(
      `${this.apiUrl}/${userId}/heartbeat`,
      {}
    );
  }

  listFriends(userId: string, page = 1, limit = 20, q = ''): Observable<Page<User>> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(q ? { q } : {})
    }).toString();
    return this.http.get<Page<User>>(`${this.apiUrl}/${userId}/friends?${params}`);
  }

  sendFriendRequest(userId: string, targetId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/friend-request`, { userId, targetId });
  }

  acceptFriendRequest(userId: string, requesterId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/friend-accept`, { userId, requesterId });
  }

  rejectFriendRequest(userId: string, requesterId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/friend-reject`, { userId, requesterId });
  }

  getFriendRequests(userId: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/friend-requests/${userId}`);
  }

  removeFriend(userId: string, friendId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${userId}/friends/${friendId}`);
  }
}