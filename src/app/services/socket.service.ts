import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment.prod';
import * as io from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: any = null;
  private readonly url = environment.apiUrl;
  private connectedUserId: string | null = null;

  constructor() {}

  connect(userId: string): void {
    if (this.socket && this.socket.connected && this.connectedUserId === userId) {
      console.log('✅ Socket ya conectado para usuario:', userId);
      return;
    }

    if (this.socket && this.connectedUserId && this.connectedUserId !== userId) {
      console.warn('⚠️ Desconectando socket de usuario anterior:', this.connectedUserId);
      this.disconnect();
    }

    console.log('🔌 Conectando socket para usuario:', userId);
    this.socket = io.connect(this.url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5 
    } as any);

    this.socket.on('connect', () => {
      console.log('✅ Socket conectado');
      if (this.socket) {
        this.socket.emit('user:online', userId);
        this.connectedUserId = userId;
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      console.warn('⚠️ Socket desconectado. Razón:', reason);
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log(`✅ Socket reconectado después de ${attemptNumber} intentos`);
      if (this.connectedUserId) {
        this.socket.emit('user:online', this.connectedUserId);
      }
    });

    this.socket.on('reconnect_error', (error: any) => {
      console.error('❌ Error al reconectar socket:', error);
    });
  }

  disconnect(): void {
    if (!this.socket) return;
    console.log('🔌 Desconectando socket para usuario:', this.connectedUserId);
    this.socket.disconnect();
    this.socket = null;
    this.connectedUserId = null;
  }

  isConnected(): boolean {
    return this.socket && this.socket.connected;
  }

  getConnectedUserId(): string | null {
    return this.connectedUserId;
  }

  onUserOnline(): Observable<{ userId: string }> {
    return new Observable((sub) => {
      if (!this.socket) {
        return;
      }

      const handler = (payload: { userId: string }) => sub.next(payload);
      this.socket.on('user:online', handler);
      return () => {
        if (this.socket) {
          this.socket.off('user:online', handler);
        }
      };
    });
  }

  onUserOffline(): Observable<{ userId: string }> {
    return new Observable((sub) => {
      if (!this.socket) {
        return;
      }

      const handler = (payload: { userId: string }) => sub.next(payload);
      this.socket.on('user:offline', handler);

      return () => {
        if (this.socket) {
          this.socket.off('user:offline', handler);
        }
      };
    });
  }

  joinChat(userId: string, friendId: string): void {
    if (!this.socket) return;
    this.socket.emit('chat:join', { userId, friendId });
  }

  sendChatMessage(from: string, to: string, text: string): void {
    if (!this.socket) return;
    this.socket.emit('chat:message', { from, to, text });
  }

  onChatMessage(): Observable<{ _id?: string; from: string; to: string; text: string; createdAt: string }> {
    return new Observable((sub) => {
      if (!this.socket) return;

      const handler = (msg: any) => sub.next(msg);
      this.socket.on('chat:message', handler);

      return () => {
        if (this.socket) {
          this.socket.off('chat:message', handler);
        }
      };
    });
  }

  joinEventChat(eventId: string): void {
    if (!this.socket) return;
    this.socket.emit('eventChat:join', { eventId });
  }

  sendEventChatMessage(eventId: string, userId: string, username: string, text: string): void {
    if (!this.socket) return;
    this.socket.emit('eventChat:message', { eventId, userId, username, text });
  }

  onEventChatMessage(): Observable<{
    _id?: string;
    eventId: string;
    userId: string;
    username: string;
    text: string;
    createdAt: string;
  }> {
    return new Observable(sub => {
      if (!this.socket) return;

      const handler = (msg: any) => sub.next(msg);
      this.socket.on('eventChat:message', handler);

      return () => {
        if (this.socket) {
          this.socket.off('eventChat:message', handler);
        }
      };
    });
  }

  onFriendRequestReceived(): Observable<{
    fromUserId: string;
    fromUsername: string;
    fromGmail: string;
  }> {
    return new Observable(sub => {
      if (!this.socket) return;

      const handler = (payload: any) => sub.next(payload);
      this.socket.on('friendRequest:received', handler);

      return () => {
        if (this.socket) {
          this.socket.off('friendRequest:received', handler);
        }
      };
    });
  }

  onPlazaDisponible(): Observable<{
    eventoId: string;
    eventoName: string;
    mensaje: string;
  }> {
    return new Observable(sub => {
      if (!this.socket) return;

      const handler = (payload: any) => sub.next(payload);
      this.socket.on('evento:plazaDisponible', handler);

      return () => {
        if (this.socket) {
          this.socket.off('evento:plazaDisponible', handler);
        }
      };
    });
  }
}