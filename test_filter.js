import { createClient } from '@supabase/supabase-js';

async function testListUsersFilter() {
  const url = 'https://imogixajsqkatoixkwlc.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imltb2dpeGFqc3FrYXRvaXhrd2xjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ5MTMxMywiZXhwIjoyMDgxMDY3MzEzfQ.oAgev4qVpElBeCHrTO6cZhL0A1ZZSkxlu_M1otPlKQ0';

  const supabase = createClient(url, key);

  const email = 'tsukasa-nishiwaki@everygroup.co.jp'; 
  console.log(`Testing listUsers with email filter for: ${email}`);

  // Some versions of gotrue-js support passing extra options to listUsers
  // Check if we can pass a filter or if there's a specific format
  try {
    // Attempt 1: standard listUsers
    const res1 = await supabase.auth.admin.listUsers();
    console.log('listUsers keys:', Object.keys(res1.data || {}));

    // Attempt 2: searching by email if supported (some versions have this)
    // Actually, in some versions of Supabase SDK, you can't filter listUsers server-side easily.
    
    // Let's try to see if listUsers can take more than page/perPage
    // I'll just check if there's any other method like 'searchUsers' or similar
  } catch (e) {
    console.error('Error:', e);
  }
}

testListUsersFilter();
