import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BankAccount {
  id: string;
  name: string;
  currency: string;
  bankName: string;
  iban: string;
  swift?: string;
  crmRequisitesId?: string;
  isDefault: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankAccountDto {
  name: string;
  currency: string;
  bankName: string;
  iban: string;
  swift?: string;
  crmRequisitesId?: string;
  isDefault?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BankAccountService {
  private readonly apiUrl = `${environment.apiUrl}/bank-accounts`;

  constructor(private http: HttpClient) {}

  getBankAccounts(): Observable<BankAccount[]> {
    return this.http.get<BankAccount[]>(this.apiUrl);
  }

  getBankAccount(id: string): Observable<BankAccount> {
    return this.http.get<BankAccount>(`${this.apiUrl}/${id}`);
  }

  createBankAccount(data: CreateBankAccountDto): Observable<BankAccount> {
    return this.http.post<BankAccount>(this.apiUrl, data);
  }

  updateBankAccount(id: string, data: Partial<CreateBankAccountDto>): Observable<BankAccount> {
    return this.http.put<BankAccount>(`${this.apiUrl}/${id}`, data);
  }

  deleteBankAccount(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  setDefault(id: string): Observable<BankAccount> {
    return this.http.patch<BankAccount>(`${this.apiUrl}/${id}/default`, {});
  }
}
