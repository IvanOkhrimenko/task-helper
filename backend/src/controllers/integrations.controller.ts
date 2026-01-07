import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const prisma = new PrismaClient();

// Get integration settings (admin only)
export async function getIntegrationSettings(req: Request, res: Response) {
  try {
    let settings = await prisma.integrationSettings.findFirst();

    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.integrationSettings.create({
        data: {
          googleEnabled: false,
        },
      });
    }

    // Mask secrets for response
    res.json({
      id: settings.id,
      googleClientId: settings.googleClientId || '',
      googleClientSecret: settings.googleClientSecret ? '••••••••' : '',
      googleRedirectUri: settings.googleRedirectUri || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/google/callback`,
      googleEnabled: settings.googleEnabled,
      hasGoogleCredentials: !!(settings.googleClientId && settings.googleClientSecret),
    });
  } catch (error) {
    console.error('Error fetching integration settings:', error);
    res.status(500).json({ error: 'Failed to fetch integration settings' });
  }
}

// Update integration settings (admin only)
export async function updateIntegrationSettings(req: Request, res: Response) {
  try {
    const { googleClientId, googleClientSecret, googleRedirectUri, googleEnabled } = req.body;

    let settings = await prisma.integrationSettings.findFirst();

    const updateData: any = {};

    if (googleClientId !== undefined) {
      updateData.googleClientId = googleClientId || null;
    }

    // Only update secret if it's not masked
    if (googleClientSecret !== undefined && googleClientSecret !== '••••••••') {
      updateData.googleClientSecret = googleClientSecret || null;
    }

    if (googleRedirectUri !== undefined) {
      updateData.googleRedirectUri = googleRedirectUri || null;
    }

    if (googleEnabled !== undefined) {
      updateData.googleEnabled = googleEnabled;
    }

    if (settings) {
      settings = await prisma.integrationSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    } else {
      settings = await prisma.integrationSettings.create({
        data: {
          googleClientId: googleClientId || null,
          googleClientSecret: googleClientSecret || null,
          googleRedirectUri: googleRedirectUri || null,
          googleEnabled: googleEnabled || false,
        },
      });
    }

    res.json({
      success: true,
      message: 'Integration settings updated successfully',
      googleEnabled: settings.googleEnabled,
      hasGoogleCredentials: !!(settings.googleClientId && settings.googleClientSecret),
    });
  } catch (error) {
    console.error('Error updating integration settings:', error);
    res.status(500).json({ error: 'Failed to update integration settings' });
  }
}

// Get public integration status (for non-admin users)
export async function getPublicIntegrationStatus(req: Request, res: Response) {
  try {
    const settings = await prisma.integrationSettings.findFirst();

    res.json({
      googleEnabled: settings?.googleEnabled ?? false,
    });
  } catch (error) {
    console.error('Error fetching public integration status:', error);
    res.status(500).json({ error: 'Failed to fetch integration status' });
  }
}

// Test Google connection (admin only)
export async function testGoogleConnection(req: Request, res: Response) {
  try {
    const settings = await prisma.integrationSettings.findFirst();

    if (!settings?.googleClientId || !settings?.googleClientSecret) {
      return res.json({
        success: false,
        error: 'Google credentials not configured. Please enter Client ID and Client Secret.',
      });
    }

    // Validate Client ID format
    if (!settings.googleClientId.includes('.apps.googleusercontent.com')) {
      return res.json({
        success: false,
        error: 'Invalid Client ID format. Should end with .apps.googleusercontent.com',
      });
    }

    // Validate Client Secret length
    if (settings.googleClientSecret.length < 10) {
      return res.json({
        success: false,
        error: 'Client Secret appears to be too short',
      });
    }

    // Try to create OAuth2 client and generate auth URL
    try {
      const redirectUri = settings.googleRedirectUri || `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/google/callback`;

      const oauth2Client = new google.auth.OAuth2(
        settings.googleClientId,
        settings.googleClientSecret,
        redirectUri
      );

      // Try to generate an auth URL - this validates the client can be created
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/gmail.compose'],
        state: 'test'
      });

      // Check that the URL was generated and contains the client_id
      if (!authUrl || !authUrl.includes('client_id=')) {
        return res.json({
          success: false,
          error: 'Failed to generate auth URL. Please check your credentials.',
        });
      }

      // Verify client_id is in the generated URL
      if (!authUrl.includes(settings.googleClientId)) {
        return res.json({
          success: false,
          error: 'Client ID not found in generated auth URL. Credentials may be invalid.',
        });
      }

      res.json({
        success: true,
        message: 'Credentials are valid! OAuth2 client created successfully.',
        details: {
          clientIdValid: true,
          redirectUri: redirectUri,
          authUrlGenerated: true
        }
      });
    } catch (oauthError: any) {
      console.error('OAuth2 client creation error:', oauthError);
      return res.json({
        success: false,
        error: `Failed to create OAuth2 client: ${oauthError.message}`,
      });
    }
  } catch (error) {
    console.error('Error testing Google connection:', error);
    res.status(500).json({ error: 'Failed to test Google connection' });
  }
}
