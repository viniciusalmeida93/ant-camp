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

  console.log("🛒 [CART RECOVERY] Função iniciada");

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("❌ RESEND_API_KEY não configurada");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body - pode vir vazio (modo batch) ou com registrationId (modo single)
    let body: { registrationId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Body vazio = modo batch
    }

    const { registrationId } = body;

    // ─── MODO SINGLE: chamada manual com registrationId específico ───
    if (registrationId) {
      console.log(`📨 Modo single - enviando para inscrição: ${registrationId}`);
      const result = await sendRecoveryEmail(supabase, resendApiKey, registrationId);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MODO BATCH: varrer todas as inscrições pendentes ───
    console.log("🔍 Modo batch - buscando inscrições pendentes...");

    // Buscar inscrições pending com mais de 2h que ainda não receberam o email
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: pendingRegistrations, error: fetchError } = await supabase
      .from("registrations")
      .select("id, athlete_name, athlete_email, cart_recovery_sent_at")
      .eq("payment_status", "pending")
      .lt("created_at", twoHoursAgo)
      .is("cart_recovery_sent_at", null) // Não enviou ainda
      .limit(50); // Processar no máximo 50 por execução

    if (fetchError) {
      console.error("❌ Erro ao buscar inscrições pendentes:", fetchError);
      throw fetchError;
    }

    console.log(`📋 Inscrições pendentes encontradas: ${pendingRegistrations?.length || 0}`);

    if (!pendingRegistrations || pendingRegistrations.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "Nenhuma inscrição pendente encontrada" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;
    const results: any[] = [];

    for (const reg of pendingRegistrations) {
      try {
        console.log(`📧 Enviando para: ${reg.athlete_email} (${reg.id})`);
        const result = await sendRecoveryEmail(supabase, resendApiKey, reg.id);

        if (result.success) {
          // Marcar como enviado para não mandar de novo
          await supabase
            .from("registrations")
            .update({ cart_recovery_sent_at: new Date().toISOString() })
            .eq("id", reg.id);

          sent++;
          results.push({ id: reg.id, email: reg.athlete_email, status: "sent" });
          console.log(`✅ Email enviado para: ${reg.athlete_email}`);
        } else {
          failed++;
          results.push({ id: reg.id, email: reg.athlete_email, status: "failed" });
        }
      } catch (e: any) {
        failed++;
        console.error(`❌ Erro ao enviar para ${reg.athlete_email}:`, e.message);
        results.push({ id: reg.id, email: reg.athlete_email, status: "error", error: e.message });
      }
    }

    console.log(`✅ Batch concluído: ${sent} enviados, ${failed} falhas`);

    return new Response(JSON.stringify({ success: true, sent, failed, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("❌ ERRO CRÍTICO em send-cart-recovery:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Helper: envia email para uma inscrição específica ───
async function sendRecoveryEmail(supabase: any, resendApiKey: string, registrationId: string) {
  const { data: registration, error: regError } = await supabase
    .from("registrations")
    .select(`*, championships:championship_id (*), categories:category_id (*)`)
    .eq("id", registrationId)
    .single();

  if (regError || !registration) throw new Error("Inscrição não encontrada");

  // Não enviar se já foi paga
  if (registration.payment_status === "approved") {
    console.log(`⏭️ Inscrição ${registrationId} já aprovada, pulando.`);
    return { success: true, skipped: true, reason: "already_approved" };
  }

  const championship = registration.championships;
  const category = registration.categories;
  const appUrl = Deno.env.get("APP_URL") || "https://antcamp.com.br";

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: #DC2626; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px;">⏰ Não Perca Sua Vaga!</h1>
              <p style="margin: 10px 0 0 0; color: #f0f0f0; font-size: 16px;">Sua inscrição está quase completa</p>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">
                Olá <strong>${registration.athlete_name}</strong>,
              </p>
              <p style="margin: 0 0 20px 0; color: #666; font-size: 15px;">
                Você iniciou sua inscrição para o <strong>${championship.name}</strong> mas ainda não finalizou o pagamento.
              </p>
              <p style="margin: 0 0 30px 0; color: #666; font-size: 15px;">
                As vagas são limitadas — complete agora e garanta sua participação!
              </p>

              <!-- Detalhes -->
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #495057; font-size: 18px;">Detalhes da Inscrição</h3>
                <p style="margin: 8px 0; color: #495057;"><strong>Campeonato:</strong> ${championship.name}</p>
                <p style="margin: 8px 0; color: #495057;"><strong>Categoria:</strong> ${category.name}</p>
                ${category.format !== "individual" ? `<p style="margin: 8px 0; color: #495057;"><strong>Time:</strong> ${registration.team_name}</p>` : ""}
              </div>

              <!-- Valores -->
              <div style="background-color: #FEE2E2; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #DC2626; font-size: 18px;">Valor da Inscrição</h3>
                <table width="100%" cellpadding="5" cellspacing="0" style="color: #495057;">
                  <tr><td>Subtotal:</td><td align="right"><strong>${formatPrice(registration.subtotal_cents)}</strong></td></tr>
                  <tr><td>Taxa de serviço:</td><td align="right">${formatPrice(registration.platform_fee_cents)}</td></tr>
                  <tr style="border-top: 2px solid #DC2626;">
                    <td style="padding-top: 10px;"><strong>Total:</strong></td>
                    <td align="right" style="padding-top: 10px;"><strong style="font-size: 20px; color: #DC2626;">${formatPrice(registration.total_cents)}</strong></td>
                  </tr>
                </table>
              </div>

              <!-- CTA -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/checkout/${registration.id}"
                   style="display: inline-block; background-color: #DC2626; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
                  🚀 Finalizar Pagamento Agora
                </a>
              </div>
              <p style="margin: 20px 0 0 0; color: #999; font-size: 13px; text-align: center;">
                ⚡ Vagas limitadas! Complete antes que esgotem.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 14px;">Dúvidas? Entre em contato com a organização do evento.</p>
              <p style="margin: 0; color: #adb5bd; font-size: 12px;">Este é um email automático, por favor não responda.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev",
      to: registration.athlete_email,
      subject: `⏰ Complete sua inscrição - ${championship.name}`,
      html: emailHtml,
    }),
  });

  if (!emailResponse.ok) {
    const errorData = await emailResponse.text();
    throw new Error(`Resend API error: ${errorData}`);
  }

  const emailData = await emailResponse.json();
  return { success: true, emailId: emailData.id };
}
