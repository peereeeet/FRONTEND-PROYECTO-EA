import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Notificacion } from '../models/notificacion.model';

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private apiUrl = 'http://localhost:3000/api/notificaciones';
  
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();
  private notificacionesSubject = new BehaviorSubject<Notificacion[]>([]);
  public notificaciones$ = this.notificacionesSubject.asObservable();

  constructor(private http: HttpClient) {}

  getUserNotificaciones(userId: string, limit = 50): Observable<{ ok: boolean; data: Notificacion[] }> {
    return this.http.get<{ ok: boolean; data: Notificacion[] }>(
      `${this.apiUrl}/${userId}?limit=${limit}`
    ).pipe(
      tap(response => {
        if (response.ok) {
          this.notificacionesSubject.next(response.data);
          this.updateUnreadCount(response.data);
        }
      })
    );
  }

  getUnreadNotificaciones(userId: string): Observable<{ ok: boolean; data: Notificacion[] }> {
    return this.http.get<{ ok: boolean; data: Notificacion[] }>(
      `${this.apiUrl}/${userId}/unread`
    ).pipe(
      tap(response => {
        if (response.ok) {
          this.updateUnreadCount(response.data);
        }
      })
    );
  }

  getUnreadCount(userId: string): Observable<{ ok: boolean; count: number }> {
    return this.http.get<{ ok: boolean; count: number }>(
      `${this.apiUrl}/${userId}/unread/count`
    ).pipe(
      tap(response => {
        if (response.ok) {
          this.unreadCountSubject.next(response.count);
        }
      })
    );
  }

  markAsRead(notificacionId: string): Observable<{ ok: boolean; message: string }> {
    return this.http.patch<{ ok: boolean; message: string }>(
      `${this.apiUrl}/${notificacionId}/read`,
      {}
    ).pipe(
      tap(response => {
        if (response.ok) {
          this.updateLocalNotificaciones(notificacionId, true);
        }
      })
    );
  }

  markAllAsRead(userId: string): Observable<{ ok: boolean; message: string }> {
    return this.http.patch<{ ok: boolean; message: string }>(
      `${this.apiUrl}/${userId}/read-all`,
      {}
    ).pipe(
      tap(response => {
        if (response.ok) {
          const currentNotificaciones = this.notificacionesSubject.value;
          const updated = currentNotificaciones.map(n => ({ ...n, read: true }));
          this.notificacionesSubject.next(updated);
          this.unreadCountSubject.next(0);
        }
      })
    );
  }

  deleteNotificacion(notificacionId: string): Observable<{ ok: boolean; message: string }> {
    return this.http.delete<{ ok: boolean; message: string }>(
      `${this.apiUrl}/${notificacionId}`
    ).pipe(
      tap(response => {
        if (response.ok) {
          const currentNotificaciones = this.notificacionesSubject.value;
          const filtered = currentNotificaciones.filter(n => n._id !== notificacionId);
          this.notificacionesSubject.next(filtered);
          this.updateUnreadCount(filtered);
        }
      })
    );
  }

  addNotificacion(notificacion: Notificacion) {
    const current = this.notificacionesSubject.value;
    this.notificacionesSubject.next([notificacion, ...current]);
    if (!notificacion.read) {
      this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
    }
  }

  private updateUnreadCount(notificaciones: Notificacion[]) {
    const count = notificaciones.filter(n => !n.read).length;
    this.unreadCountSubject.next(count);
  }

  private updateLocalNotificaciones(notificacionId: string, read: boolean) {
    const current = this.notificacionesSubject.value;
    const updated = current.map(n => 
      n._id === notificacionId ? { ...n, read } : n
    );
    this.notificacionesSubject.next(updated);
    this.updateUnreadCount(updated);
  }

  clearNotificaciones() {
    this.notificacionesSubject.next([]);
    this.unreadCountSubject.next(0);
  }
}