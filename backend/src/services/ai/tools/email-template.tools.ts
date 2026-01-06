import { ToolDefinition } from '../providers/ai-provider.interface';
import { toolRegistry, ToolContext } from './tool-registry';

// Generate Email Template Tool
const generateEmailTemplateDefinition: ToolDefinition = {
  name: 'generateEmailTemplate',
  description: `Generate a custom email template for invoice emails. Use when user asks to create or generate an email template.
The template will use placeholders that get replaced with actual data when creating invoice emails.
Available placeholders: {{clientName}}, {{invoiceNumber}}, {{invoiceAmount}}, {{invoicePeriod}}, {{taskName}}, {{description}}, {{sellerName}}, {{bankName}}, {{bankIban}}, {{bankSwift}}, {{currency}}, {{hoursWorked}}, {{hourlyRate}}`,
  parameters: {
    type: 'object',
    properties: {
      style: {
        type: 'string',
        enum: ['formal', 'casual', 'brief', 'detailed'],
        description: 'The tone/style of the email template. formal=professional/business, casual=friendly, brief=minimal, detailed=comprehensive'
      },
      language: {
        type: 'string',
        enum: ['en', 'pl', 'uk'],
        description: 'Language for the template: en=English, pl=Polish, uk=Ukrainian'
      },
      includePaymentDetails: {
        type: 'boolean',
        description: 'Whether to include bank/payment information in the template'
      },
      includeWorkDetails: {
        type: 'boolean',
        description: 'Whether to include hours worked and hourly rate details'
      },
      customInstructions: {
        type: 'string',
        description: 'Any additional customization requests from the user'
      }
    },
    required: ['style', 'language']
  },
  requiresConfirmation: false
};

async function generateEmailTemplateHandler(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const style = args.style as string;
  const language = args.language as string;
  const includePaymentDetails = args.includePaymentDetails !== false; // Default true
  const includeWorkDetails = args.includeWorkDetails !== false; // Default true

  // Generate templates based on parameters
  const templates = generateTemplate(style, language, includePaymentDetails, includeWorkDetails);

  return {
    success: true,
    subjectTemplate: templates.subject,
    bodyTemplate: templates.body,
    style,
    language,
    message: `Generated a ${style} email template in ${language === 'en' ? 'English' : language === 'pl' ? 'Polish' : 'Ukrainian'}. Copy these templates to your task settings to use them.`,
    placeholdersUsed: extractPlaceholders(templates.subject + templates.body)
  };
}

function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
}

