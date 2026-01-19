import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Valoracion, ValoracionesPage } from '../models/valoracion.model';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ValoracionService {
  private base = environment.apiBaseUrl + '/ratings';

  constructor(private http: HttpClient) {}

  create(eventoId: string, payload: { puntuacion: number; comentario?: string }): Observable<any> {
    return this.http.post<any>(`${this.base}/event/${eventoId}`, payload);
  }

  getMyRatingForEvent(eventoId: string): Observable<Valoracion> {
    return this.http.get<Valoracion>(`${this.base}/event/${eventoId}/my-rating`);
  }

  listByEvent(eventoId: string, page = 1, limit = 10, q = ''): Observable<ValoracionesPage> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (q && q.trim()) params = params.set('q', q.trim());
    return this.http.get<ValoracionesPage>(`${this.base}/event/${eventoId}`, { params });
  }

  getById(id: string): Observable<Valoracion> {
    return this.http.get<Valoracion>(`${this.base}/${id}`);
  }

  update(id: string, payload: Partial<Pick<Valoracion, 'puntuacion' | 'comentario'>>): Observable<Valoracion> {
    return this.http.put<Valoracion>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<{ message: string; id: string }> {
    return this.http.delete<{ message: string; id: string }>(`${this.base}/${id}`);
  }
}