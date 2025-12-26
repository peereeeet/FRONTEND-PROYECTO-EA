import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AiSearchRequest {
  query: string;
  userId?: string;
}

export interface AiSearchResponse {
  answer: string;
  count: number;
  data: any[];
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = 'http://localhost:3000/api/ai';

  constructor(private http: HttpClient) {}

  searchEventsWithAi(query: string, userId?: string): Observable<AiSearchResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const body: AiSearchRequest = { query, userId };
    
    return this.http.post<AiSearchResponse>(`${this.apiUrl}/search`, body, { headers });
  }
}