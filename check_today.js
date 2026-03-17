import { createClient } from '@supabase/supabase-js';

async function checkTodayData() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  // Today's date (UTC approach or simple string)
  const today = '2026-03-13';

  console.log('--- Employees created today ---');
  const { data: emps, count } = await supabase
    .from('employees')
    .select('employee_code, name, email, created_at', { count: 'exact' })
    .gte('created_at', today);
  
  console.log(`Count: ${count}`);
  console.log('Samples:', JSON.stringify(emps, null, 2));

  console.log('\n--- Logs recorded today ---');
  // Use 'logs' table as identified before
  const { data: logs } = await supabase
    .from('logs')
    .select('*')
    .gte('created_at', today)
    .limit(10);
    
  console.log('Logs:', JSON.stringify(logs, null, 2));
}

checkTodayData();
