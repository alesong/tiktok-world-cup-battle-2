import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

export const initDb = async () => {
  const { error } = await supabase.from('twc_settings').select('key', { count: 'exact', head: true }).limit(1);

  if (error) {
    if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
      console.error('Tables not found. Run backend/supabase-migration.sql in the Supabase SQL Editor first.');
    } else {
      console.error('Supabase connection error:', error.message);
    }
    process.exit(1);
  }

  console.log('Supabase database initialized successfully (twc_ tables).');
};
