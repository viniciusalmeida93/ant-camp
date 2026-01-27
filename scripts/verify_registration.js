
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

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }

    return await res.json();
}

async function debug() {
    console.log('--- Debugging Registration ---');

    try {
        // 1. Find Championship
        console.log('Fetching championship...');
        const championships = await query('championships', 'id, name, slug, organizer_id', { slug: 'caverna-challenge-2025' });
        const champ = championships[0];

        if (!champ) {
            console.log('Championship not found with slug: caverna-challenge-2025');
            return;
        }

        console.log('Championship found:', champ);

        // 2. Find Organizer Profile
        console.log('Fetching organizer profile...');
        const organizers = await query('profiles', 'id, email, full_name', { id: champ.organizer_id });
        const organizer = organizers[0];
        console.log('Organizer found:', organizer);

        // 3. Find Registrations for this Championship
        console.log('Fetching registrations for athlete...');
        const regs = await query('registrations', 'id, athlete_email, athlete_name, status, payment_status, created_at', {
            championship_id: champ.id,
            athlete_email: 'vinicius.almeidaa93@gmail.com'
        });

        console.log(`Found ${regs.length} registrations for vinicius.almeidaa93@gmail.com:`);
        regs.forEach(r => console.log(r));

        // 4. Find ALL Registrations for this Championship (count)
        console.log('Fetching total registration count...');
        const allRegs = await query('registrations', 'id', { championship_id: champ.id });
        console.log('Total registrations for this championship:', allRegs.length);

    } catch (error) {
        console.error('Debug failed:', error.message);
    }
}

debug();
