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

async function getClient(businessId: string) {
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
  console.log(`${TAG} business integration: has_client_email=${!!config.client_email} has_private_key=${!!config.private_key} has_spreadsheet_id=${!!config.spreadsheet_id}`);

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
    console.log(`${TAG} fallback check: global_settings_exists=${!!globalSettings} has_global_sa=${hasGlobalSA} has_env_var=${hasEnvVar}`);

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

  console.log(`${TAG} resolved key source: ${keySource}`);
  console.log(`${TAG} config: client_email=${config.client_email} spreadsheet_id=${config.spreadsheet_id} private_key_length=${config.private_key?.length}`);

  if (!config.client_email || !config.private_key || !config.spreadsheet_id) {
    const missing = [];
    if (!config.client_email) missing.push('client_email');
    if (!config.private_key) missing.push('private_key');
    if (!config.spreadsheet_id) missing.push('spreadsheet_id');
    console.error(`${TAG} incomplete config, missing: ${missing.join(', ')}`);
    throw new Error(`Google Sheets integration is not fully configured. Missing: ${missing.join(', ')}`);
  }

  const isEncrypted = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(config.private_key);
  console.log(`${TAG} key encrypted: ${isEncrypted}`);

  let privateKeyRaw: string;
  try {
    privateKeyRaw = isEncrypted ? decrypt(config.private_key) : config.private_key;
    if (isEncrypted) {
      keySource += ' (decrypted)';
      console.log(`${TAG} decryption OK, decrypted length: ${privateKeyRaw.length}`);
    }
  } catch (decryptErr: any) {
    console.error(`${TAG} decryption FAILED: ${decryptErr.message}`);
    throw new Error(`Failed to decrypt private key: ${decryptErr.message}`);
  }

  let privateKey: string;
  try {
    privateKey = validatePrivateKey(privateKeyRaw, keySource);
  } catch (validationErr: any) {
    console.warn(`${TAG} primary key failed: ${validationErr.message}`);
    const envKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    const envClientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    if (envKey && envKey !== config.private_key) {
      console.warn(`${TAG} falling back to env var key (length: ${envKey.length})`);
      try {
        privateKey = validatePrivateKey(envKey, 'env_var_fallback');
        config.client_email = config.client_email || envClientEmail || '';
      } catch (fallbackErr: any) {
        console.error(`${TAG} env var fallback also FAILED: ${fallbackErr.message}`);
        throw validationErr;
      }
    } else {
      throw validationErr;
    }
  }

  console.log(`${TAG} creating JWT auth client...`);
  const auth = new google.auth.JWT({
    email: config.client_email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  console.log(`${TAG} JWT auth client created, attempting to get a token to verify...`);
  try {
    const token = await auth.getAccessToken();
    console.log(`${TAG} PASS: JWT token obtained successfully`);
  } catch (tokenErr: any) {
    console.error(`${TAG} FAIL: JWT getAccessToken error: ${tokenErr.message}`);
    if (tokenErr.response?.data) {
      console.error(`${TAG} token error response:`, JSON.stringify(tokenErr.response.data));
    }
    throw tokenErr;
  }

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
    console.error(`${TAG} searchSheets FAILED:`, {
      message: err.message,
      code: err.code,
      name: err.name,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
    });
    await logHttpEvent({
      businessId,
      direction: 'system',
      service: 'google_sheets',
      endpoint: 'searchSheets',
      payload: { error: err.message, code: err.code, name: err.name, stack: err.stack },
      note: `Error: ${err.message}`,
    });
    return `Error searching spreadsheet: ${err.message}`;
  }
}
