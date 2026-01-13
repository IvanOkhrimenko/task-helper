# Daylium - Features Documentation

## Overview

Daylium is a comprehensive task management application with support for invoice tracking, reminders, and notifications.

---

## 1. Reminders System

### Description
Create flexible, scheduled reminders with various recurrence patterns. Reminders integrate with the notification system to alert you via in-app notifications and email.

### Schedule Types

| Type | Description | Configuration |
|------|-------------|---------------|
| `ONE_TIME` | Single occurrence | Date and time |
| `DAILY` | Repeats every day | Time of day |
| `WEEKLY` | Repeats on selected days | Days of week + time |
| `MONTHLY` | Repeats monthly | Day of month + time |
| `YEARLY` | Repeats annually | Month + day + time |
| `CUSTOM` | Custom interval | Days/hours interval |

### Creating a Reminder

1. Navigate to **Tasks > Reminders**
2. Click **New Reminder**
3. Fill in:
   - **Title**: Reminder name
   - **Description**: Optional details
   - **Schedule Type**: Choose from dropdown
   - **Schedule Configuration**: Depends on type selected
   - **Warning/Deadline**: Optional advance notifications

### Advanced Options

- **Custom Notification Email**: Specify a different email address for notifications (instead of your account email)
- **Warning Time**: Get notified before the reminder triggers
- **Deadline Time**: Mark as overdue after this time

### API Endpoints

```
GET    /api/reminders          - List all reminders
POST   /api/reminders          - Create reminder
GET    /api/reminders/:id      - Get reminder details
PUT    /api/reminders/:id      - Update reminder
DELETE /api/reminders/:id      - Delete reminder
PATCH  /api/reminders/:id/snooze - Snooze reminder
```

---

## 2. Notifications System

### Types of Notifications

1. **In-App Notifications**
   - Appear in the notification bell (header)
   - Badge shows unread count
   - Click to view and mark as read

2. **Email Notifications**
   - Sent when reminders trigger
   - Styled HTML emails with reminder details
   - Uses custom email if specified, otherwise account email

### Configuration

Environment variables for email service:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@taskhelper.com
```

### API Endpoints

```
GET   /api/notifications              - List notifications (paginated)
GET   /api/notifications/unread-count - Get unread count
PATCH /api/notifications/:id/read     - Mark as read
PATCH /api/notifications/read-all     - Mark all as read
POST  /api/notifications/push/subscribe   - Subscribe to push
DELETE /api/notifications/push/unsubscribe - Unsubscribe from push
```

---

## 3. Dashboard

### Agenda List View

The dashboard displays an agenda-style list of upcoming events with time period filtering.

### Period Tabs

| Tab | Shows Events |
|-----|--------------|
| Today | Events scheduled for today |
| Tomorrow | Events scheduled for tomorrow |
| This Week | Events from today through end of week |
| This Month | Events from today through end of month |
| Later | Events beyond this month |

### Event Types Displayed

| Event Type | Icon | Color | Description |
|------------|------|-------|-------------|
| Reminder | Bell | Blue | Active reminder scheduled |
| Invoice Warning | Clock | Amber | Invoice approaching deadline |
| Invoice Deadline | Alert | Red | Invoice at deadline |
| Invoice Due | Document | Green | Invoice due date |

### Stats Cards

1. **Active Reminders**: Count of active reminder tasks
2. **Today's Events**: Events scheduled for today
3. **Unpaid Invoices**: Count of unpaid invoices
4. **Monthly Total**: Total invoice amount this month

### Quick Actions

- **View Reminder**: Navigate to reminder details
- **Generate Invoice**: Open invoice generation modal
- **Go to Task**: Navigate to task details

### API Endpoints

```
GET /api/dashboard/events - Get all dashboard events
GET /api/dashboard/stats  - Get dashboard statistics
```

---

## 4. Invoice Tasks

### Description
Invoice tasks are client/project-based tasks for tracking billable work and generating invoices.

### Features

- **Client Information**: Name, email, address
- **Billing Details**: Hourly rate, currency
- **Invoice Generation**: Create PDF invoices with hours worked
- **Due Dates**: Warning datetime and deadline tracking

### Filtering Invoices

The invoices list supports filtering by:

- **Task/Client**: Filter by associated task
- **Status**: Draft, Sent, Paid
- **Date Range**: Custom date filtering

### Invoice Statuses

| Status | Description |
|--------|-------------|
| `DRAFT` | Invoice created but not sent |
| `SENT` | Invoice sent to client |
| `PAID` | Payment received |

---

## 5. Application Layout

### Sidebar Navigation

```
Main
  └── Dashboard

