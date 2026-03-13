import { createClient } from '@supabase/supabase-js';

async function peekEmployee() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  const { data, error } = await supabase.from('employees').select('*').limit(1).single();
  
  if (error) {
    console.error('Error peeking employee:', error);
  } else {
    console.log('Employee Columns and Sample values:');
    console.log(JSON.stringify(data, null, 2));
  }
}

peekEmployee();
