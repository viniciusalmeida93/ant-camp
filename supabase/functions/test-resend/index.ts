import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    console.log("=== TESTE RESEND ===");
    console.log("API Key encontrada?", resendApiKey ? "SIM" : "NÃO");
    console.log("Primeiros 10 chars:", resendApiKey?.substring(0, 10));
    
    if (!resendApiKey) {
      return new Response(JSON.stringify({ 
        error: "RESEND_API_KEY não encontrada no Supabase",
        help: "Adicione em: Settings → Edge Functions → Secrets"
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Testar chamada simples ao Resend
    console.log("Testando API do Resend...");
    
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev", // Domínio de teste - SEMPRE funciona
        to: ["viniciusalmeida93@gmail.com"], // Email de teste
        subject: "🧪 Teste de Email - AntCamp",
        html: "<h1>✅ Email funcionando!</h1><p>Se você recebeu isso, o sistema de email está configurado corretamente.</p>",
      }),
    });

    const responseText = await emailResponse.text();
    
    console.log("Status da resposta:", emailResponse.status);
    console.log("Resposta completa:", responseText);

    if (!emailResponse.ok) {
      return new Response(JSON.stringify({ 
        error: "Erro ao chamar API do Resend",
        status: emailResponse.status,
        statusText: emailResponse.statusText,
        details: responseText,
        apiKeyUsada: resendApiKey.substring(0, 15) + "..."
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailData = JSON.parse(responseText);

    return new Response(JSON.stringify({ 
      success: true,
      message: "✅ Email enviado com sucesso!",
      emailId: emailData.id,
      apiKeyOk: true
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Erro no teste:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

