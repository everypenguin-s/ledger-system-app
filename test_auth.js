import { createClient } from '@supabase/supabase-js';

async function testGetUserByEmail() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  const email = 'tsukasa-nishiwaki@everygroup.co.jp'; 
  console.log(`Testing getUserByEmail for: ${email}`);

  try {
    const { data, error } = await supabase.auth.admin.getUserByEmail(email);
    
    if (error) {
       console.error('Error from getUserByEmail:', error);
    } else {
       console.log('Success! User found:', data.user.id);
    }
  } catch (e) {
    console.error('Exception calling getUserByEmail:', e);
  }
}

testGetUserByEmail();
