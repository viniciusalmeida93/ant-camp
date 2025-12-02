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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const webhookData = await req.json();
    console.log("Webhook received:", webhookData);

    const { event, payment } = webhookData;

    // Find payment by Asaas ID
    const { data: paymentRecord, error: findError } = await supabase
      .from("payments")
      .select("*, registrations(*)")
      .eq("asaas_payment_id", payment.id)
      .single();

    if (findError || !paymentRecord) {
      console.error("Payment not found:", payment.id);
      return new Response(JSON.stringify({ error: "Payment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle different webhook events
    let newStatus = paymentRecord.status;
    let registrationStatus = paymentRecord.registrations.payment_status;
    let paidAt = paymentRecord.approved_at;

    switch (event) {
      case "PAYMENT_RECEIVED":
      case "PAYMENT_CONFIRMED":
        newStatus = "approved";
        registrationStatus = "approved";
        paidAt = new Date().toISOString();
        break;
      case "PAYMENT_OVERDUE":
        registrationStatus = "expired";
        break;
      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED":
        newStatus = "refunded";
        registrationStatus = "refunded";
        break;
    }

    // Update payment status
    const { error: updatePaymentError } = await supabase
      .from("payments")
      .update({
        status: newStatus,
        approved_at: paidAt,
        metadata: { ...paymentRecord.metadata, lastWebhookEvent: event },
      })
      .eq("id", paymentRecord.id);

    if (updatePaymentError) {
      console.error("Error updating payment:", updatePaymentError);
      throw updatePaymentError;
    }

    // Update registration status
    const { error: updateRegistrationError } = await supabase
      .from("registrations")
      .update({
        payment_status: registrationStatus,
        paid_at: paidAt,
      })
      .eq("id", paymentRecord.registration_id);

    if (updateRegistrationError) {
      console.error("Error updating registration:", updateRegistrationError);
      throw updateRegistrationError;
    }

    // If approved, send confirmation email
    if (registrationStatus === "approved") {
      console.log("Payment approved for registration:", paymentRecord.registration_id);
      
      // Enviar email de confirmação automaticamente
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-registration-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            registrationId: paymentRecord.registration_id,
          }),
        });

        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          console.log("Confirmation email sent successfully:", emailData);
        } else {
          const errorData = await emailResponse.text();
          console.error("Failed to send confirmation email:", errorData);
          // Não falhar o webhook se o email falhar
        }
      } catch (emailError: any) {
        console.error("Error sending confirmation email:", emailError);
        // Não falhar o webhook se o email falhar
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