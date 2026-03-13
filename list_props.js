import { createClient } from '@supabase/supabase-js';

async function listAllProps() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  console.log('--- Admin Auth Properties (including Prototype) ---');
  const admin = supabase.auth.admin;
  const props = [];
  for (const prop in admin) {
    props.push(prop);
  }
  console.log(props.join(', '));
  
  // Try calling listUsers with a filter if it supports it
  console.log('\n--- Testing listUsers structure ---');
  const { data, error } = await admin.listUsers({ page: 1, perPage: 1 });
  if (data && data.users && data.users[0]) {
      console.log('User keys:', Object.keys(data.users[0]).join(', '));
  }
}

listAllProps();
