import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Task, Invoice, User, InvoiceTemplate } from '@prisma/client';

interface PeriodInfo {
  month: number;
  year: number;
  hours: number;
}

interface InvoiceData {
  task: Task;
  invoice: Invoice;
  user: User;
  period?: PeriodInfo;
  language?: string;
  template?: InvoiceTemplate;
}

// Translation labels
const translations = {
  PL: {
    invoiceTitle: 'Faktura',
    invoiceNumber: 'nr',
    issueDate: 'Data wystawienia',
    serviceDate: 'Data wykonania usługi',
    seller: 'Sprzedawca',
    bankAccount: 'Nr rachunku',
    buyer: 'Nabywca',
    recipient: 'Odbiorca',
    no: 'Lp.',
    items: 'Nazwa',
    discount: 'Rabat, %',
    qty: 'Ilość',
    unit: 'J.m.',
    vat: 'VAT, %',
    unitNetPrice: 'Cena netto',
    totalNet: 'Wartość netto',
    totalGross: 'Wartość brutto',
    pcs: 'szt',
    paymentMethod: 'Forma płatności',
    due: 'Termin',
    sum: 'Kwota',
    currency: 'Waluta',
    transfer: 'przelew',
    rate: 'Stawka',
    net: 'Netto',
    gross: 'Brutto',
    total: 'Razem',
    taxRate: 'W tym',
    totalDue: 'Razem do zapłaty',
    inWords: 'Słownie',
    paid: 'Zapłacono',
    leftToPay: 'Pozostaje do zapłaty',
    issuerSignature: 'Podpis osoby uprawnionej do wystawienia faktury',
    receiptDate: 'Data odbioru',
    recipientSignature: 'Podpis osoby uprawnionej do odbioru faktury',
    softwareDev: 'Tworzenie oprogramowania'
  },
  EN: {
    invoiceTitle: 'Invoice',
    invoiceNumber: 'No.',
    issueDate: 'Issue date',
    serviceDate: 'Service performance date',
    seller: 'Seller',
    bankAccount: 'Bank account number',
    buyer: 'Buyer',
    recipient: 'Recipient',
    no: 'No.',
    items: 'Items',
    discount: 'Discount, %',
    qty: 'Qty',
    unit: 'Unit',
    vat: 'VAT, %',
    unitNetPrice: 'Unit net price',
    totalNet: 'Total net',
    totalGross: 'Total gross',
    pcs: 'pcs',
    paymentMethod: 'Payment method',
    due: 'Due',
    sum: 'Sum',
    currency: 'Currency',
    transfer: 'bank transfer',
    rate: 'Rate',
    net: 'Net',
    gross: 'Gross',
    total: 'Total',
    taxRate: 'Tax rate',
    totalDue: 'Total due',
    inWords: 'In words',
    paid: 'Paid',
    leftToPay: 'Left to pay',
    issuerSignature: 'Signature of the person authorized to issue the invoice',
    receiptDate: 'Date of receipt',
    recipientSignature: 'Signature of the person authorized to collect the invoice',
    softwareDev: 'Software Development'
  },
  BILINGUAL: {
    invoiceTitle: 'Faktura / Invoice',
    invoiceNumber: 'nr',
    issueDate: 'Data wystawienia / Issue date',
    serviceDate: 'Data dostawy / Data wykonania usługi / Delivery date / Service performance date',
    seller: 'Sprzedawca / Seller',
    bankAccount: 'Nr rachunku / Bank account number',
    buyer: 'Nabywca / Buyer',
    recipient: 'Odbiorca / Recipient',
    no: 'Lp. / No.',
    items: 'Nazwa / Items',
    discount: 'Rabat, % / Discount, %',
    qty: 'Ilość / Qty',
    unit: 'J.m.',
    vat: 'VAT, % / VAT, %',
    unitNetPrice: 'Cena netto / Unit net price',
    totalNet: 'Wartość netto / Total net',
    totalGross: 'Wartość brutto / Total gross',
    pcs: 'szt / pcs',
    paymentMethod: 'Forma płatności / Payment method',
    due: 'Termin / Due',
    sum: 'Kwota / Sum',
    currency: 'Waluta / Currency',
    transfer: 'przelew / transfer',
    rate: 'Stawka / Rate',
    net: 'Netto / Net',
    gross: 'Brutto / Gross',
    total: 'Razem / Total',
    taxRate: 'W tym / Tax rate',
    totalDue: 'Razem do zapłaty / Total due',
    inWords: 'Słownie / In words',
    paid: 'Zapłacono / Paid',
    leftToPay: 'Pozostaje do zapłaty / Left to pay',
    issuerSignature: 'Podpis osoby uprawnionej do wystawienia faktury / Signature of the person authorized to issue the invoice',
    receiptDate: 'Data odbioru / Date of receipt',
    recipientSignature: 'Podpis osoby uprawnionej do odbioru faktury / Signature of the person authorized to collect the invoice',
    softwareDev: 'Tworzenie oprogramowania / Software Development'
  }
};

function getTranslation(lang: string) {
  if (lang === 'EN') return translations.EN;
  if (lang === 'PL') return translations.BILINGUAL; // Polish invoices are typically bilingual
  return translations.BILINGUAL;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const monthNamesPL = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
];

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function getLastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

