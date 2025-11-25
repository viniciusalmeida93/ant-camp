import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Função para detectar o ambiente e retornar a URL base correta do Asaas
function getAsaasBaseUrl(apiKey: string): string {
  if (apiKey.startsWith("$aact_hmlg_")) {
    return "https://api-sandbox.asaas.com/v3";
  }
  return "https://api.asaas.com/v3";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase environment variables" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { paymentId } = await req.json();
    
    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: "paymentId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Buscar pagamento
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*, registrations!inner(championships!inner(organizer_id))")
      .eq("id", paymentId)
      .single();
    
    if (paymentError || !payment) {
      return new Response(
        JSON.stringify({ error: "Pagamento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!payment.asaas_payment_id) {
      return new Response(
        JSON.stringify({ error: "Pagamento não possui ID do Asaas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Buscar integração Asaas do organizador
    const organizerId = (payment.registrations as any).championships.organizer_id;
    const { data: asaasIntegration, error: asaasError } = await supabase
      .from("organizer_asaas_integrations")
      .select("asaas_api_key")
      .eq("organizer_id", organizerId)
      .eq("is_active", true)
      .maybeSingle();
    
    if (asaasError || !asaasIntegration || !asaasIntegration.asaas_api_key) {
      return new Response(
        JSON.stringify({ error: "Integração Asaas não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const organizerApiKey = asaasIntegration.asaas_api_key;
    const asaasBaseUrl = getAsaasBaseUrl(organizerApiKey);
    
    // Buscar QR Code atualizado do Asaas
    const pixQrCodeResponse = await fetch(
      `${asaasBaseUrl}/payments/${payment.asaas_payment_id}/pixQrCode`,
      {
        headers: {
          "access_token": organizerApiKey,
        },
      }
    );
    
    if (!pixQrCodeResponse.ok) {
      const errorData = await pixQrCodeResponse.json().catch(() => ({}));
      return new Response(
        JSON.stringify({ 
          error: `Erro ao buscar QR Code: ${errorData.errors?.[0]?.description || "Erro desconhecido"}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const pixQrCodeData = await pixQrCodeResponse.json();
    const encodedImage = pixQrCodeData.encodedImage || null;
    const pixCopyPaste = pixQrCodeData.payload ? pixQrCodeData.payload.replace(/\s+/g, '') : null;
    
    // Atualizar pagamento no banco
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        pix_qr_code: encodedImage,
        pix_copy_paste: pixCopyPaste,
      })
      .eq("id", paymentId);
    
    if (updateError) {
      return new Response(
        JSON.stringify({ error: `Erro ao atualizar pagamento: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        pixQrCode: encodedImage,
        pixCopyPaste: pixCopyPaste,
        expirationDate: pixQrCodeData.expirationDate,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

