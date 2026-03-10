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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const webhookData = await req.json();
    const { event, payment } = webhookData;

    console.log('🔔 WEBHOOK RECEBIDO DO ASAAS:');
    console.log('  - Event:', event);
    console.log('  - Payment ID:', payment?.id);
    console.log('  - Status:', payment?.status);
    console.log('  - External Reference:', payment?.externalReference);

    if (!payment || !payment.id) {
      return new Response(JSON.stringify({ message: "Ignored: No payment data" }), { status: 200, headers: corsHeaders });
    }

    // Find payment by Asaas ID or External Reference
    let paymentRecord;
    let registrationRecord;

    const { data: byAsaasId, error: findError } = await supabase
      .from("payments")
      .select("*, registrations(*)")
      .eq("asaas_payment_id", payment.id)
      .maybeSingle();

    if (findError) {
      console.error("Error finding payment by Asaas ID:", findError);
    }

    if (byAsaasId) {
      paymentRecord = byAsaasId;
      registrationRecord = byAsaasId.registrations;
    } else if (payment.externalReference) {
      // Tenta buscar o pagamento mais recente daquela inscrição
      const { data: byRef } = await supabase
        .from("payments")
        .select("*, registrations(*)")
        .eq("registration_id", payment.externalReference)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (byRef) {
        paymentRecord = byRef;
        registrationRecord = byRef.registrations;
      } else {
        // Se ainda não achou pagamento, tenta ao menos achar a inscrição para atualizar
        const { data: regOnly } = await supabase
          .from("registrations")
          .select("*")
          .eq("id", payment.externalReference)
          .maybeSingle();

        if (regOnly) {
          registrationRecord = regOnly;
        }
      }
    }

    if (!paymentRecord && !registrationRecord) {
      console.warn("Payment and Registration not found locally:", payment.id, payment.externalReference);
      return new Response(JSON.stringify({ message: "Registration not found locally, ignored." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle different webhook events
    let newStatus = paymentRecord ? paymentRecord.status : "pending";
    let registrationStatus = registrationRecord ? registrationRecord.payment_status : "pending";
    let paidAt = paymentRecord ? paymentRecord.approved_at : null;

    let shouldUpdate = false;

    switch (event) {
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED":
        newStatus = "approved";
        registrationStatus = "approved";
        paidAt = new Date().toISOString();
        shouldUpdate = true;
        break;
      case "PAYMENT_CREATED":
        // WARNING: Avoid race condition where PAYMENT_CREATED arrives AFTER PAYMENT_RECEIVED
        if (newStatus !== "approved") newStatus = "pending";
        if (registrationStatus !== "approved") registrationStatus = "pending";
        shouldUpdate = true;
        break;
      case "PAYMENT_AWAITING_RISK_ANALYSIS":
      case "PAYMENT_AUTHORIZED":
        newStatus = "processing";
        registrationStatus = "processing";
        shouldUpdate = true;
        break;
      case "PAYMENT_OVERDUE":
        registrationStatus = "expired";
        shouldUpdate = true;
        break;
      case "PAYMENT_DELETED":
        newStatus = "cancelled";
        registrationStatus = "cancelled";
        shouldUpdate = true;
        break;
      case "PAYMENT_REFUNDED":
        newStatus = "refunded";
        registrationStatus = "refunded";
        shouldUpdate = true;
        break;
      case "PAYMENT_REPROVED_BY_RISK_ANALYSIS":
        newStatus = "rejected";
        registrationStatus = "rejected";
        shouldUpdate = true;
        break;
    }

    if (shouldUpdate) {
      console.log('📝 ATUALIZANDO BANCO:');

      if (paymentRecord) {
        console.log('  - Status pagamento antigo → novo:', paymentRecord.status, '→', newStatus);
        // Update payment status
        await supabase
          .from("payments")
          .update({
            status: newStatus,
            asaas_payment_id: payment.id, // Garante que vinculou
            approved_at: paidAt,
            metadata: { ...(paymentRecord.metadata || {}), lastWebhookEvent: event, webhookPayload: webhookData },
          })
          .eq("id", paymentRecord.id);
      }

      if (registrationRecord) {
        // Update registration status
        await supabase
          .from("registrations")
          .update({
            payment_status: registrationStatus,
            paid_at: paidAt
          })
          .eq("id", registrationRecord.id);

        console.log(`Updated Registration ${registrationRecord.id} to status: ${registrationStatus}`);

        // If approved, trigger email logic (optional, call another function or let triggers handle it)
        if (registrationStatus === 'approved' && registrationRecord.payment_status !== 'approved') {
          // Logic to send confirmation email
          try {
            console.log('📧 ENVIANDO EMAIL:');
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-registration-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
              },
              body: JSON.stringify({ registrationId: registrationRecord.id })
            });
            console.log('  - Disparou email?', emailResponse.ok ? 'SIM' : 'NÃO');
          } catch (e) {
            console.error("Failed to trigger email function:", e);
            console.log('  - Disparou email?', 'NÃO (Erro)');
          }
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