import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { paymentId } = await req.json();

    // Get payment from database
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error("Payment not found");
    }

    // Check if Asaas is configured
    const asaasApiKey = Deno.env.get("ASAAS_API_KEY");
    const useMockPayment = !asaasApiKey || asaasApiKey === "mock";

    const getAsaasBaseUrl = () => {
      if (asaasApiKey?.startsWith("$aact_hmlg_")) {
        return "https://api-sandbox.asaas.com/v3";
      }
      return "https://api.asaas.com/v3";
    };

    let status = payment.status;

    if (!useMockPayment && payment.asaas_payment_id) {
      // Fetch real status from Asaas
      const baseUrl = getAsaasBaseUrl();
      const asaasResponse = await fetch(
        `${baseUrl}/payments/${payment.asaas_payment_id}`,
        {
          headers: {
            "access_token": asaasApiKey ?? "",
          },
        }
      );

      if (asaasResponse.ok) {
        const asaasData = await asaasResponse.json();

        // Map Asaas status to our status
        const statusMap: Record<string, string> = {
          PENDING: "pending",
          RECEIVED: "approved",
          CONFIRMED: "approved",
          OVERDUE: "pending",
          REFUNDED: "refunded",
          CANCELLED: "cancelled",
        };

        status = statusMap[asaasData.status] || "pending";

        // Update payment in database
        await supabase
          .from("payments")
          .update({ status })
          .eq("id", paymentId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        status,
        payment
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in check-payment-status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});