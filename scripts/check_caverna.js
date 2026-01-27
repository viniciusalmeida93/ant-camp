
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
    console.log('--- Checking Caverna Challenge 2025 ---');

    const champs = await query('championships', 'id, name, total_days, date, slug', { slug: 'caverna-challenge-2025' });
    if (champs.length > 0) {
        console.log('Caverna Challenge 2025 data:', champs[0]);
    } else {
        console.log('Caverna Challenge 2025 not found by slug.');
    }

    console.log('\n--- Checking all championships with total_days > 1 ---');
    const all = await query('championships', 'name, total_days, slug');
    all.filter(c => c.total_days > 1).forEach(c => console.log(c));
}

debug();
