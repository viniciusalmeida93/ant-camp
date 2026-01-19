import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Asaas API Configuration
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
const PLATFORM_WALLET_ID = Deno.env.get("PLATFORM_WALLET_ID"); // AntCamp Wallet ID (Optional if master absorbs residue, but good for explicit split)
const PLATFORM_FEE_CENTS = 500; // R$ 5,00 Fixed Fee per registration

const getAsaasBaseUrl = () => {
  // If API Key starts with $, it's usually Sandbox/Staging in Asaas conventions, 
  // but Asaas Sandbox keys specifically start with $aact_hmlg_
  if (ASAAS_API_KEY?.startsWith("$aact_hmlg_")) {
    return "https://api-sandbox.asaas.com/v3";
  }
  return "https://api.asaas.com/v3";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const missingVars = [];
    if (!supabaseUrl) missingVars.push("SUPABASE_URL");
    if (!supabaseKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!ASAAS_API_KEY) missingVars.push("ASAAS_API_KEY");

    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables configuration: ${missingVars.join(", ")}`);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { registrationId, paymentMethod: rawPaymentMethod = "PIX", cardData, creditCardHolderInfo, priceCents: requestPriceCents, athleteCpf: requestAthleteCpf } = await req.json();

    const paymentMethod = rawPaymentMethod.toUpperCase();

    if (!registrationId) {
      throw new Error("Registration ID is required");
    }

    // 1. Fetch Registration and Related Data
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select(`
        *,
        category:categories (
          id,
          name,
          price_cents,
          championship:championships (
            id,
            name,
            organizer_id
          )
        )
      `)
      .eq("id", registrationId)
      .single();

    if (regError || !registration) {
      throw new Error("Registration not found");
    }

    const category = registration.category;
    const championship = category.championship;
    const organizerId = championship.organizer_id;

    // 2. Fetch Organizer's Wallet ID
    // 2. Fetch Organizer's Wallet ID
    // We try to fetch from the specific integration table first
    const { data: integration, error: integrationError } = await supabase
      .from("organizer_asaas_integrations")
      .select("asaas_wallet_id")
      .eq("organizer_id", organizerId)
      .eq("is_active", true)
      .maybeSingle();

    let walletId = integration?.asaas_wallet_id;

    // Fallback: Check profiles table (legacy support)
    if (!walletId) {
      const { data: organizerProfile } = await supabase
        .from("profiles")
        .select("asaas_wallet_id")
        .eq("id", organizerId)
        .single();

      if (organizerProfile?.asaas_wallet_id) {
        walletId = organizerProfile.asaas_wallet_id;
      }
    }

    if (!walletId) {
      console.warn(`WARNING: O organizador ${championship.name} não possui carteira Asaas. O pagamento irá integralmente para a conta Mestra (AntCamp).`);
    }

    // 3. Calculate Values
    // Prioritize DB value, fallback to request value, fallback to category price + fee
    let totalCents = registration.total_cents;

    if (!totalCents || totalCents <= 0) {
      console.warn("Registration total_cents is missing or zero. Attempting fallbacks.");
      if (requestPriceCents && requestPriceCents > 0) {
        totalCents = requestPriceCents;
      } else if (category.price_cents) {
        totalCents = category.price_cents + PLATFORM_FEE_CENTS; // Assuming standard behavior
      }
    }

    if (!totalCents || totalCents <= 0) {
      throw new Error(`Valor do pagamento inválido. Cents: ${totalCents}`);
    }

    // 4. Calculate Platform Fee (Dynamic)
    let platformFeeCents = 0;

    // 4.1 Check for Championship specific overrides
    const { data: champData } = await supabase
      .from('championships')
      .select('platform_fee_configuration')
      .eq('id', registration.championship_id)
      .single();

    // 4.2 Check for Global Settings
    const { data: globalSettings } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'platform_fee_config')
      .maybeSingle();

    // 4.3 Determine Configuration to use
    let feeConfig = { type: 'percentage', value: 5 }; // Default

    if (champData?.platform_fee_configuration) {
      // Use Championship specific config
      // Ensure it's parsed if it comes as string (should be object if JSONB, but safety first)
      const config = champData.platform_fee_configuration;
      feeConfig = typeof config === 'string' ? JSON.parse(config) : config;
      console.log(`Using Championship Fee Config: ${JSON.stringify(feeConfig)}`);
    } else if (globalSettings?.value) {
      // Use Global Config
      // globalSettings.value is TEXT, need to parse
      try {
        feeConfig = JSON.parse(globalSettings.value);
        console.log(`Using Global Fee Config: ${JSON.stringify(feeConfig)}`);
      } catch (e) {
        console.error("Error parsing global fee config", e);
      }
    }

    // 4.4 Calculate Fee Cents
    if (feeConfig.type === 'fixed') {
      platformFeeCents = Number(feeConfig.value); // Value in cents
    } else {
      // Percentage
      platformFeeCents = Math.round(registration.total_cents * (Number(feeConfig.value) / 100));
    }

    console.log(`Calculated Platform Fee: ${platformFeeCents} cents (Config: ${JSON.stringify(feeConfig)}) from Total: ${registration.total_cents}`);


    // 5. Create Payment in Asaas
    const customer = {
      name: registration.athlete_name,
      cpfCpf: requestAthleteCpf || registration.athlete_cpf, // Use requestAthleteCpf if available
      email: registration.athlete_email,
      mobilePhone: registration.athlete_phone,
    };

    // Split Rule
    const splits = [];
    const isSandbox = ASAAS_API_KEY?.startsWith("$aact_hmlg_");

    if (isSandbox) {
      console.log("SANDBOX DETECTED: Skipping split payment rules. Full value goes to Master Wallet.");
    } else if (walletId) {

      // Calculate Organizer Share
      // Organizer gets: Total - PlatformFee
      const organizerShareCents = registration.total_cents - platformFeeCents;

      // Safety Check: Organizer share cannot be negative
      if (organizerShareCents <= 0) {
        throw new Error(`Invalid Fee Configuration: Platform Fee (${platformFeeCents}) exceeds Total Value (${registration.total_cents})`);
      }

      // Calculate Percentage for Asaas
      // Asaas Split Percentage = (OrganizerShare / Total) * 100
      let organizerSharePercentage = (organizerShareCents / registration.total_cents) * 100;

      // Fix: Asaas allows max 4 decimal places for percentualValue
      organizerSharePercentage = parseFloat(organizerSharePercentage.toFixed(4));

      console.log(`Split Calculation: Organizer gets ${organizerSharePercentage}% (${organizerShareCents} cents). Platform keeps ${platformFeeCents} cents.`);

      // If organizer wallet is different from platform wallet
      if (walletId !== PLATFORM_WALLET_ID) {
        splits.push({
          walletId: walletId,
          percentualValue: organizerSharePercentage,
        });
      }

      // No wallet ID: Everything stays in Master Account.
      // We can optionally explicitly send everything to PLATFORM_WALLET_ID if defined, 
      // but default behavior (empty split) is "Money stays in API Key owner's account".
    } else {
      // No wallet ID: Everything stays in Master Account.
      // We can optionally explicitly send everything to PLATFORM_WALLET_ID if defined, 
      // but default behavior (empty split) is "Money stays in API Key owner's account".
    }

    // 4. Create/Get Customer in Asaas
    // We search by email or CPF
    const customerEmail = registration.athlete_email;
    const customerName = registration.athlete_name;
    // Prefer the CPF sent from frontend (which might be corrected/manually entered) over the DB one
    const customerCpf = requestAthleteCpf || registration.athlete_cpf || "";
    const customerPhone = registration.athlete_phone || "";

    const baseUrl = getAsaasBaseUrl();
    const headers = {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY
    };

    let customerId;

    // Search Customer
    const searchRes = await fetch(`${baseUrl}/customers?email=${customerEmail}`, { headers });
    const searchData = await searchRes.json();

    if (searchData.data && searchData.data.length > 0) {
      const existingCustomer = searchData.data[0];
      customerId = existingCustomer.id;

      // Check if existing customer needs update (specifically CPF)
      if (customerCpf && (!existingCustomer.cpfCnpj || existingCustomer.cpfCnpj !== customerCpf)) {
        console.log(`Updating customer ${customerId} with new CPF: ${customerCpf}`);
        await fetch(`${baseUrl}/customers/${customerId}`, {
          method: "POST", // V3 uses POST for updates usually, or PUT. Docs say POST or PUT works.
          headers,
          body: JSON.stringify({
            cpfCnpj: customerCpf,
            name: customerName, // Update name too just in case
            phone: customerPhone
          })
        });
      }
    } else {
      // Create Customer
      const createRes = await fetch(`${baseUrl}/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: customerName,
          email: customerEmail,
          cpfCnpj: customerCpf,
          phone: customerPhone
        })
      });
      const createData = await createRes.json();
      if (createData.errors) throw new Error(`Erro ao criar cliente Asaas: ${createData.errors[0].description}`);
      customerId = createData.id;
    }

    // 5. Create Payment
    let paymentPayload: any = {
      customer: customerId,
      billingType: paymentMethod, // "PIX" or "CREDIT_CARD"
      value: totalValue,
      dueDate: new Date().toISOString().split('T')[0], // Today
      description: `Inscrição ${championship.name} - ${category.name}`,
      externalReference: registrationId,
      split: splits
    };

    if (paymentMethod === "CREDIT_CARD") {
      if (!cardData || !creditCardHolderInfo) {
        throw new Error("Dados do cartão incompletos (cardData ou creditCardHolderInfo faltando).");
      }

      paymentPayload = {
        ...paymentPayload,
        creditCard: {
          holderName: cardData.holderName,
          number: cardData.number,
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          ccv: cardData.ccv
        },
        creditCardHolderInfo: {
          name: creditCardHolderInfo.name,
          email: creditCardHolderInfo.email,
          cpfCnpj: creditCardHolderInfo.cpfCnpj,
          postalCode: creditCardHolderInfo.postalCode,
          addressNumber: creditCardHolderInfo.addressNumber,
          phone: creditCardHolderInfo.phone
        }
      };
    }

    console.log("Creating payment with payload:", JSON.stringify(paymentPayload)); // Debug

    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify(paymentPayload)
    });

    const paymentData = await paymentRes.json();

    if (paymentData.errors) {
      console.error("Asaas Payment Error:", paymentData.errors);
      throw new Error(`Erro Asaas: ${paymentData.errors[0].description}`);
    }

    // 6. Handle PIX specifics (QR Code)
    let pixData = null;
    if (paymentMethod === "PIX") {
      // Asaas requires a separate call to get the Qrcode payload sometimes, 
      // or it's in the response? V3 usually requires separate call for QrCode info if not explicitly returned.
      // Let's fetch it to be safe/standard.
      const pixRes = await fetch(`${baseUrl}/payments/${paymentData.id}/pixQrCode`, { headers });
      pixData = await pixRes.json();
    }

    // 7. Save Payment Record in DB
    const { data: savedPayment, error: saveError } = await supabase
      .from("payments")
      .insert({
        registration_id: registrationId,
        asaas_payment_id: paymentData.id,
        amount_cents: registration.total_cents,
        platform_fee_cents: PLATFORM_FEE_CENTS,
        net_amount_cents: registration.total_cents - PLATFORM_FEE_CENTS,
        payment_method: paymentMethod.toLowerCase(),
        status: paymentData.status === 'CONFIRMED' ? 'approved' : 'pending',
        payment_url: paymentData.invoiceUrl,
        pix_qr_code: pixData?.encodedImage,
        pix_copy_paste: pixData?.payload
      })
      .select()
      .single();

    if (saveError) {
      console.error("DB Save Error:", saveError);
      throw saveError;
    }

    // 8. Update Registration Status
    // If credit card is auto-approved (unlikely instantly for split but possible), update.
    if (paymentData.status === 'CONFIRMED') {
      await supabase
        .from("registrations")
        .update({
          payment_id: savedPayment.id,
          payment_status: 'approved',
          paid_at: new Date().toISOString()
        })
        .eq("id", registrationId);
    } else {
      await supabase
        .from("registrations")
        .update({ payment_id: savedPayment.id })
        .eq("id", registrationId);
    }

    return new Response(JSON.stringify({
      success: true,
      paymentId: paymentData.id,
      pix: pixData,
      invoiceUrl: paymentData.invoiceUrl,
      status: paymentData.status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
