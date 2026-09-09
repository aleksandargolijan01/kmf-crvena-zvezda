import { Injectable } from '@angular/core';
import { Receipt } from './checkout.models';
@Injectable({ providedIn: 'root' })
export class CheckoutSessionService {
  private readonly memory = new Map<string, string>();
  private read(key: string) { try { return sessionStorage.getItem(key) ?? this.memory.get(key) ?? null; } catch { return this.memory.get(key) ?? null; } }
  private write(key: string, value: string) { this.memory.set(key, value); try { sessionStorage.setItem(key, value); } catch { /* Memory fallback: no customer data is persisted. */ } }
  existing(manual = false) { const key = this.read(manual ? 'kmf_manual_attempt' : 'kmf_checkout_attempt'); return key && /^[a-zA-Z0-9_-]{32,128}$/.test(key) ? key : null; }
  attempt(manual = false) { const key = this.existing(manual) ?? crypto.randomUUID(); this.write(manual ? 'kmf_manual_attempt' : 'kmf_checkout_attempt', key); return key; }
  complete(receipt: Receipt, manual = false) {
    this.write('kmf_order_receipt', receipt.receiptToken);
    const key = manual ? 'kmf_manual_attempt' : 'kmf_checkout_attempt';
    this.memory.delete(key); try { sessionStorage.removeItem(key); } catch { /* Memory fallback. */ }
  }
  receipt() { return this.read('kmf_order_receipt'); }
}
