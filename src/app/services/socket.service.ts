import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
// @ts-ignore
import { io, Socket } from 'socket.io-client';
import { environment } from '../environments/environment';
import { logger } from '../utils/logger';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  private readonly url = (environment as any).socketUrl || environment.apiUrl.replace('/api', '');

  constructor() {}

  connect(userId: string): void {
    if (this.socket && this.socket.connected) return;

    this.socket = io(this.url, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      logger.info('✅ Socket conectado:', this.socket?.id);
      this.socket?.emit('user:online', userId);
    });

    this.socket.on('connect_error', (error: Error) => {
      logger.error('❌ Error de conexión Socket.IO:', error);
    });

    this.socket.on('disconnect', (reason: string) => {
      logger.warn('⚠️ Socket desconectado:', reason);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  onUserOnline(): Observable<{ userId: string }> {
    return new Observable(sub => {
      if (!this.socket) return;

      const handler = (payload: any) => sub.next(payload);
      this.socket.on('user:online', handler);

      return () => this.socket?.off('user:online', handler);
    });
  }

  onUserOffline(): Observable<{ userId: string }> {
    return new Observable(sub => {
      if (!this.socket) return;

      const handler = (payload: any) => sub.next(payload);
      this.socket.on('user:offline', handler);

      return () => this.socket?.off('user:offline', handler);
    });
  }

  joinChat(userId: string, friendId: string): void {
    this.socket?.emit('chat:join', { userId, friendId });
  }

  sendChatMessage(from: string, to: string, text: string): void {
    this.socket?.emit('chat:message', { from, to, text });
  }

  onChatMessage(): Observable<any> {
    return new Observable(sub => {
      if (!this.socket) return;

      const handler = (msg: any) => sub.next(msg);
      this.socket.on('chat:message', handler);

      return () => this.socket?.off('chat:message', handler);
    });
  }

  joinEventChat(eventId: string): void {
    this.socket?.emit('eventChat:join', { eventId });
  }

  sendEventChatMessage(eventId: string, userId: string, username: string, text: string): void {
    this.socket?.emit('eventChat:message', { eventId, userId, username, text });
  }

  onEventChatMessage(): Observable<any> {
    return new Observable(sub => {
      if (!this.socket) return;

      const handler = (msg: any) => sub.next(msg);
      this.socket.on('eventChat:message', handler);

      return () => this.socket?.off('eventChat:message', handler);
    });
  }

  onFriendRequestReceived(): Observable<any> {
    return new Observable(sub => {
      if (!this.socket) return;

      const handler = (payload: any) => sub.next(payload);
      this.socket.on('friendRequest:received', handler);

      return () => this.socket?.off('friendRequest:received', handler);
    });
  }
}