function numberToWords(num: number): { pl: string; en: string } {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const onesPL = ['', 'jeden', 'dwa', 'trzy', 'cztery', 'pięć', 'sześć', 'siedem', 'osiem', 'dziewięć'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const teensPL = ['dziesięć', 'jedenaście', 'dwanaście', 'trzynaście', 'czternaście', 'piętnaście', 'szesnaście', 'siedemnaście', 'osiemnaście', 'dziewiętnaście'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const tensPL = ['', '', 'dwadzieścia', 'trzydzieści', 'czterdzieści', 'pięćdziesiąt', 'sześćdziesiąt', 'siedemdziesiąt', 'osiemdziesiąt', 'dziewięćdziesiąt'];

  if (num === 0) return { pl: 'zero', en: 'zero' };

  const convertHundreds = (n: number, lang: 'en' | 'pl'): string => {
    const onesArr = lang === 'en' ? ones : onesPL;
    const teensArr = lang === 'en' ? teens : teensPL;
    const tensArr = lang === 'en' ? tens : tensPL;
    const hundred = lang === 'en' ? 'hundred' : 'sto';

    let result = '';
    if (n >= 100) {
      result += onesArr[Math.floor(n / 100)] + ' ' + hundred + ' ';
      n %= 100;
    }
    if (n >= 20) {
      result += tensArr[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n >= 10) {
      result += teensArr[n - 10] + ' ';
      n = 0;
    }
    if (n > 0) {
      result += onesArr[n] + ' ';
    }
    return result.trim();
  };

  const convertThousands = (n: number, lang: 'en' | 'pl'): string => {
    const thousand = lang === 'en' ? 'thousand' : 'tysięcy';
    let result = '';
    if (n >= 1000) {
      result += convertHundreds(Math.floor(n / 1000), lang) + ' ' + thousand + ' ';
      n %= 1000;
    }
    if (n > 0) {
      result += convertHundreds(n, lang);
    }
    return result.trim();
  };

  const wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);

  return {
    pl: convertThousands(wholePart, 'pl'),
    en: convertThousands(wholePart, 'en')
  };
}

export function generateInvoicePDF(data: InvoiceData): Promise<string> {
  // Get template from task or default to STANDARD
  const template = data.template || data.task.invoiceTemplate || 'STANDARD';

  // Route to template-specific generator
  switch (template) {
    case 'MINIMAL':
      return generateMinimalInvoice(data);
    case 'MODERN':
      return generateModernInvoice(data);
    case 'CORPORATE':
      return generateCorporateInvoice(data);
    case 'CREATIVE':
      return generateCreativeInvoice(data);
    case 'ELEGANT':
      return generateElegantInvoice(data);
    case 'STANDARD':
    default:
      return generateStandardInvoice(data);
  }
}

// STANDARD TEMPLATE - Professional bilingual invoice
function generateStandardInvoice(data: InvoiceData): Promise<string> {
  return new Promise((resolve, reject) => {
    const { task, invoice, user, period, language = 'PL' } = data;
    const t = getTranslation(language);
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate filename with month and year
    const monthName = period ? monthNames[period.month] : monthNames[new Date().getMonth()];
    const yearNum = period ? period.year : new Date().getFullYear();
    const fileName = `invoice-${monthName}-${yearNum}-${invoice.number}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    const amount = Number(invoice.amount);
    const currency = task.currency || 'USD';
    const issueDate = new Date();
    const serviceDate = period
      ? getLastDayOfMonth(period.year, period.month)
      : getLastDayOfMonth(new Date().getFullYear(), new Date().getMonth() - 1);

    // Header
    doc.fontSize(14).font('Helvetica-Bold').text(t.invoiceTitle, { align: 'center' });
    doc.fontSize(16).text(`${t.invoiceNumber} ${invoice.number}`, { align: 'center' });
    doc.moveDown(0.5);

    // Dates - right aligned
    doc.fontSize(9).font('Helvetica');
    doc.text(`${t.issueDate}: ${formatDate(issueDate)}`, { align: 'right' });
    doc.text(`${t.serviceDate}: ${formatDate(serviceDate)}`, { align: 'right' });

    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);

    // Seller section
    doc.fontSize(10).font('Helvetica-Bold').text(`${t.seller}:`);
    doc.font('Helvetica').fontSize(9);
    doc.text(user.name);
    if (user.address) doc.text(user.address);
    if (user.nip) doc.text(`NIP: ${user.nip}`);
    if (user.bankName) doc.text(`Bank: ${user.bankName}`);
    if (user.bankIban) doc.text(`${t.bankAccount}:`);
    if (user.bankIban) doc.text(user.bankIban);
    if (user.bankSwift) doc.text(`SWIFT: ${user.bankSwift}`);

    doc.moveDown(1.5);

    // Buyer section - box
    const buyerY = doc.y;
    doc.rect(40, buyerY, 250, 100).stroke();
    doc.rect(300, buyerY, 255, 100).stroke();

    // Buyer
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(`${t.buyer}:`, 45, buyerY + 5);
    doc.font('Helvetica');
    let buyerTextY = buyerY + 18;
    if (task.clientName) {
      doc.text(task.clientName, 45, buyerTextY);
      buyerTextY += 11;
    }
    if (task.clientAddress) {
      const addressLines = task.clientAddress.split('\n');
      addressLines.forEach(line => {
        doc.text(line, 45, buyerTextY);
        buyerTextY += 11;
      });
    }
    if (task.clientBankAccount) {
      doc.text(`${t.bankAccount}:`, 45, buyerTextY);
      buyerTextY += 11;
      doc.text(task.clientBankAccount, 45, buyerTextY);
    }

    // Recipient (same as buyer)
    doc.font('Helvetica-Bold');
    doc.text(`${t.recipient}:`, 305, buyerY + 5);
    doc.font('Helvetica');
    let recipientTextY = buyerY + 18;
    if (task.clientName) {
      doc.text(task.clientName, 305, recipientTextY);
      recipientTextY += 11;
    }
    if (task.clientAddress) {
      const addressLines = task.clientAddress.split('\n');
      addressLines.forEach(line => {
        doc.text(line, 305, recipientTextY);
        recipientTextY += 11;
      });
    }
    if (task.clientBankAccount) {
      doc.text(`${t.bankAccount}:`, 305, recipientTextY);
      recipientTextY += 11;
      doc.text(task.clientBankAccount, 305, recipientTextY);
    }

    doc.y = buyerY + 110;

    // Items table
    const tableTop = doc.y;
    const tableHeaders = [t.no, t.items, t.discount, t.qty, t.unit, t.vat, t.unitNetPrice, t.totalNet, t.totalGross];
    const colWidths = [30, 150, 50, 35, 30, 40, 60, 60, 60];
    const colX = [40, 70, 220, 270, 305, 335, 375, 435, 495];

    // Table header
    doc.rect(40, tableTop, 515, 40).stroke();
    doc.fontSize(7).font('Helvetica-Bold');
    tableHeaders.forEach((header, i) => {
      doc.text(header, colX[i] + 2, tableTop + 5, { width: colWidths[i] - 4, align: 'center' });
    });

    // Table row
    const rowTop = tableTop + 40;
    doc.rect(40, rowTop, 515, 30).stroke();
    doc.font('Helvetica').fontSize(8);

    // Draw vertical lines
    let currentX = 40;
    colWidths.forEach((width, i) => {
      currentX += width;
      if (i < colWidths.length - 1) {
        doc.moveTo(currentX, tableTop).lineTo(currentX, rowTop + 30).stroke();
      }
    });

    // Row data
    doc.text('1', colX[0] + 2, rowTop + 10, { width: colWidths[0] - 4, align: 'center' });
    doc.text(task.description || t.softwareDev, colX[1] + 2, rowTop + 5, { width: colWidths[1] - 4 });
    doc.text('0', colX[2] + 2, rowTop + 10, { width: colWidths[2] - 4, align: 'center' });
    doc.text('1', colX[3] + 2, rowTop + 10, { width: colWidths[3] - 4, align: 'center' });
    doc.text(t.pcs, colX[4] + 2, rowTop + 5, { width: colWidths[4] - 4, align: 'center' });
    doc.text('OO', colX[5] + 2, rowTop + 10, { width: colWidths[5] - 4, align: 'center' });
    doc.text(amount.toFixed(2), colX[6] + 2, rowTop + 10, { width: colWidths[6] - 4, align: 'right' });
    doc.text(amount.toFixed(2), colX[7] + 2, rowTop + 10, { width: colWidths[7] - 4, align: 'right' });
    doc.text(amount.toFixed(2), colX[8] + 2, rowTop + 10, { width: colWidths[8] - 4, align: 'right' });

    doc.y = rowTop + 40;

    // Payment summary table
    const paymentTop = doc.y;
    doc.rect(40, paymentTop, 300, 70).stroke();
    doc.rect(340, paymentTop, 215, 70).stroke();

    // Payment details (left side)
    doc.fontSize(7).font('Helvetica-Bold');
    doc.text(t.paymentMethod, 45, paymentTop + 5, { width: 60 });
    doc.text(t.due, 110, paymentTop + 5, { width: 50 });
    doc.text(t.sum, 165, paymentTop + 5, { width: 60 });
    doc.text(t.currency, 230, paymentTop + 5, { width: 50 });

    doc.font('Helvetica').fontSize(8);
    doc.text(t.transfer, 45, paymentTop + 35);
    doc.text(formatDate(issueDate), 110, paymentTop + 40);
    doc.text(amount.toFixed(2), 165, paymentTop + 40);
    doc.text(currency, 230, paymentTop + 40);

    // Totals (right side)
    doc.font('Helvetica-Bold').fontSize(7);
    doc.text(t.rate, 345, paymentTop + 5);
    doc.text(`${t.net} (${currency})`, 395, paymentTop + 5);
    doc.text('VAT (PLN)', 455, paymentTop + 5);
    doc.text(`${t.gross} (${currency})`, 500, paymentTop + 5);

    doc.font('Helvetica').fontSize(8);
    doc.text(`${t.total}:`, 345, paymentTop + 35);
    doc.text(amount.toFixed(2), 395, paymentTop + 40);
    doc.text('0.00', 455, paymentTop + 40);
    doc.text(amount.toFixed(2), 500, paymentTop + 40);

    doc.text(`${t.taxRate}:`, 345, paymentTop + 50);
    doc.text('OO', 380, paymentTop + 55);
    doc.text(amount.toFixed(2), 395, paymentTop + 55);
    doc.text('0.00', 455, paymentTop + 55);
    doc.text(amount.toFixed(2), 500, paymentTop + 55);

    doc.y = paymentTop + 80;

    // Total due
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(`${t.totalDue}: ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}`, 40, doc.y, { align: 'right' });

    doc.moveDown(1);

    // Amount in words
    const words = numberToWords(amount);
    const cents = Math.round((amount - Math.floor(amount)) * 100);
    doc.fontSize(9).font('Helvetica');
    if (language === 'EN') {
      doc.text(`${t.inWords}: ${words.en} ${currency} ${String(cents).padStart(2, '0')}/100`, { align: 'center' });
    } else {
      doc.text(`Słownie: ${words.pl} ${currency} ${String(cents).padStart(2, '0')}/100`, { align: 'center' });
      doc.text(`In words: ${words.en} ${currency} ${String(cents).padStart(2, '0')}/100`, { align: 'center' });
    }

    doc.moveDown(1);

    // Paid / Left to pay
    doc.fontSize(9);
    doc.text(`${t.paid}: 0.00`, 40);
    doc.text(`${t.leftToPay}: ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}`, 300, doc.y - 11);

    doc.moveDown(2);

    // Signature lines
    doc.moveTo(40, doc.y).lineTo(200, doc.y).stroke();
    doc.moveTo(240, doc.y).lineTo(330, doc.y).stroke();
    doc.moveTo(370, doc.y).lineTo(555, doc.y).stroke();

    doc.moveDown(0.3);
    doc.fontSize(7);
    doc.text(t.issuerSignature, 40, doc.y, { width: 160 });
    doc.text(t.receiptDate, 240, doc.y - 11, { width: 90 });
    doc.text(t.recipientSignature, 370, doc.y - 22, { width: 185 });

    // Footer
    const invoiceLabel = language === 'EN' ? 'Invoice' : 'Faktura';
    doc.fontSize(8);
    doc.text(`1 / 1`, 40, 780);
    doc.text(`${invoiceLabel} ${invoice.number}`, 500, 780);

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

// Process email template by replacing placeholders with actual values
function processEmailTemplate(template: string, placeholders: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

export function generateEmailDraft(task: Task, invoice: Invoice, user: User, period?: PeriodInfo, language: string = 'PL') {
  const periodText = period
    ? `${monthNames[period.month]} ${period.year}`
    : 'professional services';

  const periodTextPL = period
    ? `${monthNamesPL[period.month]} ${period.year}`
    : 'usługi profesjonalne';

  const amount = Number(invoice.amount);
  const currency = task.currency || 'USD';
  const hoursWorked = period?.hours || Number(task.hoursWorked) || 0;
  const hourlyRate = Number(task.hourlyRate) || 0;

  // Check if task has custom email template
  if (task.useCustomEmailTemplate && task.emailSubjectTemplate && task.emailBodyTemplate) {
    // Build placeholders map
    const placeholders: Record<string, string> = {
      clientName: task.clientName || 'Client',
      invoiceNumber: invoice.number,
      invoiceAmount: `${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}`,
      invoicePeriod: language === 'EN' ? periodText : periodTextPL,
      taskName: task.name,
      description: task.description || (language === 'EN' ? 'Professional Services' : 'Usługi profesjonalne'),
      sellerName: user.name,
      bankName: user.bankName || '',
      bankIban: user.bankIban || '',
      bankSwift: user.bankSwift || '',
      currency: currency,
      hoursWorked: hoursWorked.toString(),
      hourlyRate: hourlyRate.toString()
    };

    const subject = processEmailTemplate(task.emailSubjectTemplate, placeholders);
    const body = processEmailTemplate(task.emailBodyTemplate, placeholders);

    return { subject, body };
  }

  // Default templates below
  if (language === 'EN') {
    const subject = `Invoice #${invoice.number} - ${task.name} (${periodText})`;
    const body = `Dear ${task.clientName || 'Client'},

Please find attached invoice #${invoice.number} for ${task.description || 'professional services'} for ${periodText}.

Invoice Details:
- Period: ${periodText}
- Amount: ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}

${user.bankName ? `Payment Details:
Bank: ${user.bankName}
Account: ${user.bankIban || ''}
SWIFT: ${user.bankSwift || ''}
` : ''}
If you have any questions, please don't hesitate to reach out.

Best regards,
${user.name}`;

    return { subject, body };
  }

  // Polish email (default)
  const subject = `Faktura #${invoice.number} - ${task.name} (${periodTextPL})`;
  const body = `Szanowny Kliencie${task.clientName ? ` (${task.clientName})` : ''},

W załączeniu przesyłam fakturę #${invoice.number} za ${task.description || 'usługi profesjonalne'} za okres ${periodTextPL}.

Szczegóły faktury:
- Okres: ${periodTextPL}
- Kwota: ${amount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} ${currency}

${user.bankName ? `Dane do płatności:
Bank: ${user.bankName}
Numer konta: ${user.bankIban || ''}
SWIFT: ${user.bankSwift || ''}
` : ''}
W przypadku pytań proszę o kontakt.

Z poważaniem,
${user.name}`;

  return { subject, body };
}

// MINIMAL TEMPLATE - Clean, simple design
function generateMinimalInvoice(data: InvoiceData): Promise<string> {
  return new Promise((resolve, reject) => {
    const { task, invoice, user, period, language = 'PL' } = data;
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const monthName = period ? monthNames[period.month] : monthNames[new Date().getMonth()];
    const yearNum = period ? period.year : new Date().getFullYear();
    const fileName = `invoice-${monthName}-${yearNum}-${invoice.number}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const amount = Number(invoice.amount);
    const currency = task.currency || 'USD';
    const issueDate = new Date();
    const hoursWorked = period?.hours || Number(task.hoursWorked) || 0;
    const hourlyRate = Number(task.hourlyRate) || 0;

    // Header - Simple and clean
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#333333');
    doc.text('INVOICE', 50, 50);

    doc.fontSize(12).font('Helvetica').fillColor('#666666');
    doc.text(`#${invoice.number}`, 50, 85);

    // Date aligned right
    doc.fontSize(10).fillColor('#999999');
    doc.text(`Issued: ${formatDate(issueDate)}`, 400, 50, { align: 'right' });

    // Separator
    doc.moveTo(50, 120).lineTo(545, 120).strokeColor('#eeeeee').lineWidth(2).stroke();

    // From / To sections
    doc.y = 140;
    doc.fontSize(10).fillColor('#999999').font('Helvetica-Bold');
    doc.text('FROM', 50, doc.y);
    doc.text('TO', 300, doc.y);

    doc.y += 20;
    doc.font('Helvetica').fillColor('#333333').fontSize(11);
    doc.text(user.name, 50, doc.y);
    doc.text(task.clientName || 'Client', 300, doc.y);

    if (user.address) {
      doc.y += 15;
      doc.fontSize(10).fillColor('#666666');
      doc.text(user.address.replace(/\n/g, ', '), 50, doc.y, { width: 200 });
    }
    if (task.clientAddress) {
      doc.text(task.clientAddress.replace(/\n/g, ', '), 300, doc.y, { width: 200 });
    }

    // Service details
    doc.y = 280;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#eeeeee').lineWidth(1).stroke();

    doc.y += 20;
    doc.fontSize(10).fillColor('#999999').font('Helvetica-Bold');
    doc.text('DESCRIPTION', 50, doc.y);
    doc.text('QTY', 350, doc.y, { width: 50, align: 'center' });
    doc.text('RATE', 410, doc.y, { width: 60, align: 'right' });
    doc.text('AMOUNT', 480, doc.y, { width: 65, align: 'right' });

    doc.y += 25;
    doc.font('Helvetica').fillColor('#333333').fontSize(11);
    doc.text(task.description || 'Professional Services', 50, doc.y, { width: 280 });
    doc.text(hoursWorked > 0 ? `${hoursWorked}h` : '1', 350, doc.y, { width: 50, align: 'center' });
    doc.text(hourlyRate > 0 ? `${currency} ${hourlyRate}` : '-', 410, doc.y, { width: 60, align: 'right' });
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 480, doc.y, { width: 65, align: 'right' });

    if (period) {
      doc.y += 15;
      doc.fontSize(9).fillColor('#999999');
      doc.text(`Period: ${monthNames[period.month]} ${period.year}`, 50, doc.y);
    }

    // Total section
    doc.y = 420;
    doc.moveTo(350, doc.y).lineTo(545, doc.y).strokeColor('#eeeeee').lineWidth(1).stroke();

    doc.y += 15;
    doc.fontSize(10).fillColor('#666666');
    doc.text('Subtotal', 350, doc.y);
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 480, doc.y, { width: 65, align: 'right' });

    doc.y += 20;
    doc.text('Tax (0%)', 350, doc.y);
    doc.text(`${currency} 0.00`, 480, doc.y, { width: 65, align: 'right' });

    doc.y += 25;
    doc.moveTo(350, doc.y).lineTo(545, doc.y).strokeColor('#333333').lineWidth(2).stroke();

    doc.y += 15;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#333333');
    doc.text('TOTAL', 350, doc.y);
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 440, doc.y, { width: 105, align: 'right' });

    // Payment info
    doc.y = 550;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#999999');
    doc.text('PAYMENT DETAILS', 50, doc.y);

    doc.y += 20;
    doc.font('Helvetica').fillColor('#666666').fontSize(10);
    if (user.bankName) doc.text(`Bank: ${user.bankName}`, 50, doc.y);
    if (user.bankIban) { doc.y += 15; doc.text(`IBAN: ${user.bankIban}`, 50, doc.y); }
    if (user.bankSwift) { doc.y += 15; doc.text(`SWIFT: ${user.bankSwift}`, 50, doc.y); }

    // Footer
    doc.fontSize(9).fillColor('#999999');
    doc.text('Thank you for your business!', 50, 750, { align: 'center', width: 495 });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

// MODERN TEMPLATE - Contemporary with accent colors
function generateModernInvoice(data: InvoiceData): Promise<string> {
  return new Promise((resolve, reject) => {
    const { task, invoice, user, period, language = 'PL' } = data;
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const monthName = period ? monthNames[period.month] : monthNames[new Date().getMonth()];
    const yearNum = period ? period.year : new Date().getFullYear();
    const fileName = `invoice-${monthName}-${yearNum}-${invoice.number}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const amount = Number(invoice.amount);
    const currency = task.currency || 'USD';
    const issueDate = new Date();
    const hoursWorked = period?.hours || Number(task.hoursWorked) || 0;
    const hourlyRate = Number(task.hourlyRate) || 0;

    // Accent color
    const accentColor = '#2563eb';
    const darkColor = '#1e293b';
    const grayColor = '#64748b';
    const lightGray = '#f1f5f9';

    // Header with accent bar
    doc.rect(0, 0, 595, 100).fill(accentColor);

    doc.fontSize(32).font('Helvetica-Bold').fillColor('white');
    doc.text('INVOICE', 50, 35);

    doc.fontSize(12).font('Helvetica').fillColor('rgba(255,255,255,0.8)');
    doc.text(`#${invoice.number}`, 50, 72);

    // Invoice date box
    doc.rect(430, 25, 120, 50).fill('rgba(255,255,255,0.2)');
    doc.fontSize(9).fillColor('rgba(255,255,255,0.7)');
    doc.text('DATE', 445, 33);
    doc.fontSize(14).fillColor('white').font('Helvetica-Bold');
    doc.text(formatDate(issueDate), 445, 48);

    // Company info section
    doc.y = 130;

    // From section
    doc.rect(50, doc.y, 230, 120).fill(lightGray);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(accentColor);
    doc.text('FROM', 65, doc.y + 15);

    doc.font('Helvetica').fillColor(darkColor).fontSize(12);
    doc.text(user.name, 65, doc.y + 35);

    doc.fontSize(10).fillColor(grayColor);
    let fromY = doc.y + 55;
    if (user.address) {
      const lines = user.address.split('\n');
      lines.forEach(line => {
        doc.text(line, 65, fromY, { width: 200 });
        fromY += 14;
      });
    }
    if (user.nip) {
      doc.text(`NIP: ${user.nip}`, 65, fromY);
    }

    // To section
    doc.rect(315, 130, 230, 120).fill(lightGray);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(accentColor);
    doc.text('BILL TO', 330, 145);

    doc.font('Helvetica').fillColor(darkColor).fontSize(12);
    doc.text(task.clientName || 'Client', 330, 165);

    doc.fontSize(10).fillColor(grayColor);
    let toY = 185;
    if (task.clientAddress) {
      const lines = task.clientAddress.split('\n');
      lines.forEach(line => {
        doc.text(line, 330, toY, { width: 200 });
        toY += 14;
      });
    }

    // Items table header
    doc.y = 280;
    doc.rect(50, doc.y, 495, 35).fill(darkColor);

    doc.fontSize(10).font('Helvetica-Bold').fillColor('white');
    doc.text('DESCRIPTION', 65, doc.y + 12);
    doc.text('HOURS', 340, doc.y + 12, { width: 50, align: 'center' });
    doc.text('RATE', 400, doc.y + 12, { width: 60, align: 'center' });
    doc.text('AMOUNT', 470, doc.y + 12, { width: 60, align: 'right' });

    // Items row
    doc.y += 35;
    doc.rect(50, doc.y, 495, 50).fill('white').stroke(lightGray);

    doc.fontSize(11).font('Helvetica').fillColor(darkColor);
    doc.text(task.description || 'Professional Services', 65, doc.y + 10, { width: 260 });

    if (period) {
      doc.fontSize(9).fillColor(grayColor);
      doc.text(`${monthNames[period.month]} ${period.year}`, 65, doc.y + 28);
    }

    doc.fontSize(11).fillColor(darkColor);
    doc.text(hoursWorked > 0 ? `${hoursWorked}` : '-', 340, doc.y + 18, { width: 50, align: 'center' });
    doc.text(hourlyRate > 0 ? `${currency} ${hourlyRate}` : '-', 400, doc.y + 18, { width: 60, align: 'center' });
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 470, doc.y + 18, { width: 60, align: 'right' });

    // Totals section
    doc.y = 420;

    doc.fontSize(11).fillColor(grayColor);
    doc.text('Subtotal:', 380, doc.y);
    doc.fillColor(darkColor);
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 470, doc.y, { width: 75, align: 'right' });

    doc.y += 25;
    doc.fillColor(grayColor);
    doc.text('Tax (0%):', 380, doc.y);
    doc.fillColor(darkColor);
    doc.text(`${currency} 0.00`, 470, doc.y, { width: 75, align: 'right' });

    // Total box
    doc.y += 35;
    doc.rect(360, doc.y, 185, 45).fill(accentColor);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('white');
    doc.text('TOTAL DUE', 375, doc.y + 8);
    doc.fontSize(18);
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 375, doc.y + 22, { width: 155, align: 'right' });

    // Payment details
    doc.y = 550;
    doc.fontSize(11).font('Helvetica-Bold').fillColor(darkColor);
    doc.text('Payment Information', 50, doc.y);

    doc.y += 25;
    doc.font('Helvetica').fontSize(10).fillColor(grayColor);

    if (user.bankName) {
      doc.text('Bank:', 50, doc.y);
      doc.fillColor(darkColor).text(user.bankName, 120, doc.y);
      doc.y += 18;
    }
    if (user.bankIban) {
      doc.fillColor(grayColor).text('IBAN:', 50, doc.y);
      doc.fillColor(darkColor).text(user.bankIban, 120, doc.y);
      doc.y += 18;
    }
    if (user.bankSwift) {
      doc.fillColor(grayColor).text('SWIFT:', 50, doc.y);
      doc.fillColor(darkColor).text(user.bankSwift, 120, doc.y);
    }

    // Footer
    doc.rect(0, 780, 595, 62).fill(lightGray);
    doc.fontSize(10).fillColor(grayColor);
    doc.text('Thank you for your business!', 50, 800, { align: 'center', width: 495 });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

// CORPORATE TEMPLATE - Formal business style with navy blue theme
function generateCorporateInvoice(data: InvoiceData): Promise<string> {
  return new Promise((resolve, reject) => {
    const { task, invoice, user, period, language = 'PL' } = data;
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const monthName = period ? monthNames[period.month] : monthNames[new Date().getMonth()];
    const yearNum = period ? period.year : new Date().getFullYear();
    const fileName = `invoice-${monthName}-${yearNum}-${invoice.number}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const amount = Number(invoice.amount);
    const currency = task.currency || 'USD';
    const issueDate = new Date();
    const hoursWorked = period?.hours || Number(task.hoursWorked) || 0;
    const hourlyRate = Number(task.hourlyRate) || 0;

    // Corporate colors
    const navyBlue = '#1e3a5f';
    const gold = '#c9a227';
    const darkGray = '#2d3748';
    const mediumGray = '#718096';

    // Header with navy background
    doc.rect(0, 0, 595, 85).fill(navyBlue);

    // Gold accent line
    doc.rect(0, 85, 595, 4).fill(gold);

    // Company name in header
    doc.fontSize(22).font('Helvetica-Bold').fillColor('white');
    doc.text(user.name.toUpperCase(), 50, 30);

    // Invoice label
    doc.fontSize(11).font('Helvetica').fillColor('rgba(255,255,255,0.7)');
    doc.text('INVOICE', 480, 25);
    doc.fontSize(16).fillColor('white').font('Helvetica-Bold');
    doc.text(`#${invoice.number}`, 480, 42);

    // Date row
    doc.y = 110;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(navyBlue);
    doc.text('INVOICE DATE', 50, doc.y);
    doc.text('DUE DATE', 200, doc.y);
    doc.text('AMOUNT DUE', 430, doc.y);

    doc.y += 15;
    doc.font('Helvetica').fillColor(darkGray).fontSize(11);
    doc.text(formatDate(issueDate), 50, doc.y);
    doc.text(formatDate(issueDate), 200, doc.y);
    doc.fontSize(14).font('Helvetica-Bold').fillColor(navyBlue);
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 430, doc.y);

    // Separator
    doc.y += 35;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(gold).lineWidth(1).stroke();

    // Bill To section
    doc.y += 25;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(navyBlue);
    doc.text('BILL TO', 50, doc.y);
    doc.text('FROM', 330, doc.y);

    doc.y += 18;
    doc.font('Helvetica').fillColor(darkGray).fontSize(11);
    doc.text(task.clientName || 'Client', 50, doc.y);
    doc.text(user.name, 330, doc.y);

    doc.y += 15;
    doc.fontSize(10).fillColor(mediumGray);
    if (task.clientAddress) {
      const lines = task.clientAddress.split('\n');
      let leftY = doc.y;
      lines.forEach(line => {
        doc.text(line, 50, leftY, { width: 250 });
        leftY += 14;
      });
    }
    if (user.address) {
      const lines = user.address.split('\n');
      let rightY = doc.y;
      lines.forEach(line => {
        doc.text(line, 330, rightY, { width: 200 });
        rightY += 14;
      });
    }

    // Items table
    doc.y = 310;

    // Table header
    doc.rect(50, doc.y, 495, 32).fill(navyBlue);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('white');
    doc.text('DESCRIPTION', 65, doc.y + 11);
    doc.text('QTY', 340, doc.y + 11, { width: 40, align: 'center' });
    doc.text('RATE', 390, doc.y + 11, { width: 60, align: 'center' });
    doc.text('AMOUNT', 465, doc.y + 11, { width: 65, align: 'right' });

    // Table row
    doc.y += 32;
    doc.rect(50, doc.y, 495, 45).fill('#f8fafc').stroke('#e2e8f0');

    doc.fontSize(10).font('Helvetica').fillColor(darkGray);
    doc.text(task.description || 'Professional Services', 65, doc.y + 10, { width: 260 });

    if (period) {
      doc.fontSize(9).fillColor(mediumGray);
      doc.text(`Period: ${monthNames[period.month]} ${period.year}`, 65, doc.y + 28);
    }

    doc.fontSize(10).fillColor(darkGray);
    doc.text(hoursWorked > 0 ? `${hoursWorked}h` : '1', 340, doc.y + 17, { width: 40, align: 'center' });
    doc.text(hourlyRate > 0 ? `${currency} ${hourlyRate}` : '-', 390, doc.y + 17, { width: 60, align: 'center' });
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 465, doc.y + 17, { width: 65, align: 'right' });

    // Totals
    doc.y = 430;
    doc.fontSize(10).fillColor(mediumGray);
    doc.text('Subtotal', 380, doc.y);
    doc.fillColor(darkGray);
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 480, doc.y, { width: 65, align: 'right' });

    doc.y += 20;
    doc.fillColor(mediumGray);
    doc.text('Tax (0%)', 380, doc.y);
    doc.fillColor(darkGray);
    doc.text(`${currency} 0.00`, 480, doc.y, { width: 65, align: 'right' });

    // Total box
    doc.y += 30;
    doc.rect(360, doc.y, 185, 40).fill(navyBlue);
    doc.rect(360, doc.y, 185, 3).fill(gold);

    doc.fontSize(10).font('Helvetica-Bold').fillColor('white');
    doc.text('TOTAL', 375, doc.y + 15);
    doc.fontSize(16);
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 375, doc.y + 12, { width: 155, align: 'right' });

    // Payment details
    doc.y = 560;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(navyBlue);
    doc.text('PAYMENT DETAILS', 50, doc.y);

    doc.y += 18;
    doc.font('Helvetica').fontSize(10).fillColor(mediumGray);

    if (user.bankName) {
      doc.text(`Bank: ${user.bankName}`, 50, doc.y);
      doc.y += 16;
    }
    if (user.bankIban) {
      doc.text(`IBAN: ${user.bankIban}`, 50, doc.y);
      doc.y += 16;
    }
    if (user.bankSwift) {
      doc.text(`SWIFT: ${user.bankSwift}`, 50, doc.y);
    }

    // Footer
    doc.fontSize(9).fillColor(mediumGray);
    doc.text('Thank you for your business', 50, 760, { align: 'center', width: 495 });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

