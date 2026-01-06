import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { RemindersListComponent } from './reminders-list.component';
import { ReminderService, Reminder } from '../../../core/services/reminder.service';
import { of, throwError } from 'rxjs';

describe('RemindersListComponent', () => {
  let component: RemindersListComponent;
  let fixture: ComponentFixture<RemindersListComponent>;
  let reminderService: jasmine.SpyObj<ReminderService>;

  const mockReminders: Reminder[] = [
    {
      id: '1',
      name: 'Daily Standup',
      type: 'REMINDER',
      isActive: true,
      scheduleType: 'DAILY',
      scheduleConfig: { time: '09:00' },
      reminderDateTime: null,
      reminderWarning: null,
      reminderDeadline: null,
      reminderTitle: 'Standup Time',
      reminderMessage: 'Join daily standup',
      nextOccurrence: '2024-01-15T09:00:00Z',
      lastTriggered: null,
      userId: 'user1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'Weekly Report',
      type: 'REMINDER',
      isActive: false,
      scheduleType: 'WEEKLY',
      scheduleConfig: { time: '17:00', daysOfWeek: [5] },
      reminderDateTime: null,
      reminderWarning: null,
      reminderDeadline: null,
      reminderTitle: 'Report Due',
      reminderMessage: 'Submit weekly report',
      nextOccurrence: '2024-01-19T17:00:00Z',
      lastTriggered: null,
      userId: 'user1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('ReminderService', [
      'getReminders',
      'toggleReminder',
      'deleteReminder'
    ]);
    spy.getReminders.and.returnValue(of(mockReminders));

    await TestBed.configureTestingModule({
      imports: [
        RemindersListComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      providers: [
        { provide: ReminderService, useValue: spy }
      ]
    }).compileComponents();

    reminderService = TestBed.inject(ReminderService) as jasmine.SpyObj<ReminderService>;
    fixture = TestBed.createComponent(RemindersListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should load reminders on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(reminderService.getReminders).toHaveBeenCalled();
      expect(component.reminders().length).toBe(2);
    }));

    it('should set loading to false after loading', fakeAsync(() => {
      expect(component.loading()).toBe(true);
      fixture.detectChanges();
      tick();

      expect(component.loading()).toBe(false);
    }));

    it('should sort reminders by nextOccurrence', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const reminders = component.reminders();
      expect(reminders[0].name).toBe('Daily Standup');
    }));
  });

  describe('computed stats', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should calculate total count', () => {
      expect(component.totalCount()).toBe(2);
    });

    it('should calculate active count', () => {
      expect(component.activeCount()).toBe(1);
    });

    it('should calculate inactive count', () => {
      expect(component.inactiveCount()).toBe(1);
    });
  });

  describe('toggleReminder', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should toggle reminder active state', fakeAsync(() => {
      const toggledReminder = { ...mockReminders[0], isActive: false };
      reminderService.toggleReminder.and.returnValue(of(toggledReminder));

      component.toggleReminder(mockReminders[0]);
      tick();

      expect(reminderService.toggleReminder).toHaveBeenCalledWith('1');
    }));

    it('should handle toggle error', fakeAsync(() => {
      reminderService.toggleReminder.and.returnValue(throwError(() => new Error('Error')));

      // Should not throw
      expect(() => {
        component.toggleReminder(mockReminders[0]);
        tick();
      }).not.toThrow();
    }));
  });

  describe('deleteReminder', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should delete reminder when confirmed', fakeAsync(() => {
      spyOn(window, 'confirm').and.returnValue(true);
      reminderService.deleteReminder.and.returnValue(of(undefined));

      component.deleteReminder(mockReminders[0]);
      tick();

      expect(reminderService.deleteReminder).toHaveBeenCalledWith('1');
    }));

    it('should not delete when cancelled', fakeAsync(() => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.deleteReminder(mockReminders[0]);
      tick();

      expect(reminderService.deleteReminder).not.toHaveBeenCalled();
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

  describe('formatNextOccurrence', () => {
    it('should return dash for null date', () => {
      expect(component.formatNextOccurrence(null)).toBe('—');
    });

    it('should format valid date', () => {
      const result = component.formatNextOccurrence('2024-01-15T09:00:00Z');
      expect(result).toBeTruthy();
      expect(result).not.toBe('—');
    });
  });
});
