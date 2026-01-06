import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardEvent {
  id: string;
  type: 'reminder' | 'invoice_warning' | 'invoice_deadline' | 'invoice_due';
  title: string;
  subtitle?: string;
  date: string;
  status: 'upcoming' | 'today' | 'overdue';
  priority: 'low' | 'medium' | 'high';
  taskId?: string;
  taskName?: string;
  reminderScheduleType?: string;
  isActive?: boolean;
  metadata?: {
    clientName?: string;
    amount?: number;
    currency?: string;
    hoursWorked?: number;
    hourlyRate?: number;
  };
}

export interface DashboardStats {
  activeReminders: number;
  remindersToday: number;
  activeInvoiceTasks: number;
  unpaidInvoices: number;
  monthlyTotal: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/dashboard';

  getEvents(): Observable<DashboardEvent[]> {
    return this.http.get<DashboardEvent[]>(`${this.apiUrl}/events`);
  }

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }
}
