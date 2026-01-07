import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

interface ReminderEmailData {
  recipientEmail: string;
  recipientName?: string;
  reminderTitle: string;
  reminderMessage?: string;
  reminderName: string;
  nextOccurrence?: Date | null;
}

/**
 * Email service for sending notifications
 */
class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.configure();
  }

  /**
   * Configure the email transporter
   */
  private configure(): void {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      console.warn('Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      }
    });

    this.isConfigured = true;
    console.log('Email service configured successfully');
  }

  /**
   * Check if email service is configured
   */
  isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }

  /**
   * Send a raw email
   */
  async send(options: EmailOptions): Promise<boolean> {
    if (!this.isReady()) {
      console.warn('Email service not configured, skipping email send');
      return false;
    }

    try {
      const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
      const fromName = process.env.SMTP_FROM_NAME || 'Daylium';

      await this.transporter!.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });

      console.log(`Email sent to ${options.to}: ${options.subject}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * Send a reminder notification email
   */
  async sendReminderEmail(data: ReminderEmailData): Promise<boolean> {
    const subject = `🔔 Reminder: ${data.reminderTitle}`;

    const nextOccurrenceText = data.nextOccurrence
      ? `\nNext occurrence: ${data.nextOccurrence.toLocaleString()}`
      : '';

    const text = `
Hello${data.recipientName ? ` ${data.recipientName}` : ''},

This is a reminder for: ${data.reminderName}

${data.reminderMessage || 'No additional details provided.'}
${nextOccurrenceText}

--
Daylium
This is an automated notification.
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 24px; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f8fafc; padding: 24px; border: 1px solid #e5e7eb; border-top: none; }
    .reminder-card { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10B981; margin-bottom: 16px; }
    .reminder-title { font-size: 18px; font-weight: 600; color: #0f172a; margin-bottom: 8px; }
    .reminder-message { color: #64748b; }
    .next-occurrence { background: #eff6ff; padding: 12px 16px; border-radius: 8px; color: #1e40af; font-size: 14px; }
    .footer { padding: 16px 24px; color: #94a3b8; font-size: 12px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Reminder</h1>
    </div>
    <div class="content">
      <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
      <div class="reminder-card">
        <div class="reminder-title">${data.reminderTitle}</div>
        <div class="reminder-message">${data.reminderMessage || 'No additional details provided.'}</div>
      </div>
      ${data.nextOccurrence ? `
        <div class="next-occurrence">
          <strong>Next occurrence:</strong> ${data.nextOccurrence.toLocaleString()}
        </div>
      ` : ''}
    </div>
    <div class="footer">
      Daylium - Automated Notification
    </div>
  </div>
</body>
</html>
    `.trim();

    return this.send({
      to: data.recipientEmail,
      subject,
      text,
      html
    });
  }

  /**
   * Verify SMTP connection
   */
  async verify(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      await this.transporter!.verify();
      console.log('SMTP connection verified');
      return true;
    } catch (error) {
      console.error('SMTP verification failed:', error);
      return false;
    }
  }
}

// Singleton instance
const emailService = new EmailService();

export default emailService;
export { EmailService, EmailOptions, ReminderEmailData };