// CREATIVE TEMPLATE - Bold, artistic design with gradient effect
function generateCreativeInvoice(data: InvoiceData): Promise<string> {
  return new Promise((resolve, reject) => {
    const { task, invoice, user, period, language = 'PL' } = data;
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const monthName = period ? monthNames[period.month] : monthNames[new Date().getMonth()];
    const yearNum = period ? period.year : new Date().getFullYear();
    const fileName = `invoice-${monthName}-${yearNum}-${invoice.number}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const amount = Number(invoice.amount);
    const currency = task.currency || 'USD';
    const issueDate = new Date();
    const hoursWorked = period?.hours || Number(task.hoursWorked) || 0;
    const hourlyRate = Number(task.hourlyRate) || 0;

    // Creative colors - vibrant purple/pink
    const primaryPurple = '#7c3aed';
    const hotPink = '#ec4899';
    const darkPurple = '#4c1d95';
    const lightPurple = '#f5f3ff';
    const textDark = '#1f2937';
    const textGray = '#6b7280';

    // Decorative corner shapes
    doc.rect(0, 0, 180, 180).fill(primaryPurple);
    doc.rect(0, 0, 120, 120).fill(hotPink);
    doc.circle(180, 180, 60).fill(lightPurple);

    // Bottom right decoration
    doc.rect(495, 720, 100, 122).fill(primaryPurple);
    doc.rect(530, 750, 65, 92).fill(hotPink);

    // Invoice title - bold and angled
    doc.save();
    doc.rotate(-90, { origin: [40, 200] });
    doc.fontSize(60).font('Helvetica-Bold').fillColor('white');
    doc.text('INV', -90, 15);
    doc.restore();

    // Invoice number with style
    doc.fontSize(36).font('Helvetica-Bold').fillColor(darkPurple);
    doc.text(invoice.number, 200, 50);

    doc.fontSize(11).font('Helvetica').fillColor(textGray);
    doc.text(`Issued: ${formatDate(issueDate)}`, 200, 95);

    // From section
    doc.y = 160;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryPurple);
    doc.text('FROM', 200, doc.y);

    doc.y += 15;
    doc.font('Helvetica').fillColor(textDark).fontSize(13);
    doc.text(user.name, 200, doc.y);

    doc.y += 20;
    doc.fontSize(10).fillColor(textGray);
    if (user.address) {
      doc.text(user.address.replace(/\n/g, ', '), 200, doc.y, { width: 340 });
    }

    // To section
    doc.y = 260;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(hotPink);
    doc.text('BILL TO', 200, doc.y);

    doc.y += 15;
    doc.font('Helvetica').fillColor(textDark).fontSize(13);
    doc.text(task.clientName || 'Client', 200, doc.y);

    doc.y += 20;
    doc.fontSize(10).fillColor(textGray);
    if (task.clientAddress) {
      doc.text(task.clientAddress.replace(/\n/g, ', '), 200, doc.y, { width: 340 });
    }

    // Services section with creative divider
    doc.y = 360;

    // Gradient-like bar
    doc.rect(50, doc.y, 170, 4).fill(hotPink);
    doc.rect(220, doc.y, 170, 4).fill(primaryPurple);
    doc.rect(390, doc.y, 155, 4).fill(darkPurple);

    doc.y += 25;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryPurple);
    doc.text('SERVICES', 50, doc.y);
    doc.text('DETAILS', 320, doc.y);
    doc.text('AMOUNT', 470, doc.y, { width: 75, align: 'right' });

    doc.y += 25;
    doc.font('Helvetica').fillColor(textDark).fontSize(12);
    doc.text(task.description || 'Professional Services', 50, doc.y, { width: 250 });

    let detailsText = '';
    if (hoursWorked > 0 && hourlyRate > 0) {
      detailsText = `${hoursWorked}h × ${currency} ${hourlyRate}`;
    }
    if (period) {
      detailsText += `\n${monthNames[period.month]} ${period.year}`;
    }
    doc.fontSize(10).fillColor(textGray);
    doc.text(detailsText || '-', 320, doc.y, { width: 130 });

    doc.fontSize(12).font('Helvetica-Bold').fillColor(textDark);
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 470, doc.y, { width: 75, align: 'right' });

    // Total section with creative styling
    doc.y = 500;

    // Total box with gradient effect simulation
    doc.rect(50, doc.y, 200, 70).fill(lightPurple);
    doc.rect(50, doc.y, 6, 70).fill(primaryPurple);

    doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryPurple);
    doc.text('TOTAL DUE', 70, doc.y + 15);

    doc.fontSize(28).font('Helvetica-Bold').fillColor(darkPurple);
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 70, doc.y + 32);

    // Payment info
    doc.y = 600;
    doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryPurple);
    doc.text('PAYMENT INFO', 50, doc.y);

    doc.y += 18;
    doc.font('Helvetica').fontSize(10).fillColor(textGray);
    if (user.bankName) {
      doc.text(`Bank: ${user.bankName}`, 50, doc.y);
      doc.y += 15;
    }
    if (user.bankIban) {
      doc.text(`IBAN: ${user.bankIban}`, 50, doc.y);
      doc.y += 15;
    }
    if (user.bankSwift) {
      doc.text(`SWIFT: ${user.bankSwift}`, 50, doc.y);
    }

    // Creative footer message
    doc.fontSize(11).fillColor(textGray);
    doc.text('Thanks for being awesome! 🎨', 50, 720);

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

// ELEGANT TEMPLATE - Sophisticated serif typography
function generateElegantInvoice(data: InvoiceData): Promise<string> {
  return new Promise((resolve, reject) => {
    const { task, invoice, user, period, language = 'PL' } = data;
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const monthName = period ? monthNames[period.month] : monthNames[new Date().getMonth()];
    const yearNum = period ? period.year : new Date().getFullYear();
    const fileName = `invoice-${monthName}-${yearNum}-${invoice.number}.pdf`;
    const filePath = path.join(uploadsDir, fileName);

    const doc = new PDFDocument({ margin: 60, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const amount = Number(invoice.amount);
    const currency = task.currency || 'USD';
    const issueDate = new Date();
    const hoursWorked = period?.hours || Number(task.hoursWorked) || 0;
    const hourlyRate = Number(task.hourlyRate) || 0;

    // Elegant colors - warm neutrals
    const charcoal = '#2d2d2d';
    const warmGray = '#6b6b6b';
    const cream = '#faf8f5';
    const accent = '#8b7355';
    const border = '#d4d0c8';

    // Cream background
    doc.rect(0, 0, 595, 842).fill(cream);

    // Decorative top border
    doc.moveTo(60, 50).lineTo(535, 50).strokeColor(charcoal).lineWidth(2).stroke();
    doc.moveTo(60, 54).lineTo(535, 54).strokeColor(accent).lineWidth(0.5).stroke();

    // Invoice title - elegant serif style
    doc.fontSize(14).font('Times-Roman').fillColor(warmGray);
    doc.text('I N V O I C E', 60, 75, { characterSpacing: 4 });

    doc.fontSize(24).font('Times-Bold').fillColor(charcoal);
    doc.text(`№ ${invoice.number}`, 60, 100);

    // Date
    doc.fontSize(10).font('Times-Roman').fillColor(warmGray);
    doc.text(`Date: ${formatDate(issueDate)}`, 400, 85, { align: 'right', width: 135 });

    // Decorative line under header
    doc.y = 140;
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor(border).lineWidth(0.5).stroke();

    // From/To sections with elegant layout
    doc.y = 165;

    // From
    doc.fontSize(9).font('Times-Bold').fillColor(accent);
    doc.text('From', 60, doc.y);

    doc.y += 18;
    doc.font('Times-Roman').fillColor(charcoal).fontSize(12);
    doc.text(user.name, 60, doc.y);

    doc.y += 18;
    doc.fontSize(10).fillColor(warmGray);
    if (user.address) {
      const lines = user.address.split('\n');
      lines.forEach(line => {
        doc.text(line, 60, doc.y);
        doc.y += 14;
      });
    }
    if (user.nip) {
      doc.text(`Tax ID: ${user.nip}`, 60, doc.y);
    }

    // To
    doc.fontSize(9).font('Times-Bold').fillColor(accent);
    doc.text('Bill To', 330, 165);

    doc.font('Times-Roman').fillColor(charcoal).fontSize(12);
    doc.text(task.clientName || 'Client', 330, 183);

    doc.fontSize(10).fillColor(warmGray);
    let toY = 201;
    if (task.clientAddress) {
      const lines = task.clientAddress.split('\n');
      lines.forEach(line => {
        doc.text(line, 330, toY);
        toY += 14;
      });
    }

    // Items section
    doc.y = 300;

    // Table header with elegant styling
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor(charcoal).lineWidth(1).stroke();

    doc.y += 12;
    doc.fontSize(9).font('Times-Bold').fillColor(charcoal);
    doc.text('Description', 60, doc.y);
    doc.text('Quantity', 340, doc.y, { width: 60, align: 'center' });
    doc.text('Rate', 410, doc.y, { width: 50, align: 'center' });
    doc.text('Amount', 470, doc.y, { width: 65, align: 'right' });

    doc.y += 18;
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor(border).lineWidth(0.5).stroke();

    // Item row
    doc.y += 18;
    doc.font('Times-Roman').fillColor(charcoal).fontSize(11);
    doc.text(task.description || 'Professional Services', 60, doc.y, { width: 260 });

    if (period) {
      doc.fontSize(9).fillColor(warmGray).font('Times-Italic');
      doc.text(`${monthNames[period.month]} ${period.year}`, 60, doc.y + 16);
    }

    doc.font('Times-Roman').fontSize(11).fillColor(charcoal);
    doc.text(hoursWorked > 0 ? `${hoursWorked} hrs` : '1', 340, doc.y, { width: 60, align: 'center' });
    doc.text(hourlyRate > 0 ? `${currency} ${hourlyRate}` : '—', 410, doc.y, { width: 50, align: 'center' });
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 470, doc.y, { width: 65, align: 'right' });

    // Totals with elegant styling
    doc.y = 420;
    doc.moveTo(340, doc.y).lineTo(535, doc.y).strokeColor(border).lineWidth(0.5).stroke();

    doc.y += 15;
    doc.fontSize(10).font('Times-Roman').fillColor(warmGray);
    doc.text('Subtotal', 340, doc.y);
    doc.fillColor(charcoal);
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 470, doc.y, { width: 65, align: 'right' });

    doc.y += 20;
    doc.fillColor(warmGray);
    doc.text('Tax (0%)', 340, doc.y);
    doc.fillColor(charcoal);
    doc.text(`${currency} 0.00`, 470, doc.y, { width: 65, align: 'right' });

    // Total
    doc.y += 30;
    doc.moveTo(340, doc.y).lineTo(535, doc.y).strokeColor(charcoal).lineWidth(1).stroke();

    doc.y += 15;
    doc.fontSize(12).font('Times-Bold').fillColor(charcoal);
    doc.text('Total Due', 340, doc.y);
    doc.fontSize(16);
    doc.text(`${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 430, doc.y, { width: 105, align: 'right' });

    // Payment details
    doc.y = 550;
    doc.fontSize(9).font('Times-Bold').fillColor(accent);
    doc.text('Payment Details', 60, doc.y);

    doc.y += 20;
    doc.font('Times-Roman').fontSize(10).fillColor(warmGray);
    if (user.bankName) {
      doc.text(`Bank: ${user.bankName}`, 60, doc.y);
      doc.y += 16;
    }
    if (user.bankIban) {
      doc.text(`IBAN: ${user.bankIban}`, 60, doc.y);
      doc.y += 16;
    }
    if (user.bankSwift) {
      doc.text(`SWIFT/BIC: ${user.bankSwift}`, 60, doc.y);
    }

    // Elegant footer
    doc.moveTo(60, 750).lineTo(535, 750).strokeColor(border).lineWidth(0.5).stroke();
    doc.moveTo(60, 754).lineTo(535, 754).strokeColor(charcoal).lineWidth(2).stroke();

    doc.fontSize(10).font('Times-Italic').fillColor(warmGray);
    doc.text('Thank you for your valued business.', 60, 770, { align: 'center', width: 475 });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}
