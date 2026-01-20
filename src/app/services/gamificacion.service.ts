import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UsuarioProgreso, Insignia, RankingUsuario } from '../models/gamificacion.model';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class GamificacionService {
  private apiUrl = environment.apiBaseUrl + '/gamificacion';

  constructor(private http: HttpClient) {}
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  obtenerMiProgreso(): Observable<UsuarioProgreso> {
    return this.http.get<UsuarioProgreso>(
      `${this.apiUrl}/mi-progreso`,
      { headers: this.getAuthHeaders() }
    );
  }

  obtenerProgresoUsuario(usuarioId: string): Observable<UsuarioProgreso> {
    return this.http.get<UsuarioProgreso>(`${this.apiUrl}/progreso/${usuarioId}`);
  }

  obtenerRanking(limite: number = 10): Observable<RankingUsuario[]> {
    return this.http.get<RankingUsuario[]>(`${this.apiUrl}/ranking?limite=${limite}`);
  }

  obtenerInsignias(): Observable<Insignia[]> {
    return this.http.get<Insignia[]>(`${this.apiUrl}/insignias`);
  }
}