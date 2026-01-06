import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {
  AppNotificationService,
  AppNotification,
  PaginatedNotifications
} from './app-notification.service';

describe('AppNotificationService', () => {
  let service: AppNotificationService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3000/api/notifications';

  const mockNotification: AppNotification = {
    id: '1',
    type: 'IN_APP',
    status: 'PENDING',
    title: 'Test Notification',
    message: 'This is a test notification',
    scheduledFor: '2024-01-15T09:00:00Z',
    sentAt: null,
    readAt: null,
    taskId: 'task1',
    userId: 'user1',
    createdAt: '2024-01-01T00:00:00Z'
  };

  const mockPaginatedResponse: PaginatedNotifications = {
    data: [mockNotification],
    total: 1,
    page: 1,
    limit: 10,
    hasMore: false
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AppNotificationService]
    });
    service = TestBed.inject(AppNotificationService);
    httpMock = TestBed.inject(HttpTestingController);

    // Handle initial requests from constructor
    const unreadReq = httpMock.expectOne(`${apiUrl}/unread-count`);
    unreadReq.flush({ count: 0 });
    const listReq = httpMock.expectOne(`${apiUrl}?page=1&limit=10`);
    listReq.flush(mockPaginatedResponse);
  });

  afterEach(() => {
    httpMock.verify();
    service.stopPolling();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getNotifications', () => {
    it('should fetch paginated notifications', () => {
      service.getNotifications(1, 20).subscribe(response => {
        expect(response.data.length).toBe(1);
        expect(response.total).toBe(1);
      });

      const req = httpMock.expectOne(`${apiUrl}?page=1&limit=20`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPaginatedResponse);
    });

    it('should use default pagination values', () => {
      service.getNotifications().subscribe();

      const req = httpMock.expectOne(`${apiUrl}?page=1&limit=20`);
      req.flush(mockPaginatedResponse);
    });
  });

  describe('getUnreadCount', () => {
    it('should fetch unread count', () => {
      service.getUnreadCount().subscribe(response => {
        expect(response.count).toBe(5);
      });

      const req = httpMock.expectOne(`${apiUrl}/unread-count`);
      expect(req.request.method).toBe('GET');
      req.flush({ count: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      const readNotification = { ...mockNotification, status: 'READ' as const, readAt: '2024-01-15T10:00:00Z' };

      service.markAsRead('1').subscribe(notification => {
        expect(notification.status).toBe('READ');
      });

      const req = httpMock.expectOne(`${apiUrl}/1/read`);
      expect(req.request.method).toBe('PATCH');
      req.flush(readNotification);
    });

    it('should update notifications signal after marking as read', fakeAsync(() => {
      // First set up some notifications
      service.notifications.set([mockNotification]);
      service.unreadCount.set(1);

      const readNotification = { ...mockNotification, status: 'READ' as const };
      service.markAsRead('1').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/1/read`);
      req.flush(readNotification);
      tick();

      expect(service.notifications()[0].status).toBe('READ');
      expect(service.unreadCount()).toBe(0);
    }));
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', () => {
      service.markAllAsRead().subscribe(response => {
        expect(response.count).toBe(5);
      });

      const req = httpMock.expectOne(`${apiUrl}/read-all`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ count: 5 });
    });

    it('should update signals after marking all as read', fakeAsync(() => {
      service.notifications.set([mockNotification]);
      service.unreadCount.set(5);

      service.markAllAsRead().subscribe();

      const req = httpMock.expectOne(`${apiUrl}/read-all`);
      req.flush({ count: 5 });
      tick();

      expect(service.unreadCount()).toBe(0);
      expect(service.notifications()[0].status).toBe('READ');
    }));
  });

  describe('subscribeToPush', () => {
    it('should subscribe to push notifications', () => {
      const subscription = {
        endpoint: 'https://push.example.com',
        expirationTime: null,
        keys: {
          p256dh: 'key1',
          auth: 'key2'
        }
      };

      service.subscribeToPush(subscription).subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/push/subscribe`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(subscription);
      req.flush({ success: true });
    });
  });

  describe('unsubscribeFromPush', () => {
    it('should unsubscribe from push notifications', () => {
      service.unsubscribeFromPush().subscribe(response => {
        expect(response.success).toBe(true);
      });

      const req = httpMock.expectOne(`${apiUrl}/push/unsubscribe`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true });
    });
  });

  describe('computed signals', () => {
    it('hasUnread should return true when unreadCount > 0', () => {
      service.unreadCount.set(5);
      expect(service.hasUnread()).toBe(true);
    });

    it('hasUnread should return false when unreadCount is 0', () => {
      service.unreadCount.set(0);
      expect(service.hasUnread()).toBe(false);
    });

    it('recentNotifications should return first 5 notifications', () => {
      const notifications = Array(10).fill(null).map((_, i) => ({
        ...mockNotification,
        id: String(i)
      }));
      service.notifications.set(notifications);

      expect(service.recentNotifications().length).toBe(5);
    });
  });

  describe('getRelativeTime', () => {
    it('should return "Just now" for recent times', () => {
      const now = new Date().toISOString();
      expect(service.getRelativeTime(now)).toBe('Just now');
    });

    it('should return minutes ago for times less than an hour', () => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      expect(service.getRelativeTime(tenMinutesAgo)).toBe('10m ago');
    });

    it('should return hours ago for times less than a day', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
      expect(service.getRelativeTime(fiveHoursAgo)).toBe('5h ago');
    });

    it('should return days ago for times less than a week', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(service.getRelativeTime(threeDaysAgo)).toBe('3d ago');
    });
  });

  describe('polling', () => {
    it('should stop polling on destroy', fakeAsync(() => {
      service.stopPolling();
      // Should not throw any errors
      tick(60000);
      discardPeriodicTasks();
    }));
  });
});
