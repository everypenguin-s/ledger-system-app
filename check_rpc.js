import { createClient } from '@supabase/supabase-js';

async function listRPCs() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  // Try to find a user by email via a custom RPC if it exists
  // common names: get_user_by_email, search_users, etc.
  const suspects = ['get_user_by_email', 'search_users', 'get_auth_user_by_email'];
  for (const rpc of suspects) {
    const { data, error } = await supabase.rpc(rpc, { email: 'test@example.com' });
    console.log(`RPC '${rpc}': ${error ? 'Error (' + error.message + ')' : 'Found!'}`);
  }
}

listRPCs();
