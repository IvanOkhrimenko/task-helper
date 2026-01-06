import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSignal = signal<Notification[]>([]);
  notifications = this.notificationsSignal.asReadonly();

  show(message: string, type: Notification['type'] = 'info', duration = 4000): void {
    const notification: Notification = {
      id: crypto.randomUUID(),
      type,
      message,
      duration
    };

    this.notificationsSignal.update(notifications => [...notifications, notification]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(notification.id), duration);
    }
  }

  success(message: string, duration = 4000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  warning(message: string, duration = 4000): void {
    this.show(message, 'warning', duration);
  }

  dismiss(id: string): void {
    this.notificationsSignal.update(notifications =>
      notifications.filter(n => n.id !== id)
    );
  }

  async requestBrowserPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  showBrowserNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }
}
