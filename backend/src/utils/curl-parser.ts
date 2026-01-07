/**
 * cURL Command Parser
 *
 * Parses cURL commands to extract URL, method, headers, cookies, and body fields.
 * Used to help users quickly configure CRM integrations from browser DevTools.
 */

export interface ParsedCurlRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  body: Record<string, string>;
  contentType: string;
}

export interface ParsedCurlField {
  name: string;
  value: string;
  suggestedPlaceholder?: string;
}

export interface ParseCurlResult {
  success: boolean;
  request?: ParsedCurlRequest;
  fields?: ParsedCurlField[];
  error?: string;
}

/**
 * Parse a cURL command string into structured data
 */
export function parseCurlCommand(curlString: string): ParseCurlResult {
  try {
    // Normalize the string - handle multi-line with backslashes
    const normalized = curlString
      .replace(/\\\r?\n/g, ' ')  // Remove line continuations
      .replace(/\s+/g, ' ')       // Normalize whitespace
      .trim();

    // Check if it starts with 'curl'
    if (!normalized.toLowerCase().startsWith('curl')) {
      return { success: false, error: 'Command must start with "curl"' };
    }

    const result: ParsedCurlRequest = {
      url: '',
      method: 'GET',
      headers: {},
      cookies: {},
      body: {},
      contentType: '',
    };

    // Extract URL - it's usually the unquoted argument or after certain flags
    const urlMatch = normalized.match(/curl\s+(?:.*?\s+)?['"]?(https?:\/\/[^\s'"]+)['"]?/i) ||
                     normalized.match(/--url\s+['"]?(https?:\/\/[^\s'"]+)['"]?/i);
    if (urlMatch) {
      result.url = urlMatch[1];
    }

    // Extract method
    const methodMatch = normalized.match(/-X\s+['"]?(\w+)['"]?/i) ||
                        normalized.match(/--request\s+['"]?(\w+)['"]?/i);
    if (methodMatch) {
      result.method = methodMatch[1].toUpperCase();
    } else if (normalized.includes('-d') || normalized.includes('--data')) {
      // If there's data but no explicit method, it's POST
      result.method = 'POST';
    }

    // Extract headers (-H or --header)
    const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/gi;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(normalized)) !== null) {
      const headerParts = headerMatch[1].split(':');
      if (headerParts.length >= 2) {
        const name = headerParts[0].trim();
        const value = headerParts.slice(1).join(':').trim();

        // Handle Cookie header separately
        if (name.toLowerCase() === 'cookie') {
          parseCookieString(value, result.cookies);
        } else {
          result.headers[name] = value;
        }

        // Track content type
        if (name.toLowerCase() === 'content-type') {
          result.contentType = value;
        }
      }
    }

    // Extract cookies from -b or --cookie flag
    const cookieMatch = normalized.match(/(?:-b|--cookie)\s+['"]([^'"]+)['"]/i);
    if (cookieMatch) {
      parseCookieString(cookieMatch[1], result.cookies);
    }

    // Extract body data (-d, --data, --data-raw, --data-binary, --data-urlencode)
    const dataRegex = /(?:-d|--data(?:-raw|-binary|-urlencode)?)\s+['"]([^'"]*)['"]/gi;
    let dataMatch;
    let bodyString = '';
    while ((dataMatch = dataRegex.exec(normalized)) !== null) {
      bodyString += (bodyString ? '&' : '') + dataMatch[1];
    }

    // Also try to match $'...' syntax used by some curl exports
    const dollarDataMatch = normalized.match(/--data(?:-raw)?\s+\$'([^']+)'/);
    if (dollarDataMatch) {
      // Unescape the $'...' string
      bodyString = dollarDataMatch[1]
        .replace(/\\'/g, "'")
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
    }

    // Parse body as URL-encoded form data
    if (bodyString) {
      parseUrlEncodedBody(bodyString, result.body);
    }

    // Generate field list with suggested placeholders
    const fields = generateFieldList(result.body);

    return {
      success: true,
      request: result,
      fields,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse cURL command',
    };
  }
}

/**
 * Parse cookie string into key-value pairs
 */
function parseCookieString(cookieString: string, target: Record<string, string>): void {
  const cookies = cookieString.split(';');
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split('=');
    if (name && valueParts.length > 0) {
      target[name.trim()] = valueParts.join('=').trim();
    }
  }
}

/**
 * Parse URL-encoded body string into key-value pairs
 */
function parseUrlEncodedBody(bodyString: string, target: Record<string, string>): void {
  try {
    const params = new URLSearchParams(bodyString);
    for (const [key, value] of params) {
      target[key] = value;
    }
  } catch {
    // If URLSearchParams fails, try manual parsing
    const pairs = bodyString.split('&');
    for (const pair of pairs) {
      const [key, ...valueParts] = pair.split('=');
      if (key) {
        try {
          target[decodeURIComponent(key)] = decodeURIComponent(valueParts.join('='));
        } catch {
          target[key] = valueParts.join('=');
        }
      }
    }
  }
}

/**
 * Generate field list with suggested placeholders based on field names and values
 */
function generateFieldList(body: Record<string, string>): ParsedCurlField[] {
  const fields: ParsedCurlField[] = [];

  for (const [name, value] of Object.entries(body)) {
    fields.push({
      name,
      value,
      suggestedPlaceholder: suggestPlaceholder(name, value),
    });
  }

  return fields;
}

/**
 * Suggest an appropriate placeholder based on field name and value patterns
 *
 * Logic: CRM forms typically have explicit prefixes for client/buyer data:
 * - contr*, client*, buyer*, kontrahent* = client/buyer data
 * - Generic fields (company, nip, address) = seller data
 * This is the common pattern in Polish CRM systems like mcgroup.pl
 */
function suggestPlaceholder(fieldName: string, value: string): string | undefined {
  const nameLower = fieldName.toLowerCase();

  // Check if this is explicitly a CLIENT/BUYER field (contr_, client_, buyer_, etc.)
  const isClientField = nameLower.includes('contr') ||
                        nameLower.includes('client') ||
                        nameLower.includes('buyer') ||
                        nameLower.includes('kontrahent') ||
                        nameLower.includes('nabywca') ||
                        nameLower.includes('odbiorca');

  // Company/name fields
  if (nameLower.includes('company') || nameLower === 'name' || nameLower === 'firma' || nameLower === 'nazwa') {
    return isClientField ? '{{task.clientName}}' : '{{user.name}}';
  }

  // NIP/Tax ID fields
  if (nameLower.includes('nip') || nameLower.includes('taxid') || nameLower.includes('tax_id') || nameLower === 'vat_id' || nameLower === 'ico') {
    return isClientField ? '{{task.clientNip}}' : '{{user.nip}}';
  }

  // Address fields
  if (nameLower.includes('address') || nameLower.includes('street') || nameLower.includes('addr') || nameLower === 'ulica') {
    return isClientField ? '{{task.clientStreetAddress}}' : '{{user.streetAddress}}';
  }

  // Postal code / index
  if (nameLower.includes('index') || nameLower.includes('postcode') || nameLower.includes('postal') || nameLower.includes('zip') || nameLower === 'psc') {
    return isClientField ? '{{task.clientPostcode}}' : '{{user.postcode}}';
  }

  // City
  if (nameLower.includes('city') || nameLower === 'mesto' || nameLower === 'miasto') {
    return isClientField ? '{{task.clientCity}}' : '{{user.city}}';
  }

  // Country
  if (nameLower.includes('country') || nameLower === 'stat' || nameLower === 'kraj') {
    return isClientField ? '{{task.clientCountry}}' : '{{user.country}}';
  }

  // Bank account / IBAN (only if not client field - contrRequisite is client's bank)
  if ((nameLower === 'requisite' || nameLower.includes('iban') || nameLower === 'ucet' || nameLower === 'konto') && !isClientField) {
    return '{{bankAccount.iban}}';
  }

  // Bank name (only if not client field)
  if ((nameLower === 'name_bank' || nameLower === 'bank' || nameLower.includes('bankname') || nameLower.includes('bank_name')) && !isClientField) {
    return '{{bankAccount.bankName}}';
  }

  // SWIFT (only if not client field)
  if ((nameLower === 'swift' || nameLower.includes('bic')) && !isClientField) {
    return '{{bankAccount.swift}}';
  }

  // Requisites ID (bank account ID in CRM)
  if (nameLower === 'requisites_id' || nameLower === 'requisitesid') {
    return '{{bankAccount.crmRequisitesId}}';
  }

  // Client ID in CRM
  if (nameLower === 'client_id' || nameLower === 'clientid' || nameLower === 'buyer_id' || nameLower === 'contractor_id') {
    return '{{task.crmClientId}}';
  }

  // Invoice number - match various patterns (numberF, numberFAuto, etc.)
  if (nameLower === 'numberf' || nameLower === 'numberfauto' ||
      nameLower === 'invoice_number' || nameLower === 'invoicenumber' ||
      nameLower.includes('cislo') || nameLower === 'faktura_cislo') {
    return '{{computed.invoiceNumberFormatted}}';
  }

  // Plain "number" field - invoice sequence number
  if (nameLower === 'number') {
    return '{{invoice.number}}';
  }

  // Currency
  if (nameLower.includes('currency') || nameLower === 'selectval' || nameLower === 'mena' || nameLower === 'waluta') {
    return '{{invoice.currency}}';
  }

  // Language
  if (nameLower.includes('lang') || nameLower === 'selectlang' || nameLower === 'jazyk' || nameLower === 'jezyk') {
    return '{{invoice.language}}';
  }

  // Amount / totals - net
  if (nameLower.includes('netto') || nameLower === 'allsumnetto' || nameLower === 'sumnetto' ||
      (nameLower.includes('sum') && nameLower.includes('net'))) {
    return '{{computed.netAmount}}';
  }

  // Amount / totals - gross
  if (nameLower.includes('brutto') || nameLower === 'sumsvatbrutto' || nameLower === 'sumbrutto' ||
      (nameLower.includes('sum') && nameLower.includes('brutto')) || nameLower.includes('gross')) {
    return '{{computed.grossAmount}}';
  }

  // VAT amount
  if (nameLower === 'allsumvatzl' || nameLower.includes('sumvat') ||
      (nameLower.includes('vat') && (nameLower.includes('sum') || nameLower.includes('zl')))) {
    return '{{computed.vatAmount}}';
  }

  // Service name / description (from allServices array or standalone)
  if (nameLower.includes('name1') || nameLower.includes('name2') ||
      nameLower.includes('servicename') || nameLower === 'service') {
    return '{{task.defaultServiceName}}';
  }

  // Email - buyer email
  if (nameLower === 'emailbuyer' || nameLower === 'buyeremail' ||
      nameLower === 'email_buyer' || nameLower === 'buyer_email' ||
      (nameLower.includes('email') && isClientField)) {
    return '{{task.clientEmail}}';
  }

  // Dates - issue date (dataSales in mcgroup CRM)
  if (nameLower === 'datasales' || nameLower === 'datapredaj' || nameLower === 'data_sprzedazy' ||
      nameLower.includes('issuedate') || nameLower.includes('issue_date') ||
      nameLower === 'datum_vystaveni' || nameLower === 'data_wystawienia') {
    return '{{invoice.issueDate}}';
  }

  // Dates - due date (dataPay in mcgroup CRM)
  if (nameLower === 'datapay' || nameLower === 'datasplatnosti' || nameLower === 'data_platnosci' ||
      nameLower.includes('duedate') || nameLower.includes('due_date') ||
      nameLower === 'datum_splatnosti' || nameLower === 'termin_platnosci') {
    return '{{invoice.dueDate}}';
  }

  // Dates - delivery date (dataDos in mcgroup CRM)
  if (nameLower === 'datados' || nameLower === 'datadodani' || nameLower === 'data_dostawy' ||
      nameLower.includes('deliverydate') || nameLower.includes('delivery_date') ||
      nameLower === 'datum_dodani') {
    return '{{invoice.deliveryDate}}';
  }

  // No suggestion for unknown fields
  return undefined;
}

/**
 * Get all available placeholders with descriptions
 */
export function getAvailablePlaceholders(): Record<string, { description: string; example: string }> {
  return {
    // Invoice fields
    '{{invoice.number}}': { description: 'Invoice number', example: 'INV-202601-ABC123' },
    '{{invoice.amount}}': { description: 'Invoice amount', example: '5000.00' },
    '{{invoice.currency}}': { description: 'Currency code', example: 'EUR' },
    '{{invoice.language}}': { description: 'Invoice language', example: 'EN' },
    '{{invoice.month}}': { description: 'Invoice month (0-11)', example: '0' },
    '{{invoice.year}}': { description: 'Invoice year', example: '2026' },
    '{{invoice.issueDate}}': { description: 'Issue date', example: '2026-01-06' },
    '{{invoice.dueDate}}': { description: 'Due date', example: '2026-01-20' },
    '{{invoice.deliveryDate}}': { description: 'Delivery date', example: '2026-01-31' },

    // Task (client) fields
    '{{task.clientName}}': { description: 'Client company name', example: 'Bluefield Technologies s.r.o.' },
    '{{task.clientNip}}': { description: 'Client tax ID', example: '12345678' },
    '{{task.clientStreetAddress}}': { description: 'Client street address', example: 'Mlynske nivy 4963/56' },
    '{{task.clientPostcode}}': { description: 'Client postal code', example: '821 05' },
    '{{task.clientCity}}': { description: 'Client city', example: 'Bratislava' },
    '{{task.clientCountry}}': { description: 'Client country', example: 'Slovakia' },
    '{{task.clientEmail}}': { description: 'Client email', example: 'client@example.com' },
    '{{task.crmClientId}}': { description: 'Client ID in CRM', example: '8769' },
    '{{task.defaultServiceName}}': { description: 'Service name', example: 'Tworzenie oprogramowania' },
    '{{task.description}}': { description: 'Task description', example: 'Software development' },

    // User (seller) fields
    '{{user.name}}': { description: 'Seller name', example: 'Ivan Okhrimenko' },
    '{{user.nip}}': { description: 'Seller tax ID (NIP)', example: '5214076954' },
    '{{user.streetAddress}}': { description: 'Seller street address', example: 'Racjonalizacji 3/64' },
    '{{user.postcode}}': { description: 'Seller postal code', example: '02-069' },
    '{{user.city}}': { description: 'Seller city', example: 'Warszawa' },
    '{{user.country}}': { description: 'Seller country', example: 'Polska' },

    // Bank account fields
    '{{bankAccount.iban}}': { description: 'Bank IBAN', example: 'PL77 1020 1169 0000 8002 0902 5612' },
    '{{bankAccount.bankName}}': { description: 'Bank name', example: 'PKO Bank Polski' },
    '{{bankAccount.swift}}': { description: 'SWIFT/BIC code', example: 'BPKOPLPW' },
    '{{bankAccount.crmRequisitesId}}': { description: 'Bank requisites ID in CRM', example: '2929' },
    '{{bankAccount.currency}}': { description: 'Account currency', example: 'PLN' },

    // Computed fields
    '{{computed.invoiceNumberFormatted}}': { description: 'Invoice number in CRM format (num/MM/YYYY)', example: '123/01/2026' },
    '{{computed.netAmount}}': { description: 'Net amount', example: '5000.00' },
    '{{computed.vatAmount}}': { description: 'VAT amount', example: '0.00' },
    '{{computed.grossAmount}}': { description: 'Gross amount', example: '5000.00' },
  };
}
