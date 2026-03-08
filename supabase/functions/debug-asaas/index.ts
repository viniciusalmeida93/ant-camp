import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
        if (!asaasApiKey) {
            throw new Error("Missing ASAAS_API_KEY");
        }

        const baseUrl = asaasApiKey.startsWith("$aact_hmlg_") ? "https://api-sandbox.asaas.com/v3" : "https://api.asaas.com/v3";

        // Busca os 50 últimos pagamentos iterando até achar Sabooor ou o id TheUserGave
        const response = await fetch(`${baseUrl}/payments?limit=50`, {
            headers: {
                "access_token": asaasApiKey,
            }
        });

        const data = await response.json();

        if (data.errors) {
            return new Response(JSON.stringify(data), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const found = data.data.filter((p: any) =>
            p.invoiceNumber === "754804970" ||
            (p.description && p.description.includes("Sabooor")) ||
            (p.customerName && p.customerName.includes("Sabooor")) ||
            (p.externalReference && p.externalReference.includes("48f152f2"))
        );

        return new Response(JSON.stringify({
            message: "Debug Asaas",
            allRecordsPeek: data.data.slice(0, 3).map((p: any) => ({ desc: p.description, inv: p.invoiceNumber, ext: p.externalReference, status: p.status, val: p.value })),
            found_in_last_50: found
        }, null, 2), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
