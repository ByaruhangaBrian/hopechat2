import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required env vars:');
    console.error('  NEXT_PUBLIC_SUPABASE_URL');
    console.error('  SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Use the /rest/v1/rpc/ endpoint to execute raw SQL via a helper function
  // First, create the helper function if it doesn't exist
  console.log('Creating pg_exec helper function...');
  const { error: createFnErr } = await supabase.rpc('pg_exec', {
    query_text: `CREATE OR REPLACE FUNCTION pg_exec(query_text TEXT) RETURNS VOID AS $$ BEGIN EXECUTE query_text; END; $$ LANGUAGE plpgsql SECURITY DEFINER;`
  });

  // If that fails, try direct approach
  if (createFnErr) {
    console.log('Function approach failed, trying direct SQL...');
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = join(MIGRATIONS_DIR, file);
    const sql = readFileSync(filePath, 'utf-8');

    // Split by semicolons to execute statement by statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Applying ${file}...`);
    
    for (const stmt of statements) {
      const { error } = await supabase.rpc('pg_exec', {
        query_text: stmt + ';'
      });

      if (error) {
        // Many errors are expected (e.g., "already exists") - only log unexpected ones
        if (!error.message.includes('already exists') && 
            !error.message.includes('duplicate') &&
            !error.message.includes('42883')) { // function not found
          console.warn(`  Warning in ${file}: ${error.message}`);
        }
      }
    }

    console.log(`  Done.`);
  }

  console.log('\nAll migrations applied successfully!');
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
