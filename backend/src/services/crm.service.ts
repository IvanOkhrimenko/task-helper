/**
 * CRM Integration Service
 *
 * Integrates with crm.mcgroup.pl for invoice synchronization.
 * Uses session-based authentication with CSRF token protection.
 */

import fetch from 'node-fetch';
import { Invoice, Task, User, BankAccount } from '@prisma/client';

// Extended task type with bank account
type TaskWithBankAccount = Task & {
  bankAccount?: BankAccount | null;
};

// Extended invoice type with relations
type InvoiceWithRelations = Invoice & {
  task?: TaskWithBankAccount | null;
  user?: User | null;
};

interface CRMSession {
  cookies: string[];
  csrfToken: string;
  expiresAt: Date;
}

interface CRMInvoiceData {
  // Seller info
  company: string;
  nip: string;
  address: string;
  index: string;
  city: string;
  country: string;
  requisite: string;
  name_bank: string;
  swift: string;
  requisites_id: string;

  // Invoice details
  numberF: string;
  dataSales: string;
  dataPay: string;
  dataDos: string;
  selectLang: string;
  selectVal: string;
  typePayF: string;

  // Client info
  client_id?: string;
  contrCompanyN: string;
  contrCompanyO: string;
  contrNipN: string;
  contrNipO: string;
  contrAddressN: string;
  contrAddressO: string;
  contrIndexN: string;
  contrIndexO: string;
  contrCityN: string;
  contrCityO: string;
  contrCountryN: string;
  contrCountryO: string;

  // Services/items
  allServices: CRMServiceItem[];

  // Totals
  allSumNetto: string;
  allSumVatZl: string;
  sumSvatBrutto: string;
  blockVat: CRMVatBlock[];
}

interface CRMServiceItem {
  number: string;
  discount: string;
  name1: string;
  name2: string;
  id?: string;
  code: string;
  count: string;
  typeCount: string;
  cenaNetto: string;
  cenaBrutto: string;
  vat: string;
  nettoTotal: string;
  bruttoTotal: string;
}

interface CRMVatBlock {
  type: string;
  netto: string;
  vat: string;
  brutto: string;
}

interface CRMSyncResult {
  success: boolean;
  message: string;
  crmInvoiceId?: string;
  error?: string;
}

export class CRMService {
  private baseUrl = 'https://crm.mcgroup.pl';
  private session: CRMSession | null = null;

  private get credentials() {
    return {
      email: process.env.CRM_EMAIL,
      password: process.env.CRM_PASSWORD,
    };
  }

  private get isConfigured(): boolean {
    return !!(process.env.CRM_EMAIL && process.env.CRM_PASSWORD);
  }

