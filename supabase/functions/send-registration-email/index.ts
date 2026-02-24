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

    const paymentMethodLabel = (method: string | null) => {
      switch ((method || '').toLowerCase()) {
        case 'pix': return 'PIX';
        case 'credit_card': return 'Cartão de Crédito';
        case 'boleto': case 'bank_slip': return 'Boleto';
        default: return method || 'Não informado';
      }
    };

    const methodLabel = paymentMethodLabel(registration.payment_method);

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

    // Template do email redesign premium
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', Arial, sans-serif; background-color: #0d1216; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 0 auto; background-color: #0d1216; padding: 20px; }
    .card { background-color: #12181d; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
    .header { text-align: center; padding: 40px 20px; border-bottom: 1px solid #1f2937; }
    .success-icon { width: 64px; height: 64px; margin-bottom: 20px; }
    .title { color: white; font-size: 28px; font-weight: 900; margin: 0; text-transform: uppercase; font-style: italic; }
    .title-highlight { color: #DC2626; }
    .subtitle { color: #9ca3af; font-size: 16px; margin-top: 10px; line-height: 1.5; }
    .content { padding: 30px; }
    .top-info { background-color: #0a0e11; border: 1px solid #ef4444; border-top-width: 4px; border-radius: 8px; padding: 20px; margin-bottom: 25px; display: table; width: 100%; box-sizing: border-box; }
    .info-col { display: table-cell; width: 50%; vertical-align: top; }
    .info-label { color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; font-weight: 600; }
    .info-value { color: white; font-size: 15px; font-weight: 600; margin: 0; }
    .section-title { color: white; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #1f2937; padding-bottom: 8px; margin-bottom: 15px; margin-top: 30px; font-weight: 700; }
    .grid-details { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .grid-details td { padding: 10px 0; border-bottom: 1px dashed #1f2937; }
    .grid-details td:first-child { color: #9ca3af; font-size: 14px; width: 40%; }
    .grid-details td:last-child { color: white; font-size: 14px; font-weight: 600; text-align: right; }
    .price-box { background: linear-gradient(to right, #111827, #1f2937); border-radius: 8px; padding: 20px; margin-top: 25px; border-left: 4px solid #3b82f6; }
    .price-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #d1d5db; }
    .price-total { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 1px solid #374151; font-size: 18px; font-weight: 800; color: white; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; }
    .badge-success { background-color: rgba(34, 197, 94, 0.1); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
    .button-container { text-align: center; margin-top: 40px; margin-bottom: 10px; }
    .primary-button { background-color: #DC2626; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 700; font-size: 16px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .team-member { background-color: rgba(255,255,255,0.03); border: 1px solid #1f2937; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
    .team-member-name { color: white; font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .team-member-contact { color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align: center; margin-bottom: 20px;">
      <!-- Logo da plataforma opcional aqui -->
    </div>
    
    <div class="card">
      <div class="header">
        <img src="https://antcampp-web.vercel.app/static/check-circle.png" alt="Success" style="width: 72px; height: 72px; margin-bottom: 15px; display: inline-block;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/190/190411.png'" />
        <h1 class="title">INSCRIÇÃO <span class="title-highlight">CONFIRMADA!</span></h1>
        <p class="subtitle">Parabéns, ${registration.athlete_name}!<br/>Sua vaga está garantida no <strong>${championship.name}</strong>.</p>
      </div>

      <div class="content">
        
        <!-- Info Resumo -->
        <div class="top-info">
          <div class="info-col">
            <div class="info-label">🏆 Campeonato</div>
            <div class="info-value">${championship.name}</div>
            
            <div style="margin-top: 15px;">
              <div class="info-label">👥 Categoria</div>
              <div class="info-value">${category.name}</div>
            </div>
          </div>
          <div class="info-col">
            <div class="info-label">📅 Data do Evento</div>
            <div class="info-value">${eventDate}</div>
            
            <div style="margin-top: 15px;">
              <div class="info-label">📍 Local</div>
              <div class="info-value" style="font-size: 13px;">${championship.location}</div>
            </div>
          </div>
        </div>

        <div class="section-title">Detalhes do Pedido</div>
        
        <table class="grid-details">
          <tr>
            <td>Status do Pagamento</td>
            <td>
              <span class="badge ${registration.payment_status === 'approved' ? 'badge-success' : ''}">
                ${registration.payment_status === 'approved' ? '✔ APROVADO' : 'AGUARDANDO'}
              </span>
            </td>
          </tr>
          <tr>
            <td>Código da Inscrição</td>
            <td style="font-family: monospace; color: #9ca3af;">#${registration.id.substring(0, 8).toUpperCase()}</td>
          </tr>
          <tr>
            <td>Formato</td>
            <td>${category.format === "individual" ? "Individual" : category.format === "duo" ? "Dupla" : category.format === "trio" ? "Trio" : "Time"}</td>
          </tr>
          ${category.format !== "individual" ? `
          <tr>
            <td>Nome do Time</td>
            <td>${registration.team_name}</td>
          </tr>
          ` : ""}
          <tr>
            <td>Atleta / Responsável</td>
            <td>${registration.athlete_name}</td>
          </tr>
          <tr>
            <td>Forma de Pagamento</td>
            <td>${methodLabel}</td>
          </tr>
        </table>

        <!-- Time Se Houver -->
        ${category.format !== "individual" && registration.team_members ? `
          <div class="section-title">Integrantes do Time</div>
          ${(Array.isArray(registration.team_members) ? registration.team_members : [registration.team_members]).map(member => `
            <div class="team-member">
              <div class="team-member-name">${member.name}</div>
              <div class="team-member-contact">${member.email} | ${member.whatsapp}</div>
            </div>
          `).join('')}
        ` : ""}

        <!-- Valores Premium -->
        <div class="price-box">
          <div style="width: 100%; display: table;">
            <div style="display: table-row;">
              <div style="display: table-cell; color: #9ca3af; font-size: 14px; padding-bottom: 8px;">Valor Inscrição:</div>
              <div style="display: table-cell; color: white; font-size: 14px; text-align: right; font-weight: 500;">${formatPrice(registration.subtotal_cents)}</div>
            </div>
            <div style="display: table-row;">
              <div style="display: table-cell; color: #9ca3af; font-size: 14px; padding-bottom: 8px;">Taxas da Plataforma:</div>
              <div style="display: table-cell; color: white; font-size: 14px; text-align: right; font-weight: 500;">${formatPrice(registration.platform_fee_cents)}</div>
            </div>
            <div style="display: table-row; border-top: 1px solid #374151;">
              <div style="display: table-cell; color: white; font-size: 16px; font-weight: 800; padding-top: 15px;">TOTAL EXATO:</div>
              <div style="display: table-cell; color: #3b82f6; font-size: 20px; font-weight: 900; text-align: right; padding-top: 15px;">${formatPrice(registration.total_cents)}</div>
            </div>
          </div>
        </div>

        <div class="button-container">
          <a href="https://antcampp-web.vercel.app/" class="primary-button">Acessar Meu Painel</a>
        </div>
        
      </div>
    </div>
    
    <div class="footer">
      Você recebeu este e-mail porque se inscreveu no ${championship.name}.<br/>
      Dúvidas? Responda a este e-mail para contatar o organizador.<br/><br/>
      <strong>© ${new Date().getFullYear()} AntCamp</strong>. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
    `;

    // Preparar lista de destinatários (todos os membros do time)
    const recipients: string[] = [registration.athlete_email].filter(Boolean);

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

    if (recipients.length === 0) {
      console.log("No recipients found (no emails provided for athlete or team members). Skipping email sending.");
      return new Response(JSON.stringify({
        success: true,
        message: "No recipients found, skipping email.",
        registrationId: registrationId
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

