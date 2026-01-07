/**
 * Data migration script: Create Client entities from Task data
 *
 * This script:
 * 1. Creates a Client for each unique Task (by clientName + userId)
 * 2. Links Tasks to their Clients
 * 3. Links Invoices to their Clients
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateClients() {
  console.log('Starting client migration...\n');

  // Get all tasks with client data
  const tasks = await prisma.task.findMany({
    where: {
      clientName: { not: null },
      clientId: null, // Only tasks without a client yet
    },
    include: {
      invoices: true,
    },
  });

  console.log(`Found ${tasks.length} tasks to migrate\n`);

  let clientsCreated = 0;
  let tasksUpdated = 0;
  let invoicesUpdated = 0;

  // Group tasks by unique client (clientName + userId)
  const clientGroups = new Map<string, typeof tasks>();

  for (const task of tasks) {
    const key = `${task.userId}:${task.clientName}`;
    if (!clientGroups.has(key)) {
      clientGroups.set(key, []);
    }
    clientGroups.get(key)!.push(task);
  }

  console.log(`Found ${clientGroups.size} unique clients\n`);

  for (const [key, groupTasks] of clientGroups) {
    // Use the first task's data to create the client
    const sourceTask = groupTasks[0];

    try {
      // Create the client
      const client = await prisma.client.create({
        data: {
          name: sourceTask.clientName!,
          userId: sourceTask.userId,
          isActive: true,
          isArchived: false,

          // Contact info
          nip: sourceTask.clientNip,
          streetAddress: sourceTask.clientStreetAddress,
          postcode: sourceTask.clientPostcode,
          city: sourceTask.clientCity,
          country: sourceTask.clientCountry,
          email: sourceTask.clientEmail,
          billingEmail: sourceTask.billingEmail,
          bankAccount: sourceTask.clientBankAccount,

          // CRM integration
          crmClientId: sourceTask.crmClientId,
          crmIntegrationId: sourceTask.crmIntegrationId,

          // Invoice defaults
          hourlyRate: sourceTask.hourlyRate,
          hoursWorked: sourceTask.hoursWorked,
          description: sourceTask.description,
          defaultServiceName: sourceTask.defaultServiceName,
          currency: sourceTask.currency,
          defaultLanguage: sourceTask.defaultLanguage,
          invoiceTemplate: sourceTask.invoiceTemplate,

          // Email templates
          emailSubjectTemplate: sourceTask.emailSubjectTemplate,
          emailBodyTemplate: sourceTask.emailBodyTemplate,
          useCustomEmailTemplate: sourceTask.useCustomEmailTemplate,

          // Integrations
          googleAccountId: sourceTask.googleAccountId,
          bankAccountId: sourceTask.bankAccountId,
        },
      });

      clientsCreated++;
      console.log(`✓ Created client: ${client.name} (${client.id})`);

      // Update all tasks in this group
      for (const task of groupTasks) {
        await prisma.task.update({
          where: { id: task.id },
          data: { clientId: client.id },
        });
        tasksUpdated++;

        // Update all invoices for this task
        for (const invoice of task.invoices) {
          await prisma.invoice.update({
            where: { id: invoice.id },
            data: { clientId: client.id },
          });
          invoicesUpdated++;
        }
      }
    } catch (error) {
      console.error(`✗ Error migrating client ${sourceTask.clientName}:`, error);
    }
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Clients created: ${clientsCreated}`);
  console.log(`Tasks updated: ${tasksUpdated}`);
  console.log(`Invoices updated: ${invoicesUpdated}`);
  console.log('Migration complete!');
}

migrateClients()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