  /**
   * Login to CRM and get session cookies + CSRF token
   */
  async login(): Promise<boolean> {
    if (!this.isConfigured) {
      console.error('CRM credentials not configured');
      return false;
    }

    try {
      // Step 1: Get login page to obtain initial CSRF token
      const loginPageResponse = await fetch(`${this.baseUrl}/login`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!loginPageResponse.ok) {
        console.error('Failed to get CRM login page:', loginPageResponse.status);
        return false;
      }

      // Extract cookies from response
      const setCookies = this.getCookiesFromResponse(loginPageResponse as any);
      console.log('Login page cookies:', setCookies.length, 'cookies received');
      console.log('Login page cookie names:', setCookies.map(c => c.split('=')[0]));

      // Parse HTML to get CSRF token
      const loginHtml = await loginPageResponse.text();
      const csrfMatch = loginHtml.match(/name="_token"\s+value="([^"]+)"/);
      if (!csrfMatch) {
        console.error('Could not find CSRF token on login page');
        return false;
      }
      const csrfToken = csrfMatch[1];

      // Build cookie string for next request
      const cookieString = this.parseCookies(setCookies);

      // Step 2: Submit login form with AJAX format (as shown in curl)
      const loginData = new URLSearchParams({
        email: this.credentials.email!,
        password: this.credentials.password!,
        tokenApp: '',
        s_Products: '',
        lastPage: '',
        _token: csrfToken,
      });

      const loginResponse = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': cookieString,
          'Origin': this.baseUrl,
          'Referer': `${this.baseUrl}/login`,
        },
        body: loginData.toString(),
        redirect: 'manual', // Don't follow redirects automatically
      });

      // Get new cookies after login
      const newCookies = this.getCookiesFromResponse(loginResponse as any);
      console.log('Login response cookies:', newCookies.length, 'cookies received');
      console.log('Login response cookie names:', newCookies.map(c => c.split('=')[0]));

      // Merge cookies
      const allCookies = [...setCookies, ...newCookies];
      const sessionCookies = this.parseCookies(allCookies);
      console.log('Session cookies after login:', sessionCookies.substring(0, 250) + '...');

      // Check if login was successful
      // AJAX login may return 200 with JSON, or 302 redirect
      const loginResponseText = await loginResponse.text();
      let loginSuccess = false;

      if (loginResponse.status === 200) {
        // Try to parse as JSON - AJAX response
        try {
          const jsonResponse = JSON.parse(loginResponseText);
          loginSuccess = jsonResponse.success === true || jsonResponse.status === 'ok' || !jsonResponse.error;
          console.log('CRM login AJAX response:', jsonResponse);
        } catch {
          // Not JSON, might be HTML redirect or success page
          loginSuccess = loginResponseText.includes('dashboard') ||
                        loginResponseText.includes('success') ||
                        !loginResponseText.includes('error');
        }
      } else if (loginResponse.status === 302 || loginResponse.status === 301) {
        loginSuccess = true;
      }

      if (loginSuccess) {
        // Step 3: Get a page to extract new CSRF token for API calls
        const dashboardResponse = await fetch(`${this.baseUrl}/create-faktura`, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cookie': sessionCookies,
          },
        });

        if (!dashboardResponse.ok) {
          console.error('Failed to get CRM dashboard:', dashboardResponse.status);
          return false;
        }

        // Update cookies if new ones were set
        const dashboardCookies = this.getCookiesFromResponse(dashboardResponse as any);
        console.log('Dashboard cookies:', dashboardCookies.length, 'cookies received');
        console.log('Dashboard cookie names:', dashboardCookies.map(c => c.split('=')[0]));
        const finalCookies = [...allCookies, ...dashboardCookies];
        const finalCookieString = this.parseCookies(finalCookies);
        console.log('Final cookies to store:', finalCookieString);
        console.log('Has session cookie:', finalCookieString.includes('mia_consult_group_session'));

        // Extract CSRF token from dashboard
        const dashboardHtml = await dashboardResponse.text();
        const newCsrfMatch = dashboardHtml.match(/name="_token"\s+value="([^"]+)"/) ||
                            dashboardHtml.match(/_token['"]\s*:\s*['"]([^'"]+)['"]/) ||
                            dashboardHtml.match(/csrf-token['"]\s+content=['"]([^'"]+)['"]/);

        if (!newCsrfMatch) {
          console.error('Could not find CSRF token on dashboard');
          return false;
        }

        this.session = {
          cookies: finalCookies,
          csrfToken: newCsrfMatch[1],
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        };

        console.log('CRM login successful');
        return true;
      }

      console.error('CRM login failed - unexpected response:', loginResponse.status);
      return false;
    } catch (error) {
      console.error('CRM login error:', error);
      return false;
    }
  }

  /**
   * Ensure we have a valid session
   */
  private async ensureSession(): Promise<boolean> {
    if (this.session && this.session.expiresAt > new Date()) {
      return true;
    }
    return this.login();
  }

  /**
   * Invalidate current session (used on auth failures)
   */
  private invalidateSession(): void {
    console.log('Invalidating CRM session');
    this.session = null;
  }

  /**
   * Parse Set-Cookie headers into a cookie string
   * Handles deduplication - later cookies override earlier ones
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
   * Get cookies from response headers (handles different node-fetch versions)
   */
  private getCookiesFromResponse(response: Response): string[] {
    // Try getSetCookie first (node-fetch v3)
    if (typeof (response.headers as any).getSetCookie === 'function') {
      return (response.headers as any).getSetCookie();
    }

    // Try raw() method
    if (typeof (response.headers as any).raw === 'function') {
      const raw = (response.headers as any).raw();
      return raw['set-cookie'] || [];
    }

    // Fallback: try to get from entries
    const cookies: string[] = [];
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        cookies.push(value);
      }
    });

    return cookies;
  }

  /**
   * Extract XSRF token from cookies for Laravel
   */
  private getXsrfToken(setCookies: string[]): string | null {
    for (const cookie of setCookies) {
      const match = cookie.match(/XSRF-TOKEN=([^;]+)/);
      if (match) {
        // Laravel URL-encodes the token, so decode it
        return decodeURIComponent(match[1]);
      }
    }
    return null;
  }

  /**
   * Create invoice in CRM
   */
  async createInvoice(invoice: InvoiceWithRelations): Promise<CRMSyncResult> {
    return this.createInvoiceWithRetry(invoice, false);
  }

  /**
   * Internal method to create invoice with retry on 401
   */
  private async createInvoiceWithRetry(invoice: InvoiceWithRelations, isRetry: boolean): Promise<CRMSyncResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'CRM not configured',
        error: 'CRM_EMAIL and CRM_PASSWORD environment variables are required',
      };
    }

    const hasSession = await this.ensureSession();
    if (!hasSession || !this.session) {
      return {
        success: false,
        message: 'Failed to authenticate with CRM',
        error: 'Could not establish CRM session',
      };
    }

    try {
      // Build form data from invoice
      const formData = this.buildInvoiceFormData(invoice);

      // Get XSRF token from cookies for Laravel
      const xsrfToken = this.getXsrfToken(this.session.cookies);

      // Build headers
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': this.parseCookies(this.session.cookies),
        'Origin': this.baseUrl,
        'Referer': `${this.baseUrl}/create-faktura`,
      };

      // Add X-XSRF-TOKEN header if available (required by Laravel)
      if (xsrfToken) {
        headers['X-XSRF-TOKEN'] = xsrfToken;
      }

      console.log('=== CRM REQUEST DEBUG ===');
      console.log('Cookies:', this.parseCookies(this.session.cookies).substring(0, 200) + '...');
      console.log('XSRF Token:', xsrfToken ? 'present' : 'missing');
      console.log('CSRF Token in form:', this.session.csrfToken ? 'present' : 'missing');

      // Log key form fields for debugging
      const debugFields = ['company', 'nip', 'requisite', 'requisites_id', 'client_id', 'contrCompanyN', 'numberF', 'selectVal', 'allServices[0][name1]', 'allSumNetto'];
      console.log('Key form fields:');
      debugFields.forEach(field => {
        console.log(`  ${field}: ${formData.get(field)}`);
      });

      console.log('Full form data:', formData.toString());

      // Send request to CRM
      const response = await fetch(`${this.baseUrl}/saveFakturyClients`, {
        method: 'POST',
        headers,
        body: formData.toString(),
      });

      const responseText = await response.text();
      console.log('CRM response status:', response.status);
      console.log('CRM response body (full):', responseText);

      // Handle 401 Unauthenticated - retry with fresh session
      if (response.status === 401 && !isRetry) {
        console.log('CRM returned 401 Unauthenticated - invalidating session and retrying...');
        this.invalidateSession();
        return this.createInvoiceWithRetry(invoice, true);
      }

      // Try to parse response
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
        console.log('CRM parsed response:', JSON.stringify(responseData, null, 2));
      } catch {
        console.log('CRM response is not JSON, raw text:', responseText);
      }

      if (response.ok) {
        // Check for success indicators
        // CRM might return: { success: true, id: 123 } or { error: "message" } or just { id: 123 }
        const hasSuccess = responseData.success === true || responseData.success === 'true';
        const hasId = responseData.id !== undefined && responseData.id !== null;
        const hasError = responseData.error || responseData.errors || responseData.message?.includes('error');

        if (hasError) {
          console.error('CRM returned error in response:', responseData.error || responseData.errors || responseData.message);
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

        // If we got 200 but no clear success/error indicator, log warning but treat as potential failure
        console.warn('CRM returned 200 but no clear success indicator. Response:', responseData);

        // Check if the response might still indicate success (e.g., redirect or empty response)
        if (responseText === '' || responseText === '{}' || responseText === 'ok' || responseText === 'OK') {
          console.log('CRM returned empty/ok response - might be success without ID');
          return {
            success: true,
            message: 'Invoice may have been created in CRM (no ID returned)',
          };
        }

        // Return failure if we can't determine success
        return {
          success: false,
          message: 'CRM returned unexpected response',
          error: `Response status 200 but unclear result: ${responseText.substring(0, 200)}`,
        };
      }

      // Handle non-200 response
      console.error('CRM create invoice failed with status:', response.status);
      return {
        success: false,
        message: 'Failed to create invoice in CRM',
        error: `HTTP ${response.status}: ${responseText.substring(0, 500)}`,
      };
    } catch (error) {
      console.error('CRM create invoice error:', error);
      return {
        success: false,
        message: 'Error communicating with CRM',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Build form data from real invoice data
   */
  private buildInvoiceFormData(invoice: InvoiceWithRelations): URLSearchParams {
    const params = new URLSearchParams();
    const task = invoice.task;
    const user = invoice.user;
    const bankAccount = task?.bankAccount;

    // Seller info from user profile (new split fields)
    params.append('company', user?.name || '');
    params.append('nip', user?.nip || '');
    params.append('address', user?.streetAddress || '');
    params.append('index', user?.postcode || '');
    params.append('city', user?.city || '');
    params.append('country', user?.country || 'Polska');

    // Bank details from task's bank account (or fallback to user's legacy fields)
    params.append('requisite', bankAccount?.iban || user?.bankIban || '');
    params.append('name_bank', bankAccount?.bankName || user?.bankName || '');
    params.append('swift', bankAccount?.swift || user?.bankSwift || '');

    // Invoice number - format: number/month/year
    // Extract number from our format (e.g., "INV-202512-ABC123" -> get sequence number)
    const invoiceMonth = invoice.invoiceMonth !== null ? invoice.invoiceMonth : new Date().getMonth();
    const invoiceYear = invoice.invoiceYear !== null ? invoice.invoiceYear : new Date().getFullYear();

    // Generate invoice number in CRM format
    // Use last 4 chars of invoice ID as unique number
    const invoiceNum = parseInt(invoice.id.slice(-4), 16) % 1000 || 1;
    const monthStr = String(invoiceMonth + 1).padStart(2, '0');
    const numberF = `${invoiceNum}/${monthStr}/${invoiceYear}`;

    params.append('number', String(invoiceNum));
    params.append('numberFAuto', numberF);
    params.append('numberF', numberF);

    // Dates
    // Issue date = today or invoice creation date
    const issueDate = new Date().toISOString().split('T')[0];

    // Delivery date = last day of invoice month
    const lastDayOfMonth = new Date(invoiceYear, invoiceMonth + 1, 0);
    const deliveryDate = lastDayOfMonth.toISOString().split('T')[0];

    // Due date = issue date + 14 days (or configurable)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    params.append('dataSales', issueDate);
    params.append('dataPay', dueDateStr);
    params.append('dataDos', deliveryDate);

    // Options
    params.append('checkedAuto', 'on');
    params.append('selectLang', invoice.language || 'PL');
    // Currency from bank account (preferred) or invoice or fallback
    params.append('selectVal', bankAccount?.currency || invoice.currency || 'PLN');
    params.append('typePayF', 'transfer');
    params.append('selectDiscount', 'percent');

    // Client/Buyer info from task (new split fields)
    // client_id links to CRM client - required for proper invoice creation
    if (task?.crmClientId) {
      params.append('client_id', task.crmClientId);
    }
    params.append('recipient_id', 'default');

    const clientName = task?.clientName || '';
    const clientNip = task?.clientNip || '';
    const clientStreet = task?.clientStreetAddress || '';
    const clientPostcode = task?.clientPostcode || '';
    const clientCity = task?.clientCity || '';
    const clientCountry = task?.clientCountry || '';

    params.append('contrCompanyN', clientName);
    params.append('contrCompanyO', clientName);
    params.append('contrNipN', clientNip);
    params.append('contrNipO', clientNip);
    params.append('contrAddressN', clientStreet);
    params.append('contrAddressO', clientStreet);
    params.append('contrIndexN', clientPostcode);
    params.append('contrIndexO', clientPostcode);
    params.append('contrCityN', clientCity);
    params.append('contrCityO', clientCity);
    params.append('contrCountryN', clientCountry);
    params.append('contrCountryO', clientCountry);
    params.append('contrRequisiteN', '');
    params.append('contrRequisiteO', '');
    params.append('contrName_bankN', '');
    params.append('contrName_bankO', '');
    params.append('vatNumN', '');
    params.append('vatNumO', '');

    // Cost settings
    params.append('showHidePlNCost', '0');
    params.append('oplat', '0.00');

    // Service/Item
    const netAmount = Number(invoice.amount);
    const serviceName = task?.defaultServiceName || task?.description || 'Tworzenie oprogramowania';

    params.append('allServices[0][number]', '1');
    params.append('allServices[0][discount]', '0');
    params.append('allServices[0][name1]', serviceName);
    params.append('allServices[0][name2]', serviceName);
    params.append('allServices[0][code]', '');
    params.append('allServices[0][count]', '1');
    params.append('allServices[0][typeCount]', 'szt');
    params.append('allServices[0][cenaNetto]', netAmount.toFixed(2));
    params.append('allServices[0][cenaBrutto]', '0.00');
    params.append('allServices[0][vat]', 'np.');
    params.append('allServices[0][nettoTotal]', netAmount.toFixed(2));
    params.append('allServices[0][bruttoTotal]', netAmount.toFixed(2));

    // Totals
    params.append('sumSvatBrutto', netAmount.toFixed(2));
    params.append('allSumNetto', netAmount.toFixed(2));
    params.append('allSumVatZl', '0.00');

    // VAT block
    params.append('blockVat[0][type]', 'np.');
    params.append('blockVat[0][netto]', netAmount.toFixed(2));
    params.append('blockVat[0][vat]', '0.00');
    params.append('blockVat[0][brutto]', netAmount.toFixed(2));

    // Other settings
    params.append('rate', '1');
    params.append('dateResp', '');
    params.append('tableNumber', '');
    params.append('logo', '');
    params.append('attention', '');
    params.append('emailBuyer', task?.clientEmail || '');
    params.append('openAfterCreate', '0');
    params.append('cycleInvoice', '0');
    params.append('inpValVat', '0');
    // CRM requisites ID from bank account (preferred) or user's legacy field or env
    params.append('requisites_id', bankAccount?.crmRequisitesId || user?.crmRequisitesId || process.env.CRM_REQUISITES_ID || '');
    params.append('addLogoToInvoice', 'false');
    params.append('checkboxDateDos', 'false');

    // CSRF token
    params.append('_token', this.session?.csrfToken || '');

    // dataCycle JSON - CRM expects this too
    const dataCycle = {
      company: user?.name || '',
      nip: user?.nip || '',
      address: user?.streetAddress || '',
      index: user?.postcode || '',
      city: user?.city || '',
      country: user?.country || 'Polska',
      requisite: bankAccount?.iban || user?.bankIban || '',
      name_bank: bankAccount?.bankName || user?.bankName || '',
      swift: bankAccount?.swift || user?.bankSwift || '',
      number: invoiceNum,
      numberFAuto: numberF,
      numberF: numberF,
      dataSales: issueDate,
      dataPay: dueDateStr,
      dataDos: deliveryDate,
      checkedAuto: 'on',
      selectLang: invoice.language || 'PL',
      selectVal: bankAccount?.currency || invoice.currency || 'PLN',
      typePayF: 'transfer',
      selectDiscount: 'percent',
      client_id: task?.crmClientId || undefined,
      recipient_id: 'default',
      contrCompanyN: clientName,
      contrCompanyO: clientName,
      contrNipN: clientNip,
      contrNipO: clientNip,
      contrAddressN: clientStreet,
      contrAddressO: clientStreet,
      contrIndexN: clientPostcode,
      contrIndexO: clientPostcode,
      contrCityN: clientCity,
      contrCityO: clientCity,
      contrCountryN: clientCountry,
      contrCountryO: clientCountry,
      contrRequisiteN: '',
      contrRequisiteO: '',
      contrName_bankN: '',
      contrName_bankO: '',
      vatNumN: '',
      vatNumO: '',
      showHidePlNCost: 0,
      oplat: '0.00',
      allServices: [{
        number: '1',
        discount: '0',
        name1: serviceName,
        name2: serviceName,
        code: '',
        count: '1',
        typeCount: 'szt',
        cenaNetto: netAmount.toFixed(2),
        cenaBrutto: '0.00',
        vat: 'np.',
        nettoTotal: netAmount.toFixed(2),
        bruttoTotal: netAmount.toFixed(2)
      }],
      sumSvatBrutto: netAmount.toFixed(2),
      allSumNetto: netAmount.toFixed(2),
      allSumVatZl: '0.00',
      blockVat: [{
        type: 'np.',
        netto: netAmount.toFixed(2),
        vat: '0.00',
        brutto: netAmount.toFixed(2)
      }],
      rate: 1,
      dateResp: '',
      tableNumber: '',
      logo: null,
      attention: '',
      emailBuyer: task?.clientEmail || '',
      openAfterCreate: 0,
      cycleInvoice: 0,
      inpValVat: 0,
      requisites_id: bankAccount?.crmRequisitesId || user?.crmRequisitesId || process.env.CRM_REQUISITES_ID || '',
      addLogoToInvoice: false,
      checkboxDateDos: false,
      _token: this.session?.csrfToken || ''
    };
    params.append('dataCycle', JSON.stringify(dataCycle));

    return params;
  }

  /**
   * TEMPORARY: Build hardcoded test data from user's working curl
   */
  private buildHardcodedTestData(): URLSearchParams {
    const params = new URLSearchParams();

    // Seller info
    params.append('company', 'Ivan Okhrimenko');
    params.append('nip', '5214076954');
    params.append('address', 'Racjonalizacji 3/64');
    params.append('index', '02-069');
    params.append('city', 'Warszawa');
    params.append('country', 'Polska');
    params.append('requisite', 'PL77 1020 1169 0000 8002 0902 5612');
    params.append('name_bank', 'IKO');
    params.append('swift', 'BPKOPLPW');

    // Invoice number - use next number
    const invoiceNum = Math.floor(Math.random() * 900) + 100; // Random for test
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const numberF = `${invoiceNum}/${month}/${year}`;

    params.append('number', String(invoiceNum));
    params.append('numberFAuto', numberF);
    params.append('numberF', numberF);

    // Dates
    const today = now.toISOString().split('T')[0];
    params.append('dataSales', today);
    params.append('dataPay', today);
    params.append('dataDos', today);

    // Options
    params.append('checkedAuto', 'on');
    params.append('selectLang', 'PL');
    params.append('selectVal', 'PLN');
    params.append('typePayF', 'transfer');
    params.append('selectDiscount', 'percent');

    // Client
    params.append('client_id', '8769');
    params.append('recipient_id', 'default');
    params.append('contrCompanyN', 'Bluefield Technologies s. r. o.');
    params.append('contrCompanyO', 'Bluefield Technologies s. r. o.');
    params.append('contrNipN', '');
    params.append('contrNipO', '');
    params.append('contrAddressN', 'Mlynské nivy 4963/56');
    params.append('contrAddressO', 'Mlynské nivy 4963/56');
    params.append('contrIndexN', '821 05');
    params.append('contrIndexO', '821 05');
    params.append('contrCityN', 'Bratislava');
    params.append('contrCityO', 'Bratislava');
    params.append('contrCountryN', 'Slovakia');
    params.append('contrCountryO', 'Slovakia');
    params.append('contrRequisiteN', '');
    params.append('contrRequisiteO', '');
    params.append('contrName_bankN', '');
    params.append('contrName_bankO', '');
    params.append('vatNumN', '');
    params.append('vatNumO', '');

    // Cost settings
    params.append('showHidePlNCost', '0');
    params.append('oplat', '0.00');

    // Service
    params.append('allServices[0][number]', '1');
    params.append('allServices[0][discount]', '0');
    params.append('allServices[0][name1]', 'Tworzenie oprogramowania');
    params.append('allServices[0][id]', '7243');
    params.append('allServices[0][name2]', 'Tworzenie oprogramowania');
    params.append('allServices[0][code]', '');
    params.append('allServices[0][count]', '1');
    params.append('allServices[0][typeCount]', 'szt');
    params.append('allServices[0][cenaNetto]', '1.00');
    params.append('allServices[0][cenaBrutto]', '0.00');
    params.append('allServices[0][vat]', 'np.');
    params.append('allServices[0][nettoTotal]', '1.00');
    params.append('allServices[0][bruttoTotal]', '1.00');

    // Totals
    params.append('sumSvatBrutto', '1.00');
    params.append('allSumNetto', '1.00');
    params.append('allSumVatZl', '0.00');

    // VAT block
    params.append('blockVat[0][type]', 'np.');
    params.append('blockVat[0][netto]', '1.00');
    params.append('blockVat[0][vat]', '0.00');
    params.append('blockVat[0][brutto]', '1.00');

    // Other settings
    params.append('rate', '1');
    params.append('dateResp', '');
    params.append('tableNumber', '');
    params.append('logo', '');
    params.append('attention', '');
    params.append('emailBuyer', '');
    params.append('openAfterCreate', '0');
    params.append('cycleInvoice', '0');
    params.append('inpValVat', '0');
    params.append('requisites_id', '2929');
    params.append('addLogoToInvoice', 'false');
    params.append('checkboxDateDos', 'false');

    // CSRF token
    params.append('_token', this.session?.csrfToken || '');

    // dataCycle JSON
    const dataCycle = {
      company: 'Ivan Okhrimenko',
      nip: '5214076954',
      address: 'Racjonalizacji 3/64',
      index: '02-069',
      city: 'Warszawa',
      country: 'Polska',
      requisite: 'PL77 1020 1169 0000 8002 0902 5612',
      name_bank: 'IKO',
      swift: 'BPKOPLPW',
      number: invoiceNum,
      numberFAuto: numberF,
      numberF: numberF,
      dataSales: today,
      dataPay: today,
      dataDos: today,
      checkedAuto: 'on',
      selectLang: 'PL',
      selectVal: 'PLN',
      typePayF: 'transfer',
      selectDiscount: 'percent',
      client_id: '8769',
      recipient_id: 'default',
      contrCompanyN: 'Bluefield Technologies s. r. o.',
      contrCompanyO: 'Bluefield Technologies s. r. o.',
      contrNipN: '',
      contrNipO: '',
      contrAddressN: 'Mlynské nivy 4963/56',
      contrAddressO: 'Mlynské nivy 4963/56',
      contrIndexN: '821 05',
      contrIndexO: '821 05',
      contrCityN: 'Bratislava',
      contrCityO: 'Bratislava',
      contrCountryN: 'Slovakia',
      contrCountryO: 'Slovakia',
      contrRequisiteN: '',
      contrRequisiteO: '',
      contrName_bankN: '',
      contrName_bankO: '',
      vatNumN: '',
      vatNumO: '',
      showHidePlNCost: 0,
      oplat: '0.00',
      allServices: [{
        number: '1',
        discount: '0',
        name1: 'Tworzenie oprogramowania',
        id: '7243',
        name2: 'Tworzenie oprogramowania',
        code: '',
        count: '1',
        typeCount: 'szt',
        cenaNetto: '1.00',
        cenaBrutto: '0.00',
        vat: 'np.',
        nettoTotal: '1.00',
        bruttoTotal: '1.00'
      }],
      sumSvatBrutto: '1.00',
      allSumNetto: '1.00',
      allSumVatZl: '0.00',
      blockVat: [{
        type: 'np.',
        netto: '1.00',
        vat: '0.00',
        brutto: '1.00'
      }],
      rate: 1,
      dateResp: '',
      tableNumber: '',
      logo: null,
      attention: '',
      emailBuyer: '',
      openAfterCreate: 0,
      cycleInvoice: 0,
      inpValVat: 0,
      requisites_id: '2929',
      addLogoToInvoice: false,
      checkboxDateDos: false,
      _token: this.session?.csrfToken || ''
    };
    params.append('dataCycle', JSON.stringify(dataCycle));

    return params;
  }

  /**
   * Build CRM invoice data from our invoice model
   */
  private buildCRMInvoiceData(invoice: InvoiceWithRelations): CRMInvoiceData {
    const task = invoice.task;
    const user = invoice.user;

    // Calculate invoice date from month/year or use createdAt
    const invoiceDate = invoice.invoiceMonth !== null && invoice.invoiceYear !== null
      ? new Date(invoice.invoiceYear, invoice.invoiceMonth, 1)
      : invoice.createdAt;

    // Due date is typically 14 days after invoice date
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 14);

    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Calculate totals from amount (amount is gross)
    const grossAmount = Number(invoice.amount);
    // For "np." (not applicable) VAT - net equals gross
    const netAmount = grossAmount;
    const vatAmount = 0;
    const vatType = 'np.'; // Not applicable for international invoices

    return {
      // Seller info (from user profile)
      company: user?.name || '',
      nip: user?.nip || '',
      address: user?.address?.split('\n')[0] || '',
      index: this.extractPostalCode(user?.address || ''),
      city: this.extractCity(user?.address || ''),
      country: 'Polska',
      requisite: user?.bankIban || '',
      name_bank: user?.bankName || '',
      swift: user?.bankSwift || '',
      requisites_id: process.env.CRM_REQUISITES_ID || '2929',

      // Invoice details
      numberF: invoice.number,
      dataSales: formatDate(invoiceDate),
      dataPay: formatDate(dueDate),
      dataDos: formatDate(invoiceDate),
      selectLang: invoice.language || 'PL',
      selectVal: invoice.currency || 'PLN',
      typePayF: 'transfer',

      // Client info (from task)
      client_id: undefined, // Will be matched by CRM based on company name/NIP
      contrCompanyN: task?.clientName || '',
      contrCompanyO: task?.clientName || '',
      contrNipN: '', // Most international clients don't have Polish NIP
      contrNipO: '',
      contrAddressN: task?.clientAddress?.split('\n')[0] || '',
      contrAddressO: task?.clientAddress?.split('\n')[0] || '',
      contrIndexN: this.extractPostalCode(task?.clientAddress || ''),
      contrIndexO: this.extractPostalCode(task?.clientAddress || ''),
      contrCityN: this.extractCity(task?.clientAddress || ''),
      contrCityO: this.extractCity(task?.clientAddress || ''),
      contrCountryN: this.extractCountry(task?.clientAddress || ''),
      contrCountryO: this.extractCountry(task?.clientAddress || ''),

      // Services - single item
      allServices: [{
        number: '1',
        discount: '0',
        name1: task?.description || 'Tworzenie oprogramowania',
        name2: task?.description || 'Tworzenie oprogramowania',
        id: '',
        code: '',
        count: '1',
        typeCount: 'szt',
        cenaNetto: netAmount.toFixed(2),
        cenaBrutto: '0.00',
        vat: vatType,
        nettoTotal: netAmount.toFixed(2),
        bruttoTotal: grossAmount.toFixed(2),
      }],

      // Totals
      allSumNetto: netAmount.toFixed(2),
      allSumVatZl: vatAmount.toFixed(2),
      sumSvatBrutto: grossAmount.toFixed(2),
      blockVat: [{
        type: vatType,
        netto: netAmount.toFixed(2),
        vat: vatAmount.toFixed(2),
        brutto: grossAmount.toFixed(2),
      }],
    };
  }

  /**
   * Extract country from address string (assumes country is on last line)
   */
  private extractCountry(address: string): string {
    const lines = address.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return 'Polska';
    // Return last line as country
    return lines[lines.length - 1];
  }

  /**
   * Build URL-encoded form data
   */
  private buildFormData(data: CRMInvoiceData): URLSearchParams {
    const params = new URLSearchParams();

    // Basic fields
    params.append('company', data.company);
    params.append('nip', data.nip);
    params.append('address', data.address);
    params.append('index', data.index);
    params.append('city', data.city);
    params.append('country', data.country);
    params.append('requisite', data.requisite);
    params.append('name_bank', data.name_bank);
    params.append('swift', data.swift);

    // Auto-number fields
    params.append('number', '');
    params.append('numberFAuto', data.numberF);
    params.append('numberF', data.numberF);

    // Dates
    params.append('dataSales', data.dataSales);
    params.append('dataPay', data.dataPay);
    params.append('dataDos', data.dataDos);

    // Options
    params.append('checkedAuto', 'on');
    params.append('selectLang', data.selectLang);
    params.append('selectVal', data.selectVal);
    params.append('typePayF', data.typePayF);
    params.append('selectDiscount', 'percent');

    // Client
    if (data.client_id) {
      params.append('client_id', data.client_id);
    }
    params.append('recipient_id', 'default');
    params.append('contrCompanyN', data.contrCompanyN);
    params.append('contrCompanyO', data.contrCompanyO);
    params.append('contrNipN', data.contrNipN);
    params.append('contrNipO', data.contrNipO);
    params.append('contrAddressN', data.contrAddressN);
    params.append('contrAddressO', data.contrAddressO);
    params.append('contrIndexN', data.contrIndexN);
    params.append('contrIndexO', data.contrIndexO);
    params.append('contrCityN', data.contrCityN);
    params.append('contrCityO', data.contrCityO);
    params.append('contrCountryN', data.contrCountryN);
    params.append('contrCountryO', data.contrCountryO);
    params.append('contrRequisiteN', '');
    params.append('contrRequisiteO', '');
    params.append('contrName_bankN', '');
    params.append('contrName_bankO', '');
    params.append('vatNumN', '');
    params.append('vatNumO', '');

    // Cost settings
    params.append('showHidePlNCost', '0');
    params.append('oplat', '0.00');

    // Services
    data.allServices.forEach((service, index) => {
      params.append(`allServices[${index}][number]`, service.number);
      params.append(`allServices[${index}][discount]`, service.discount);
      params.append(`allServices[${index}][name1]`, service.name1);
      if (service.id) {
        params.append(`allServices[${index}][id]`, service.id);
      }
      params.append(`allServices[${index}][name2]`, service.name2);
      params.append(`allServices[${index}][code]`, service.code);
      params.append(`allServices[${index}][count]`, service.count);
      params.append(`allServices[${index}][typeCount]`, service.typeCount);
      params.append(`allServices[${index}][cenaNetto]`, service.cenaNetto);
      params.append(`allServices[${index}][cenaBrutto]`, service.cenaBrutto);
      params.append(`allServices[${index}][vat]`, service.vat);
      params.append(`allServices[${index}][nettoTotal]`, service.nettoTotal);
      params.append(`allServices[${index}][bruttoTotal]`, service.bruttoTotal);
    });

    // Totals
    params.append('sumSvatBrutto', data.sumSvatBrutto);
    params.append('allSumNetto', data.allSumNetto);
    params.append('allSumVatZl', data.allSumVatZl);

    // VAT blocks
    data.blockVat.forEach((block, index) => {
      params.append(`blockVat[${index}][type]`, block.type);
      params.append(`blockVat[${index}][netto]`, block.netto);
      params.append(`blockVat[${index}][vat]`, block.vat);
      params.append(`blockVat[${index}][brutto]`, block.brutto);
    });

    // Other settings
    params.append('rate', '1');
    params.append('dateResp', '');
    params.append('tableNumber', '');
    params.append('logo', '');
    params.append('attention', '');
    params.append('emailBuyer', '');
    params.append('openAfterCreate', '0');
    params.append('cycleInvoice', '0');
    params.append('inpValVat', '0');
    params.append('requisites_id', data.requisites_id);
    params.append('addLogoToInvoice', 'false');
    params.append('checkboxDateDos', 'false');

    // CSRF token
    params.append('_token', this.session?.csrfToken || '');

    // Data cycle (JSON version of all data)
    const dataCycle = {
      ...data,
      number: '',
      numberFAuto: data.numberF,
      checkedAuto: 'on',
      selectDiscount: 'percent',
      recipient_id: 'default',
      contrRequisiteN: '',
      contrRequisiteO: '',
      contrName_bankN: '',
      contrName_bankO: '',
      vatNumN: '',
      vatNumO: '',
      showHidePlNCost: 0,
      oplat: '0.00',
      rate: 1,
      dateResp: '',
      tableNumber: '',
      logo: null,
      attention: '',
      emailBuyer: '',
      openAfterCreate: 0,
      cycleInvoice: 0,
      inpValVat: 0,
      addLogoToInvoice: false,
      checkboxDateDos: false,
      _token: this.session?.csrfToken || '',
    };
    params.append('dataCycle', JSON.stringify(dataCycle));

    return params;
  }

  /**
   * Extract postal code from address string
   */
  private extractPostalCode(address: string): string {
    const match = address.match(/\b\d{2}-\d{3}\b/) || address.match(/\b\d{5}\b/) || address.match(/\b\d{3}\s?\d{2}\b/);
    return match ? match[0] : '';
  }

  /**
   * Extract city from address string (assumes city is after postal code or on last line)
   */
  private extractCity(address: string): string {
    const lines = address.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return '';

    // Try to find city after postal code
    const lastLine = lines[lines.length - 1];
    const postalMatch = lastLine.match(/\b\d{2}-\d{3}\s+(.+)$/);
    if (postalMatch) return postalMatch[1];

    // Otherwise return last line (minus postal code if present)
    return lastLine.replace(/\b\d{2}-\d{3}\b/, '').trim();
  }

  /**
   * Test connection to CRM
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConfigured) {
      return {
        success: false,
        message: 'CRM credentials not configured. Set CRM_EMAIL and CRM_PASSWORD environment variables.',
      };
    }

    const loggedIn = await this.login();
    if (loggedIn) {
      return {
        success: true,
        message: 'Successfully connected to CRM',
      };
    }

    return {
      success: false,
      message: 'Failed to authenticate with CRM. Check credentials.',
    };
  }
}

// Singleton instance
export const crmService = new CRMService();
