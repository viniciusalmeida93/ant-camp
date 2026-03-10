import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ResendData {
  userId: string;
  email: string;
  fullName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";

    if (!resendApiKey) {
      throw new Error("Email service not configured (RESEND_API_KEY missing)");
    }

    const { userId, email, fullName }: ResendData = await req.json();

    if (!userId || !email || !fullName) {
      throw new Error("userId, email, and fullName are required");
    }

    // Generate a new random password
    const newPassword = Math.random().toString(36).slice(-10) + "A1!";

    // 1. Update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword
    });

    if (updateError) {
      console.error("Error updating user password:", updateError);
      throw updateError;
    }

    // 2. Build HTML Email
    const appUrl = Deno.env.get("APP_URL") || "https://antcamp.com.br";
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
              <h1 style="margin: 0; color: white; font-size: 28px;">Acesso ao AntCamp (Reenviado)</h1>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">
                Olá <strong>${fullName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #666; font-size: 15px;">
                O envio das suas credenciais para o sistema <strong>AntCamp</strong> foi refeito. Uma nova senha foi gerada.
              </p>

              <p style="margin: 0 0 10px 0; color: #666; font-size: 15px;">
                Abaixo estão suas credenciais de acesso:
              </p>

              <div style="background-color: #f8f9fa; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #333; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0 0 0; color: #333; font-size: 14px;"><strong>Nova Senha:</strong> ${newPassword}</p>
              </div>

              <p style="margin: 0 0 30px 0; color: #666; font-size: 15px;">
                Recomendamos que você altere sua senha após o próximo acesso no seu perfil.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/auth" 
                   style="display: inline-block; background-color: #DC2626; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
                  Acessar Painel
                </a>
              </div>

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

    // 3. Send Email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: `🚀 Reenvio de Credenciais - AntCamp`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      console.error("Resend error:", await emailResponse.text());
    }

    return new Response(JSON.stringify({
      success: true,
      userId: userId
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error resending invite:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