Tasks
  ├── Invoice Tasks
  └── Reminders

Documents
  └── Invoices

Settings
  └── Profile
```

### Header Components

- **User Profile**: Current user info
- **Notification Bell**: In-app notifications with unread count
- **Quick Actions**: New task buttons

---

## 6. Scheduler Service

### How It Works

The backend runs a scheduler service that:

1. Checks for due reminders every minute
2. Triggers notifications when reminder time arrives
3. Updates `lastTriggered` timestamp
4. Calculates `nextOccurrence` for recurring reminders
5. Creates in-app notifications
6. Sends email notifications (if configured)

### Schedule Configuration Format

```typescript
// Weekly example
{
  scheduleType: 'WEEKLY',
  scheduleConfig: {
    time: '09:00',
    daysOfWeek: [1, 3, 5]  // Mon, Wed, Fri
  }
}

// Monthly example
{
  scheduleType: 'MONTHLY',
  scheduleConfig: {
    time: '10:30',
    dayOfMonth: 15
  }
}

// Custom interval
{
  scheduleType: 'CUSTOM',
  scheduleConfig: {
    intervalDays: 3,
    intervalHours: 0,
    time: '14:00'
  }
}
```

---

## 7. Database Schema

### Key Models

**Task**
```prisma
model Task {
  id                String        @id @default(uuid())
  type              TaskType      // INVOICE or REMINDER
  name              String

  // Invoice fields
  clientName        String?
  hourlyRate        Float?
  currency          String?

  // Reminder fields
  scheduleType      ScheduleType?
  scheduleConfig    Json?
  reminderDateTime  DateTime?
  nextOccurrence    DateTime?
  lastTriggered     DateTime?
  notificationEmail String?       // Custom email for notifications

  // Relationships
  invoices          Invoice[]
  notifications     Notification[]
}
```

**Notification**
```prisma
model Notification {
  id           String             @id @default(uuid())
  type         String             // IN_APP, BROWSER_PUSH, EMAIL
  status       NotificationStatus // PENDING, SENT, READ, FAILED
  title        String
  message      String
  scheduledFor DateTime
  sentAt       DateTime?
  readAt       DateTime?

  taskId       String?
  userId       String
}
```

---

## 8. Running the Application

### Backend

```bash
cd backend
npm install
npx prisma db push
npm run dev
```

Required environment variables:
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/taskhelper"
JWT_SECRET="your-secret-key"

# Optional: Email service
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM=noreply@taskhelper.com
```

### Frontend

```bash
cd frontend
npm install
npm start
```

Application runs on:
- Frontend: http://localhost:4200
- Backend: http://localhost:3000

---

## 9. API Authentication

All API endpoints (except `/api/auth/*`) require JWT authentication.

### Headers
```
Authorization: Bearer <jwt-token>
```

### Auth Endpoints
```
POST /api/auth/register - Create account
POST /api/auth/login    - Get JWT token
GET  /api/auth/me       - Get current user
```

---

## 10. Business Finance Module

### Overview

The Business Finance module provides multi-tenant workspace management for tracking shared business finances. Perfect for small businesses, partnerships, and teams that need to track expenses, income, and member balances.

### Key Features

