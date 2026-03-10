const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function testFunction(functionName, payload) {
    console.log(`Testing ${functionName}...`);
    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Body: ${text}`);
    } catch (e) {
        console.error("Fetch error:", e);
    }
}

async function main() {
    await testFunction('delete-organizer', { userId: "dummy-id" });
    await testFunction('invite-organizer', { email: "test@test.com", password: "password123", full_name: "Test" });
}

main();
