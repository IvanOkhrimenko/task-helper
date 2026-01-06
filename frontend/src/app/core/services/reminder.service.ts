import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ScheduleConfig {
  time?: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  month?: number;
  intervalMinutes?: number;
}

export type ScheduleType = 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';

export interface Reminder {
  id: string;
  name: string;
  type: 'REMINDER';
  isActive: boolean;
  scheduleType: ScheduleType;
  scheduleConfig: ScheduleConfig | null;
  reminderDateTime: string | null;
  reminderWarning: number | null;
  reminderDeadline: number | null;
  reminderTitle: string | null;
  reminderMessage: string | null;
  notificationEmail: string | null;
  nextOccurrence: string | null;
  lastTriggered: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  notifications?: any[];
}

export interface CreateReminderDto {
  name: string;
  scheduleType: ScheduleType;
  scheduleConfig?: ScheduleConfig;
  reminderDateTime?: string;
  reminderWarning?: number;
  reminderDeadline?: number;
  reminderTitle?: string;
  reminderMessage?: string;
  notificationEmail?: string;
  isActive?: boolean;
}

export interface UpdateReminderDto extends Partial<CreateReminderDto> {}

@Injectable({
  providedIn: 'root'
})
export class ReminderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reminders`;

  getReminders(): Observable<Reminder[]> {
    return this.http.get<Reminder[]>(this.apiUrl);
  }

  getReminder(id: string): Observable<Reminder> {
    return this.http.get<Reminder>(`${this.apiUrl}/${id}`);
  }

  createReminder(data: CreateReminderDto): Observable<Reminder> {
    return this.http.post<Reminder>(this.apiUrl, data);
  }

  updateReminder(id: string, data: UpdateReminderDto): Observable<Reminder> {
    return this.http.put<Reminder>(`${this.apiUrl}/${id}`, data);
  }

  deleteReminder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleReminder(id: string): Observable<Reminder> {
    return this.http.patch<Reminder>(`${this.apiUrl}/${id}/toggle`, {});
  }

  snoozeReminder(id: string, minutes: number): Observable<Reminder> {
    return this.http.patch<Reminder>(`${this.apiUrl}/${id}/snooze`, { minutes });
  }
}
