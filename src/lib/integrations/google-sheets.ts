import { google } from 'googleapis';
import crypto from 'crypto';
import { decrypt } from '@/lib/whatsapp/encryption';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { logHttpEvent } from '@/lib/logs/http-logs';
import { BusinessSpreadsheet } from '@/types';

export interface GoogleSheetsConfig {
  spreadsheet_id: string;
  client_email?: string;
  private_key?: string;
  reference_column?: string;
  return_columns?: string;
}

const TAG = '[google-sheets]';

function hexDumpBoundary(raw: string, label: string, chars: number = 40): string {
  const front = raw.substring(0, chars);
  const back = raw.substring(Math.max(0, raw.length - chars));
  const toHex = (s: string) => Array.from(s).map(c => c.charCodeAt(0).toString(16).padStart(4, '0')).join(' ');
  return `${label} front(${front.length}): [${toHex(front)}] | back(${back.length}): [${toHex(back)}]`;
}

function debugKeyRaw(raw: string, source: string) {
  console.log(`${TAG} === KEY DEBUG (${source}) ===`);
  console.log(`${TAG} raw length: ${raw.length}`);
  console.log(`${TAG} Node.js: ${process.version}`);
  console.log(`${TAG} OpenSSL: ${crypto.constants ? 'available' : 'N/A'}`);

  const hasLiteralBackslashN = raw.includes('\\n');
  const hasLiteralBackslashR = raw.includes('\\r');
  const hasRealNewline = raw.includes('\n');
  const hasRealCarriageReturn = raw.includes('\r');
  const hasQuotes = raw.startsWith('"') || raw.startsWith("'");

  console.log(`${TAG} char analysis: literal\\\\n=${hasLiteralBackslashN} literal\\\\r=${hasLiteralBackslashR} real\\n=${hasRealNewline} real\\r=${hasRealCarriageReturn} startsWithQuote=${hasQuotes}`);

  const nonAscii: number[] = [];
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code > 127 || (code < 32 && code !== 10 && code !== 13)) {
      nonAscii.push(i);
    }
  }
  if (nonAscii.length > 0) {
    console.log(`${TAG} NON-ASCII/CONTROL chars at positions: ${nonAscii.slice(0, 20).map(i => `${i}(U+${raw.charCodeAt(i).toString(16).padStart(4, '0')})`).join(', ')}`);
  } else {
    console.log(`${TAG} no non-ASCII or control characters found`);
  }

  console.log(`${TAG} hex boundary: ${hexDumpBoundary(raw, 'raw')}`);
}

function debugKeyNormalized(normalized: string, source: string) {
  console.log(`${TAG} normalized length: ${normalized.length}`);
  console.log(`${TAG} line count: ${normalized.split('\n').length}`);
  console.log(`${TAG} hex boundary: ${hexDumpBoundary(normalized, 'normalized')}`);

  const lines = normalized.split('\n');
  console.log(`${TAG} line[0]: "${lines[0]}" (len=${lines[0].length})`);
  if (lines.length > 1) {
    console.log(`${TAG} line[1] (first data): "${lines[1].substring(0, 40)}..." (len=${lines[1].length})`);
  }
  console.log(`${TAG} line[last]: "${lines[lines.length - 1]}" (len=${lines[lines.length - 1].length})`);
  if (lines.length > 2) {
    console.log(`${TAG} line[last-1]: "${lines[lines.length - 2]}" (len=${lines[lines.length - 2].length})`);
  }

  const beginIdx = normalized.indexOf('-----BEGIN PRIVATE KEY-----');
  const endIdx = normalized.indexOf('-----END PRIVATE KEY-----');
  console.log(`${TAG} BEGIN position: ${beginIdx}, END position: ${endIdx}`);
  if (beginIdx >= 0 && endIdx > beginIdx) {
    const contentBetween = normalized.substring(beginIdx + '-----BEGIN PRIVATE KEY-----'.length, endIdx).trim();
    console.log(`${TAG} content between headers length: ${contentBetween.length}`);
    const base64chars = contentBetween.replace(/\n/g, '');
    console.log(`${TAG} base64 chars (no newlines) length: ${base64chars.length}`);
    const invalidBase64 = base64chars.match(/[^A-Za-z0-9+/=]/g);
    if (invalidBase64) {
      console.error(`${TAG} INVALID BASE64 CHARACTERS: ${invalidBase64.slice(0, 10).map(c => `U+${c.charCodeAt(0).toString(16)}`).join(', ')}`);
    } else {
      console.log(`${TAG} all base64 chars are valid`);
    }
  }
}

