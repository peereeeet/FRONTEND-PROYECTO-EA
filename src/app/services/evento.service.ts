import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Evento } from '../models/evento.model';

@Injectable({ providedIn: 'root' })
export class EventoService {
  private apiUrl = 'http://localhost:3000/api/event';

  constructor(private http: HttpClient) {}

  getEventos(page: number = 1, limit: number = 10): Observable<{ 
    data: Evento[]; 
    page: number; 
    totalPages: number; 
    totalItems: number; 
  }> {
    return this.http.get<{ data: Evento[]; page: number; totalPages: number; totalItems: number; }>(
      `${this.apiUrl}?page=${page}&limit=${limit}`
    );
  }

  getEventoById(id: string): Observable<Evento> {
    return this.http.get<Evento>(`${this.apiUrl}/${id}`);
  }

  addEvento(newEvent: Evento): Observable<Evento> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    const scheduleAsString = Array.isArray(newEvent.schedule)
      ? (newEvent.schedule[0] || '')
      : (newEvent.schedule as any);

    const rawParticipants =
      (newEvent as any).participantes ??
      (newEvent as any).participants ??
      [];

    const payload: any = {
      ...newEvent,
      schedule: scheduleAsString,
      participantes: Array.isArray(rawParticipants) ? [...rawParticipants] : [],
    };

    return this.http.post<Evento>(this.apiUrl, payload, { headers });
  }

  createEventoFromPanel(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create-from-panel`, payload).pipe(
      map((ev) => {
        const raw = ev?.creador;
        const creadorId =
          raw && typeof raw === 'object' && raw._id ? raw._id : raw || '';
        return {
          ...ev,
          creador: creadorId,
          creadorInfo: typeof raw === 'object' ? raw : undefined,
        };
      })
    );
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

  joinEvento(id: string): Observable<Evento> {
    return this.http.post<Evento>(`${this.apiUrl}/${id}/join`, {});
  }

  leaveEvento(id: string): Observable<Evento> {
    return this.http.post<Evento>(`${this.apiUrl}/${id}/leave`, {});
  }

  getMisEventos(): Observable<{ eventosCreados: Evento[]; eventosInscritos: Evento[] }> {
    return this.http.get<{ eventosCreados: Evento[]; eventosInscritos: Evento[] }>(
      `${this.apiUrl}/user/my-events`
    );
  }

  checkEventNameExists(name: string): Observable<{ exists: boolean; message?: string }> {
    return this.http.post<{ exists: boolean; message?: string }>(
      `${this.apiUrl}/check-name`,
      { name },
      { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
    );
  }
}