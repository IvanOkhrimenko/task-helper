import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ReminderDetailComponent } from './reminder-detail.component';
import { ReminderService, Reminder } from '../../../core/services/reminder.service';
import { of } from 'rxjs';

describe('ReminderDetailComponent', () => {
  let component: ReminderDetailComponent;
  let fixture: ComponentFixture<ReminderDetailComponent>;
  let reminderService: jasmine.SpyObj<ReminderService>;
  let router: Router;

  const mockReminder: Reminder = {
    id: '1',
    name: 'Test Reminder',
    type: 'REMINDER',
    isActive: true,
    scheduleType: 'WEEKLY',
    scheduleConfig: { time: '09:00', daysOfWeek: [1, 3, 5] },
    reminderDateTime: null,
    reminderWarning: 15,
    reminderDeadline: 30,
    reminderTitle: 'Test Title',
    reminderMessage: 'Test Message',
    nextOccurrence: '2024-01-15T09:00:00Z',
    lastTriggered: '2024-01-12T09:00:00Z',
    userId: 'user1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ReminderService', [
      'getReminder',
      'toggleReminder',
      'snoozeReminder',
      'deleteReminder'
    ]);
    spy.getReminder.and.returnValue(of(mockReminder));
    spy.toggleReminder.and.returnValue(of({ ...mockReminder, isActive: false }));
    spy.snoozeReminder.and.returnValue(of(mockReminder));
    spy.deleteReminder.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [
        ReminderDetailComponent,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([])
      ],
      providers: [
        { provide: ReminderService, useValue: spy },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '1' } } } }
      ]
    }).compileComponents();

    reminderService = TestBed.inject(ReminderService) as jasmine.SpyObj<ReminderService>;
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ReminderDetailComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should load reminder on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(reminderService.getReminder).toHaveBeenCalledWith('1');
      expect(component.reminder()).toBeTruthy();
      expect(component.reminder()?.name).toBe('Test Reminder');
    }));

    it('should set loading to false after loading', fakeAsync(() => {
      expect(component.isLoading()).toBe(true);
      fixture.detectChanges();
      tick();

      expect(component.isLoading()).toBe(false);
    }));
  });

  describe('getScheduleLabel', () => {
    it('should return correct label for ONE_TIME', () => {
      expect(component.getScheduleLabel('ONE_TIME')).toBe('One-time');
    });

    it('should return correct label for DAILY', () => {
      expect(component.getScheduleLabel('DAILY')).toBe('Daily');
    });

    it('should return correct label for WEEKLY', () => {
      expect(component.getScheduleLabel('WEEKLY')).toBe('Weekly');
    });

    it('should return correct label for MONTHLY', () => {
      expect(component.getScheduleLabel('MONTHLY')).toBe('Monthly');
    });

    it('should return correct label for YEARLY', () => {
      expect(component.getScheduleLabel('YEARLY')).toBe('Yearly');
    });

    it('should return correct label for CUSTOM', () => {
      expect(component.getScheduleLabel('CUSTOM')).toBe('Custom');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const result = component.formatDate('2024-01-15T09:00:00Z');
      expect(result).toBeTruthy();
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });
  });

  describe('formatScheduleConfig', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should format time config', () => {
      const reminder: Reminder = {
        ...mockReminder,
        scheduleConfig: { time: '10:00' }
      };
      expect(component.formatScheduleConfig(reminder)).toContain('at 10:00');
    });

    it('should format daysOfWeek config', () => {
      const result = component.formatScheduleConfig(mockReminder);
      expect(result).toContain('Mon');
      expect(result).toContain('Wed');
      expect(result).toContain('Fri');
    });

    it('should format dayOfMonth config', () => {
      const reminder: Reminder = {
        ...mockReminder,
        scheduleConfig: { dayOfMonth: 15 }
      };
      expect(component.formatScheduleConfig(reminder)).toContain('day 15');
    });

    it('should format month config', () => {
      const reminder: Reminder = {
        ...mockReminder,
        scheduleConfig: { month: 6 }
      };
      expect(component.formatScheduleConfig(reminder)).toContain('Jul');
    });

    it('should format intervalMinutes config', () => {
      const reminder: Reminder = {
        ...mockReminder,
        scheduleConfig: { intervalMinutes: 30 }
      };
      expect(component.formatScheduleConfig(reminder)).toContain('every 30 minutes');
    });

    it('should return dash for null config', () => {
      const reminder: Reminder = {
        ...mockReminder,
        scheduleConfig: null as any
      };
      expect(component.formatScheduleConfig(reminder)).toBe('-');
    });
  });

  describe('toggleActive', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should toggle reminder active state', fakeAsync(() => {
      component.toggleActive();
      tick();

      expect(reminderService.toggleReminder).toHaveBeenCalledWith('1');
      expect(component.reminder()?.isActive).toBe(false);
    }));

    it('should not call toggle if no reminder', () => {
      component.reminder.set(null);
      component.toggleActive();
      expect(reminderService.toggleReminder).not.toHaveBeenCalled();
    });
  });

  describe('snooze', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should snooze reminder for 15 minutes', fakeAsync(() => {
      component.snooze(15);
      tick();

      expect(reminderService.snoozeReminder).toHaveBeenCalledWith('1', 15);
    }));

    it('should snooze reminder for 60 minutes', fakeAsync(() => {
      component.snooze(60);
      tick();

      expect(reminderService.snoozeReminder).toHaveBeenCalledWith('1', 60);
    }));

    it('should not snooze if no reminder', () => {
      component.reminder.set(null);
      component.snooze(15);
      expect(reminderService.snoozeReminder).not.toHaveBeenCalled();
    });
  });

  describe('deleteReminder', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should delete reminder when confirmed', fakeAsync(() => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(router, 'navigate');

      component.deleteReminder();
      tick();

      expect(reminderService.deleteReminder).toHaveBeenCalledWith('1');
      expect(router.navigate).toHaveBeenCalledWith(['/tasks/reminders']);
    }));

    it('should not delete when cancelled', fakeAsync(() => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.deleteReminder();
      tick();

      expect(reminderService.deleteReminder).not.toHaveBeenCalled();
    }));

    it('should not delete if no reminder', () => {
      component.reminder.set(null);
      component.deleteReminder();
      expect(reminderService.deleteReminder).not.toHaveBeenCalled();
    });
  });
});
