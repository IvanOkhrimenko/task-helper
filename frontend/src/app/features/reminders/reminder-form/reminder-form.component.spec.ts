import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ReminderFormComponent } from './reminder-form.component';
import { ReminderService, Reminder, CreateReminderDto } from '../../../core/services/reminder.service';
import { of } from 'rxjs';

describe('ReminderFormComponent', () => {
  let component: ReminderFormComponent;
  let fixture: ComponentFixture<ReminderFormComponent>;
  let reminderService: jasmine.SpyObj<ReminderService>;
  let router: Router;

  const mockReminder: Reminder = {
    id: '1',
    name: 'Test Reminder',
    type: 'REMINDER',
    isActive: true,
    scheduleType: 'DAILY',
    scheduleConfig: { time: '09:00' },
    reminderDateTime: null,
    reminderWarning: 15,
    reminderDeadline: 30,
    reminderTitle: 'Test Title',
    reminderMessage: 'Test Message',
    nextOccurrence: '2024-01-15T09:00:00Z',
    lastTriggered: null,
    userId: 'user1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  describe('Create mode', () => {
    beforeEach(async () => {
      const spy = jasmine.createSpyObj('ReminderService', ['createReminder', 'updateReminder', 'getReminder']);
      spy.createReminder.and.returnValue(of(mockReminder));

      await TestBed.configureTestingModule({
        imports: [
          ReminderFormComponent,
          HttpClientTestingModule,
          RouterTestingModule.withRoutes([])
        ],
        providers: [
          { provide: ReminderService, useValue: spy },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
        ]
      }).compileComponents();

      reminderService = TestBed.inject(ReminderService) as jasmine.SpyObj<ReminderService>;
      router = TestBed.inject(Router);
      fixture = TestBed.createComponent(ReminderFormComponent);
      component = fixture.componentInstance;
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should be in create mode by default', () => {
      fixture.detectChanges();
      expect(component.isEditing()).toBe(false);
    });

    it('should have default schedule type as ONE_TIME', () => {
      expect(component.scheduleType).toBe('ONE_TIME');
    });

    it('should have default schedule time', () => {
      expect(component.scheduleTime).toBe('09:00');
    });

    it('should have isActive true by default', () => {
      expect(component.isActive).toBe(true);
    });

    it('should toggle day in selectedDays', () => {
      component.selectedDays = [1];

      // Add day
      component.toggleDay(2);
      expect(component.selectedDays).toContain(2);

      // Remove day
      component.toggleDay(2);
      expect(component.selectedDays).not.toContain(2);
    });

    it('should not remove last day from selectedDays', () => {
      component.selectedDays = [1];
      component.toggleDay(1);
      expect(component.selectedDays).toContain(1);
    });

    it('should not save without name', () => {
      component.name = '';
      component.save();
      expect(reminderService.createReminder).not.toHaveBeenCalled();
    });

    it('should create reminder with correct data', fakeAsync(() => {
      spyOn(router, 'navigate');

      component.name = 'New Reminder';
      component.scheduleType = 'DAILY';
      component.scheduleTime = '10:00';
      component.reminderTitle = 'Title';
      component.reminderMessage = 'Message';

      component.save();
      tick();

      expect(reminderService.createReminder).toHaveBeenCalled();
      const createDto = reminderService.createReminder.calls.mostRecent().args[0] as CreateReminderDto;
      expect(createDto.name).toBe('New Reminder');
      expect(createDto.scheduleType).toBe('DAILY');
      expect(createDto.scheduleConfig?.time).toBe('10:00');
    }));

    it('should navigate after successful create', fakeAsync(() => {
      spyOn(router, 'navigate');

      component.name = 'New Reminder';
      component.scheduleType = 'ONE_TIME';
      component.reminderDateTime = '2024-01-15T10:00';

      component.save();
      tick();

      expect(router.navigate).toHaveBeenCalledWith(['/tasks/reminders']);
    }));

    it('should include daysOfWeek for WEEKLY schedule', fakeAsync(() => {
      spyOn(router, 'navigate');

      component.name = 'Weekly Reminder';
      component.scheduleType = 'WEEKLY';
      component.selectedDays = [1, 3, 5];

      component.save();
      tick();

      const createDto = reminderService.createReminder.calls.mostRecent().args[0] as CreateReminderDto;
      expect(createDto.scheduleConfig?.daysOfWeek).toEqual([1, 3, 5]);
    }));

    it('should include dayOfMonth for MONTHLY schedule', fakeAsync(() => {
      spyOn(router, 'navigate');

      component.name = 'Monthly Reminder';
      component.scheduleType = 'MONTHLY';
      component.dayOfMonth = 15;

      component.save();
      tick();

      const createDto = reminderService.createReminder.calls.mostRecent().args[0] as CreateReminderDto;
      expect(createDto.scheduleConfig?.dayOfMonth).toBe(15);
    }));

    it('should include month and dayOfMonth for YEARLY schedule', fakeAsync(() => {
      spyOn(router, 'navigate');

      component.name = 'Yearly Reminder';
      component.scheduleType = 'YEARLY';
      component.selectedMonth = 6;
      component.dayOfMonth = 25;

      component.save();
      tick();

      const createDto = reminderService.createReminder.calls.mostRecent().args[0] as CreateReminderDto;
      expect(createDto.scheduleConfig?.month).toBe(6);
      expect(createDto.scheduleConfig?.dayOfMonth).toBe(25);
    }));

    it('should include intervalMinutes for CUSTOM schedule', fakeAsync(() => {
      spyOn(router, 'navigate');

      component.name = 'Custom Reminder';
      component.scheduleType = 'CUSTOM';
      component.intervalMinutes = 30;

      component.save();
      tick();

      const createDto = reminderService.createReminder.calls.mostRecent().args[0] as CreateReminderDto;
      expect(createDto.scheduleConfig?.intervalMinutes).toBe(30);
    }));
  });

  describe('Edit mode', () => {
    beforeEach(async () => {
      const spy = jasmine.createSpyObj('ReminderService', ['createReminder', 'updateReminder', 'getReminder']);
      spy.getReminder.and.returnValue(of(mockReminder));
      spy.updateReminder.and.returnValue(of(mockReminder));

      await TestBed.configureTestingModule({
        imports: [
          ReminderFormComponent,
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
      fixture = TestBed.createComponent(ReminderFormComponent);
      component = fixture.componentInstance;
    });

    it('should be in edit mode when id is provided', fakeAsync(() => {
      fixture.detectChanges();
      tick();
      expect(component.isEditing()).toBe(true);
    }));

    it('should load reminder data', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(reminderService.getReminder).toHaveBeenCalledWith('1');
      expect(component.name).toBe('Test Reminder');
      expect(component.scheduleType).toBe('DAILY');
      expect(component.isActive).toBe(true);
    }));

    it('should update reminder on save', fakeAsync(() => {
      spyOn(router, 'navigate');
      fixture.detectChanges();
      tick();

      component.name = 'Updated Reminder';
      component.save();
      tick();

      expect(reminderService.updateReminder).toHaveBeenCalledWith('1', jasmine.any(Object));
    }));
  });

  describe('scheduleTypes', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          ReminderFormComponent,
          HttpClientTestingModule,
          RouterTestingModule.withRoutes([])
        ],
        providers: [
          { provide: ReminderService, useValue: jasmine.createSpyObj('ReminderService', ['createReminder']) },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(ReminderFormComponent);
      component = fixture.componentInstance;
    });

    it('should have 6 schedule types', () => {
      expect(component.scheduleTypes.length).toBe(6);
    });

    it('should include all required schedule types', () => {
      const types = component.scheduleTypes.map(t => t.value);
      expect(types).toContain('ONE_TIME');
      expect(types).toContain('DAILY');
      expect(types).toContain('WEEKLY');
      expect(types).toContain('MONTHLY');
      expect(types).toContain('YEARLY');
      expect(types).toContain('CUSTOM');
    });
  });

  describe('weekDays', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          ReminderFormComponent,
          HttpClientTestingModule,
          RouterTestingModule.withRoutes([])
        ],
        providers: [
          { provide: ReminderService, useValue: jasmine.createSpyObj('ReminderService', ['createReminder']) },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(ReminderFormComponent);
      component = fixture.componentInstance;
    });

    it('should have 7 week days', () => {
      expect(component.weekDays.length).toBe(7);
    });

    it('should start with Sunday (0)', () => {
      expect(component.weekDays[0].value).toBe(0);
      expect(component.weekDays[0].short).toBe('Su');
    });
  });

  describe('months', () => {
    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [
          ReminderFormComponent,
          HttpClientTestingModule,
          RouterTestingModule.withRoutes([])
        ],
        providers: [
          { provide: ReminderService, useValue: jasmine.createSpyObj('ReminderService', ['createReminder']) },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
        ]
      }).compileComponents();

      fixture = TestBed.createComponent(ReminderFormComponent);
      component = fixture.componentInstance;
    });

    it('should have 12 months', () => {
      expect(component.months.length).toBe(12);
    });

    it('should start with January (0)', () => {
      expect(component.months[0].value).toBe(0);
      expect(component.months[0].label).toBe('January');
    });
  });
});
