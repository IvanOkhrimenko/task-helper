import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import reminderRoutes from './routes/reminder.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import googleRoutes from './routes/google.routes.js';
import chatRoutes from './routes/chat.routes.js';
import { initScheduler } from './services/scheduler.service.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());

// Make prisma available in routes
app.set('prisma', prisma);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

async function main() {
  await prisma.$connect();
  console.log('Connected to database');

  // Start the reminder scheduler
  const scheduler = initScheduler(prisma);
  scheduler.start();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  const scheduler = initScheduler(prisma);
  scheduler.stop();
  await prisma.$disconnect();
  process.exit(0);
});
