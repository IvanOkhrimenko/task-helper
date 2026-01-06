import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, NavigationEnd } from '@angular/router';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { AppNotificationService, AppNotification } from '../../core/services/app-notification.service';
import { of, Subject, BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let notificationService: jasmine.SpyObj<AppNotificationService>;
  let router: Router;
  let routerEvents: Subject<any>;

  const mockUser = {
    id: 'user1',
    name: 'Test User',
    email: 'test@example.com'
  };

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

  beforeEach(async () => {
    routerEvents = new Subject();

    const authSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      user: signal(mockUser)
    });

    const notifSpy = jasmine.createSpyObj('AppNotificationService', [
      'markAsRead',
      'markAllAsRead',
      'getRelativeTime'
    ], {
      notifications: signal([mockNotification]),
      unreadCount: signal(1),
      hasUnread: signal(true),
      recentNotifications: signal([mockNotification]),
      totalCount: signal(1)
    });
    notifSpy.markAsRead.and.returnValue(of(mockNotification));
    notifSpy.markAllAsRead.and.returnValue(of({ count: 1 }));
    notifSpy.getRelativeTime.and.returnValue('Just now');

    await TestBed.configureTestingModule({
      imports: [
        MainLayoutComponent,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([])
      ],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: AppNotificationService, useValue: notifSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    notificationService = TestBed.inject(AppNotificationService) as jasmine.SpyObj<AppNotificationService>;
    router = TestBed.inject(Router);

    // Override router events
    spyOnProperty(router, 'events', 'get').and.returnValue(routerEvents.asObservable());

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should initialize with sidebar not collapsed', () => {
      expect(component.sidebarCollapsed()).toBe(false);
    });

    it('should initialize with notifications closed', () => {
      expect(component.notificationsOpen()).toBe(false);
    });

    it('should have 4 nav sections', () => {
      expect(component.navSections().length).toBe(4);
    });
  });

  describe('computed properties', () => {
    it('should compute userName from user', () => {
      expect(component.userName()).toBe('Test User');
    });

    it('should compute userEmail from user', () => {
      expect(component.userEmail()).toBe('test@example.com');
    });

    it('should compute userInitial from user name', () => {
      expect(component.userInitial()).toBe('T');
    });
  });

  describe('toggleSidebar', () => {
    it('should toggle sidebar collapsed state', () => {
      expect(component.sidebarCollapsed()).toBe(false);

      component.toggleSidebar();
      expect(component.sidebarCollapsed()).toBe(true);

      component.toggleSidebar();
      expect(component.sidebarCollapsed()).toBe(false);
    });
  });

  describe('toggleSection', () => {
    it('should toggle section collapsed state', () => {
      const section = component.navSections()[0];
      expect(section.collapsed).toBe(false);

      component.toggleSection(section);
      expect(section.collapsed).toBe(true);

      component.toggleSection(section);
      expect(section.collapsed).toBe(false);
    });
  });

  describe('toggleNotifications', () => {
    it('should toggle notifications open state', () => {
      expect(component.notificationsOpen()).toBe(false);

      component.toggleNotifications();
      expect(component.notificationsOpen()).toBe(true);

      component.toggleNotifications();
      expect(component.notificationsOpen()).toBe(false);
    });
  });

  describe('markAllRead', () => {
    it('should call notification service markAllAsRead', () => {
      component.markAllRead();
      expect(notificationService.markAllAsRead).toHaveBeenCalled();
    });
  });

  describe('openNotification', () => {
    it('should mark notification as read if unread', fakeAsync(() => {
      spyOn(router, 'navigate');

      component.openNotification(mockNotification);
      tick();

      expect(notificationService.markAsRead).toHaveBeenCalledWith('1');
    }));

    it('should not mark as read if already read', fakeAsync(() => {
      spyOn(router, 'navigate');
      const readNotification = { ...mockNotification, status: 'READ' as const };

      component.openNotification(readNotification);
      tick();

      expect(notificationService.markAsRead).not.toHaveBeenCalled();
    }));

    it('should close notifications dropdown', fakeAsync(() => {
      component.notificationsOpen.set(true);
      spyOn(router, 'navigate');

      component.openNotification(mockNotification);
      tick();

      expect(component.notificationsOpen()).toBe(false);
    }));

    it('should navigate to task if taskId exists', fakeAsync(() => {
      spyOn(router, 'navigate');

      component.openNotification(mockNotification);
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/tasks/reminders', 'task1']);
    }));
  });

  describe('logout', () => {
    it('should call auth service logout', () => {
      component.logout();
      expect(authService.logout).toHaveBeenCalled();
    });
  });

  describe('onEscape', () => {
    it('should close notifications on escape key', () => {
      component.notificationsOpen.set(true);

      component.onEscape();

      expect(component.notificationsOpen()).toBe(false);
    });

    it('should do nothing if notifications already closed', () => {
      component.notificationsOpen.set(false);

      component.onEscape();

      expect(component.notificationsOpen()).toBe(false);
    });
  });

  describe('currentPageTitle', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should return Dashboard for /dashboard route', () => {
      component.currentRoute.set('/dashboard');
      expect(component.currentPageTitle()).toBe('Dashboard');
    });

    it('should return Invoice Tasks for /tasks/invoices route', () => {
      component.currentRoute.set('/tasks/invoices');
      expect(component.currentPageTitle()).toBe('Invoice Tasks');
    });

    it('should return Reminders for /tasks/reminders route', () => {
      component.currentRoute.set('/tasks/reminders');
      expect(component.currentPageTitle()).toBe('Reminders');
    });

    it('should return Profile for /profile route', () => {
      component.currentRoute.set('/profile');
      expect(component.currentPageTitle()).toBe('Profile');
    });

    it('should return Daily Helper for unknown routes', () => {
      component.currentRoute.set('/unknown');
      expect(component.currentPageTitle()).toBe('Daily Helper');
    });
  });

  describe('navSections structure', () => {
    it('should have Main section with Dashboard', () => {
      const mainSection = component.navSections().find(s => s.title === 'Main');
      expect(mainSection).toBeTruthy();
      expect(mainSection?.items.some(i => i.label === 'Dashboard')).toBe(true);
    });

    it('should have Tasks section with Invoice Tasks and Reminders', () => {
      const tasksSection = component.navSections().find(s => s.title === 'Tasks');
      expect(tasksSection).toBeTruthy();
      expect(tasksSection?.items.some(i => i.label === 'Invoice Tasks')).toBe(true);
      expect(tasksSection?.items.some(i => i.label === 'Reminders')).toBe(true);
    });

    it('should have Documents section with Invoices', () => {
      const docsSection = component.navSections().find(s => s.title === 'Documents');
      expect(docsSection).toBeTruthy();
      expect(docsSection?.items.some(i => i.label === 'Invoices')).toBe(true);
    });

    it('should have Settings section with Profile', () => {
      const settingsSection = component.navSections().find(s => s.title === 'Settings');
      expect(settingsSection).toBeTruthy();
      expect(settingsSection?.items.some(i => i.label === 'Profile')).toBe(true);
    });
  });
});
