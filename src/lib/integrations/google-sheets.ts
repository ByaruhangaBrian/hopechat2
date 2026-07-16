import { google } from 'googleapis';
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

  // 2. Fallback to global settings if local config is missing keys
  if (!config.client_email || !config.private_key) {
    const { data: globalSettings } = await db
      .from('system_settings')
      .select('value')
      .eq('id', 'integrations_global')
      .maybeSingle();

    const globalConfig = (globalSettings?.value as any)?.google_sheets || {};
    
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
  const privateKeyRaw = isEncrypted ? decrypt(config.private_key) : config.private_key;

  // Normalize PEM key newlines: handle literal \n, \r\n, double-escaped \\n, etc.
  const privateKey = privateKeyRaw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n');

  // Validate that the result looks like a PEM private key
  if (!privateKey.includes('-----BEGIN')) {
    console.error('[google-sheets] Resolved private key is not valid PEM format. Source:',
      isEncrypted ? 'decrypted from DB' : 'plaintext from config/env');
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
