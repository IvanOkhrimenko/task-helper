import { google, gmail_v1 } from 'googleapis';
import { PrismaClient, GoogleAccount } from '@prisma/client';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback'
);

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

export function getAuthUrl(state: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state
  });
}

export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getUserInfo(accessToken: string) {
  oauth2Client.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();
  return data;
}

export async function getValidAccessToken(
  prisma: PrismaClient,
  googleAccount: GoogleAccount
): Promise<string> {
  const now = new Date();

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(googleAccount.expiresAt);
  expiresAt.setMinutes(expiresAt.getMinutes() - 5);

  if (now >= expiresAt) {
    // Refresh the token
    oauth2Client.setCredentials({
      refresh_token: googleAccount.refreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    // Update in database
    await prisma.googleAccount.update({
      where: { id: googleAccount.id },
      data: {
        accessToken: credentials.access_token!,
        expiresAt: new Date(credentials.expiry_date!)
      }
    });

    return credentials.access_token!;
  }

  return googleAccount.accessToken;
}

interface CreateDraftParams {
  to: string;
  subject: string;
  body: string;
  attachmentBase64?: string;
  attachmentFilename?: string;
}

export async function createGmailDraft(
  prisma: PrismaClient,
  googleAccount: GoogleAccount,
  params: CreateDraftParams
): Promise<{ draftId: string; webLink: string }> {
  const accessToken = await getValidAccessToken(prisma, googleAccount);

  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Build email message
  const boundary = 'boundary_' + Date.now();
  let emailContent: string;

  if (params.attachmentBase64 && params.attachmentFilename) {
    // Email with attachment
    emailContent = [
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      params.body,
      '',
      `--${boundary}`,
      `Content-Type: application/pdf; name="${params.attachmentFilename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${params.attachmentFilename}"`,
      '',
      params.attachmentBase64,
      '',
      `--${boundary}--`
    ].join('\r\n');
  } else {
    // Simple HTML email
    emailContent = [
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      '',
      params.body
    ].join('\r\n');
  }

  // Base64 encode the email
  const encodedEmail = Buffer.from(emailContent)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  // Create draft
  const response = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw: encodedEmail
      }
    }
  });

  const draftId = response.data.id!;
  const webLink = `https://mail.google.com/mail/u/0/#drafts?compose=${draftId}`;

  return { draftId, webLink };
}
