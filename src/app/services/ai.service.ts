import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment.prod';

export interface AiSearchRequest {
  query: string;
  userId?: string;
  language?: string;
}

export interface AiSearchResponse {
  answer: string;
  count: number;
  data: any[];
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  searchEventsWithAi(query: string, userId?: string, language?: string): Observable<AiSearchResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body: AiSearchRequest = { query, userId, language: language || 'es' };
    
    return this.http.post<AiSearchResponse>(`${this.apiUrl}/search`, body, { headers });
  }
}