- **Multi-tenant Workspaces**: Create and manage multiple business entities
- **Role-Based Access Control (RBAC)**: 5 role presets with granular permissions
- **Expense & Income Tracking**: Record transactions with category attribution
- **Member Attribution**: Track out-of-pocket expenses and personal receipts
- **Ledger & Balances**: Automatic balance computation showing who owes whom
- **Settlements**: Record reimbursements and repayments
- **Analytics Dashboard**: KPIs, category breakdowns, and time series charts
- **Invite System**: Secure token-based invitations with email or link
- **Audit Logging**: Complete audit trail of all business actions

### Role Hierarchy

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `OWNER` | Business creator | Full access, can delete business |
| `CO_OWNER` | Co-founder/Partner | Full access except deletion |
| `ADMIN` | Manager | Manage members, categories, view analytics |
| `ACCOUNTANT` | Financial access | View all transactions & analytics, export data |
| `EMPLOYEE` | Basic access | View own transactions only, submit expenses |

### Permission Matrix

| Permission | Owner | Co-Owner | Admin | Accountant | Employee |
|------------|:-----:|:--------:|:-----:|:----------:|:--------:|
| Update Business | ✓ | ✓ | ✓ | - | - |
| Invite Members | ✓ | ✓ | ✓ | - | - |
| Change Roles | ✓ | ✓ | ✓ | - | - |
| Create Expense | ✓ | ✓ | ✓ | - | ✓ |
| View All Expenses | ✓ | ✓ | ✓ | ✓ | - |
| View Own Expenses | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create Settlement | ✓ | ✓ | ✓ | - | - |
| View Full Analytics | ✓ | ✓ | ✓ | ✓ | - |
| View Own Analytics | ✓ | ✓ | ✓ | ✓ | ✓ |
| Export Data | ✓ | ✓ | ✓ | ✓ | - |
| View Audit Log | ✓ | ✓ | ✓ | - | - |

### Balance Computation

The ledger system tracks member balances automatically:

```
Balance = OutOfPocketExpenses - PersonallyReceivedIncome - SettlementsReceived + SettlementsPaid
```

- **Positive balance**: Business owes the member (needs reimbursement)
- **Negative balance**: Member owes the business (needs repayment)
- **Zero balance**: Settled

### Creating a Business

1. Navigate to **Business Finance**
2. Click **New Business**
3. Fill in:
   - **Name**: Business name
   - **Description**: Optional details
   - **Currency**: USD, EUR, GBP, PLN
   - **Timezone**: For date calculations

### Recording Transactions

**Expenses:**
- Select category (e.g., Salary, Office Supplies, Fuel)
- Enter amount and date
- Optional: Assign to member who paid out-of-pocket
- Optional: Add counterparty (vendor/supplier)

**Income:**
- Select category (e.g., Sales Revenue, Service Income)
- Enter amount and date
- Optional: Assign to member who received personally
- Optional: Add counterparty (customer/client)

### Settlement Types

| Type | Description | Effect on Balance |
|------|-------------|-------------------|
| `BUSINESS_TO_MEMBER` | Reimbursement | Decreases positive balance |
| `MEMBER_TO_BUSINESS` | Repayment | Increases negative balance |

### Inviting Team Members

1. Go to **Members** tab
2. Click **Invite Member**
3. Choose:
   - **Email**: For email-specific invite
   - **Role**: What access level
   - **Expiration**: 1-30 days
   - **Usage**: Single use or multiple

Invite links format: `/invite/accept?token=<64-char-hex>`

### API Endpoints

**Business CRUD:**
```
GET    /api/businesses              - List user's businesses
POST   /api/businesses              - Create business
GET    /api/businesses/:id          - Get business details
PATCH  /api/businesses/:id          - Update business
POST   /api/businesses/:id/archive  - Archive business
```

