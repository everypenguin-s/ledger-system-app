import { createClient } from '@supabase/supabase-js';

async function checkDetailedIntegrity() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  console.log('Fetching all database auth_ids...');
  const dbAuthIds = new Set();
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.from('employees').select('auth_id').range(offset, offset + 1000);
    if (error || !data || data.length === 0) break;
    data.forEach(d => { if (d.auth_id) dbAuthIds.add(d.auth_id); });
    if (data.length < 1000) break;
    offset += 1000;
  }
  console.log(`Unique auth_ids in DB: ${dbAuthIds.size}`);

  console.log('Fetching all Auth users...');
  const authUsers = [];
  let page = 1;
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !users || users.length === 0) break;
    authUsers.push(...users);
    if (users.length < 1000) break;
    page++;
  }
  console.log(`Total Auth users: ${authUsers.length}`);

  const authIds = new Set(authUsers.map(u => u.id));

  // Find orphans
  const dbWithoutAuth = [...dbAuthIds].filter(id => !authIds.has(id));
  const authWithoutDb = authUsers.filter(u => !dbAuthIds.has(u.id));

  console.log(`\nResults:`);
  console.log(`DB records referencing non-existent Auth IDs: ${dbWithoutAuth.length}`);
  console.log(`Auth users not referenced in DB: ${authWithoutDb.length}`);

  if (authWithoutDb.length > 0) {
      console.log('Samples of Auth orphans (first 5):');
      console.log(JSON.stringify(authWithoutDb.slice(0, 5).map(u => ({ id: u.id, email: u.email, meta: u.user_metadata })), null, 2));
  }
}

checkDetailedIntegrity();
