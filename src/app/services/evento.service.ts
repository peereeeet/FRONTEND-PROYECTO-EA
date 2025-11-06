import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Evento } from '../models/evento.model';

@Injectable({ providedIn: 'root' })
export class EventoService {
  private apiUrl = 'http://localhost:3000/api/event';

  constructor(private http: HttpClient) {}

  getEventos(page: number = 1, limit: number = 10): Observable<{ data: Evento[]; page: number; totalPages: number; totalItems: number; }> {
    return this.http.get<{ data: Evento[]; page: number; totalPages: number; totalItems: number; }>(
      `${this.apiUrl}?page=${page}&limit=${limit}`
    );
  }

  getEventoById(id: string): Observable<Evento> {
    return this.http.get<Evento>(`${this.apiUrl}/${id}`);
  }

  addEvento(newEvent: Evento): Observable<Evento> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const scheduleAsString =
      Array.isArray(newEvent.schedule) ? (newEvent.schedule[0] || '') : (newEvent.schedule as any);
    const payload: any = { ...newEvent, schedule: scheduleAsString, participantes: [...(newEvent.participantes || [])] };
    return this.http.post<Evento>(this.apiUrl, payload, { headers });
  }

  updateEvento(evento: Evento): Observable<Evento> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const scheduleAsString =
      Array.isArray(evento.schedule) ? (evento.schedule[0] || '') : (evento.schedule as any);
    const payload: any = { 
      ...evento, 
      schedule: scheduleAsString, 
      participantes: [...(evento.participantes || [])] 
    };
    return this.http.put<Evento>(`${this.apiUrl}/${evento._id}`, payload, { headers });
  }

  deleteEvento(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  checkEventNameExists(name: string): Observable<{ exists: boolean; message?: string }> {
    return this.http.post<{ exists: boolean; message?: string }>(
      `${this.apiUrl}/check-name`,
      { name },
      { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
    );
  }
}