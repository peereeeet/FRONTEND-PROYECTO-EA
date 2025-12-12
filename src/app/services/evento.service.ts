import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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

  getUpcomingEventos(page: number = 1,limit: number = 10): Observable<{ 
    data: Evento[]; 
    page: number; 
    totalPages: number; 
    totalItems: number; 
  }> {
    return this.http.get<{ data: Evento[]; page: number; totalPages: number; totalItems: number; }>(
      `${this.apiUrl}/upcoming?page=${page}&limit=${limit}`
    );
  }

  getEventoById(id: string): Observable<Evento> {
    return this.http.get<Evento>(`${this.apiUrl}/${id}`);
  }

  getEventosByBounds(
    north: number,
    south: number,
    east: number,
    west: number,
    page: number = 1,
    limit: number = 10
  ): Observable<{
    data: Evento[];
    page: number;
    totalPages: number;
    totalItems: number;
  }> {
    const params = new HttpParams()
      .set('north', String(north))
      .set('south', String(south))
      .set('east', String(east))
      .set('west', String(west))
      .set('page', String(page))
      .set('limit', String(limit));

    return this.http.get<{
      data: Evento[];
      page: number;
      totalPages: number;
      totalItems: number;
    }>(`${this.apiUrl}/by-bounds`, { params });
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

    let lat = (newEvent as any).lat;
    let lng = (newEvent as any).lng;

    if (typeof lat === 'string' && lat.trim() !== '') {
      const parsed = parseFloat(lat);
      lat = Number.isNaN(parsed) ? undefined : parsed;
    }
    if (typeof lng === 'string' && lng.trim() !== '') {
      const parsed = parseFloat(lng);
      lng = Number.isNaN(parsed) ? undefined : parsed;
    }

    const payload: any = {
      ...newEvent,
      schedule: scheduleAsString,
      participantes: Array.isArray(rawParticipants) ? [...rawParticipants] : [],
      lat,
      lng,
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

    const scheduleAsString = Array.isArray(evento.schedule)
      ? (evento.schedule[0] || '')
      : (evento.schedule as any);

    const rawParticipants =
      (evento as any).participantes ??
      (evento as any).participants ??
      [];

    let lat = (evento as any).lat;
    let lng = (evento as any).lng;

    if (typeof lat === 'string' && lat.trim() !== '') {
      const parsed = parseFloat(lat);
      lat = Number.isNaN(parsed) ? undefined : parsed;
    }
    if (typeof lng === 'string' && lng.trim() !== '') {
      const parsed = parseFloat(lng);
      lng = Number.isNaN(parsed) ? undefined : parsed;
    }

    const payload: any = {
      ...evento,
      schedule: scheduleAsString,
      participantes: Array.isArray(rawParticipants) ? [...rawParticipants] : [],
      lat,
      lng,
    };

    return this.http.put<Evento>(`${this.apiUrl}/${evento._id}`, payload, {
      headers,
    });
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

  searchEventos(
    search: string = '',
    dateFrom: string = '',
    dateTo: string = '',
    categoria: string = '',
    page: number = 1,
    limit: number = 10
  ): Observable<{
    data: Evento[];
    page: number;
    totalPages: number;
    totalItems: number;
  }> {
    let params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(limit));

    if (search) {
      params = params.set('search', search);
    }
    if (dateFrom) {
      params = params.set('dateFrom', dateFrom);
    }
    if (dateTo) {
      params = params.set('dateTo', dateTo);
    }
    if (categoria) {
      params = params.set('categoria', categoria);
    }

    return this.http.get<{
      data: Evento[];
      page: number;
      totalPages: number;
      totalItems: number;
    }>(`${this.apiUrl}/search`, { params });
  }

  // ==================== MÉTODOS DE EVENTOS PRIVADOS ====================

  /**
   * Invitar usuarios a un evento privado
   */
  inviteUsersToEvent(eventoId: string, userIds: string[]): Observable<{ message: string; evento: Evento }> {
    return this.http.post<{ message: string; evento: Evento }>(
      `${this.apiUrl}/${eventoId}/invite`,
      { userIds }
    );
  }

  /**
   * Aceptar invitación a un evento privado
   */
  acceptInvitation(eventoId: string): Observable<{ message: string; evento: Evento }> {
    return this.http.post<{ message: string; evento: Evento }>(
      `${this.apiUrl}/${eventoId}/accept-invitation`,
      {}
    );
  }

  /**
   * Rechazar invitación a un evento privado
   */
  rejectInvitation(eventoId: string): Observable<{ message: string; evento: Evento }> {
    return this.http.post<{ message: string; evento: Evento }>(
      `${this.apiUrl}/${eventoId}/reject-invitation`,
      {}
    );
  }

  /**
   * Obtener invitaciones pendientes del usuario autenticado
   */
  getPendingInvitations(): Observable<{ count: number; invitaciones: Evento[] }> {
    return this.http.get<{ count: number; invitaciones: Evento[] }>(
      `${this.apiUrl}/invitations/pending`
    );
  }

  /**
   * Eliminar un invitado del evento (solo creador)
   */
  removeInvitedUser(eventoId: string, userId: string): Observable<{ message: string; evento: Evento }> {
    return this.http.delete<{ message: string; evento: Evento }>(
      `${this.apiUrl}/${eventoId}/remove-invite/${userId}`
    );
  }

  /**
   * Obtener eventos visibles para el usuario (públicos + privados donde está invitado)
   */
  getEventosVisibles(): Observable<{ count: number; eventos: Evento[] }> {
    return this.http.get<{ count: number; eventos: Evento[] }>(
      `${this.apiUrl}/visible`
    );
  }
}