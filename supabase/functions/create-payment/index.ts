import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  registrationId: string;
  categoryId: string;
  athleteName: string;
  athleteEmail: string;
  athletePhone?: string;
  teamName?: string;
  teamMembers?: any[];
  priceCents: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { registrationId, categoryId, athleteName, athleteEmail, athletePhone, teamName, teamMembers, priceCents } = await req.json() as PaymentRequest;

    // Get registration to find championship
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select("*, championships(*)")
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      throw new Error("Registration not found");
    }

    const championship = registration.championships;
    const organizerId = championship?.organizer_id;

    // Get organizer's Asaas integration
    let organizerIntegration = null;
    if (organizerId) {
      const { data: integration } = await supabase
        .from("organizer_asaas_integrations")
        .select("*")
        .eq("organizer_id", organizerId)
        .eq("is_active", true)
        .maybeSingle();
      
      organizerIntegration = integration;
    }

    // Calculate platform fee (5%)
    const platformFeeCents = Math.round(priceCents * 0.05);
    const totalCents = priceCents + platformFeeCents;

    // Calculate split values (95% organizer, 5% platform)
    const organizerAmount = priceCents; // 95% of total (priceCents is 95% of totalCents)
    const platformAmount = platformFeeCents; // 5% of total

    // Use organizer's API key if available, otherwise fallback to platform key
    const organizerApiKey = organizerIntegration?.asaas_api_key;
    const platformApiKey = Deno.env.get("ASAAS_API_KEY");
    const asaasApiKey = organizerApiKey || platformApiKey;
    const useMockPayment = !asaasApiKey || asaasApiKey === "mock";
    
    // Get organizer's Asaas wallet ID (from integration or championship)
    const organizerWalletId = organizerIntegration?.asaas_wallet_id || championship?.asaas_wallet_id;
    
    // Get platform wallet ID - try environment variable first, then database
    let platformWalletId = Deno.env.get("ASAAS_PLATFORM_WALLET_ID");
    if (!platformWalletId) {
      // Fallback to database configuration
      const { data: platformSetting } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "asaas_platform_wallet_id")
        .single();
      platformWalletId = platformSetting?.value || null;
    }

    let paymentData;

    if (useMockPayment) {
      // Mock payment for demo
      console.log("Using mock payment (Asaas not configured)");
      
      paymentData = {
        id: `mock_payment_${Date.now()}`,
        status: "PENDING",
        invoiceUrl: `https://mock-payment.demo/invoice/${Date.now()}`,
        bankSlipUrl: `https://mock-payment.demo/boleto/${Date.now()}`,
        pixQrCode: "00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5925Nome do Beneficiario Final6009SAO PAULO62290525mockpayment123456789101263044B12",
        pixCopyPaste: "00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5925Nome do Beneficiario Final6009SAO PAULO62290525mockpayment123456789101263044B12",
      };
    } else {
      // Real Asaas integration
      const paymentBody: any = {
        customer: athleteEmail,
        billingType: "UNDEFINED", // Allows multiple payment methods
        value: totalCents / 100,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: `Inscrição - ${athleteName}`,
        externalReference: registrationId,
      };

      // Configure split payment if organizer wallet is configured
      if (organizerWalletId && platformWalletId) {
        // Split payment: 95% to organizer, 5% to platform
        paymentBody.split = [
          {
            walletId: organizerWalletId,
            totalValue: organizerAmount / 100, // Convert cents to reais
            percentualValue: 95,
            fixedValue: null,
          },
          {
            walletId: platformWalletId,
            totalValue: platformAmount / 100, // Convert cents to reais
            percentualValue: 5,
            fixedValue: null,
          },
        ];
        console.log("Using split payment:", paymentBody.split);
      } else if (organizerWalletId) {
        console.warn("Organizer wallet configured but platform wallet not found. Using single wallet.");
      }

      const asaasResponse = await fetch("https://www.asaas.com/api/v3/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "access_token": asaasApiKey,
        },
        body: JSON.stringify(paymentBody),
      });

      if (!asaasResponse.ok) {
        const errorText = await asaasResponse.text();
        console.error("Asaas API error:", errorText);
        throw new Error(`Failed to create payment with Asaas: ${errorText}`);
      }

      paymentData = await asaasResponse.json();
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        registration_id: registrationId,
        asaas_payment_id: paymentData.id,
        amount_cents: priceCents,
        platform_fee_cents: platformFeeCents,
        net_amount_cents: priceCents,
        payment_method: "undefined",
        status: "pending",
        payment_url: paymentData.invoiceUrl,
        pix_qr_code: paymentData.pixQrCode,
        pix_copy_paste: paymentData.pixCopyPaste,
        boleto_url: paymentData.bankSlipUrl,
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
      throw paymentError;
    }

    // Update registration with payment info
    const { error: updateError } = await supabase
      .from("registrations")
      .update({
        payment_id: payment.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", registrationId);

    if (updateError) {
      console.error("Error updating registration:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment: {
          id: payment.id,
          paymentUrl: payment.payment_url,
          pixQrCode: payment.pix_qr_code,
          pixCopyPaste: payment.pix_copy_paste,
          boletoUrl: payment.boleto_url,
          totalCents,
          platformFeeCents,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in create-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});