/**
 * Generic CRM Integration Service
 *
 * A configurable CRM service that uses user-defined integrations
 * instead of hardcoded CRM configuration. Supports session-based
 * authentication with CSRF token protection.
 */

import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient, CRMIntegration, Invoice, Task, User, BankAccount } from '@prisma/client';

// Extended types with relations
type TaskWithBankAccount = Task & {
  bankAccount?: BankAccount | null;
  crmIntegration?: CRMIntegration | null;
};

type InvoiceWithRelations = Invoice & {
  task?: TaskWithBankAccount | null;
  user?: User | null;
};

interface CRMSession {
  cookies: string[];
  csrfToken: string;
  expiresAt: Date;
}

interface CRMSyncResult {
  success: boolean;
  message: string;
  crmInvoiceId?: string;
  crmPdfUrl?: string;
  crmPdfPath?: string;
  error?: string;
}

interface InvoiceListItem {
  invoiceNumber: string;
  pdfUrl: string;
}

interface PlaceholderContext {
  invoice: Invoice;
  task: TaskWithBankAccount | null;
  user: User | null;
  bankAccount: BankAccount | null;
}

export class GenericCRMService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Login to CRM using configured credentials
   */
  async login(integration: CRMIntegration): Promise<{
    success: boolean;
    cookies?: string[];
    csrfToken?: string;
    error?: string;
  }> {
    try {
      console.log(`[GenericCRM] Logging in to ${integration.name} at ${integration.loginUrl}`);

      // Step 1: Get login page to obtain initial CSRF token
      const loginPageResponse = await fetch(integration.loginUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!loginPageResponse.ok) {
        console.error(`[GenericCRM] Failed to get login page: ${loginPageResponse.status}`);
        return { success: false, error: `Failed to get login page: HTTP ${loginPageResponse.status}` };
      }

      // Extract cookies from response
      const setCookies = this.getCookiesFromResponse(loginPageResponse as any);
      console.log(`[GenericCRM] Login page cookies: ${setCookies.length} cookies received`);

      // Parse HTML to get CSRF token
      const loginHtml = await loginPageResponse.text();

      // Try multiple patterns to find CSRF token
      let csrfToken: string | null = null;

      if (integration.csrfSelector) {
        // User-provided selector
        const csrfRegex = new RegExp(integration.csrfSelector);
        const csrfMatch = loginHtml.match(csrfRegex);
        if (csrfMatch) csrfToken = csrfMatch[1];
      } else {
        // Try common CSRF patterns in order of likelihood
        const csrfPatterns = [
          /name="_token"\s+value="([^"]+)"/,           // Laravel default: name first
          /value="([^"]+)"\s+name="_token"/,           // Laravel: value first
          /name='_token'\s+value='([^']+)'/,           // Single quotes
          /<input[^>]+name="_token"[^>]+value="([^"]+)"/,  // With other attrs
          /<input[^>]+value="([^"]+)"[^>]+name="_token"/,  // Value first with attrs
          /name="_token"[^>]*value="([^"]+)"/,         // Any attrs between
          /csrf-token['"]\s*content=['"']([^'"]+)['"]/i, // Meta tag
          /_token['":\s]+['":]?([a-zA-Z0-9]{20,})/,    // JSON or loose format
        ];

        for (const pattern of csrfPatterns) {
          const match = loginHtml.match(pattern);
          if (match && match[1]) {
            csrfToken = match[1];
            console.log(`[GenericCRM] Found CSRF token using pattern: ${pattern.source.substring(0, 30)}...`);
            break;
          }
        }
      }

      // If regex didn't work, try direct extraction
      if (!csrfToken) {
        console.log('[GenericCRM] Regex patterns failed, trying direct extraction...');

        // Find name="_token" and extract the value that follows
        const tokenAttrIndex = loginHtml.indexOf('name="_token"');
        if (tokenAttrIndex > -1) {
          // Look for value="..." after name="_token"
          const afterToken = loginHtml.substring(tokenAttrIndex, tokenAttrIndex + 200);
          const valueMatch = afterToken.match(/value="([^"]+)"/);
          if (valueMatch) {
            csrfToken = valueMatch[1];
            console.log('[GenericCRM] Found CSRF token via direct extraction:', csrfToken.substring(0, 10) + '...');
          }
        }
      }

      if (!csrfToken) {
        console.error('[GenericCRM] Could not find CSRF token on login page');
        console.error('[GenericCRM] Login page HTML length:', loginHtml.length);

        // Debug: try to find _token anywhere in HTML
        const tokenIndex = loginHtml.indexOf('_token');
        if (tokenIndex > -1) {
          console.error('[GenericCRM] Found _token at index:', tokenIndex);
          console.error('[GenericCRM] Context around _token:', loginHtml.substring(tokenIndex - 50, tokenIndex + 200));
        }

        return { success: false, error: 'Could not find CSRF token on login page' };
      }

      // Build cookie string for next request
      const cookieString = this.parseCookies(setCookies);

      // Step 2: Submit login form
      const loginData = new URLSearchParams({
        email: integration.email,
        password: integration.password,
        _token: csrfToken,
      });

      const baseUrl = new URL(integration.loginUrl).origin;
      const loginResponse = await fetch(integration.loginUrl, {
        method: integration.loginMethod || 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': cookieString,
          'Origin': baseUrl,
          'Referer': integration.loginUrl,
        },
        body: loginData.toString(),
        redirect: 'manual',
      });

      // Get new cookies after login
      const newCookies = this.getCookiesFromResponse(loginResponse as any);
      console.log(`[GenericCRM] Login response cookies: ${newCookies.length} cookies received`);

      // Merge cookies
      const allCookies = [...setCookies, ...newCookies];
      const sessionCookies = this.parseCookies(allCookies);

      // Check if login was successful
      const loginResponseText = await loginResponse.text();
      let loginSuccess = false;

      if (loginResponse.status === 200) {
        try {
          const jsonResponse = JSON.parse(loginResponseText);
          loginSuccess = jsonResponse.success === true || jsonResponse.status === 'ok' || !jsonResponse.error;
        } catch {
          loginSuccess = loginResponseText.includes('dashboard') ||
                        loginResponseText.includes('success') ||
                        !loginResponseText.includes('error');
        }
      } else if (loginResponse.status === 302 || loginResponse.status === 301) {
        loginSuccess = true;
      }

      if (loginSuccess) {
        // Step 3: Get a page to extract new CSRF token for API calls
        const invoiceUrl = new URL(integration.createInvoiceUrl);
        const dashboardUrl = invoiceUrl.origin + '/create-faktura'; // Common pattern

        const dashboardResponse = await fetch(dashboardUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cookie': sessionCookies,
          },
        });

        if (!dashboardResponse.ok) {
          console.error(`[GenericCRM] Failed to get dashboard: ${dashboardResponse.status}`);
          return { success: false, error: `Failed to get dashboard: HTTP ${dashboardResponse.status}` };
        }

        // Update cookies if new ones were set
        const dashboardCookies = this.getCookiesFromResponse(dashboardResponse as any);
        const finalCookies = [...allCookies, ...dashboardCookies];

        // Extract CSRF token from dashboard using same patterns
        const dashboardHtml = await dashboardResponse.text();
        let newCsrfToken: string | null = null;

        const dashboardCsrfPatterns = [
          /name="_token"\s+value="([^"]+)"/,
          /value="([^"]+)"\s+name="_token"/,
          /<input[^>]+name="_token"[^>]+value="([^"]+)"/,
          /<input[^>]+value="([^"]+)"[^>]+name="_token"/,
          /_token['"]\s*:\s*['"]([^'"]+)['"]/,
          /csrf-token['"]\s*content=['"]([^'"]+)['"]/i,
        ];

        for (const pattern of dashboardCsrfPatterns) {
          const match = dashboardHtml.match(pattern);
          if (match && match[1]) {
            newCsrfToken = match[1];
            break;
          }
        }

        if (!newCsrfToken) {
          console.error('[GenericCRM] Could not find CSRF token on dashboard');
          return { success: false, error: 'Could not find CSRF token on dashboard' };
        }

        console.log(`[GenericCRM] Login successful for ${integration.name}`);
        return {
          success: true,
          cookies: finalCookies,
          csrfToken: newCsrfToken,
        };
      }

      console.error(`[GenericCRM] Login failed for ${integration.name}`);
      return { success: false, error: 'Login failed - invalid credentials or unexpected response' };
    } catch (error) {
      console.error('[GenericCRM] Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during login',
      };
    }
  }

  /**
   * Ensure valid session, re-login if expired
   */
  async ensureSession(integrationId: string): Promise<CRMIntegration | null> {
    const integration = await this.prisma.cRMIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      console.error(`[GenericCRM] Integration not found: ${integrationId}`);
      return null;
    }

    // Check if we have a valid session
    if (
      integration.sessionCookies &&
      integration.csrfToken &&
      integration.sessionExpiresAt &&
      integration.sessionExpiresAt > new Date()
    ) {
      return integration;
    }

    // Need to login
    console.log(`[GenericCRM] Session expired or missing, logging in...`);
    const loginResult = await this.login(integration);

    if (!loginResult.success || !loginResult.cookies || !loginResult.csrfToken) {
      console.error(`[GenericCRM] Failed to establish session: ${loginResult.error}`);
      return null;
    }

    // Update session in database
    const updatedIntegration = await this.prisma.cRMIntegration.update({
      where: { id: integrationId },
      data: {
        sessionCookies: JSON.stringify(loginResult.cookies),
        csrfToken: loginResult.csrfToken,
        sessionExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      },
    });

    return updatedIntegration;
  }

  /**
   * Invalidate session (on auth failure)
   */
  async invalidateSession(integrationId: string): Promise<void> {
    console.log(`[GenericCRM] Invalidating session for ${integrationId}`);
    await this.prisma.cRMIntegration.update({
      where: { id: integrationId },
      data: {
        sessionCookies: null,
        csrfToken: null,
        sessionExpiresAt: null,
      },
    });
  }

  /**
   * Create invoice in CRM
   */
  async createInvoice(
    integrationId: string,
    invoice: InvoiceWithRelations
  ): Promise<CRMSyncResult> {
    return this.createInvoiceWithRetry(integrationId, invoice, false);
  }

  /**
   * Internal method with retry logic for 401 errors
   */
  private async createInvoiceWithRetry(
    integrationId: string,
    invoice: InvoiceWithRelations,
    isRetry: boolean
  ): Promise<CRMSyncResult> {
    const integration = await this.ensureSession(integrationId);

    if (!integration) {
      return {
        success: false,
        message: 'Failed to authenticate with CRM',
        error: 'Could not establish CRM session',
      };
    }

    try {
      // Build form data from field mapping
      const context: PlaceholderContext = {
        invoice,
        task: invoice.task || null,
        user: invoice.user || null,
        bankAccount: invoice.task?.bankAccount || null,
      };

      const formData = this.buildFormData(integration, context);

      // Log form data for debugging
      console.log('[GenericCRM] Form data being sent:');
      const formDataObj: Record<string, string> = {};
      formData.forEach((value, key) => {
        formDataObj[key] = value.length > 50 ? value.substring(0, 50) + '...' : value;
      });
      console.log(JSON.stringify(formDataObj, null, 2));

      // Parse stored cookies
      let cookies: string[] = [];
      try {
        cookies = JSON.parse(integration.sessionCookies || '[]');
      } catch {
        cookies = [];
      }

      // Get XSRF token from cookies
      const xsrfToken = this.getXsrfToken(cookies);

      // Build headers
      const baseUrl = new URL(integration.createInvoiceUrl).origin;
      const configuredHeaders = (integration.headers as Record<string, string>) || {};

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': this.parseCookies(cookies),
        'Origin': baseUrl,
        'Referer': `${baseUrl}/create-faktura`,
        ...configuredHeaders,
      };

      // Add XSRF token header if available
      if (xsrfToken && integration.csrfHeader) {
        headers[integration.csrfHeader] = xsrfToken;
      } else if (xsrfToken) {
        headers['X-XSRF-TOKEN'] = xsrfToken;
      }

      console.log(`[GenericCRM] Sending invoice to ${integration.createInvoiceUrl}`);

      // Send request
      const response = await fetch(integration.createInvoiceUrl, {
        method: integration.createInvoiceMethod || 'POST',
        headers,
        body: formData.toString(),
      });

      const responseText = await response.text();
      console.log(`[GenericCRM] Response status: ${response.status}`);

      // Handle 401 - retry with fresh session
      if (response.status === 401 && !isRetry) {
        console.log('[GenericCRM] Got 401 - invalidating session and retrying...');
        await this.invalidateSession(integrationId);
        return this.createInvoiceWithRetry(integrationId, invoice, true);
      }

      // Parse response
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
        console.log('[GenericCRM] Response:', JSON.stringify(responseData, null, 2));
      } catch {
        console.log('[GenericCRM] Response is not JSON:', responseText.substring(0, 200));
      }

      if (response.ok) {
        const hasSuccess = responseData.success === true || responseData.success === 'true';
        const hasId = responseData.id !== undefined && responseData.id !== null;
        const hasError = responseData.error || responseData.errors || responseData.message?.includes('error');

        if (hasError) {
          return {
            success: false,
            message: 'CRM returned an error',
            error: responseData.error || responseData.errors || responseData.message || 'Unknown error',
          };
        }

        if (hasSuccess || hasId) {
          return {
            success: true,
            message: 'Invoice created in CRM successfully',
            crmInvoiceId: responseData.id?.toString(),
          };
        }

        // Empty/ok response might still be success
        if (responseText === '' || responseText === '{}' || responseText === 'ok') {
          return {
            success: true,
            message: 'Invoice may have been created in CRM (no ID returned)',
          };
        }

        return {
          success: false,
          message: 'CRM returned unexpected response',
          error: `Response status 200 but unclear result: ${responseText.substring(0, 200)}`,
        };
      }

      return {
        success: false,
        message: 'Failed to create invoice in CRM',
        error: `HTTP ${response.status}: ${responseText.substring(0, 500)}`,
      };
    } catch (error) {
      console.error('[GenericCRM] Create invoice error:', error);
      return {
        success: false,
        message: 'Error communicating with CRM',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build form data from field mapping with placeholder substitution
   */
  private buildFormData(
    integration: CRMIntegration,
    context: PlaceholderContext
  ): URLSearchParams {
    const params = new URLSearchParams();
    const fieldMapping = (integration.fieldMapping as Record<string, string>) || {};
    const staticFields = (integration.staticFields as Record<string, string>) || {};

    // Add static fields first
    for (const [name, value] of Object.entries(staticFields)) {
      params.append(name, value);
    }

    // Add mapped fields with placeholder resolution
    for (const [name, template] of Object.entries(fieldMapping)) {
      const value = this.resolvePlaceholder(template, context);
      params.append(name, value);
    }

    // Add CSRF token
    if (integration.csrfToken) {
      params.append('_token', integration.csrfToken);
    }

    return params;
  }

  /**
   * Replace placeholders in template string
   */
  private resolvePlaceholder(template: string, context: PlaceholderContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getValueByPath(path, context);
      return value?.toString() ?? '';
    });
  }

  /**
   * Get value from context by dot-notation path
   */
  private getValueByPath(path: string, context: PlaceholderContext): any {
    const parts = path.split('.');

    // Handle computed fields
    if (parts[0] === 'computed') {
      return this.computeField(parts[1], context);
    }

    // Handle invoice date fields specially (they need to be computed)
    if (parts[0] === 'invoice' && ['issueDate', 'dueDate', 'deliveryDate'].includes(parts[1])) {
      return this.computeField(parts[1], context);
    }

    // Navigate through context
    let value: any = context;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return '';
      }
    }

    // Format value appropriately
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'number' || typeof value === 'object') {
      // Handle Decimal type from Prisma
      return value?.toString() ?? '';
    }

    return value ?? '';
  }

  /**
   * Compute dynamic fields
   */
  private computeField(fieldName: string, context: PlaceholderContext): string {
    const invoice = context.invoice;

    switch (fieldName) {
      case 'invoiceNumberFormatted': {
        // Format: number/MM/YYYY
        const invoiceMonth = invoice.invoiceMonth ?? new Date().getMonth();
        const invoiceYear = invoice.invoiceYear ?? new Date().getFullYear();
        const invoiceNum = parseInt(invoice.id.slice(-4), 16) % 1000 || 1;
        const monthStr = String(invoiceMonth + 1).padStart(2, '0');
        return `${invoiceNum}/${monthStr}/${invoiceYear}`;
      }
      case 'netAmount':
      case 'grossAmount': {
        // For now, net equals gross (no VAT calculation)
        return Number(invoice.amount).toFixed(2);
      }
      case 'vatAmount': {
        return '0.00';
      }
      case 'issueDate': {
        return new Date().toISOString().split('T')[0];
      }
      case 'dueDate': {
        const due = new Date();
        due.setDate(due.getDate() + 14);
        return due.toISOString().split('T')[0];
      }
      case 'deliveryDate': {
        const invoiceMonth = invoice.invoiceMonth ?? new Date().getMonth();
        const invoiceYear = invoice.invoiceYear ?? new Date().getFullYear();
        const lastDay = new Date(invoiceYear, invoiceMonth + 1, 0);
        return lastDay.toISOString().split('T')[0];
      }
      default:
        return '';
    }
  }

  /**
   * Test connection to CRM
   */
  async testConnection(integrationId: string): Promise<{ success: boolean; message: string }> {
    const integration = await this.prisma.cRMIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return { success: false, message: 'Integration not found' };
    }

    const loginResult = await this.login(integration);

    if (loginResult.success) {
      // Save session for future use
      await this.prisma.cRMIntegration.update({
        where: { id: integrationId },
        data: {
          sessionCookies: JSON.stringify(loginResult.cookies),
          csrfToken: loginResult.csrfToken,
          sessionExpiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      return { success: true, message: 'Successfully connected to CRM' };
    }

    return { success: false, message: loginResult.error || 'Failed to connect to CRM' };
  }

  /**
   * Parse Set-Cookie headers into a cookie string
   */
  private parseCookies(setCookies: string[]): string {
    const cookieMap = new Map<string, string>();

    for (const cookie of setCookies) {
      const [nameValue] = cookie.split(';');
      const [name, ...valueParts] = nameValue.split('=');
      if (name && valueParts.length > 0) {
        cookieMap.set(name.trim(), valueParts.join('='));
      }
    }

    return Array.from(cookieMap.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  /**
   * Get cookies from response headers
   */
  private getCookiesFromResponse(response: Response): string[] {
    if (typeof (response.headers as any).getSetCookie === 'function') {
      return (response.headers as any).getSetCookie();
    }

    if (typeof (response.headers as any).raw === 'function') {
      const raw = (response.headers as any).raw();
      return raw['set-cookie'] || [];
    }

    const cookies: string[] = [];
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        cookies.push(value);
      }
    });

    return cookies;
  }

  /**
   * Extract XSRF token from cookies
   */
  private getXsrfToken(cookies: string[]): string | null {
    for (const cookie of cookies) {
      const match = cookie.match(/XSRF-TOKEN=([^;]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    return null;
  }

  /**
   * Fetch invoice list from CRM
   */
  async getInvoiceList(integrationId: string, isRetry = false): Promise<InvoiceListItem[]> {
    // Force fresh login to ensure valid session
    if (!isRetry) {
      await this.invalidateSession(integrationId);
    }

    const integration = await this.ensureSession(integrationId);

    if (!integration || !integration.listInvoicesUrl) {
      console.log('[GenericCRM] No list invoices URL configured');
      return [];
    }

    try {
      let cookies: string[] = [];
      try {
        cookies = JSON.parse(integration.sessionCookies || '[]');
      } catch {
        cookies = [];
      }

      const baseUrl = new URL(integration.listInvoicesUrl).origin;
      const xsrfToken = this.getXsrfToken(cookies);
      const cookieString = this.parseCookies(cookies);

      console.log(`[GenericCRM] Session cookies count: ${cookies.length}`);
      console.log(`[GenericCRM] CSRF token: ${integration.csrfToken?.substring(0, 10)}...`);

      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': cookieString,
        'Origin': baseUrl,
        'Referer': `${baseUrl}/show-faktury-client`,
      };

      if (xsrfToken) {
        headers['X-XSRF-TOKEN'] = xsrfToken;
      }

      console.log(`[GenericCRM] Fetching invoice list from ${integration.listInvoicesUrl}`);

      // Build full DataTables request with all required params
      const formData = new URLSearchParams();
      formData.append('draw', '1');

      // Column definitions (must match table columns - 8 columns for this CRM)
      for (let i = 0; i < 8; i++) {
        formData.append(`columns[${i}][data]`, String(i));
        formData.append(`columns[${i}][name]`, '');
        formData.append(`columns[${i}][searchable]`, 'true');
        formData.append(`columns[${i}][orderable]`, i < 3 || i === 4 || i === 5 ? 'true' : 'false');
        formData.append(`columns[${i}][search][value]`, '');
        formData.append(`columns[${i}][search][regex]`, 'false');
      }

      formData.append('order[0][column]', '0');
      formData.append('order[0][dir]', 'desc');
      formData.append('start', '0');
      formData.append('length', '100');
      formData.append('search[value]', '');
      formData.append('search[regex]', 'false');

      // Add CSRF token if available
      if (integration.csrfToken) {
        formData.append('_token', integration.csrfToken);
      }

      // Add year filter (30 = show all years)
      formData.append('year', '30');

      const response = await fetch(integration.listInvoicesUrl, {
        method: 'POST',
        headers,
        body: formData.toString(),
      });

      console.log(`[GenericCRM] Invoice list response status: ${response.status}`);

      // Handle 401 - retry with fresh session
      if (response.status === 401 && !isRetry) {
        console.log('[GenericCRM] Got 401 on invoice list - invalidating session and retrying...');
        await this.invalidateSession(integrationId);
        return this.getInvoiceList(integrationId, true);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GenericCRM] Failed to fetch invoice list: ${response.status}`, errorText.substring(0, 500));
        return [];
      }

      const responseText = await response.text();
      console.log(`[GenericCRM] Invoice list response length: ${responseText.length}`);
      console.log(`[GenericCRM] Invoice list response preview: ${responseText.substring(0, 500)}`);

      // Parse DataTables response
      const data = JSON.parse(responseText);
      const invoices: InvoiceListItem[] = [];

      if (data.data && Array.isArray(data.data)) {
        for (const row of data.data) {
          if (Array.isArray(row) && row.length >= 2) {
            // Column 1 contains invoice number like "FS/5/01/2026/MCG"
            const invoiceNumber = String(row[1]).trim();

            // Column 6 contains actions HTML with PDF download link
            const actionsHtml = row[6] || row[3] || '';

            // Extract PDF URL - look for download link with .pdf
            // Pattern: href="https://crm.mcgroup.pl/storage/app/act/ClientsInvoice/MCG_3657/Faktura-5/01/2026_20260107010126.pdf"
            const pdfUrlMatch = actionsHtml.match(/href="([^"]+\.pdf)"/);
            if (pdfUrlMatch) {
              const pdfUrl = pdfUrlMatch[1];

              invoices.push({
                invoiceNumber,
                pdfUrl,
              });
              console.log(`[GenericCRM] Found invoice: ${invoiceNumber} -> ${pdfUrl}`);
            } else {
              console.log(`[GenericCRM] Invoice ${invoiceNumber} - no PDF link found in: ${actionsHtml.substring(0, 100)}`);
            }
          }
        }
      }

      console.log(`[GenericCRM] Found ${invoices.length} invoices with PDF URLs`);
      return invoices;
    } catch (error) {
      console.error('[GenericCRM] Error fetching invoice list:', error);
      return [];
    }
  }

  /**
   * Find PDF URL for a specific invoice number
   */
  async findInvoicePdfUrl(
    integrationId: string,
    invoiceNumber: string,
    invoiceMonth?: number,
    invoiceYear?: number
  ): Promise<string | null> {
    const integration = await this.prisma.cRMIntegration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      return null;
    }

    const invoiceList = await this.getInvoiceList(integrationId);

    if (invoiceList.length === 0) {
      console.log(`[GenericCRM] No invoices found in CRM`);
      return null;
    }

    // Get month/year for matching
    const month = invoiceMonth !== undefined ? invoiceMonth + 1 : new Date().getMonth() + 1;
    const year = invoiceYear || new Date().getFullYear();
    const monthStr = String(month).padStart(2, '0');

    console.log(`[GenericCRM] Looking for invoice from ${monthStr}/${year}`);
    console.log(`[GenericCRM] Available invoices: ${invoiceList.map(i => i.invoiceNumber).join(', ')}`);

    // Try to find by month/year pattern in CRM invoice number
    // CRM format: "FS/5/01/2026/MCG" where 01 is month and 2026 is year
    let found = invoiceList.find(inv => {
      const invNum = inv.invoiceNumber;
      // Match pattern like /01/2026 or /1/2026
      return invNum.includes(`/${monthStr}/${year}`) || invNum.includes(`/${month}/${year}`);
    });

    // If multiple invoices for same month, return the most recent (first in desc order)
    if (found) {
      console.log(`[GenericCRM] Found invoice by month/year: ${found.invoiceNumber} -> ${found.pdfUrl}`);
      return found.pdfUrl;
    }

    // If no match by month/year, just return the most recent invoice (first one)
    console.log(`[GenericCRM] No exact match, returning most recent invoice`);
    const mostRecent = invoiceList[0];
    if (mostRecent) {
      console.log(`[GenericCRM] Using most recent: ${mostRecent.invoiceNumber} -> ${mostRecent.pdfUrl}`);
      return mostRecent.pdfUrl;
    }

    console.log(`[GenericCRM] Invoice not found in CRM list`);
    return null;
  }

  /**
   * Download PDF from CRM and save locally
   */
  async downloadInvoicePdf(
    integrationId: string,
    pdfUrl: string,
    invoiceId: string
  ): Promise<string | null> {
    const integration = await this.ensureSession(integrationId);

    if (!integration) {
      console.error('[GenericCRM] No valid session for PDF download');
      return null;
    }

    try {
      let cookies: string[] = [];
      try {
        cookies = JSON.parse(integration.sessionCookies || '[]');
      } catch {
        cookies = [];
      }

      console.log(`[GenericCRM] Downloading PDF from ${pdfUrl}`);

      const response = await fetch(pdfUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/pdf,*/*',
          'Cookie': this.parseCookies(cookies),
        },
      });

      if (!response.ok) {
        console.error(`[GenericCRM] Failed to download PDF: ${response.status}`);
        return null;
      }

      // Get the PDF content
      const pdfBuffer = await response.buffer();

      // Create directory if it doesn't exist
      const invoicesDir = path.join(process.cwd(), 'uploads', 'crm-invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      // Save the PDF
      const filename = `crm-${invoiceId}.pdf`;
      const filePath = path.join(invoicesDir, filename);
      fs.writeFileSync(filePath, pdfBuffer);

      console.log(`[GenericCRM] PDF saved to ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('[GenericCRM] Error downloading PDF:', error);
      return null;
    }
  }

  /**
   * Fetch and save PDF after invoice creation
   */
  async fetchInvoicePdf(
    integrationId: string,
    invoice: Invoice
  ): Promise<{ pdfUrl?: string; pdfPath?: string }> {
    try {
      // Find the PDF URL in CRM
      const pdfUrl = await this.findInvoicePdfUrl(
        integrationId,
        invoice.number,
        invoice.invoiceMonth ?? undefined,
        invoice.invoiceYear ?? undefined
      );

      if (!pdfUrl) {
        console.log('[GenericCRM] Could not find PDF URL in CRM');
        return {};
      }

      // Download the PDF
      const pdfPath = await this.downloadInvoicePdf(integrationId, pdfUrl, invoice.id);

      if (!pdfPath) {
        console.log('[GenericCRM] Could not download PDF from CRM');
        return { pdfUrl };
      }

      // Update invoice with PDF info
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          crmPdfUrl: pdfUrl,
          crmPdfPath: pdfPath,
        },
      });

      return { pdfUrl, pdfPath };
    } catch (error) {
      console.error('[GenericCRM] Error fetching invoice PDF:', error);
      return {};
    }
  }
}
