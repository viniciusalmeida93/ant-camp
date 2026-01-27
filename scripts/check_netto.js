
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
    console.log('--- Checking Championships for Netto Santos ---');

    // 1. Find Profile with name containing "Netto"
    const profiles = await query('profiles', 'id, email, full_name');
    const netto = profiles.find(p => p.full_name?.toLowerCase().includes('netto') || p.email?.toLowerCase().includes('netto'));

    if (!netto) {
        console.log('Profile "Netto" not found.');
        console.log('All profiles:', profiles);
        return;
    }

    console.log('Netto Profile Found:', netto);

    // 2. Find Championships
    const champs = await query('championships', 'id, name, total_days, date', { organizer_id: netto.id });
    console.log(`Found ${champs.length} championships for Netto:`);
    champs.forEach(c => console.log(c));
}

debug();
