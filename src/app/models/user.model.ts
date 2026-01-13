import { Evento } from './evento.model';

export interface User {
  _id?: string;
  username: string;
  gmail: string;
  password?: string;
  birthday?: Date | string;
  eventos?: (string | Evento)[];
  isActive?: boolean;
  rol?: 'admin' | 'usuario';
  isGoogleUser?: boolean;
  isOnline?: boolean;
  profilePhoto?: string;
  friends?: Array<
    string |
    { _id: string; username: string; gmail: string; isOnline?: boolean }
  >;
  friendRequest?: Array<string | { _id: string; username: string; gmail: string }>;
  sentRequests?: Array<string | { _id: string; username: string; gmail: string }>;
  blockedUsers?: Array<string | { _id: string; username: string; gmail: string; profilePhoto?: string; isOnline?: boolean }>;
}

export interface BlockedUser {
  _id: string;
  username: string;
  gmail: string;
  profilePhoto?: string;
  isOnline?: boolean;
}

export interface ChatMessage {
  _id?: string;
  from: string;
  to: string;
  text: string;
  createdAt: string;
}

export interface EventChatMessage {
  _id?: string;
  eventId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}
