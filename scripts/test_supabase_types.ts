
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testQueryBuilder() {
    const qb = supabase.from('routers');
    console.log('QueryBuilder methods:', Object.keys(qb));
    
    const fb = qb.select('id');
    console.log('FilterBuilder methods:', Object.keys(fb));
    
    try {
        (qb as any).order('no');
        console.log('QueryBuilder has order');
    } catch (e) {
        console.log('QueryBuilder does NOT have order');
    }

    try {
        (fb as any).order('no');
        console.log('FilterBuilder has order');
    } catch (e) {
        console.log('FilterBuilder does NOT have order');
    }
}

testQueryBuilder();
