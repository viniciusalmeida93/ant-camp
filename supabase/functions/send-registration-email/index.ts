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
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px;">✅ Inscrição Confirmada!</h1>
              <p style="margin: 10px 0 0 0; color: #f0f0f0; font-size: 16px;">Sua inscrição foi registrada com sucesso</p>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Informações do Evento -->
              <div style="margin-bottom: 30px;">
                <h2 style="margin: 0 0 15px 0; color: #333; font-size: 22px; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
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
                  <span style="font-size: 18px; color: #667eea; font-family: monospace;">#${registration.id.substring(0, 8).toUpperCase()}</span>
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
              <div style="background-color: #e7f3ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="margin: 0 0 15px 0; color: #0066cc; font-size: 18px;">Valor da Inscrição</h3>
                
                <table width="100%" cellpadding="5" cellspacing="0" style="color: #495057;">
                  <tr>
                    <td>Subtotal:</td>
                    <td align="right"><strong>${formatPrice(registration.subtotal_cents)}</strong></td>
                  </tr>
                  <tr>
                    <td>Taxa de serviço:</td>
                    <td align="right">${formatPrice(registration.platform_fee_cents)}</td>
                  </tr>
                  <tr style="border-top: 2px solid #0066cc;">
                    <td style="padding-top: 10px;"><strong>Total:</strong></td>
                    <td align="right" style="padding-top: 10px;"><strong style="font-size: 20px; color: #0066cc;">${formatPrice(registration.total_cents)}</strong></td>
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
              <div style="background-color: #fff4e6; padding: 20px; border-radius: 8px; border: 2px dashed #ff9800;">
                <h3 style="margin: 0 0 10px 0; color: #e65100; font-size: 16px;">📱 Importante para o Check-in</h3>
                <p style="margin: 0; color: #bf360c; font-size: 14px;">
                  <strong>Guarde este email!</strong> Você precisará apresentar este comprovante no dia do evento para fazer o check-in.
                  Pode mostrar direto no celular ou imprimir.
                </p>
              </div>

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
        from: "AntCamp <onboarding@resend.dev>", // Domínio de teste do Resend (funciona imediatamente)
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