**Members:**
```
GET    /api/businesses/:id/members                  - List members
PATCH  /api/businesses/:id/members/:mid/role        - Update role
PATCH  /api/businesses/:id/members/:mid/permissions - Update permissions
DELETE /api/businesses/:id/members/:mid             - Remove member
```

**Invites:**
```
GET    /api/businesses/:id/invites          - List invites
POST   /api/businesses/:id/invites          - Create invite
DELETE /api/businesses/:id/invites/:iid     - Revoke invite
GET    /api/businesses/invite/:token        - Get invite info
POST   /api/businesses/invite/:token/accept - Accept invite
```

**Categories:**
```
GET    /api/businesses/:id/categories       - List categories
POST   /api/businesses/:id/categories       - Create category
PATCH  /api/businesses/:id/categories/:cid  - Update category
```

**Expenses:**
```
GET    /api/businesses/:id/expenses         - List expenses
POST   /api/businesses/:id/expenses         - Create expense
GET    /api/businesses/:id/expenses/:eid    - Get expense
PATCH  /api/businesses/:id/expenses/:eid    - Update expense
DELETE /api/businesses/:id/expenses/:eid    - Delete expense
```

**Income:**
```
GET    /api/businesses/:id/incomes          - List income records
POST   /api/businesses/:id/incomes          - Create income
PATCH  /api/businesses/:id/incomes/:iid     - Update income
DELETE /api/businesses/:id/incomes/:iid     - Delete income
```

**Ledger & Settlements:**
```
GET    /api/businesses/:id/ledger           - Get ledger summary
GET    /api/businesses/:id/ledger/:mid      - Get member ledger
GET    /api/businesses/:id/settlements      - List settlements
POST   /api/businesses/:id/settlements      - Create settlement
```

**Analytics:**
```
GET    /api/businesses/:id/analytics               - Full analytics
GET    /api/businesses/:id/analytics/kpis          - KPIs only
GET    /api/businesses/:id/analytics/expenses/categories - Expense breakdown
GET    /api/businesses/:id/analytics/incomes/categories  - Income breakdown
GET    /api/businesses/:id/analytics/timeseries    - Time series data
GET    /api/businesses/:id/analytics/balances      - Balance widget
GET    /api/businesses/:id/analytics/own           - Own analytics
GET    /api/businesses/user/analytics              - Cross-business analytics
```

**Audit Log:**
```
GET    /api/businesses/:id/audit                        - Query audit log
GET    /api/businesses/:id/audit/:entityType/:entityId  - Entity history
```

### Frontend Routes

```
/business                           - Business list
/business/:id                       - Business detail/overview
/business/:id/transactions          - Expenses & income list
/business/:id/analytics             - Analytics dashboard
/business/:id/members               - Members & balances
```

### Default Categories

**Expense Categories:**
- Salary (marked as salary category)
- Office Supplies
- Fuel
- Maintenance
- Insurance
- Other (default)

**Income Categories:**
- Sales Revenue (default)
- Service Income
- Commission
- Other

### Audit Actions Tracked

- `BUSINESS_CREATED`, `BUSINESS_UPDATED`, `BUSINESS_ARCHIVED`
- `MEMBER_INVITED`, `MEMBER_ACCEPTED`, `MEMBER_ROLE_CHANGED`, `MEMBER_REMOVED`
- `CATEGORY_CREATED`, `CATEGORY_UPDATED`
- `EXPENSE_CREATED`, `EXPENSE_UPDATED`, `EXPENSE_DELETED`
- `INCOME_CREATED`, `INCOME_UPDATED`, `INCOME_DELETED`
- `SETTLEMENT_CREATED`
- `INVITE_REVOKED`

### Testing

The module includes comprehensive tests:

```bash
cd backend
npm test
```

Test coverage:
- **business-permissions.test.ts**: 42 tests for RBAC logic
- **business-ledger.test.ts**: Balance computation tests
- **business-integration.test.ts**: Integration flow tests

Total: 72 tests with >80% coverage for services, >90% for finance-critical logic.

---
