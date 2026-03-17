import { createClient } from '@supabase/supabase-js';

async function checkImportLogs() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  // Check logs table
  const { data: logs, error: logsError } = await supabase
    .from('logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (logsError) {
      console.error('Logs Error:', logsError);
  } else {
      console.log('Recent 20 Logs:');
      console.log(JSON.stringify(logs, null, 2));
  }

  // Check most recent 5 employees
  const { data: emps, error: empsError } = await supabase
    .from('employees')
    .select('employee_code, name, email, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (empsError) {
      console.error('Emps Error:', empsError);
  } else {
      console.log('Recent 5 Employees:');
      console.log(JSON.stringify(emps, null, 2));
  }
}

checkImportLogs();
