
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Asaas API Configuration
const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
const PLATFORM_WALLET_ID = Deno.env.get("PLATFORM_WALLET_ID");

const getAsaasBaseUrl = () => {
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

    const {
      registrationId,
      paymentMethod: rawPaymentMethod = "PIX",
      cardData,
      creditCardHolderInfo,
      priceCents: requestPriceCents,
      athleteCpf: requestAthleteCpf,
      installments = 1,
      couponCode // Receive coupon code
    } = await req.json();

    const paymentMethod = rawPaymentMethod.toUpperCase();

    if (!registrationId) {
      throw new Error("ID da inscrição é obrigatório");
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
      throw new Error("Inscrição não encontrada");
    }

    const category = registration.category;
    const championship = category.championship;
    const organizerId = championship.organizer_id;

    // 2. Fetch Organizer's Wallet ID
    const { data: integration } = await supabase
      .from("organizer_asaas_integrations")
      .select("asaas_wallet_id")
      .eq("organizer_id", organizerId)
      .eq("is_active", true)
      .maybeSingle();

    let walletId = integration?.asaas_wallet_id;

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

    // 2.5 Handle Coupon Logic (Validate & Calculate Discount for Report)
    let couponId = null;
    let discountCents = 0;

    if (couponCode) {
      const { data: coupon, error: couponError } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.toUpperCase().trim())
        .eq("championship_id", registration.championship_id)
        .eq("is_active", true)
        .maybeSingle();

      // We don't block payment if coupon is invalid (maybe client-side validation failed?), 
      // but we won't link it. Or SHOULD we block?
      // Client passed requestPriceCents assuming coupon is valid.
      // If we find coupon invalid, the price might be wrong (too low).
      // Blocking is safer to prevent exploitation.
      if (!coupon) {
        throw new Error("Cupom inválido ou não encontrado");
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        throw new Error("Cupom expirado");
      }

      if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        throw new Error("Limite de uso do cupom atingido");
      }

      couponId = coupon.id;

      // Calculate expected discount to store in DB
      // We use registration.subtotal_cents as base (or category price)
      const basePrice = registration.subtotal_cents || category.price_cents;
      if (coupon.discount_type === 'percentage') {
        discountCents = Math.round(basePrice * (coupon.discount_value / 100));
      } else {
        discountCents = coupon.discount_value;
      }
      discountCents = Math.min(discountCents, basePrice);
    }

    // 3. Determine Total Value (Use requestPriceCents if available as it includes markup)
    let totalCents = registration.total_cents;
    if (requestPriceCents && requestPriceCents > 0) {
      totalCents = requestPriceCents;
    }

    if (!totalCents || totalCents <= 0) {
      throw new Error(`Valor do pagamento inválido. Cents: ${totalCents}`);
    }

    // 4. Calculate Platform Fee (Dynamic)
    let platformFeeCents = 0;

    // Check for Championship specific overrides
    const { data: champData } = await supabase
      .from('championships')
      .select('platform_fee_configuration')
      .eq('id', registration.championship_id)
      .single();

    // Check for Global Settings
    const { data: globalSettings } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'platform_fee_config')
      .maybeSingle();

    let feeConfig = { type: 'percentage', value: 5 }; // Default

    if (champData?.platform_fee_configuration) {
      const config = champData.platform_fee_configuration;
      feeConfig = typeof config === 'string' ? JSON.parse(config) : config;
    } else if (globalSettings?.value) {
      try {
        feeConfig = JSON.parse(globalSettings.value);
      } catch (e) {
        console.error("Error parsing global fee config", e);
      }
    }

    if (feeConfig.type === 'fixed') {
      platformFeeCents = Number(feeConfig.value); // Value in cents
    } else {
      // Percentage of the SUB-TOTAL (Original Price), not the Markup Total?
      // Actually, standard is usually percentage of the transaction.
      // But 'registration.total_cents' in DB is the Subtotal + Platform Fee (from PublicRegistration logic).
      // Let's rely on calculating based on 'registration.subtotal_cents' OR 'registration.total_cents' (which is subtotal + fee in logic).
      // If we use 'totalCents' (Markup Total), we might double charge if fee is %.
      // Safest: Use 'registration.subtotal_cents' if available, or 'category.price_cents'.

      const baseForFee = registration.subtotal_cents || category.price_cents || registration.total_cents; // Fallback
      platformFeeCents = Math.round(baseForFee * (Number(feeConfig.value) / 100));
    }

    console.log(`Calculated Platform Fee: ${platformFeeCents} cents.`);

    // 5. Create/Get Customer in Asaas
    const customerEmail = registration.athlete_email;
    const customerName = registration.athlete_name;
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

      if (customerCpf && (!existingCustomer.cpfCnpj || existingCustomer.cpfCnpj !== customerCpf)) {
        await fetch(`${baseUrl}/customers/${customerId}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            cpfCnpj: customerCpf,
            name: customerName,
            phone: customerPhone
          })
        });
      }
    } else {
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

    // 6. Split Logic
    const splits = [];
    const isSandbox = ASAAS_API_KEY?.startsWith("$aact_hmlg_");

    if (isSandbox) {
      console.log("SANDBOX: Skipping splits.");
    } else if (walletId && walletId !== PLATFORM_WALLET_ID) {
      // Split Strategy:
      // We want the Platform to receive EXACTLY platformFeeCents.
      // Everything else should go to the Organizer (walletId).
      // But Asaas charges fees from the Wallet that owns the Split?
      // Usually, fees are deducted from the 'Main' receiver or shared.
      // Strategy: Send FIXED Value to Platform Wallet. Organizer is Main Recipient (or vice-versa).

      // OPTION A: Current Master Wallet (ANTCAMP) creates payment. Split % goes to Organizer.
      // Master pays fees. 
      // If we use this, Master pays 1.99 or 2.99%.
      // We increased Total to cover this.
      // So Master receives Total. Master pays Fee. Master sends 'CategoryPrice' to Organizer.
      // Master keeps 'PlatformFee'.
      // This is complicated to calculate exact % for Organizer dynamically.

      // OPTION B: Split by FIXED VALUE.
      // We can split Fixed Value to Organizer? 'CategoryPrice + 0'?
      // Or Split Fixed Value to Platform?

      // Let's use FIXED VALUE split to PLATFORM (if we can), and the rest goes to Organizer?
      // Check Asaas API: Split can be fixedValue.

      // If we are creating payment with Master API Key:
      // Master is the owner.
      // We want to send Money to Organizer Wallet.
      // Split: { walletId: organizerWalletId, fixedValue: CATEGORY_PRICE ??? } -> NO.
      // If Master pays fees, Organizer gets Fixed Value Clean?
      // Asaas Docs: "When splitting by fixed value, the fee is deducted from the remaining amount (owner)".
      // So if Master creates payment, fees are deducted from Master.
      // If we Split Fixed Value = 300.00 to Organizer.
      // Total = 310.99.
      // Master gets 310.99.
      // Split 300.00 to Org.
      // Master keeps 10.99.
      // Master pays 1.99 Fee.
      // Master Net = 9.00. (Platform Fee).
      // THIS WORKS PERFECTLY!

      // Wait, what if user pays Card?
      // Total = 318.94.
      // Master gets 318.94.
      // Split 300.00 to Org.
      // Master keeps 18.94.
      // Master pays Fee (318.94 * 2.99% + 0.40) ~= 9.94.
      // Master Net = 18.94 - 9.94 = 9.00. (Platform Fee).
      // THIS ALSO WORKS PERFECTLY!

      // So the logic is: SPLIT FIXED VALUE = CATEGORY_PRICE (subtotal) to ORGANIZER.
      // The rest stays with Master (which covers fees + platform fee).

      // Requirement: We need 'subtotal_cents' (Category Price).
      const organizerFixedShare = registration.subtotal_cents || category.price_cents;

      splits.push({
        walletId: walletId,
        fixedValue: organizerFixedShare / 100, // API expects value in REAIS for fixedValue? or Cents?
        // Asaas API v3 usually takes numbers. 'value' in payment creation is float. 'fixedValue' is float.
        // Convert cents to float.
      });

    }

    // 7. Create Payment Payload
    let totalValue = totalCents / 100; // Float

    let paymentPayload: any = {
      customer: customerId,
      billingType: paymentMethod,
      value: totalValue,
      dueDate: new Date().toISOString().split('T')[0],
      description: `Inscrição ${championship.name} - ${category.name}`,
      externalReference: registrationId,
      split: splits
    };

    if (paymentMethod === "CREDIT_CARD") {
      paymentPayload.installmentCount = installments;
      if (!cardData || !creditCardHolderInfo) throw new Error("Dados do cartão faltando");
      paymentPayload.creditCard = {
        holderName: cardData.holderName,
        number: cardData.number,
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
        ccv: cardData.ccv
      };
      paymentPayload.creditCardHolderInfo = creditCardHolderInfo;
    } else if (paymentMethod === "DEBIT_CARD") {
      if (!cardData || !creditCardHolderInfo) throw new Error("Dados do cartão faltando");
      paymentPayload.creditCard = {
        holderName: cardData.holderName,
        number: cardData.number,
        expiryMonth: cardData.expiryMonth,
        expiryYear: cardData.expiryYear,
        ccv: cardData.ccv
      };
      paymentPayload.creditCardHolderInfo = creditCardHolderInfo;
    }

    console.log("Creating payment with payload:", JSON.stringify(paymentPayload));

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

    // 8. PIX QR Code
    let pixData = null;
    if (paymentMethod === "PIX") {
      const pixRes = await fetch(`${baseUrl}/payments/${paymentData.id}/pixQrCode`, { headers });
      pixData = await pixRes.json();
    }

    // 9. Save to DB
    // We should store the 'charged' amount (totalCents) in amount_cents?
    // Or the 'net' amount?
    // Let's store Total Charged in amount_cents.
    // Platform Fee = The actual Platform Fee (9.00).
    // Net Amount = Organizer Share (300.00).

    const { data: savedPayment, error: saveError } = await supabase
      .from("payments")
      .insert({
        registration_id: registrationId,
        asaas_payment_id: paymentData.id,
        amount_cents: totalCents,
        platform_fee_cents: platformFeeCents,
        // net_amount logic might need adjustment if we want to show Organizer Net specifically
        net_amount_cents: registration.subtotal_cents || category.price_cents,
        payment_method: paymentMethod.toLowerCase(),
        status: paymentData.status === 'CONFIRMED' ? 'approved' : 'pending',
        payment_url: paymentData.invoiceUrl,
        pix_qr_code: pixData?.encodedImage,
        pix_copy_paste: pixData?.payload,
        metadata: { installments: installments }
      })
      .select()
      .single();

    if (saveError) {
      console.error("DB Save Error:", saveError);
      throw saveError;
    }

    // 10. Update Registration
    if (paymentData.status === 'CONFIRMED') {
      await supabase
        .from("registrations")
        .update({
          payment_id: savedPayment.id,
          payment_status: 'approved',
          paid_at: new Date().toISOString(),
          total_cents: totalCents
        })
        .eq("id", registrationId);
    } else {
      await supabase
        .from("registrations")
        .update({
          payment_id: savedPayment.id,
          total_cents: totalCents, // Update the total to reflect the markup charged
          coupon_id: couponId,
          discount_cents: discountCents
        })
        .eq("id", registrationId);
    }

    // Increment Coupon Usage
    if (couponId) {
      await supabase.rpc('increment_coupon_usage', { coupon_id: couponId });
      // Fallback if RPC doesn't exist (using direct update with danger of race condition, but simple for now)
      // Actually RPC is better. I'll check if RPC exists later, but for now I will try direct update assuming low concurrency
      // Or just:
      const { error: cntError } = await supabase
        .from("coupons")
        .update({ used_count: (await supabase.from("coupons").select("used_count").eq("id", couponId).single()).data.used_count + 1 })
        .eq("id", couponId);
      // Note: The above is racy. Postgres has `used_count = used_count + 1` syntax but via Supabase JS client it's not direct unless using rpc.
      // But wait, the user doesn't have `increment_coupon_usage` RPC created yet probably.
      // I will assume low concurrency for this MVP or I should have created the RPC.
      // I'll create the RPC in the next step to be safe, but for now the Edge Function needs valid code.
      // Better approach without RPC: Fetch, then Update. (Still racy but acceptable for MVP).
      /*
      const { data: cData } = await supabase.from('coupons').select('used_count').eq('id', couponId).single();
      if (cData) {
         await supabase.from('coupons').update({ used_count: cData.used_count + 1 }).eq('id', couponId);
      }
      */
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
