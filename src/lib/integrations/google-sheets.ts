import { google } from 'googleapis';
import crypto from 'crypto';
import { decrypt } from '@/lib/whatsapp/encryption';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { logHttpEvent } from '@/lib/logs/http-logs';

export interface GoogleSheetsConfig {
  spreadsheet_id: string;
  client_email?: string;
  private_key?: string;
  reference_column?: string;
  return_columns?: string;
}

function normalizePemKey(raw: string): string {
  let key = raw;

  // Strip surrounding quotes that may come from env var misconfiguration
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // Strip BOM if present
  key = key.replace(/^\uFEFF/, '');

  // Collapse all newline variants (escaped and actual) into real newlines
  key = key
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Remove any whitespace between PEM header/footer and content
  key = key.replace(/(-----BEGIN [A-Z ]+-----)\s+/g, '$1\n');
  key = key.replace(/\s+(-----END [A-Z ]+-----)/g, '\n$1');

  return key;
}

function validatePrivateKey(key: string, source: string): string {
  const normalized = normalizePemKey(key);

  console.log(`[google-sheets] Key source: ${source}, length: ${normalized.length}, starts: ${normalized.substring(0, 30)}..., ends: ...${normalized.substring(normalized.length - 30)}`);

  if (!normalized.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error(`[google-sheets] Key from ${source} does not contain valid PEM header`);
    throw new Error(`Invalid private key format from ${source}: missing PEM header`);
  }

  // Test with Node.js crypto to catch OpenSSL errors early with a clear message
  try {
    const keyObj = crypto.createPrivateKey(normalized);
    console.log(`[google-sheets] Key validated OK via crypto.createPrivateKey (type: ${keyObj.asymmetricKeyType})`);
  } catch (err: any) {
    console.error(`[google-sheets] crypto.createPrivateKey FAILED for key from ${source}:`, err.message);
    throw new Error(`Private key from ${source} is invalid: ${err.message}`);
  }

  return normalized;
}

