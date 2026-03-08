import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function checkStatus() {
    const email = 'otavioantonio.rocha@gmail.com';
    console.log(`Checking registrations for: ${email}`);

    const { data: regs, error } = await supabase
        .from('registrations')
        .select('id, payment_status, payment_id, created_at, athlete_name')
        .eq('athlete_email', email)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    console.log("Registrations found in DB:", regs);

    if (regs && regs.length > 0) {
        const asaasKey = process.env.VITE_ASAAS_API_KEY;
        const baseUrl = asaasKey.startsWith('$aact_hmlg_') ? 'https://api-sandbox.asaas.com/v3' : 'https://api.asaas.com/v3';

        for (const reg of regs) {
            console.log(`\nChecking Asaas for externalReference=${reg.id}`);
            try {
                const res = await fetch(`${baseUrl}/payments?externalReference=${reg.id}`, {
                    headers: { 'access_token': asaasKey }
                });
                const data = await res.json();
                console.log("Asaas response (by externalReference):", data.data?.map(p => ({ id: p.id, status: p.status, value: p.value })));
            } catch (err) {
                console.error("Asaas API Error:", err);
            }

            if (reg.payment_id) {
                console.log(`\nChecking Payments Table for payment_id=${reg.payment_id}`);
                const { data: pData } = await supabase.from('payments').select('*').eq('id', reg.payment_id).single();
                console.log("Payment record in DB:", pData ? { id: pData.id, status: pData.status, asaas_id: pData.asaas_payment_id } : 'Not found');

                if (pData && pData.asaas_payment_id) {
                    console.log(`\nChecking Asaas for payment ID=${pData.asaas_payment_id}`);
                    try {
                        const res2 = await fetch(`${baseUrl}/payments/${pData.asaas_payment_id}`, {
                            headers: { 'access_token': asaasKey }
                        });
                        const data2 = await res2.json();
                        if (data2 && !data2.errors) {
                            console.log("Asaas response (by ID):", { id: data2.id, status: data2.status, value: data2.value });
                        } else {
                            console.log("Asaas response (by ID):", data2);
                        }
                    } catch (err) {
                        console.error("Asaas API Error (by ID):", err);
                    }
                }
            }
        }
    }
}

checkStatus();
