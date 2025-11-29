import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import * as io from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: any = null;
  private readonly url = 'http://localhost:3000';

  constructor() {}

  connect(userId: string): void {
    if (this.socket && this.socket.connected) {
      return;
    }

    this.socket = io.connect(this.url, {
      transports: ['websocket', 'polling']
    } as any);

    this.socket.on('connect', () => {
      if (this.socket) {
        this.socket.emit('user:online', userId);
      }
    });
  }

  disconnect(): void {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
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
}