function generateTemplate(
  style: string,
  language: string,
  includePaymentDetails: boolean,
  includeWorkDetails: boolean
): { subject: string; body: string } {
  const templates: Record<string, Record<string, { subject: string; body: string }>> = {
    en: {
      formal: {
        subject: 'Invoice #{{invoiceNumber}} - {{taskName}} - {{invoicePeriod}}',
        body: `Dear {{clientName}},

Please find attached invoice #{{invoiceNumber}} for {{description}} rendered during {{invoicePeriod}}.

Invoice Details:
- Invoice Number: {{invoiceNumber}}
- Period: {{invoicePeriod}}
- Amount Due: {{invoiceAmount}}
${includeWorkDetails ? `- Hours Worked: {{hoursWorked}} hours
- Hourly Rate: {{currency}} {{hourlyRate}}` : ''}
${includePaymentDetails ? `
Payment Information:
Bank: {{bankName}}
IBAN: {{bankIban}}
SWIFT/BIC: {{bankSwift}}` : ''}

Payment is due upon receipt unless otherwise agreed.

Should you have any questions regarding this invoice, please do not hesitate to contact me.

Best regards,
{{sellerName}}`
      },
      casual: {
        subject: 'Invoice for {{invoicePeriod}} - {{invoiceNumber}}',
        body: `Hi {{clientName}},

Hope you're doing well! Here's my invoice (#{{invoiceNumber}}) for {{invoicePeriod}}.

Quick summary:
- Total: {{invoiceAmount}}
${includeWorkDetails ? `- Hours: {{hoursWorked}}h @ {{currency}} {{hourlyRate}}/hr` : ''}
${includePaymentDetails ? `
You can send payment to:
{{bankName}}
IBAN: {{bankIban}}` : ''}

Let me know if you have any questions!

Thanks,
{{sellerName}}`
      },
      brief: {
        subject: 'Invoice {{invoiceNumber}} - {{invoiceAmount}}',
        body: `{{clientName}},

Invoice #{{invoiceNumber}} attached.
Amount: {{invoiceAmount}}
Period: {{invoicePeriod}}
${includePaymentDetails ? `
IBAN: {{bankIban}}` : ''}

{{sellerName}}`
      },
      detailed: {
        subject: 'Invoice #{{invoiceNumber}} | {{clientName}} | {{invoicePeriod}} | {{invoiceAmount}}',
        body: `Dear {{clientName}},

I am pleased to submit invoice #{{invoiceNumber}} for professional services rendered during {{invoicePeriod}}.

SERVICE SUMMARY
---------------
Description: {{description}}
${includeWorkDetails ? `Hours Worked: {{hoursWorked}} hours
Hourly Rate: {{currency}} {{hourlyRate}} per hour` : ''}
Total Amount Due: {{invoiceAmount}}

INVOICE DETAILS
---------------
Invoice Number: {{invoiceNumber}}
Invoice Period: {{invoicePeriod}}
Task Reference: {{taskName}}
Currency: {{currency}}
${includePaymentDetails ? `
PAYMENT INFORMATION
-------------------
Please remit payment to the following account:
Bank Name: {{bankName}}
IBAN: {{bankIban}}
SWIFT/BIC Code: {{bankSwift}}

Payment Terms: Due upon receipt` : ''}

Thank you for your continued partnership. Please don't hesitate to reach out if you have any questions or require any clarification regarding this invoice.

Warm regards,
{{sellerName}}`
      }
    },
    pl: {
      formal: {
        subject: 'Faktura #{{invoiceNumber}} - {{taskName}} - {{invoicePeriod}}',
        body: `Szanowni Państwo ({{clientName}}),

W załączeniu przesyłam fakturę #{{invoiceNumber}} za {{description}} za okres {{invoicePeriod}}.

Szczegóły faktury:
- Numer faktury: {{invoiceNumber}}
- Okres: {{invoicePeriod}}
- Kwota do zapłaty: {{invoiceAmount}}
${includeWorkDetails ? `- Przepracowane godziny: {{hoursWorked}} godz.
- Stawka godzinowa: {{currency}} {{hourlyRate}}` : ''}
${includePaymentDetails ? `
Dane do przelewu:
Bank: {{bankName}}
IBAN: {{bankIban}}
SWIFT/BIC: {{bankSwift}}` : ''}

Płatność wymagana zgodnie z warunkami umowy.

W przypadku pytań pozostaję do dyspozycji.

Z poważaniem,
{{sellerName}}`
      },
      casual: {
        subject: 'Faktura za {{invoicePeriod}} - {{invoiceNumber}}',
        body: `Cześć {{clientName}},

Przesyłam fakturę (#{{invoiceNumber}}) za {{invoicePeriod}}.

Podsumowanie:
- Razem: {{invoiceAmount}}
${includeWorkDetails ? `- Godziny: {{hoursWorked}}h @ {{currency}} {{hourlyRate}}/godz.` : ''}
${includePaymentDetails ? `
Dane do przelewu:
{{bankName}}
IBAN: {{bankIban}}` : ''}

Daj znać jeśli masz pytania!

Pozdrawiam,
{{sellerName}}`
      },
      brief: {
        subject: 'Faktura {{invoiceNumber}} - {{invoiceAmount}}',
        body: `{{clientName}},

Faktura #{{invoiceNumber}} w załączeniu.
Kwota: {{invoiceAmount}}
Okres: {{invoicePeriod}}
${includePaymentDetails ? `
IBAN: {{bankIban}}` : ''}

{{sellerName}}`
      },
      detailed: {
        subject: 'Faktura #{{invoiceNumber}} | {{clientName}} | {{invoicePeriod}} | {{invoiceAmount}}',
        body: `Szanowni Państwo ({{clientName}}),

Mam przyjemność przesłać fakturę #{{invoiceNumber}} za usługi świadczone w okresie {{invoicePeriod}}.

PODSUMOWANIE USŁUG
------------------
Opis: {{description}}
${includeWorkDetails ? `Przepracowane godziny: {{hoursWorked}} godz.
Stawka godzinowa: {{currency}} {{hourlyRate}} za godzinę` : ''}
Łączna kwota do zapłaty: {{invoiceAmount}}

SZCZEGÓŁY FAKTURY
-----------------
Numer faktury: {{invoiceNumber}}
Okres rozliczeniowy: {{invoicePeriod}}
Referencja zadania: {{taskName}}
Waluta: {{currency}}
${includePaymentDetails ? `
DANE DO PŁATNOŚCI
-----------------
Proszę o przelew na poniższe konto:
Nazwa banku: {{bankName}}
IBAN: {{bankIban}}
Kod SWIFT/BIC: {{bankSwift}}

Termin płatności: Zgodnie z umową` : ''}

Dziękuję za współpracę. W przypadku pytań dotyczących faktury pozostaję do dyspozycji.

Z wyrazami szacunku,
{{sellerName}}`
      }
    },
    uk: {
      formal: {
        subject: 'Рахунок #{{invoiceNumber}} - {{taskName}} - {{invoicePeriod}}',
        body: `Шановний {{clientName}},

Надсилаю рахунок #{{invoiceNumber}} за {{description}} за період {{invoicePeriod}}.

Деталі рахунку:
- Номер рахунку: {{invoiceNumber}}
- Період: {{invoicePeriod}}
- Сума до сплати: {{invoiceAmount}}
${includeWorkDetails ? `- Відпрацьовані години: {{hoursWorked}} год.
- Погодинна ставка: {{currency}} {{hourlyRate}}` : ''}
${includePaymentDetails ? `
Платіжні реквізити:
Банк: {{bankName}}
IBAN: {{bankIban}}
SWIFT/BIC: {{bankSwift}}` : ''}

Оплата очікується згідно умов договору.

З будь-якими питаннями звертайтесь.

З повагою,
{{sellerName}}`
      },
      casual: {
        subject: 'Рахунок за {{invoicePeriod}} - {{invoiceNumber}}',
        body: `Привіт {{clientName}},

Надсилаю рахунок (#{{invoiceNumber}}) за {{invoicePeriod}}.

Коротко:
- Разом: {{invoiceAmount}}
${includeWorkDetails ? `- Години: {{hoursWorked}}г @ {{currency}} {{hourlyRate}}/год` : ''}
${includePaymentDetails ? `
Реквізити для оплати:
{{bankName}}
IBAN: {{bankIban}}` : ''}

Пиши, якщо є питання!

{{sellerName}}`
      },
      brief: {
        subject: 'Рахунок {{invoiceNumber}} - {{invoiceAmount}}',
        body: `{{clientName}},

Рахунок #{{invoiceNumber}} у вкладенні.
Сума: {{invoiceAmount}}
Період: {{invoicePeriod}}
${includePaymentDetails ? `
IBAN: {{bankIban}}` : ''}

{{sellerName}}`
      },
      detailed: {
        subject: 'Рахунок #{{invoiceNumber}} | {{clientName}} | {{invoicePeriod}} | {{invoiceAmount}}',
        body: `Шановний {{clientName}},

Маю честь надіслати рахунок #{{invoiceNumber}} за професійні послуги, надані протягом {{invoicePeriod}}.

ОПИС ПОСЛУГ
-----------
Опис: {{description}}
${includeWorkDetails ? `Відпрацьовані години: {{hoursWorked}} год.
Погодинна ставка: {{currency}} {{hourlyRate}} за годину` : ''}
Загальна сума до сплати: {{invoiceAmount}}

ДЕТАЛІ РАХУНКУ
--------------
Номер рахунку: {{invoiceNumber}}
Період: {{invoicePeriod}}
Посилання на завдання: {{taskName}}
Валюта: {{currency}}
${includePaymentDetails ? `
ПЛАТІЖНІ РЕКВІЗИТИ
------------------
Оплату просимо здійснити на рахунок:
Назва банку: {{bankName}}
IBAN: {{bankIban}}
Код SWIFT/BIC: {{bankSwift}}

Умови оплати: Згідно договору` : ''}

Дякую за співпрацю. З будь-якими питаннями щодо рахунку звертайтесь.

З найкращими побажаннями,
{{sellerName}}`
      }
    }
  };

  return templates[language]?.[style] || templates.en.formal;
}

