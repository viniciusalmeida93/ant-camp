
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
    console.log('--- Listing Profiles ---');

    const targetId = '4177d08b-ed2e-4ae2-9e87-f5666a476366';
    const profiles = await query('profiles', 'id, email, full_name');

    const targetProfile = profiles.find(p => p.id === targetId);
    if (targetProfile) {
        console.log('Target Organizer Profile:', targetProfile);
    } else {
        console.log('Target ID not found in profiles table.');
        console.log('Listing all available profiles for context:');
        profiles.slice(0, 10).forEach(p => console.log(p));
    }
}

debug();
