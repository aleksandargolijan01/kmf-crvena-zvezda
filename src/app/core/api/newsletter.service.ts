import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export type NewsletterSource = 'footer' | 'homepage';

export interface NewsletterSubscribePayload {
  email: string;
  firstName?: string;
  consent: true;
  source: NewsletterSource;
  website?: string;
}

export interface NewsletterSubscribeResponse {
  success: boolean;
  status?: 'subscribed' | 'already_subscribed';
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');

  constructor(private readonly http: HttpClient) {}

  subscribe(payload: NewsletterSubscribePayload): Observable<NewsletterSubscribeResponse> {
    return this.http.post<NewsletterSubscribeResponse>(`${this.apiUrl}/newsletter/subscribe`, payload).pipe(
      catchError((error: HttpErrorResponse) => throwError(() => error))
    );
  }
}