// Save Email Template to Task Tool
const saveEmailTemplateDefinition: ToolDefinition = {
  name: 'saveEmailTemplate',
  description: 'Save an email template to a specific task/client. Use when user wants to save a generated template to their task settings.',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID to save the template to (get from listTasks)'
      },
      subjectTemplate: {
        type: 'string',
        description: 'The email subject template with placeholders'
      },
      bodyTemplate: {
        type: 'string',
        description: 'The email body template with placeholders'
      }
    },
    required: ['taskId', 'subjectTemplate', 'bodyTemplate']
  },
  requiresConfirmation: true
};

async function saveEmailTemplateHandler(
  args: Record<string, unknown>,
  context: ToolContext
): Promise<unknown> {
  const { userId, prisma } = context;
  const taskId = args.taskId as string;
  const subjectTemplate = args.subjectTemplate as string;
  const bodyTemplate = args.bodyTemplate as string;

  // Verify task exists and belongs to user
  const existingTask = await prisma.task.findFirst({
    where: { id: taskId, userId, type: 'INVOICE' }
  });

  if (!existingTask) {
    return { error: 'Task not found or access denied' };
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      emailSubjectTemplate: subjectTemplate,
      emailBodyTemplate: bodyTemplate,
      useCustomEmailTemplate: true
    },
    select: {
      id: true,
      name: true,
      clientName: true,
      emailSubjectTemplate: true,
      emailBodyTemplate: true,
      useCustomEmailTemplate: true
    }
  });

  return {
    success: true,
    message: `Email template saved successfully for "${updatedTask.clientName || updatedTask.name}"`,
    task: {
      id: updatedTask.id,
      name: updatedTask.name,
      clientName: updatedTask.clientName,
      hasCustomTemplate: updatedTask.useCustomEmailTemplate
    }
  };
}

// Register tools
export function registerEmailTemplateTools(): void {
  toolRegistry.register(generateEmailTemplateDefinition, generateEmailTemplateHandler);
  toolRegistry.register(saveEmailTemplateDefinition, saveEmailTemplateHandler);
}
