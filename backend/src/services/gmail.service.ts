import { google, gmail_v1 } from 'googleapis';
import { PrismaClient, GoogleAccount } from '@prisma/client';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Cache for OAuth2 client to avoid recreating on every request
let cachedOAuth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;
let cachedCredentials: { clientId: string; clientSecret: string; redirectUri: string } | null = null;

async function getIntegrationSettings(prisma: PrismaClient) {
  console.log('[Gmail Service] Fetching integration settings from database...');
  const settings = await prisma.integrationSettings.findFirst();

  console.log('[Gmail Service] Settings found:', {
    hasSettings: !!settings,
    hasClientId: !!settings?.googleClientId,
    hasClientSecret: !!settings?.googleClientSecret,
    googleEnabled: settings?.googleEnabled,
    clientIdLength: settings?.googleClientId?.length || 0
  });

  if (!settings || !settings.googleClientId || !settings.googleClientSecret) {
    throw new Error('Google integration not configured. Please configure Google credentials in Settings.');
  }

  if (!settings.googleEnabled) {
    throw new Error('Google integration is disabled.');
  }

  const redirectUri = settings.googleRedirectUri || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/google/callback`;

  console.log('[Gmail Service] Using credentials:', {
    clientId: settings.googleClientId.substring(0, 20) + '...',
    redirectUri
  });

  return {
    clientId: settings.googleClientId,
    clientSecret: settings.googleClientSecret,
    redirectUri
  };
}

async function getOAuth2Client(prisma: PrismaClient) {
  const settings = await getIntegrationSettings(prisma);

  // Check if we can reuse cached client
  if (cachedOAuth2Client && cachedCredentials &&
      cachedCredentials.clientId === settings.clientId &&
      cachedCredentials.clientSecret === settings.clientSecret &&
      cachedCredentials.redirectUri === settings.redirectUri) {
    return cachedOAuth2Client;
  }

  // Create new OAuth2 client
  cachedOAuth2Client = new google.auth.OAuth2(
    settings.clientId,
    settings.clientSecret,
    settings.redirectUri
  );
  cachedCredentials = settings;

  return cachedOAuth2Client;
}

export async function getAuthUrl(prisma: PrismaClient, state: string): Promise<string> {
  console.log('[Gmail Service] Generating auth URL...');
  const oauth2Client = await getOAuth2Client(prisma);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
    state
  });

  console.log('[Gmail Service] Generated auth URL:', authUrl.substring(0, 100) + '...');
  return authUrl;
}

export async function exchangeCodeForTokens(prisma: PrismaClient, code: string) {
  const oauth2Client = await getOAuth2Client(prisma);
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getUserInfo(prisma: PrismaClient, accessToken: string) {
  const oauth2Client = await getOAuth2Client(prisma);
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
  const oauth2Client = await getOAuth2Client(prisma);

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
  const oauth2Client = await getOAuth2Client(prisma);

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