function normalizePemKey(raw: string): string {
  let key = raw;

  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    console.log(`${TAG} stripping surrounding quotes`);
    key = key.slice(1, -1);
  }

  if (key.startsWith('\uFEFF')) {
    console.log(`${TAG} stripping BOM`);
  }
  key = key.replace(/^\uFEFF/, '');

  const before = key.length;
  key = key
    .replace(/\\r\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
  if (key.length !== before) {
    console.log(`${TAG} newline normalization changed length: ${before} -> ${key.length}`);
  }

  key = key.replace(/(-----BEGIN [A-Z ]+-----)\s+/g, '$1\n');
  key = key.replace(/\s+(-----END [A-Z ]+-----)/g, '\n$1');

  return key;
}

function validatePrivateKey(raw: string, source: string): string {
  console.log(`${TAG} --- Validating key from: ${source} ---`);
  debugKeyRaw(raw, source);

  const normalized = normalizePemKey(raw);
  debugKeyNormalized(normalized, source);

  if (!normalized.includes('-----BEGIN PRIVATE KEY-----')) {
    console.error(`${TAG} FAIL: missing PEM header from ${source}`);
    throw new Error(`Invalid private key format from ${source}: missing PEM header`);
  }

  if (!normalized.includes('-----END PRIVATE KEY-----')) {
    console.error(`${TAG} FAIL: missing PEM footer from ${source}`);
    throw new Error(`Invalid private key format from ${source}: missing PEM footer`);
  }

  try {
    const keyObj = crypto.createPrivateKey(normalized);
    console.log(`${TAG} PASS: crypto.createPrivateKey OK (type: ${keyObj.asymmetricKeyType})`);
  } catch (err: any) {
    console.error(`${TAG} FAIL: crypto.createPrivateKey error: ${err.message} (code: ${err.code})`);
    throw new Error(`Private key from ${source} is invalid: ${err.message}`);
  }

  try {
    const keyObj = crypto.createPrivateKey(normalized);
    const testPayload = Buffer.from('test-payload-for-signing');
    const sig = crypto.sign('RSA-SHA256', testPayload, keyObj);
    console.log(`${TAG} PASS: crypto.sign OK (sig length: ${sig.length})`);
  } catch (err: any) {
    console.error(`${TAG} FAIL: crypto.sign error: ${err.message}`);
    throw new Error(`Private key from ${source} cannot sign: ${err.message}`);
  }

  return normalized;
}

