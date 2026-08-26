import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  ListQuery,
  ManagementItem,
  MediaFile,
  NewsItem,
  NewsletterSubscriber,
  PageResponse,
  PlayerItem,
  StaffAdminItem,
  SponsorCategory,
  SponsorItem
} from './admin-api.models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.url('auth/login'), { email, password });
  }

  refresh(refreshToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(this.url('auth/refresh'), { refreshToken });
  }

  logout(): Observable<{ success?: boolean }> {
    return this.http.post<{ success?: boolean }>(this.url('auth/logout'), {});
  }

  me() {
    return this.http.get(this.url('auth/me'));
  }

  news(query: ListQuery) {
    return this.http.get<PageResponse<NewsItem>>(this.url('admin/news'), { params: this.params(query) });
  }

  createNews(payload: Partial<NewsItem>) {
    return this.http.post<NewsItem>(this.url('admin/news'), payload);
  }

  updateNews(id: string, payload: Partial<NewsItem>) {
    return this.http.patch<NewsItem>(this.url(`admin/news/${id}`), payload);
  }

  deleteNews(id: string) {
    return this.http.delete(this.url(`admin/news/${id}`));
  }

  media(query: ListQuery) {
    return this.http.get<PageResponse<MediaFile>>(this.url('admin/media'), { params: this.params(query) });
  }

  upload(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<MediaFile>(this.url('admin/media/upload'), form);
  }

  deleteMedia(id: string) {
    return this.http.delete(this.url(`admin/media/${id}`));
  }

  players(kind: 'firstTeam' | 'u19', query: ListQuery) {
    return this.http.get<PageResponse<PlayerItem>>(this.url(kind === 'u19' ? 'admin/u19-players' : 'admin/players'), {
      params: this.params(query)
    });
  }

  savePlayer(kind: 'firstTeam' | 'u19', payload: Partial<PlayerItem>, id?: string) {
    const path = kind === 'u19' ? 'admin/u19-players' : 'admin/players';
    return id ? this.http.patch<PlayerItem>(this.url(`${path}/${id}`), payload) : this.http.post<PlayerItem>(this.url(path), payload);
  }

  deletePlayer(kind: 'firstTeam' | 'u19', id: string) {
    return this.http.delete(this.url(`${kind === 'u19' ? 'admin/u19-players' : 'admin/players'}/${id}`));
  }

  management(kind: 'management' | 'board', query: ListQuery) {
    return this.http.get<PageResponse<ManagementItem>>(this.url(kind === 'board' ? 'admin/board-members' : 'admin/management'), {
      params: this.params(query)
    });
  }

  saveManagement(kind: 'management' | 'board', payload: Partial<ManagementItem>, id?: string) {
    const path = kind === 'board' ? 'admin/board-members' : 'admin/management';
    return id ? this.http.patch<ManagementItem>(this.url(`${path}/${id}`), payload) : this.http.post<ManagementItem>(this.url(path), payload);
  }

  deleteManagement(kind: 'management' | 'board', id: string) {
    return this.http.delete(this.url(`${kind === 'board' ? 'admin/board-members' : 'admin/management'}/${id}`));
  }

  staff(query: ListQuery) {
    return this.http.get<PageResponse<StaffAdminItem>>(this.url('admin/staff'), { params: this.params(query) });
  }

  saveStaff(payload: Partial<StaffAdminItem>, id?: string) {
    return id ? this.http.patch<StaffAdminItem>(this.url(`admin/staff/${id}`), payload) : this.http.post<StaffAdminItem>(this.url('admin/staff'), payload);
  }

  deleteStaff(id: string) {
    return this.http.delete(this.url(`admin/staff/${id}`));
  }

  sponsorCategories(query: ListQuery) {
    return this.http.get<PageResponse<SponsorCategory>>(this.url('admin/sponsor-categories'), { params: this.params(query) });
  }

  saveSponsorCategory(payload: Partial<SponsorCategory>, id?: string) {
    return id
      ? this.http.patch<SponsorCategory>(this.url(`admin/sponsor-categories/${id}`), payload)
      : this.http.post<SponsorCategory>(this.url('admin/sponsor-categories'), payload);
  }

  deleteSponsorCategory(id: string) {
    return this.http.delete(this.url(`admin/sponsor-categories/${id}`));
  }

  sponsors(query: ListQuery) {
    return this.http.get<PageResponse<SponsorItem>>(this.url('admin/sponsors'), { params: this.params(query) });
  }

  saveSponsor(payload: Partial<SponsorItem>, id?: string) {
    return id ? this.http.patch<SponsorItem>(this.url(`admin/sponsors/${id}`), payload) : this.http.post<SponsorItem>(this.url('admin/sponsors'), payload);
  }

  deleteSponsor(id: string) {
    return this.http.delete(this.url(`admin/sponsors/${id}`));
  }

  newsletter(query: ListQuery) {
    return this.http.get<PageResponse<NewsletterSubscriber>>(this.url('admin/newsletter/subscribers'), { params: this.params(query) });
  }

  updateSubscriber(id: string, payload: Partial<NewsletterSubscriber>) {
    return this.http.patch<NewsletterSubscriber>(this.url(`admin/newsletter/subscribers/${id}`), payload);
  }

  deleteSubscriber(id: string) {
    return this.http.delete(this.url(`admin/newsletter/subscribers/${id}`));
  }

  private url(path: string): string {
    return `${this.apiUrl}/${path}`;
  }

  private params(query: ListQuery): HttpParams {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }
}
