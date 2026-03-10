import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.log("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDelete() {
    const { data, error } = await supabase.auth.admin.deleteUser("2112c3f8-8ed2-4b2a-aec5-b4cbe54f59fc");
    if (error) {
        console.error("EXACT ERROR:", JSON.stringify(error, null, 2));
    } else {
        console.log("Success:", data);
    }
}

testDelete();