async function getClient(businessId: string): Promise<{ sheets: any; config: GoogleSheetsConfig }> {
  const db = supabaseAdmin();
  console.log(`${TAG} getClient called for businessId: ${businessId}`);

  const { data: integration, error: intErr } = await db
    .from('business_integrations')
    .select('config')
    .eq('business_id', businessId)
    .eq('type', 'google_sheets')
    .eq('is_enabled', true)
    .maybeSingle();

  if (intErr) console.error(`${TAG} business_integrations query error:`, intErr.message);

  let config = (integration?.config as unknown as GoogleSheetsConfig) || {};
  let keySource = 'business_integration';

  if (!config.client_email || !config.private_key) {
    const { data: globalSettings, error: gsErr } = await db
      .from('system_settings')
      .select('value')
      .eq('id', 'integrations_global')
      .maybeSingle();

    if (gsErr) console.error(`${TAG} system_settings query error:`, gsErr.message);

    const globalConfig = (globalSettings?.value as any)?.google_sheets || {};
    const hasGlobalSA = !!globalConfig.default_service_account?.private_key;
    const hasEnvVar = !!process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    if (config.private_key) {
      keySource = 'business_integration';
    } else if (hasGlobalSA) {
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

  if (!config.client_email || !config.private_key) {
    const missing = [];
    if (!config.client_email) missing.push('client_email');
    if (!config.private_key) missing.push('private_key');
    throw new Error(`Google Sheets integration is not fully configured. Missing: ${missing.join(', ')}`);
  }

  const isEncrypted = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(config.private_key);

  let privateKeyRaw: string;
  try {
    privateKeyRaw = isEncrypted ? decrypt(config.private_key) : config.private_key;
    if (isEncrypted) {
      keySource += ' (decrypted)';
    }
  } catch (decryptErr: any) {
    throw new Error(`Failed to decrypt private key: ${decryptErr.message}`);
  }

  let privateKey: string;
  try {
    privateKey = validatePrivateKey(privateKeyRaw, keySource);
  } catch (validationErr: any) {
    const envKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    if (envKey && envKey !== config.private_key) {
      try {
        privateKey = validatePrivateKey(envKey, 'env_var_fallback');
      } catch (fallbackErr: any) {
        throw validationErr;
      }
    } else {
      throw validationErr;
    }
  }

  const auth = new google.auth.JWT({
    email: config.client_email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  await auth.getAccessToken();

  return {
    sheets: google.sheets({ version: 'v4', auth }),
    config
  };
}

/**
 * Fetch all enabled spreadsheets for a business from the new table.
 */
export async function getBusinessSpreadsheets(businessId: string): Promise<BusinessSpreadsheet[]> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from('business_spreadsheets')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_enabled', true)
    .order('name');

  if (error) {
    console.error(`${TAG} getBusinessSpreadsheets error:`, error.message);
    return [];
  }
  return data || [];
}

/**
 * Find a row by searching a column for a specific value.
 * @param spreadsheetId - Optional. If not provided, uses the first enabled spreadsheet from the new table.
 */
export async function lookupRow(businessId: string, sheetName: string, searchColumn: string, searchValue: string, spreadsheetId?: string) {
  const { sheets } = await getClient(businessId);

  let targetSpreadsheetId = spreadsheetId;

  if (!targetSpreadsheetId) {
    const spreadsheets = await getBusinessSpreadsheets(businessId);
    if (spreadsheets.length > 0) {
      targetSpreadsheetId = spreadsheets[0].spreadsheet_id;
    } else {
      const db = supabaseAdmin();
      const { data: integration } = await db
        .from('business_integrations')
        .select('config')
        .eq('business_id', businessId)
        .eq('type', 'google_sheets')
        .eq('is_enabled', true)
        .maybeSingle();
      const cfg = (integration?.config as any) || {};
      if (!cfg.spreadsheet_id) throw new Error('No spreadsheets configured for this business');
      targetSpreadsheetId = cfg.spreadsheet_id;
    }
  }

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: targetSpreadsheetId,
    range: `${sheetName}!A1:Z1000`,
  });

  const rows = response.data.values;
  if (!rows || rows.length === 0) return null;

  const header = rows[0];
  const colIndex = header.indexOf(searchColumn);
  if (colIndex === -1) throw new Error(`Column "${searchColumn}" not found in sheet "${sheetName}"`);

  const foundRow = rows.find((r: any) => String(r[colIndex]).toLowerCase() === String(searchValue).toLowerCase());
  if (!foundRow) return null;

  const result: Record<string, string> = {};
  header.forEach((h: any, i: any) => {
    result[h] = foundRow[i] ?? '';
  });

  return result;
}

/**
 * Search all enabled spreadsheets for AI tool calling.
 * Returns results tagged with the spreadsheet name so the AI knows which data came from where.
 */
export async function searchSheets(businessId: string, query: string) {
  try {
    const { sheets } = await getClient(businessId);
    const spreadsheets = await getBusinessSpreadsheets(businessId);

    // Fallback: if no spreadsheets in the new table, try the old integration config
    if (spreadsheets.length === 0) {
      const db = supabaseAdmin();
      const { data: integration } = await db
        .from('business_integrations')
        .select('config')
        .eq('business_id', businessId)
        .eq('type', 'google_sheets')
        .eq('is_enabled', true)
        .maybeSingle();
      const cfg = (integration?.config as any) || {};
      if (cfg.spreadsheet_id) {
        return await searchSingleSheet(sheets, cfg.spreadsheet_id, cfg.reference_column, cfg.return_columns, query, cfg.sheet_name || 'Sheet1');
      }
      return "No spreadsheets are configured. Ask the business owner to add spreadsheets in Settings > Integrations.";
    }

    void logHttpEvent({
      businessId,
      direction: 'system',
      service: 'google-sheets',
      endpoint: 'searchSheets',
      payload: { query, spreadsheets: spreadsheets.map(s => ({ name: s.name, id: s.spreadsheet_id, sheet: s.sheet_name || 'Sheet1', ref_col: s.reference_column })) },
      note: `searching ${spreadsheets.length} spreadsheet(s)`,
    });

    const allResults: string[] = [];
    for (const sheet of spreadsheets) {
      const result = await searchSingleSheet(
        sheets,
        sheet.spreadsheet_id,
        sheet.reference_column,
        sheet.return_columns || undefined,
        query,
        sheet.sheet_name || 'Sheet1',
        sheet.name
      );
      allResults.push(result);
    }

    const noMatchPrefix = `No matches found for "${query}"`;
    const allNoMatch = allResults.every(r => r.includes(noMatchPrefix));
    if (allNoMatch) {
      return `No records found matching "${query}".`;
    }

    return allResults.join('\n\n=====\n\n');
  } catch (err: any) {
    console.error(`${TAG} searchSheets FAILED:`, {
      message: err.message,
      code: err.code,
      name: err.name,
    });
    return `Error searching spreadsheets: ${err.message}`;
  }
}

async function searchSingleSheet(
  sheets: any,
  spreadsheetId: string,
  referenceColumn: string | undefined,
  returnColumns: string | undefined,
  query: string,
  sheetName: string,
  spreadsheetName?: string
): Promise<string> {
  try {
    const range = `${sheetName}!A:Z`;
    void logHttpEvent({
      direction: 'system',
      service: 'google-sheets',
      endpoint: 'searchSingleSheet',
      payload: { spreadsheetId, spreadsheetName, sheetName, range, query },
      note: `querying "${spreadsheetName || spreadsheetId}"`,
    });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) return `[${spreadsheetName || spreadsheetId}] Spreadsheet is empty.`;

    const header = rows[0];
    const refCol = referenceColumn?.trim();
    const retColsRaw = returnColumns?.trim();

    let refColIndex = -1;
    if (refCol) {
      refColIndex = header.findIndex((h: any) => String(h).toLowerCase() === refCol.toLowerCase());
    }

    const results = rows.slice(1).filter((row: any) => {
      if (refColIndex !== -1) {
        const cellValue = row[refColIndex];
        return cellValue !== undefined && String(cellValue).toLowerCase().includes(query.toLowerCase());
      } else {
        return row.some((cell: any) => String(cell).toLowerCase().includes(query.toLowerCase()));
      }
    });

    void logHttpEvent({
      direction: 'system',
      service: 'google-sheets',
      endpoint: 'searchSingleSheet',
      payload: { spreadsheetName, rowsReturned: rows?.length, refColIndex, matchedRows: results.length, query, refCol },
      note: `matched ${results.length} of ${rows?.length ?? 0} rows in "${spreadsheetName || spreadsheetId}"`,
    });

    if (results.length === 0) {
      return `[${spreadsheetName || sheetName}] No matches found for "${query}".`;
    }

    let columnsToReturn: string[] = [];
    if (retColsRaw) {
      columnsToReturn = retColsRaw.split(',').map(c => c.trim().toLowerCase());
    }

    const formatted = results.slice(0, 5).map((row: any) => {
      return header
        .map((h: any, i: any) => {
          const isAllowed = columnsToReturn.length === 0 || columnsToReturn.includes(String(h).trim().toLowerCase());
          if (!isAllowed) return null;
          return `${h}: ${row[i] ?? ''}`;
        })
        .filter((val: any) => val !== null)
        .join(', ');
    }).join('\n---\n');

    const label = spreadsheetName || sheetName;
    return `Spreadsheet "${label}":\n${formatted}`;
  } catch (err: any) {
    return `[${spreadsheetName || spreadsheetId}] Error: ${err.message}`;
  }
}
