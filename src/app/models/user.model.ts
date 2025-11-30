import { Evento } from './evento.model';

export interface User {
  _id?: string;
  username: string;
  gmail: string;
  password?: string;
  birthday: Date;
  eventos?: (string | Evento)[];
  isActive?: boolean;
  rol?: 'admin' | 'usuario';
  isOnline?: boolean;
  friends?: Array<
    string |
    { _id: string; username: string; gmail: string; isOnline?: boolean }
  >;
  friendRequest?: Array<string | { _id: string; username: string; gmail: string }>;
  sentRequests?: Array<string | { _id: string; username: string; gmail: string }>;
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
