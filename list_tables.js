import { createClient } from '@supabase/supabase-js';

async function listAllTables() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  // Query to list tables in public schema
  const { data, error } = await supabase.rpc('get_table_names'); // If this RPC exists
  
  if (error) {
    // Alternate: query from information_schema if possible (often blocked)
    // Try to select count from various possible names
    const suspects = ['employees', 'staff', 'users_master', 'm_employee', 'logs', 'audit_logs'];
    for (const name of suspects) {
      const { count, error: err } = await supabase.from(name).select('*', { count: 'exact', head: true });
      console.log(`Table '${name}': ${err ? 'Error (' + err.message + ')' : count + ' rows'}`);
    }
  } else {
    console.log('Tables:', data);
  }
}

listAllTables();
