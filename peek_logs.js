import { createClient } from '@supabase/supabase-js';

async function peekLogs() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  const { data, error } = await supabase.from('logs').select('*').limit(1);
  
  if (error) {
    console.error('Error peeking logs:', error);
  } else {
    if (data && data.length > 0) {
        console.log('Log Columns:', Object.keys(data[0]).join(', '));
    } else {
        console.log('No logs found, trying head only');
        const { data: head, error: headError } = await supabase.from('logs').select('*', { count: 'exact', head: true });
        console.log('Logs head result:', headError || 'Table exists');
    }
  }
}

peekLogs();
