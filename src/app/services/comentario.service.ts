import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Comentario, ComentarioPaginado } from '../models/comentario.model';

@Injectable({
  providedIn: 'root'
})
export class ComentarioService {
  private apiUrl = 'http://localhost:3000/api/comment';

  constructor(private http: HttpClient) {}

  // CREATE - Crear comentario
  createComentario(comentario: Comentario): Observable<{ message: string; comentario: Comentario }> {
    return this.http.post<{ message: string; comentario: Comentario }>(this.apiUrl, comentario);
  }

  // READ - Obtener todos los comentarios (con paginación)
  getAllComentarios(page: number = 1, limit: number = 10): Observable<ComentarioPaginado> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ComentarioPaginado>(this.apiUrl, { params });
  }

  // READ - Obtener comentario por ID
  getComentarioById(id: string): Observable<Comentario> {
    return this.http.get<Comentario>(`${this.apiUrl}/${id}`);
  }

  // READ - Obtener comentarios por evento
  getComentariosByEvento(eventoId: string, page: number = 1, limit: number = 10): Observable<ComentarioPaginado> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ComentarioPaginado>(`${this.apiUrl}/evento/${eventoId}`, { params });
  }

  // READ - Buscar comentarios
  searchComentarios(query: string, page: number = 1, limit: number = 10): Observable<ComentarioPaginado> {
    const params = new HttpParams()
      .set('q', query)
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<ComentarioPaginado>(`${this.apiUrl}/search`, { params });
  }

  // UPDATE - Actualizar comentario
  updateComentario(id: string, data: Partial<Comentario>): Observable<{ message: string; comentario: Comentario }> {
    return this.http.put<{ message: string; comentario: Comentario }>(`${this.apiUrl}/${id}`, data);
  }

  // UPDATE - Dar like a comentario
  likeComentario(id: string): Observable<{ message: string; comentario: Comentario }> {
    return this.http.put<{ message: string; comentario: Comentario }>(`${this.apiUrl}/${id}/like`, {});
  }

  // DELETE - Eliminar comentario
  deleteComentario(id: string): Observable<{ message: string; comentario: Comentario }> {
    return this.http.delete<{ message: string; comentario: Comentario }>(`${this.apiUrl}/${id}`);
  }
}