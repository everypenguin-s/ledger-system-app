import { createClient } from '@supabase/supabase-js';

async function checkIntegrity() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  // Count employees
  const { count: empCount, error: empError } = await supabase
    .from('employees')
    .select('*', { count: 'exact', head: true });

  if (empError) {
      console.error('Emp count error:', empError);
  }

  // Count auth users
  let authCount = 0;
  let page = 1;
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !users || users.length === 0) break;
    authCount += users.length;
    if (users.length < 1000) break;
    page++;
  }

  console.log(`Integrity Check:`);
  console.log(`Employees in DB: ${empCount}`);
  console.log(`Users in Auth: ${authCount}`);
  
  // Recent audit logs for employee insert/update
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('target_type', 'employees')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log('Recent Audit Logs (Employees):');
  console.log(JSON.stringify(logs, null, 2));
}

checkIntegrity();
