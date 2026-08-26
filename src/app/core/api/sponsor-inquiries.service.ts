import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SponsorInquiryPayload {
  fullName: string;
  companyName: string;
  email: string;
  phone?: string;
  sponsorshipPackage?: string;
  message: string;
  consent: true;
  website?: string;
}

export interface SponsorInquiryResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class SponsorInquiriesService {
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');

  constructor(private readonly http: HttpClient) {}

  send(payload: SponsorInquiryPayload): Observable<SponsorInquiryResponse> {
    return this.http.post<SponsorInquiryResponse>(`${this.apiUrl}/sponsor-inquiries`, payload);
  }
}
