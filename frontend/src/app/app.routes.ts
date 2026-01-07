import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
    canActivate: [guestGuard]
  },
  // All authenticated routes wrapped in MainLayout
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      // Invoice Tasks (existing tasks)
      {
        path: 'tasks/invoices',
        loadComponent: () => import('./features/tasks/tasks-list/tasks-list.component').then(m => m.TasksListComponent)
      },
      {
        path: 'tasks/invoices/new',
        loadComponent: () => import('./features/tasks/task-form/task-form.component').then(m => m.TaskFormComponent)
      },
      {
        path: 'tasks/invoices/:id',
        loadComponent: () => import('./features/tasks/task-detail/task-detail.component').then(m => m.TaskDetailComponent)
      },
      {
        path: 'tasks/invoices/:id/edit',
        loadComponent: () => import('./features/tasks/task-form/task-form.component').then(m => m.TaskFormComponent)
      },
      // Reminders (MUST be before wildcard tasks/:id routes)
      {
        path: 'tasks/reminders',
        loadComponent: () => import('./features/reminders/reminders-list/reminders-list.component').then(m => m.RemindersListComponent)
      },
      {
        path: 'tasks/reminders/new',
        loadComponent: () => import('./features/reminders/reminder-form/reminder-form.component').then(m => m.ReminderFormComponent)
      },
      {
        path: 'tasks/reminders/:id/edit',
        loadComponent: () => import('./features/reminders/reminder-form/reminder-form.component').then(m => m.ReminderFormComponent)
      },
      {
        path: 'tasks/reminders/:id',
        loadComponent: () => import('./features/reminders/reminder-detail/reminder-detail.component').then(m => m.ReminderDetailComponent)
      },
      // Legacy task routes (wildcard - must be AFTER specific routes)
      {
        path: 'tasks/new',
        redirectTo: 'tasks/invoices/new',
        pathMatch: 'full'
      },
      {
        path: 'tasks/:id/edit',
        loadComponent: () => import('./features/tasks/task-form/task-form.component').then(m => m.TaskFormComponent)
      },
      {
        path: 'tasks/:id',
        loadComponent: () => import('./features/tasks/task-detail/task-detail.component').then(m => m.TaskDetailComponent)
      },
      // Invoices
      {
        path: 'invoices',
        loadComponent: () => import('./features/invoices/invoices-list/invoices-list.component').then(m => m.InvoicesListComponent)
      },
      {
        path: 'invoices/:id',
        loadComponent: () => import('./features/invoices/invoice-preview/invoice-preview.component').then(m => m.InvoicePreviewComponent)
      },
      // Profile
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      // CRM Integrations
      {
        path: 'settings/crm',
        loadComponent: () => import('./features/settings/crm-settings/crm-settings.component').then(m => m.CRMSettingsComponent)
      },
      // Bank Accounts
      {
        path: 'settings/bank-accounts',
        loadComponent: () => import('./features/settings/bank-accounts-settings/bank-accounts-settings.component').then(m => m.BankAccountsSettingsComponent)
      },
      // Admin: AI Settings
      {
        path: 'settings/ai',
        loadComponent: () => import('./features/settings/ai-settings/ai-settings.component').then(m => m.AISettingsComponent),
        canActivate: [adminGuard]
      },
      // Admin: Google Integration Settings
      {
        path: 'settings/google',
        loadComponent: () => import('./features/settings/google-settings/google-settings.component').then(m => m.GoogleSettingsComponent),
        canActivate: [adminGuard]
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
