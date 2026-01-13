import { Injectable, inject, signal, computed, OnDestroy, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, Subscription, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export type NotificationType = 'IN_APP' | 'BROWSER_PUSH' | 'EMAIL';
export type NotificationStatus = 'PENDING' | 'SENT' | 'READ' | 'FAILED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  scheduledFor: string;
  sentAt: string | null;
  readAt: string | null;
  taskId: string | null;
  userId: string;
  createdAt: string;
  task?: {
    id: string;
    name: string;
  };
}

export interface PaginatedNotifications {
  data: AppNotification[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AppNotificationService implements OnDestroy {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = `${environment.apiUrl}/notifications`;

  private pollSubscription?: Subscription;
  private readonly POLL_INTERVAL = 30000; // 30 seconds

  // Signals for reactive state
  notifications = signal<AppNotification[]>([]);
  unreadCount = signal(0);
  isLoading = signal(false);
  totalCount = signal(0);

  // Computed signals
  hasUnread = computed(() => this.unreadCount() > 0);
  recentNotifications = computed(() => this.notifications().slice(0, 5));

  constructor() {
    // Only start polling when user is authenticated
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.startPolling();
        this.refreshNotifications();
      } else {
        this.stopPolling();
        this.clearLocalState();
      }
    });
  }

  private clearLocalState(): void {
    this.notifications.set([]);
    this.unreadCount.set(0);
    this.totalCount.set(0);
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  /**
   * Start polling for new notifications
   */
  startPolling(): void {
    if (this.pollSubscription) return;

    this.pollSubscription = interval(this.POLL_INTERVAL)
      .pipe(
        tap(() => this.refreshNotifications())
      )
      .subscribe();
  }

  /**
   * Stop polling for notifications
   */
  stopPolling(): void {
    this.pollSubscription?.unsubscribe();
    this.pollSubscription = undefined;
  }

  /**
   * Refresh notifications and unread count
   */
  refreshNotifications(): void {
    this.fetchUnreadCount();
    this.fetchNotifications(1, 10);
  }

  /**
   * Get paginated notifications
   */
  getNotifications(page = 1, limit = 20): Observable<PaginatedNotifications> {
    return this.http.get<PaginatedNotifications>(
      `${this.apiUrl}?page=${page}&limit=${limit}`
    );
  }

  /**
   * Fetch notifications and update signals
   */
  fetchNotifications(page = 1, limit = 10): void {
    this.isLoading.set(true);

    this.getNotifications(page, limit)
      .pipe(
        catchError(() => of({ data: [], total: 0, page: 1, limit: 10, hasMore: false }))
      )
      .subscribe(response => {
        if (page === 1) {
          this.notifications.set(response.data);
        } else {
          this.notifications.update(current => [...current, ...response.data]);
        }
        this.totalCount.set(response.total);
        this.isLoading.set(false);
      });
  }

  /**
   * Get unread notification count
   */
  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`);
  }

  /**
   * Fetch unread count and update signal
   */
  fetchUnreadCount(): void {
    this.getUnreadCount()
      .pipe(catchError(() => of({ count: 0 })))
      .subscribe(response => {
        this.unreadCount.set(response.count);
      });
  }

  /**
   * Mark a notification as read
   */
  markAsRead(id: string): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.apiUrl}/${id}/read`, {})
      .pipe(
        tap(updated => {
          this.notifications.update(list =>
            list.map(n => n.id === id ? updated : n)
          );
          this.unreadCount.update(c => Math.max(0, c - 1));
        })
      );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<{ count: number }> {
    return this.http.patch<{ count: number }>(`${this.apiUrl}/read-all`, {})
      .pipe(
        tap(() => {
          this.notifications.update(list =>
            list.map(n => ({ ...n, status: 'READ' as NotificationStatus, readAt: new Date().toISOString() }))
          );
          this.unreadCount.set(0);
        })
      );
  }

  /**
   * Clear all notifications
   */
  clearAll(): Observable<{ count: number }> {
    return this.http.delete<{ count: number }>(`${this.apiUrl}/clear-all`)
      .pipe(
        tap(() => {
          this.notifications.set([]);
          this.unreadCount.set(0);
          this.totalCount.set(0);
        })
      );
  }

  /**
   * Subscribe to push notifications
   */
  subscribeToPush(subscription: PushSubscriptionData): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/push/subscribe`, subscription);
  }

  /**
   * Unsubscribe from push notifications
   */
  unsubscribeFromPush(): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/push/unsubscribe`);
  }

  /**
   * Format relative time for display
   */
  getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
