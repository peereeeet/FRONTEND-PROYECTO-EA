import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import * as io from 'socket.io-client';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: any = null;
  private readonly url = environment.socketUrl;
  private connectedUserId: string | null = null;

  constructor() {}

  connect(userId: string): void {
    if (this.socket && this.socket.connected && this.connectedUserId === userId) {
      return;
    }

    if (this.socket && this.connectedUserId && this.connectedUserId !== userId) {
      this.disconnect();
    }

    this.socket = io.connect(this.url, {
      transports: ['polling'],
      upgrade: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5 
    } as any);

    this.socket.on('connect', () => {
      if (this.socket) {
        this.socket.emit('user:online', userId);
        this.connectedUserId = userId;
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      if (this.connectedUserId) {
        this.socket.emit('user:online', this.connectedUserId);
      }
    });

    this.socket.on('reconnect_error', (error: any) => {
    });
  }

  disconnect(): void {
    if (!this.socket) return;
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

  on(eventName: string): Observable<any> {
    return new Observable((subscriber) => {
      if (!this.socket) {
        return;
      }

      const handler = (data: any) => {
        subscriber.next(data);
      };

      this.socket.on(eventName, handler);

      return () => {
        if (this.socket) {
          this.socket.off(eventName, handler);
        }
      };
    });
  }

  emit(eventName: string, data?: any): void {
    if (!this.socket) {
      return;
    }
    this.socket.emit(eventName, data);
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

  sendChatMessage(from: string, to: string, text: string, imageUrl?: string): void {
    if (!this.socket) return;
    this.socket.emit('chat:message', { from, to, text, imageUrl });
  }

  onChatMessage(): Observable<{ _id?: string; from: string; to: string; text: string; imageUrl?: string; createdAt: string }> {
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


  sendEventChatMessage(eventId: string, userId: string, username: string, text: string, imageUrl?: string): void {
    if (!this.socket) return;
    this.socket.emit('eventChat:message', { eventId, userId, username, text, imageUrl });
  }

  onEventChatMessage(): Observable<{
    _id?: string;
    eventId: string;
    userId: string;
    username: string;
    text: string;
    imageUrl?: string;
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

  onFriendRequestUpdated(): Observable<{
    type: 'accepted' | 'rejected';
    userId: string;
  }> {
    return new Observable(sub => {
      if (!this.socket) return;

      const handler = (payload: any) => sub.next(payload);
      this.socket.on('friendRequest:updated', handler);

      return () => {
        if (this.socket) {
          this.socket.off('friendRequest:updated', handler);
        }
      };
    });
  }

  onEventChatMessageDeleted(): Observable<{
    messageId: string;
    eventId: string;
  }> {
    return new Observable(sub => {
      if (!this.socket) return;

      const handler = (payload: any) => sub.next(payload);
      this.socket.on('eventChat:messageDeleted', handler);

      return () => {
        if (this.socket) {
          this.socket.off('eventChat:messageDeleted', handler);
        }
      };
    });
  }

  onChatMessageDeleted(): Observable<{
    messageId: string;
    from: string;
    to: string;
  }> {
    return new Observable(sub => {
      if (!this.socket) return;

      const handler = (payload: any) => sub.next(payload);
      this.socket.on('chat:messageDeleted', handler);

      return () => {
        if (this.socket) {
          this.socket.off('chat:messageDeleted', handler);
        }
      };
    });
  }
}