async function getClient(businessId: string) {
  const db = supabaseAdmin();

  // 1. Try to get business-specific integration
  const { data: integration } = await db
    .from('business_integrations')
    .select('config')
    .eq('business_id', businessId)
    .eq('type', 'google_sheets')
    .eq('is_enabled', true)
    .maybeSingle();

  let config = (integration?.config as unknown as GoogleSheetsConfig) || {};
  let keySource = 'business_integration';

  // 2. Fallback to global settings if local config is missing keys
  if (!config.client_email || !config.private_key) {
    const { data: globalSettings } = await db
      .from('system_settings')
      .select('value')
      .eq('id', 'integrations_global')
      .maybeSingle();

    const globalConfig = (globalSettings?.value as any)?.google_sheets || {};
    
    if (config.private_key) {
      keySource = 'business_integration';
    } else if (globalConfig.default_service_account?.private_key) {
      keySource = 'system_settings_global';
    } else {
      keySource = 'env_var';
    }

    config = {
      ...config,
      client_email: config.client_email || globalConfig.default_service_account?.client_email || process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: config.private_key || globalConfig.default_service_account?.private_key || process.env.GOOGLE_SHEETS_PRIVATE_KEY,
    };
  }

  if (!config.client_email || !config.private_key || !config.spreadsheet_id) {
    throw new Error('Google Sheets integration is not fully configured.');
  }

  // Decrypt private key if it looks like it's encrypted (GCM format: iv:ct:tag)
  const isEncrypted = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(config.private_key);
  let privateKeyRaw: string;
  try {
    privateKeyRaw = isEncrypted ? decrypt(config.private_key) : config.private_key;
    if (isEncrypted) keySource += ' (decrypted)';
  } catch (decryptErr: any) {
    console.error(`[google-sheets] Decryption failed for key from ${keySource}:`, decryptErr.message);
    throw new Error(`Failed to decrypt private key: ${decryptErr.message}`);
  }

  let privateKey: string;
  try {
    privateKey = validatePrivateKey(privateKeyRaw, keySource);
  } catch (validationErr: any) {
    // If the DB key failed, try the env var as a fallback
    const envKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    if (envKey && envKey !== config.private_key) {
      console.warn(`[google-sheets] DB key from ${keySource} failed validation, falling back to env var`);
      privateKey = validatePrivateKey(envKey, 'env_var_fallback');
    } else {
      throw validationErr;
    }
  }

  const auth = new google.auth.JWT({
    email: config.client_email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    spreadsheetId: config.spreadsheet_id,
    config
  };
}

/**
 * Find a row by searching a column for a specific value.
 */
export async function lookupRow(businessId: string, sheetName: string, searchColumn: string, searchValue: string) {
  const { sheets, spreadsheetId } = await getClient(businessId);

  // Fetch the first 1000 rows
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:Z1000`, 
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return null;

  const header = rows[0];
  const colIndex = header.indexOf(searchColumn);
  if (colIndex === -1) throw new Error(`Column "${searchColumn}" not found in sheet "${sheetName}"`);

  const foundRow = rows.find(r => String(r[colIndex]).toLowerCase() === String(searchValue).toLowerCase());
  if (!foundRow) return null;

  // Map row to object using headers
  const result: Record<string, string> = {};
  header.forEach((h, i) => {
    result[h] = foundRow[i] ?? '';
  });

  return result;
}

/**
 * General search for AI tool calling.
 */
export async function searchSheets(businessId: string, query: string) {
  try {
    const { sheets, spreadsheetId, config } = await getClient(businessId);

    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const firstSheetName = spreadsheet.data.sheets?.[0]?.properties?.title;
    if (!firstSheetName) return "No sheets found.";

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${firstSheetName}!A1:Z100`, // Small range for AI context
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return "Spreadsheet is empty.";

    const header = rows[0];
    const refCol = config.reference_column?.trim();
    const retColsRaw = config.return_columns?.trim();

    let refColIndex = -1;
    if (refCol) {
      refColIndex = header.findIndex(h => String(h).toLowerCase() === refCol.toLowerCase());
    }

    await logHttpEvent({
      businessId,
      direction: 'system',
      service: 'google_sheets',
      endpoint: 'searchSheets',
      payload: { headers: header, refCol, refColIndex, query, totalRows: rows.length - 1 },
      note: `Searching for "${query}" in "${refCol}" column`,
    });

    const results = rows.slice(1).filter(row => {
      if (refColIndex !== -1) {
        const cellValue = row[refColIndex];
        return cellValue !== undefined && String(cellValue).toLowerCase().includes(query.toLowerCase());
      } else {
        return row.some(cell => String(cell).toLowerCase().includes(query.toLowerCase()));
      }
    });

    if (results.length === 0) {
      await logHttpEvent({
        businessId,
        direction: 'system',
        service: 'google_sheets',
        endpoint: 'searchSheets',
        payload: { query, sheetName: firstSheetName },
        note: `No results found for "${query}"`,
      });
      return `No matches found for "${query}" in sheet "${firstSheetName}".`;
    }

    let columnsToReturn: string[] = [];
    if (retColsRaw) {
      columnsToReturn = retColsRaw.split(',').map(c => c.trim().toLowerCase());
    }

    const formatted = results.slice(0, 5).map(row => {
      return header
        .map((h, i) => {
          const isAllowed = columnsToReturn.length === 0 || columnsToReturn.includes(String(h).trim().toLowerCase());
          if (!isAllowed) return null;
          return `${h}: ${row[i] ?? ''}`;
        })
        .filter(val => val !== null)
        .join(', ');
    }).join('\n---\n');

    await logHttpEvent({
      businessId,
      direction: 'system',
      service: 'google_sheets',
      endpoint: 'searchSheets',
      payload: { query, matchCount: results.length, columnsToReturn, formatted },
      note: `Returned ${results.length} result(s) for "${query}"`,
    });
    return formatted;
  } catch (err: any) {
    console.error('[google-sheets] search failed:', err);
    await logHttpEvent({
      businessId,
      direction: 'system',
      service: 'google_sheets',
      endpoint: 'searchSheets',
      payload: { error: err.message, stack: err.stack },
      note: `Error: ${err.message}`,
    });
    return `Error searching spreadsheet: ${err.message}`;
  }
}
