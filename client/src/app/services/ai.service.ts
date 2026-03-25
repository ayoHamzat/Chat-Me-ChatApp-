import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  private apiUrl = 'http://localhost:5000/api/ai/chat';

  constructor(private http: HttpClient) {}

  askAi(message: string): Observable<AiResponse> {
    return this.http.post<AiResponse>(this.apiUrl, {
      message
    });
  }
}