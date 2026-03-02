import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const asaasApiKey = Deno.env.get("ASAAS_API_KEY");

        if (!supabaseUrl || !supabaseKey || !asaasApiKey) {
            throw new Error("Missing environment variables");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const getAsaasBaseUrl = (key: string) => {
            if (key?.startsWith("$aact_hmlg_")) return "https://api-sandbox.asaas.com/v3";
            return "https://api.asaas.com/v3";
        };

        const baseUrl = getAsaasBaseUrl(asaasApiKey);

        console.log("Starting reconciliation process...");

        // Buscar inscrições pendentes
        const { data: pendingRegs, error: fetchError } = await supabase
            .from("registrations")
            .select("id, payment_status, payment_id")
            .eq("payment_status", "pending")
            .order("created_at", { ascending: false })
            .limit(50); // Lote de 50 para evitar timeout

        if (fetchError) throw fetchError;

        if (!pendingRegs || pendingRegs.length === 0) {
            return new Response(JSON.stringify({ message: "No pending registrations found.", reconciled: 0 }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        console.log(`Found ${pendingRegs.length} pending registrations.`);

        let reconciledCount = 0;
        const results = [];

        for (const reg of pendingRegs) {
            try {
                console.log(`Checking registration: ${reg.id}`);
                // Consultar Asaas via externalReference
                const response = await fetch(`${baseUrl}/payments?externalReference=${reg.id}`, {
                    headers: {
                        "access_token": asaasApiKey,
                        "Content-Type": "application/json"
                    }
                });

                const data = await response.json();

                if (data.data && data.data.length > 0) {
                    // Pega o pagamento mais recente retornado pelo Asaas
                    const asaasPayment = data.data[0];

                    if (asaasPayment.status === "CONFIRMED" || asaasPayment.status === "RECEIVED") {
                        console.log(`Registration ${reg.id} is PAID in Asaas. Updating Database...`);

                        const paidAt = asaasPayment.paymentDate || asaasPayment.creditDate || new Date().toISOString();

                        // Atualiza a Inscrição
                        await supabase
                            .from("registrations")
                            .update({ payment_status: "approved", paid_at: paidAt })
                            .eq("id", reg.id);

                        // Atualiza a tabela Payments (pelo ID do asaas no banco ou pelo registration_id)
                        if (reg.payment_id) {
                            await supabase
                                .from("payments")
                                .update({ status: "approved", approved_at: paidAt, asaas_payment_id: asaasPayment.id })
                                .eq("id", reg.payment_id);
                        } else {
                            // Tenta atualizar caso não esteja linkado diretamente
                            await supabase
                                .from("payments")
                                .update({ status: "approved", approved_at: paidAt, asaas_payment_id: asaasPayment.id })
                                .eq("registration_id", reg.id)
                                .is("status", "pending");
                        }

                        reconciledCount++;
                        results.push({ id: reg.id, asaas_id: asaasPayment.id, new_status: "approved" });
                    } else {
                        results.push({ id: reg.id, asaas_status: asaasPayment.status });
                    }
                } else {
                    results.push({ id: reg.id, error: "not_found_in_asaas" });
                }
            } catch (err: any) {
                console.error(`Error reconciling registration ${reg.id}:`, err);
                results.push({ id: reg.id, error: err.message });
            }
        }

        return new Response(JSON.stringify({
            success: true,
            message: "Reconciliation complete",
            totalChecked: pendingRegs.length,
            reconciled: reconciledCount,
            details: results
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        console.error("Reconciliation critical error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
