import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface InviteData {
  email: string;
  fullName: string;
  password?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Create client with Service Role to access admin functions
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";

    if (!resendApiKey) {
      throw new Error("Email service not configured (RESEND_API_KEY missing)");
    }

    const { email, fullName, password: providedPassword }: InviteData = await req.json();
    const finalPassword = providedPassword || Math.random().toString(36).slice(-10) + "A1!";

    // 1. Create User via Auth Admin
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: finalPassword,
      user_metadata: { full_name: fullName },
      email_confirm: true
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    const user = userData.user;

    // 2. Assign Organizer Role
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: user.id,
        role: 'organizer'
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
    }

    // 3. Build HTML Email
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
              <h1 style="margin: 0; color: white; font-size: 28px;">Bem-vindo ao AntCamp</h1>
            </td>
          </tr>

          <!-- Conteúdo -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <p style="margin: 0 0 20px 0; color: #333; font-size: 16px;">
                Olá <strong>${fullName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #666; font-size: 15px;">
                Você foi cadastrado como <strong>Organizador de Eventos</strong> no sistema <strong>AntCamp</strong>.
              </p>

              <p style="margin: 0 0 10px 0; color: #666; font-size: 15px;">
                Abaixo estão suas credenciais de acesso:
              </p>

              <div style="background-color: #f8f9fa; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #333; font-size: 14px;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0 0 0; color: #333; font-size: 14px;"><strong>Senha:</strong> ${finalPassword}</p>
              </div>

              <p style="margin: 0 0 30px 0; color: #666; font-size: 15px;">
                Recomendamos que você altere sua senha após o primeiro acesso no seu perfil.
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

    // 4. Send Email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: `🚀 Suas credenciais de Organizador - AntCamp`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      console.error("Resend error:", await emailResponse.text());
    }

    return new Response(JSON.stringify({
      success: true,
      userId: user.id
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in invite-organizer:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

