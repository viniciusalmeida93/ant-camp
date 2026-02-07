
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jxuhmqctiyeheamhviob.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log("🔍 Verifying Simulation Data...");

  const slugs = ['battle-games-2026', 'battle-trad-2026'];

  for (const slug of slugs) {
    console.log(`\n🏆 Championship: ${slug}`);
    const { data: champ } = await supabase.from('championships').select('id, name').eq('slug', slug).single();

    if (!champ) {
      console.error("   ❌ Not found!");
      continue;
    }

    // Check Categories
    const { data: cats } = await supabase.from('categories').select('id, name').eq('championship_id', champ.id);
    console.log(`   📂 Categories: ${cats?.length || 0}`);

    // Check WODs
    const { data: wods } = await supabase.from('wods').select('id, name').eq('championship_id', champ.id);
    console.log(`   🏋️ WODs: ${wods?.length || 0}`);
    wods?.forEach(w => console.log(`      - ${w.name}`));

    // Check Results
    if (wods && wods.length > 0) {
      const wodIds = wods.map(w => w.id);
      const { count } = await supabase.from('wod_results').select('*', { count: 'exact', head: true }).in('wod_id', wodIds);
      console.log(`   📝 Results: ${count}`);
    }

    // Check Heats
    const { count } = await supabase.from('heats').select('*', { count: 'exact', head: true }).eq('championship_id', champ.id);
    console.log(`   🔥 Heats: ${count}`);
  }
}

check();
