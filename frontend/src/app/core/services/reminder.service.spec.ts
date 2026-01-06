import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReminderService, Reminder, CreateReminderDto, ScheduleType } from './reminder.service';

describe('ReminderService', () => {
  let service: ReminderService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3000/api/reminders';

  const mockReminder: Reminder = {
    id: '1',
    name: 'Test Reminder',
    type: 'REMINDER',
    isActive: true,
    scheduleType: 'DAILY',
    scheduleConfig: { time: '09:00' },
    reminderDateTime: null,
    reminderWarning: null,
    reminderDeadline: null,
    reminderTitle: 'Test Title',
    reminderMessage: 'Test Message',
    nextOccurrence: '2024-01-15T09:00:00Z',
    lastTriggered: null,
    userId: 'user1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReminderService]
    });
    service = TestBed.inject(ReminderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getReminders', () => {
    it('should return list of reminders', () => {
      const mockReminders: Reminder[] = [mockReminder];

      service.getReminders().subscribe(reminders => {
        expect(reminders.length).toBe(1);
        expect(reminders[0].name).toBe('Test Reminder');
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush(mockReminders);
    });

    it('should handle empty list', () => {
      service.getReminders().subscribe(reminders => {
        expect(reminders.length).toBe(0);
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush([]);
    });
  });

  describe('getReminder', () => {
    it('should return single reminder by id', () => {
      service.getReminder('1').subscribe(reminder => {
        expect(reminder.id).toBe('1');
        expect(reminder.name).toBe('Test Reminder');
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('GET');
      req.flush(mockReminder);
    });
  });

  describe('createReminder', () => {
    it('should create a new reminder', () => {
      const createDto: CreateReminderDto = {
        name: 'New Reminder',
        scheduleType: 'DAILY',
        scheduleConfig: { time: '10:00' },
        reminderTitle: 'New Title',
        reminderMessage: 'New Message'
      };

      service.createReminder(createDto).subscribe(reminder => {
        expect(reminder.name).toBe('New Reminder');
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(createDto);
      req.flush({ ...mockReminder, ...createDto });
    });
  });

  describe('updateReminder', () => {
    it('should update an existing reminder', () => {
      const updateData = { name: 'Updated Name' };

      service.updateReminder('1', updateData).subscribe(reminder => {
        expect(reminder.name).toBe('Updated Name');
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('PUT');
      req.flush({ ...mockReminder, ...updateData });
    });
  });

  describe('deleteReminder', () => {
    it('should delete a reminder', () => {
      service.deleteReminder('1').subscribe(response => {
        expect(response).toBeUndefined();
      });

      const req = httpMock.expectOne(`${apiUrl}/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('toggleReminder', () => {
    it('should toggle reminder active state', () => {
      service.toggleReminder('1').subscribe(reminder => {
        expect(reminder.isActive).toBe(false);
      });

      const req = httpMock.expectOne(`${apiUrl}/1/toggle`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...mockReminder, isActive: false });
    });
  });

  describe('snoozeReminder', () => {
    it('should snooze reminder for specified minutes', () => {
      service.snoozeReminder('1', 15).subscribe(reminder => {
        expect(reminder).toBeTruthy();
      });

      const req = httpMock.expectOne(`${apiUrl}/1/snooze`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual({ minutes: 15 });
      req.flush(mockReminder);
    });
  });
});
