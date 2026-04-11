import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AiResponse {
  isSuccess: boolean;
  data: string;
  error: string | null;
  message: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private apiUrl = `${environment.baseUrl}/api/ai/chat`;

  constructor(private http: HttpClient) {}

  askAi(message: string): Observable<AiResponse> {
    return this.http.post<AiResponse>(this.apiUrl, {
      message
    });
  }
}