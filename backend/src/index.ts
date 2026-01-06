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
import integrationsRoutes from './routes/integrations.routes.js';
import { initScheduler } from './services/scheduler.service.js';

const app = express();
const prisma = new PrismaClient();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4200'],
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
app.use('/api/integrations', integrationsRoutes);

// Health check
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Version endpoint
app.get('/api/version', (_, res) => {
  res.json({
    version: process.env.APP_VERSION || '1.0.0',
    commit: process.env.COMMIT_SHA || 'local',
    deployedAt: process.env.DEPLOYED_AT || new Date().toISOString()
  });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
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
