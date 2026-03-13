import { createClient } from '@supabase/supabase-js';

async function checkUserOrder() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  console.log('--- Checking first page of users (perPage: 5) ---');
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 5 });
  if (users) {
    users.forEach((u, i) => console.log(`${i}: ${u.email} created at ${u.created_at}`));
  }
}

checkUserOrder();
