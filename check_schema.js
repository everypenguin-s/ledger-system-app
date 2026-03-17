import { createClient } from '@supabase/supabase-js';

async function checkSchemaAndData() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  console.log('--- Table: logs ---');
  const { data: logSample, error: logError } = await supabase.from('logs').select('*').limit(1);
  if (logError) console.error('logs error:', logError);
  else console.log('Columns:', Object.keys(logSample[0] || {}));

  console.log('\n--- Table: employees ---');
  const { data: empSample, error: empError } = await supabase.from('employees').select('*').limit(1);
  if (empError) console.error('employees error:', empError);
  else console.log('Columns:', Object.keys(empSample[0] || {}));
  
  // Try to find if there is an import in progress or recently failed
  // Since we don't know the date column name for sure, let's just get the last 5 logs if possible
  if (logSample && logSample.length > 0) {
      const { data: recentLogs } = await supabase.from('logs').select('*').limit(5); // No order yet
      console.log('\nRecent Logs (unordered):', JSON.stringify(recentLogs, null, 2));
  }
}

checkSchemaAndData();
