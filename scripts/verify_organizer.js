
const supabaseUrl = 'https://jxuhmqctiyeheamhviob.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

async function query(table, select = '*', filters = {}) {
    let url = `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    for (const [key, value] of Object.entries(filters)) {
        url += `&${key}=eq.${encodeURIComponent(value)}`;
    }

    const res = await fetch(url, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });

    return await res.json();
}

async function debug() {
    console.log('--- Verifying Organizer ---');

    const queryEmail = 'NETOSPERSONAL@HOTMAIL.COM';

    // We can't query auth.users directly via REST without admin key.
    // But we can check profiles if they exist.
    const profiles = await query('profiles', 'id, email', { email: queryEmail });
    if (profiles.length > 0) {
        console.log('Profile found for email:', profiles[0]);
    } else {
        // Try Case Insensitive or partial
        console.log('Profile not found by exact email. Checking all profiles with partial match...');
        const allProfiles = await query('profiles', 'id, email');
        const matched = allProfiles.find(p => p.email && p.email.toLowerCase() === queryEmail.toLowerCase());
        if (matched) {
            console.log('Profile found (case insensitive):', matched);
        } else {
            console.log('No profile found for this email.');
        }
    }
}

debug();
