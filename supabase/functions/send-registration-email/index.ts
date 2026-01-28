import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailData {
  registrationId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    console.log("Checking RESEND_API_KEY:", resendApiKey ? `Found (${resendApiKey.substring(0, 10)}...)` : "NOT FOUND");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured in Supabase secrets");
      return new Response(JSON.stringify({
        error: "Email service not configured",
        details: "RESEND_API_KEY secret is missing. Please add it in Supabase dashboard."
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { registrationId }: EmailData = await req.json();

    // Buscar dados completos da inscrição
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

    // Formatar data
    const eventDate = new Date(championship.date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    // Formatar valores
    const formatPrice = (cents: number) => {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(cents / 100);
    };

    // Preparar lista de membros
    let membersHtml = "";
    if (category.format !== "individual" && registration.team_members) {
      const members = Array.isArray(registration.team_members)
        ? registration.team_members
        : [registration.team_members];

      membersHtml = `
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
          <h3 style="margin: 0 0 10px 0; color: #495057; font-size: 16px;">Integrantes do Time:</h3>
          ${members.map((member: any, index: number) => `
            <div style="margin: 8px 0; padding: 8px; background-color: white; border-radius: 4px;">
              <strong>Integrante ${index + 1}:</strong> ${member.name}<br/>
              <span style="color: #6c757d; font-size: 14px;">
                Email: ${member.email} | WhatsApp: ${member.whatsapp}
              </span>
            </div>
          `).join("")}
        </div>
      `;
    }

    // Template do email
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
            <td style="background-color: #051C2C; padding: 40px 30px; text-align: center;">
              <img src="data:image/webp;base64,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" alt="AntCamp" style="max-width: 200px; height: auto; margin-bottom: 20px;" />
              <h1 style="margin: 0; color: white; font-size: 28px;">Inscrição Confirmada!</h1>
              <p style="margin: 10px 0 0 0; color: #f0f0f0; font-size: 16px;">Sua inscrição foi registrada com sucesso</p>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Informações do Evento -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #333; font-size: 22px; border-bottom: 2px solid #DC2626; padding-bottom: 10px;">
                  ${championship.name}
                </h2>
                <p style="margin: 8px 0; color: #666; font-size: 15px;">
                  📅 <strong>Data:</strong> ${eventDate}
                </p>
                <p style="margin: 8px 0; color: #666; font-size: 15px;">
                  📍 <strong>Local:</strong> ${championship.location}
                </p>
              </div>

              <!-- Informações da Inscrição -->
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #495057; font-size: 18px;">Detalhes da Inscrição</h3>
                
                <p style="margin: 8px 0; color: #495057;">
                  <strong>Número da Inscrição:</strong><br/>
                  <span style="font-size: 18px; color: #DC2626; font-family: monospace;">#${registration.id.substring(0, 8).toUpperCase()}</span>
                </p>
                
                <p style="margin: 8px 0; color: #495057;">
                  <strong>Categoria:</strong> ${category.name}
                </p>
                
                <p style="margin: 8px 0; color: #495057;">
                  <strong>Formato:</strong> ${category.format === "individual" ? "Individual" : category.format === "duo" ? "Dupla" : category.format === "trio" ? "Trio" : "Time"}
                </p>

                ${category.format !== "individual" ? `
                  <p style="margin: 8px 0; color: #495057;">
                    <strong>Nome do Time:</strong> ${registration.team_name}
                  </p>
                ` : ""}

                <p style="margin: 8px 0; color: #495057;">
                  <strong>Atleta Principal:</strong> ${registration.athlete_name}
                </p>
                
                <p style="margin: 8px 0; color: #495057;">
                  <strong>Email:</strong> ${registration.athlete_email}
                </p>
                
                ${registration.athlete_phone ? `
                  <p style="margin: 8px 0; color: #495057;">
                    <strong>WhatsApp:</strong> ${registration.athlete_phone}
                  </p>
                ` : ""}
              </div>

              ${membersHtml}

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

              <!-- Status do Pagamento -->
              <div style="background-color: ${registration.payment_status === "approved" ? "#d4edda" : "#fff3cd"}; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid ${registration.payment_status === "approved" ? "#28a745" : "#ffc107"};">
                <p style="margin: 0; color: #495057;">
                  <strong>Status do Pagamento:</strong> 
                  <span style="color: ${registration.payment_status === "approved" ? "#155724" : "#856404"};">
                    ${registration.payment_status === "approved" ? "✅ PAGO" : "⏳ AGUARDANDO PAGAMENTO"}
                  </span>
                </p>
              </div>

              <!-- Check-in -->
              <!-- Check-in REMOVIDO -->

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

    // Preparar lista de destinatários (todos os membros do time)
    const recipients: string[] = [registration.athlete_email];

    // Se for time, adicionar emails de todos os membros
    if (category.format !== "individual" && registration.team_members) {
      const members = Array.isArray(registration.team_members)
        ? registration.team_members
        : [registration.team_members];

      members.forEach((member: any) => {
        if (member.email && member.email !== registration.athlete_email) {
          recipients.push(member.email);
        }
      });
    }

    console.log(`Enviando email para ${recipients.length} destinatário(s):`, recipients);

    // Enviar email via Resend para todos os destinatários
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev",
        to: recipients, // Envia para todos os membros do time
        subject: `✅ Inscrição Confirmada - ${championship.name}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", {
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        error: errorData
      });
      throw new Error(`Failed to send email via Resend: ${errorData}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({
      success: true,
      emailId: emailData.id,
      recipients: recipients.length
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in send-registration-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

