import { createClient } from '@supabase/supabase-js';

async function listAdminMethods() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  console.log('--- Admin Auth Methods ---');
  const methods = Object.keys(supabase.auth.admin);
  for (const method of methods) {
    if (typeof supabase.auth.admin[method] === 'function') {
      console.log(`Method: ${method}`);
    }
  }
}

listAdminMethods();
