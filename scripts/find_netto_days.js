
const supabaseUrl = 'https://jxuhmqctiyeheamhviob.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

async function query(table, select = '*') {
    let url = `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}`;

    const res = await fetch(url, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });

    return await res.json();
}

async function debug() {
    console.log('--- Finding Netto Santos Championships ---');

    const champs = await query('championships', 'id, name, total_days, date, slug, organizer_id');
    const matched = champs.filter(c =>
        c.name?.toLowerCase().includes('netto') ||
        c.slug?.toLowerCase().includes('netto') ||
        c.name?.toLowerCase().includes('santos') ||
        c.slug?.toLowerCase().includes('santos')
    );

    if (matched.length > 0) {
        console.log('Found matches:');
        matched.forEach(c => console.log(c));
    } else {
        console.log('No matches found for "netto" or "santos" in name/slug.');
    }

    // Check championship_days count for each champ
    console.log('\n--- Checking championship_days counts ---');
    for (const c of champs) {
        const days = await query('championship_days', 'id', { championship_id: c.id });
        if (days.length > 5) {
            console.log(`Champ "${c.name}" has ${days.length} days! (Slug: ${c.slug})`);
        }
    }
}

// Helper to query with filters
async function queryFiltered(table, select = '*', filters = {}) {
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

debug();
