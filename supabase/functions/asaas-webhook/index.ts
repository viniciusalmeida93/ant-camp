import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const webhookData = await req.json();
    console.log("Webhook received:", JSON.stringify(webhookData));

    const { event, payment } = webhookData;

    if (!payment || !payment.id) {
      return new Response(JSON.stringify({ message: "Ignored: No payment data" }), { status: 200, headers: corsHeaders });
    }

    // Find payment by Asaas ID
    const { data: paymentRecord, error: findError } = await supabase
      .from("payments")
      .select("*, registrations(*)")
      .eq("asaas_payment_id", payment.id)
      .maybeSingle();

    if (findError) {
      console.error("Error finding payment:", findError);
      return new Response(JSON.stringify({ error: "Database error" }), { status: 500, headers: corsHeaders });
    }

    if (!paymentRecord) {
      console.warn("Payment not found in database:", payment.id);
      // Return 200 to acknowledge webhook (otherwise Asaas keeps retrying)
      return new Response(JSON.stringify({ message: "Payment not found locally, ignored." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle different webhook events
    let newStatus = paymentRecord.status;
    let registrationStatus = paymentRecord.registrations?.payment_status;
    let paidAt = paymentRecord.approved_at;

    let shouldUpdate = false;

    switch (event) {
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED":
        newStatus = "approved";
        registrationStatus = "approved";
        paidAt = new Date().toISOString();
        shouldUpdate = true;
        break;
      case "PAYMENT_OVERDUE":
        registrationStatus = "expired";
        shouldUpdate = true;
        break;
      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED":
        newStatus = "refunded";
        registrationStatus = "refunded";
        shouldUpdate = true;
        break;
    }

    if (shouldUpdate) {
      // Update payment status
      await supabase
        .from("payments")
        .update({
          status: newStatus,
          approved_at: paidAt,
          metadata: { ...paymentRecord.metadata, lastWebhookEvent: event, webhookPayload: webhookData },
        })
        .eq("id", paymentRecord.id);

      // Update registration status
      await supabase
        .from("registrations")
        .update({
          payment_status: registrationStatus,
          paid_at: paidAt
        })
        .eq("id", paymentRecord.registration_id);

      console.log(`Updated Payment ${paymentRecord.id} and Registration ${paymentRecord.registration_id} to status: ${registrationStatus}`);

      // If approved, trigger email logic (optional, call another function or let triggers handle it)
      if (registrationStatus === 'approved' && paymentRecord.registrations?.payment_status !== 'approved') {
        // Logic to send confirmation email
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-registration-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ registrationId: paymentRecord.registration_id })
          });
        } catch (e) {
          console.error("Failed to trigger email function:", e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in asaas-webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});