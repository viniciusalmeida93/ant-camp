import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailData {
  registrationId: string;
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

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({
        error: "Email service not configured"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { registrationId }: EmailData = await req.json();

    // Buscar dados da inscrição
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select(`
        *,
        championships:championship_id (*),
        categories:category_id (*)
      `)
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      throw new Error("Registration not found");
    }

    const championship = registration.championships;
    const category = registration.categories;

    // Formatar valores
    const formatPrice = (cents: number) => {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(cents / 100);
    };

    // Template do email de recuperação de carrinho
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
                Notamos que você iniciou sua inscrição para o <strong>${championship.name}</strong> mas ainda não finalizou o pagamento.
              </p>

              <p style="margin: 0 0 30px 0; color: #666; font-size: 15px;">
                As vagas são limitadas e podem esgotar a qualquer momento! Complete sua inscrição agora e garanta sua participação.
              </p>

              <!-- Informações da Inscrição -->
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #495057; font-size: 18px;">Detalhes da Inscrição</h3>
                
                <p style="margin: 8px 0; color: #495057;">
                  <strong>Campeonato:</strong> ${championship.name}
                </p>
                
                <p style="margin: 8px 0; color: #495057;">
                  <strong>Categoria:</strong> ${category.name}
                </p>

                ${category.format !== "individual" ? `
                  <p style="margin: 8px 0; color: #495057;">
                    <strong>Time:</strong> ${registration.team_name}
                  </p>
                ` : ""}
              </div>

              <!-- Valores -->
              <div style="background-color: #FEE2E2; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #DC2626; font-size: 18px;">Valor da Inscrição</h3>
                
                <table width="100%" cellpadding="5" cellspacing="0" style="color: #495057;">
                  <tr>
                    <td>Subtotal:</td>
                    <td align="right"><strong>${formatPrice(registration.subtotal_cents)}</strong></td>
                  </tr>
                  <tr>
                    <td>Taxa de serviço:</td>
                    <td align="right">${formatPrice(registration.platform_fee_cents)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #DC2626;">
                    <td style="padding-top: 10px;"><strong>Total:</strong></td>
                    <td align="right" style="padding-top: 10px;"><strong style="font-size: 20px; color: #DC2626;">${formatPrice(registration.total_cents)}</strong></td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get("SUPABASE_URL")?.replace('/rest/v1', '')}/checkout/${registration.id}" 
                   style="display: inline-block; background-color: #DC2626; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
                  🚀 Finalizar Pagamento Agora
                </a>
              </div>

              <p style="margin: 20px 0 0 0; color: #999; font-size: 13px; text-align: center;">
                ⚡ Vagas limitadas! Complete sua inscrição antes que esgotem.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #6c757d; font-size: 14px;">
                Dúvidas? Entre em contato com a organização do evento.
              </p>
              <p style="margin: 0; color: #adb5bd; font-size: 12px;">
                Este é um email automático, por favor não responda.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // Enviar email via Resend
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
      throw new Error(`Failed to send email via Resend: ${errorData}`);
    }

    const emailData = await emailResponse.json();

    return new Response(JSON.stringify({
      success: true,
      emailId: emailData.id
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in send-cart-recovery:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
