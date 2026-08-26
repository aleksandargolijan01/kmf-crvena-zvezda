import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly messages$ = new BehaviorSubject<ToastMessage[]>([]);

  success(text: string): void {
    this.push('success', text);
  }

  error(text: string): void {
    this.push('error', text);
  }

  info(text: string): void {
    this.push('info', text);
  }

  dismiss(id: number): void {
    this.messages$.next(this.messages$.value.filter((message) => message.id !== id));
  }

  private push(type: ToastType, text: string): void {
    const message = { id: this.nextId++, type, text };
    this.messages$.next([...this.messages$.value, message]);
    window.setTimeout(() => this.dismiss(message.id), 4200);
  }
}
