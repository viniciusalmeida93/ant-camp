// Helper to generate valid CPF
function generateCPF() {
    const rnd = (n: number) => Math.round(Math.random() * n);
    const mod = (base: number, div: number) => Math.round(base - Math.floor(base / div) * div);
    const n = Array(9).fill(0).map(() => rnd(9));

    let d1 = n.reduce((total, number, index) => total + number * (10 - index), 0);
    d1 = 11 - mod(d1, 11);
    if (d1 >= 10) d1 = 0;

    let d2 = n.reduce((total, number, index) => total + number * (11 - index), 0) + d1 * 2;
    d2 = 11 - mod(d2, 11);
    if (d2 >= 10) d2 = 0;

    return `${n.join('')}${d1}${d2}`;
}

import { describe, it, expect, beforeAll } from 'vitest';
import { createAuthenticatedClient } from '../../test/supabase-client';
import { TEST_CREDENTIALS } from '../../test/test-credentials';

describe('Payment Flow Integration', () => {
    let organizerClient: any;
    let athleteClient: any;
    let championshipId: string;
    let categoryId: string;
    let registrationId: string;
    const athleteCPF = generateCPF();

    beforeAll(async () => {
        // Init clients
        organizerClient = await createAuthenticatedClient(TEST_CREDENTIALS.ORGANIZER.email, TEST_CREDENTIALS.ORGANIZER.password);
        athleteClient = await createAuthenticatedClient(TEST_CREDENTIALS.ATHLETE.email, TEST_CREDENTIALS.ATHLETE.password);
    }, 30000); // Higher timeout for auth

    it('should allow Organizer to create a Championship and Category', async () => {
        // 1. Create Championship
        const timestamp = Date.now();
        const champData = {
            name: `Integration Test Champ - ${timestamp}`,
            slug: `integration-test-champ-${timestamp}`,
            date: new Date().toISOString(),
            location: 'Test Location',
            description: 'Created by Integration Test',
            organizer_id: (await organizerClient.auth.getUser()).data.user.id
        };

        const { data: champ, error: champError } = await organizerClient
            .from('championships')
            .insert(champData)
            .select()
            .single();

        if (champError) console.error("Champ Create Error:", champError);
        expect(champError).toBeNull();
        expect(champ).toBeDefined();
        championshipId = champ.id;

        // 2. Create Category
        const catData = {
            championship_id: championshipId,
            name: 'Test Scaled',
            format: 'individual',
            gender: 'misto', // Add gender as it's required in form
            price_cents: 10000,
            capacity: 10,
            athletes_per_heat: 10 // Add default
        };

        // Create Asaas Integration for Organizer
        // Use VALID SANDBOX WALLET ID provided by User
        // This ensures the split logic works against the real Sandbox API
        const { error: intError } = await organizerClient
            .from('organizer_asaas_integrations')
            .upsert({
                organizer_id: (await organizerClient.auth.getUser()).data.user.id,
                asaas_wallet_id: 'c451d6ce-e4ce-46d2-9d07-9f154710c0f3', // Valid Sandbox Wallet
                asaas_api_key: '$aact_dummy_key', // Required by schema
                is_active: true
            }, { onConflict: 'organizer_id' });

        if (intError) console.error("Integration Create Error:", intError);
        expect(intError).toBeNull();

        const { data: cat, error: catError } = await organizerClient
            .from('categories')
            .insert(catData)
            .select()
            .single();

        if (catError) console.error("Cat Create Error:", catError);
        expect(catError).toBeNull();
        expect(cat).toBeDefined();
        categoryId = cat.id;

        console.log(`Created Champ: ${championshipId}, Cat: ${categoryId}`);
    });

    it('should allow Athlete to Register', async () => {
        const athleteUser = (await athleteClient.auth.getUser()).data.user;
        const regData = {
            championship_id: championshipId,
            category_id: categoryId,
            // athlete_id removed - not in schema
            athlete_name: 'Integration Athlete',
            athlete_email: athleteUser.email,
            athlete_phone: '11999999999', // Valid phone
            status: 'pending',
            total_cents: 10500, // 100 + 5 fee
            subtotal_cents: 10000,
            platform_fee_cents: 500
        };

        const { data: reg, error: regError } = await athleteClient
            .from('registrations')
            .insert(regData)
            .select()
            .single();

        if (regError) console.error("Registration Error:", regError);
        expect(regError).toBeNull();
        expect(reg).toBeDefined();
        registrationId = reg.id;
        console.log(`Created Registration: ${registrationId}`);
    });

    it('should invoke create-payment and return payment link', async () => {
        // Prepare Authentication Header
        const session = (await athleteClient.auth.getSession()).data.session;
        const token = session?.access_token;
        const supabaseUrl = process.env.VITE_SUPABASE_URL;

        if (!token || !supabaseUrl) {
            throw new Error("Missing auth token or Supabase URL");
        }

        // Direct Fetch to Debug 400 Error Body
        // functions.invoke often consumes the body or throws, hiding the message.
        const response = await fetch(`${supabaseUrl}/functions/v1/create-payment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                registrationId,
                athleteCpf: athleteCPF,
                paymentMethod: 'PIX'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Payment Function FAILURE STATUS:", response.status);
            console.error("Payment Function FAILURE BODY:", errorText);
            throw new Error(`Function failed with ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log("Payment Function Response:", data);

        expect(data.paymentId).toBeDefined();
        if (data.paymentUrl) {
            expect(data.paymentUrl).toContain('asaas.com');
        }

        // Verify split if possible (data.split?)
        // Sandbox might not return split details in the same way, but let's check.
    }, 60000); // 60s timeout for function invocation
});
