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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Create client with Service Role to access admin functions
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    // Default to testing domain if variable not set, but prefer verified domain
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";

    if (!resendApiKey) {
      return new Response(JSON.stringify({
        error: "Email service not configured",
        details: "RESEND_API_KEY is missing."
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { registrationId }: EmailData = await req.json();

    // 1. Fetch registration details
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select("athlete_name, athlete_email, team_name")
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      throw new Error("Registration not found");
    }

    if (!registration.athlete_email) {
      throw new Error("Registration has no email address");
    }

    // 2. Generate Password Recovery Link
    // Note: This relies on Supabase Auth. 
    // If the proper user doesn't exist for this email, this might fail or return nothing.
    // However, usually registrations are linked to users. 
    // PRO TIP: In this system, registrations might be standalone. 
    // IF the user is not in Auth table, we cannot recover password.
    // Let's assume the email corresponds to a user.
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: registration.athlete_email
    });

    if (linkError) {
      console.error("Error generating link:", linkError);
      throw new Error(`Failed to generate recovery link: ${linkError.message}`);
    }

    const recoveryLink = linkData.properties.action_link;
    const recipientName = registration.athlete_name || registration.team_name || "Atleta";

    // 3. Build HTML Email
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
              <h1 style="margin: 0; color: white; font-size: 28px;">Recuperação de Senha</h1>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">
                Olá <strong>${recipientName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #666; font-size: 15px;">
                Recebemos uma solicitação para redefinir a senha da sua conta no <strong>AntCamp</strong>.
              </p>

              <p style="margin: 0 0 30px 0; color: #666; font-size: 15px;">
                Se você não fez essa solicitação, pode ignorar este email com segurança.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${recoveryLink}" 
                   style="display: inline-block; background-color: #DC2626; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
                  Redefinir Minha Senha
                </a>
              </div>

              <p style="margin: 20px 0 0 0; color: #999; font-size: 13px; text-align: center;">
                Este link expira em breve por motivos de segurança.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center;">
              <p style="margin: 0; color: #adb5bd; font-size: 12px;">
                AntCamp - Sistema de Gestão de Campeonatos
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

    // 4. Send Email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: registration.athlete_email,
        subject: `🔑 Redefinição de Senha - AntCamp`,
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
    console.error("Error in send-password-recovery:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

