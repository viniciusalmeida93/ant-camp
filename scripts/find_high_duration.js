
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
    console.log('--- Finding High Event Duration ---');

    const champs = await query('championships', 'id, name, total_days, date, slug');
    const highDuration = champs.filter(c => c.total_days > 5);

    console.log(`Verified ${champs.length} championships.`);
    if (highDuration.length > 0) {
        console.log('Championships with high duration (total_days > 5):');
        highDuration.forEach(c => console.log(c));
    } else {
        console.log('No championships found with total_days > 5.');
        console.log('Sample data (first 5):');
        champs.slice(0, 5).forEach(c => console.log(c));
    }
}

debug();
