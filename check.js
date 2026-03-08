const dotenv = require('dotenv');
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function run() {
    const res = await fetch(`${url}/rest/v1/payments?select=id,status,asaas_payment_id,created_at&order=created_at.desc&limit=5`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log('Payments:', await res.json());

    const res2 = await fetch(`${url}/rest/v1/registrations?select=id,payment_status,athlete_name,created_at&order=created_at.desc&limit=5`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log('Regs:', await res2.json());
}
run();
