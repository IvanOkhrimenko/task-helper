import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { InvoicesListComponent } from './invoices-list.component';
import { InvoiceService } from '../../../core/services/invoice.service';
import { Invoice } from '../../../core/services/task.service';
import { of } from 'rxjs';

describe('InvoicesListComponent', () => {
  let component: InvoicesListComponent;
  let fixture: ComponentFixture<InvoicesListComponent>;
  let invoiceService: jasmine.SpyObj<InvoiceService>;

  const mockInvoices: Invoice[] = [
    {
      id: '1',
      number: 'INV-001',
      amount: 1000,
      currency: 'USD',
      status: 'PAID',
      taskId: 'task1',
      userId: 'user1',
      invoiceMonth: 0,
      invoiceYear: 2024,
      hoursWorked: 10,
      hourlyRate: 100,
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      task: {
        id: 'task1',
        name: 'Project Alpha',
        clientName: 'Client A'
      } as any
    },
    {
      id: '2',
      number: 'INV-002',
      amount: 2000,
      currency: 'EUR',
      status: 'SENT',
      taskId: 'task2',
      userId: 'user1',
      invoiceMonth: 1,
      invoiceYear: 2024,
      hoursWorked: 20,
      hourlyRate: 100,
      createdAt: '2024-02-15T00:00:00Z',
      updatedAt: '2024-02-15T00:00:00Z',
      task: {
        id: 'task2',
        name: 'Project Beta',
        clientName: 'Client B'
      } as any
    },
    {
      id: '3',
      number: 'INV-003',
      amount: 500,
      currency: 'USD',
      status: 'DRAFT',
      taskId: 'task1',
      userId: 'user1',
      invoiceMonth: 2,
      invoiceYear: 2024,
      hoursWorked: 5,
      hourlyRate: 100,
      createdAt: '2024-03-15T00:00:00Z',
      updatedAt: '2024-03-15T00:00:00Z',
      task: {
        id: 'task1',
        name: 'Project Alpha',
        clientName: 'Client A'
      } as any
    }
  ];

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('InvoiceService', ['getInvoices']);
    spy.getInvoices.and.returnValue(of(mockInvoices));

    await TestBed.configureTestingModule({
      imports: [
        InvoicesListComponent,
        HttpClientTestingModule,
        RouterTestingModule
      ],
      providers: [
        { provide: InvoiceService, useValue: spy }
      ]
    }).compileComponents();

    invoiceService = TestBed.inject(InvoiceService) as jasmine.SpyObj<InvoiceService>;
    fixture = TestBed.createComponent(InvoicesListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should load invoices on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(invoiceService.getInvoices).toHaveBeenCalled();
      expect(component.invoices().length).toBe(3);
    }));

    it('should set loading to false after loading', fakeAsync(() => {
      expect(component.isLoading()).toBe(true);
      fixture.detectChanges();
      tick();

      expect(component.isLoading()).toBe(false);
    }));

    it('should sort invoices by createdAt descending', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      const invoices = component.invoices();
      expect(invoices[0].number).toBe('INV-003'); // Most recent
    }));
  });

  describe('status counts', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should calculate paid count', () => {
      expect(component.paidCount()).toBe(1);
    });

    it('should calculate sent count', () => {
      expect(component.sentCount()).toBe(1);
    });

    it('should calculate draft count', () => {
      expect(component.draftCount()).toBe(1);
    });
  });

  describe('status filtering', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    it('should show all invoices by default', () => {
      expect(component.filteredInvoices().length).toBe(3);
    });

    it('should filter by PAID status', () => {
      component.setFilter('PAID');
      expect(component.filteredInvoices().length).toBe(1);
      expect(component.filteredInvoices()[0].status).toBe('PAID');
    });

    it('should filter by SENT status', () => {
      component.setFilter('SENT');
      expect(component.filteredInvoices().length).toBe(1);
      expect(component.filteredInvoices()[0].status).toBe('SENT');
    });

    it('should filter by DRAFT status', () => {
      component.setFilter('DRAFT');
      expect(component.filteredInvoices().length).toBe(1);
      expect(component.filteredInvoices()[0].status).toBe('DRAFT');
    });
  });

  describe('advanced filtering', () => {
    beforeEach(fakeAsync(() => {
      fixture.detectChanges();
      tick();
    }));

    describe('task filtering', () => {
      it('should extract unique tasks', () => {
        const uniqueTasks = component.uniqueTasks();
        expect(uniqueTasks.length).toBe(2);
      });

      it('should filter by task', () => {
        component.onTaskChange('task1');
        const filtered = component.filteredInvoices();
        expect(filtered.length).toBe(2);
        filtered.forEach(inv => {
          expect(inv.taskId).toBe('task1');
        });
      });

      it('should clear task filter', () => {
        component.onTaskChange('task1');
        expect(component.selectedTaskId()).toBe('task1');

        component.clearTaskFilter();
        expect(component.selectedTaskId()).toBe('');
        expect(component.filteredInvoices().length).toBe(3);
      });
    });

    describe('date range filtering', () => {
      it('should filter by start date', () => {
        component.onStartDateChange('2024-02-01');
        const filtered = component.filteredInvoices();
        expect(filtered.length).toBe(2);
      });

      it('should filter by end date', () => {
        component.onEndDateChange('2024-02-01');
        const filtered = component.filteredInvoices();
        expect(filtered.length).toBe(1);
      });

      it('should filter by date range', () => {
        component.onStartDateChange('2024-02-01');
        component.onEndDateChange('2024-02-28');
        const filtered = component.filteredInvoices();
        expect(filtered.length).toBe(1);
        expect(filtered[0].number).toBe('INV-002');
      });

      it('should clear start date', () => {
        component.onStartDateChange('2024-02-01');
        component.clearStartDate();
        expect(component.startDate()).toBe('');
      });

      it('should clear end date', () => {
        component.onEndDateChange('2024-02-28');
        component.clearEndDate();
        expect(component.endDate()).toBe('');
      });

      it('should clear date range', () => {
        component.onStartDateChange('2024-02-01');
        component.onEndDateChange('2024-02-28');
        component.clearDateRange();
        expect(component.startDate()).toBe('');
        expect(component.endDate()).toBe('');
      });
    });

    describe('combined filtering', () => {
      it('should combine status and task filters', () => {
        component.setFilter('PAID');
        component.onTaskChange('task1');
        const filtered = component.filteredInvoices();
        expect(filtered.length).toBe(1);
        expect(filtered[0].status).toBe('PAID');
        expect(filtered[0].taskId).toBe('task1');
      });

      it('should combine all filters', () => {
        component.setFilter('ALL');
        component.onTaskChange('task1');
        component.onStartDateChange('2024-01-01');
        component.onEndDateChange('2024-02-28');
        const filtered = component.filteredInvoices();
        expect(filtered.length).toBe(1);
      });
    });

    describe('hasActiveFilters', () => {
      it('should return false when no filters active', () => {
        expect(component.hasActiveFilters()).toBe(false);
      });

      it('should return true when task filter active', () => {
        component.onTaskChange('task1');
        expect(component.hasActiveFilters()).toBe(true);
      });

      it('should return true when date filter active', () => {
        component.onStartDateChange('2024-01-01');
        expect(component.hasActiveFilters()).toBe(true);
      });
    });

    describe('activeFilterCount', () => {
      it('should return 0 when no filters', () => {
        expect(component.activeFilterCount()).toBe(0);
      });

      it('should return 1 for task filter', () => {
        component.onTaskChange('task1');
        expect(component.activeFilterCount()).toBe(1);
      });

      it('should return 1 for date range (counts as one)', () => {
        component.onStartDateChange('2024-01-01');
        component.onEndDateChange('2024-12-31');
        expect(component.activeFilterCount()).toBe(1);
      });

      it('should return 2 for task + date range', () => {
        component.onTaskChange('task1');
        component.onStartDateChange('2024-01-01');
        expect(component.activeFilterCount()).toBe(2);
      });
    });

    describe('clearAllFilters', () => {
      it('should clear all advanced filters', () => {
        component.onTaskChange('task1');
        component.onStartDateChange('2024-01-01');
        component.onEndDateChange('2024-12-31');

        component.clearAllFilters();

        expect(component.selectedTaskId()).toBe('');
        expect(component.startDate()).toBe('');
        expect(component.endDate()).toBe('');
      });
    });
  });

  describe('helper methods', () => {
    it('should get task name', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(component.getTaskName('task1')).toBe('Project Alpha');
      expect(component.getTaskName('unknown')).toBe('Unknown Task');
    }));

    it('should get date range label for both dates', () => {
      component.startDate.set('2024-01-15');
      component.endDate.set('2024-02-15');
      const label = component.getDateRangeLabel();
      expect(label).toContain('Jan');
      expect(label).toContain('Feb');
    });

    it('should get date range label for start only', () => {
      component.startDate.set('2024-01-15');
      const label = component.getDateRangeLabel();
      expect(label).toContain('From');
    });

    it('should get date range label for end only', () => {
      component.endDate.set('2024-02-15');
      const label = component.getDateRangeLabel();
      expect(label).toContain('Until');
    });

    it('should get month name', () => {
      expect(component.getMonthName(0)).toBe('January');
      expect(component.getMonthName(11)).toBe('December');
      expect(component.getMonthName(undefined)).toBe('');
    });

    it('should get status label', () => {
      expect(component.getStatusLabel('DRAFT')).toBe('Draft');
      expect(component.getStatusLabel('SENT')).toBe('Sent');
      expect(component.getStatusLabel('PAID')).toBe('Paid');
      expect(component.getStatusLabel('CANCELLED')).toBe('Cancelled');
    });

    it('should get currency symbol', () => {
      expect(component.getCurrencySymbol('USD')).toBe('$');
      expect(component.getCurrencySymbol('EUR')).toBe('€');
      expect(component.getCurrencySymbol('PLN')).toBe('zł');
      expect(component.getCurrencySymbol('GBP')).toBe('£');
    });
  });

  describe('toggleAdvancedFilters', () => {
    it('should toggle advanced filters visibility', () => {
      expect(component.showAdvancedFilters()).toBe(false);

      component.toggleAdvancedFilters();
      expect(component.showAdvancedFilters()).toBe(true);

      component.toggleAdvancedFilters();
      expect(component.showAdvancedFilters()).toBe(false);
    });
  });
});
