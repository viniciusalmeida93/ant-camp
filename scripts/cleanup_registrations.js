
const supabaseUrl = 'https://jxuhmqctiyeheamhviob.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4dWhtcWN0aXllaGVhbWh2aW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0Mjc1NDEsImV4cCI6MjA3ODAwMzU0MX0.SXgw_idjdmaKmBZkYs9omG8A-WRt3HiTlnUZB-iP00s';

async function cleanup() {
    const email = 'vinicius.almeidaa93@gmail.com';
    console.log(`--- Removendo inscrições para: ${email} ---`);

    // 1. Buscar inscrições
    const res = await fetch(`${supabaseUrl}/rest/v1/registrations?athlete_email=eq.${encodeURIComponent(email)}`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
        }
    });
    const regs = await res.json();

    if (regs.length === 0) {
        console.log('Nenhuma inscrição encontrada para este e-mail.');
        return;
    }

    console.log(`Encontradas ${regs.length} inscrições. Removendo...`);

    // 2. Deletar (Cascata deve cuidar do resto se houver dependências, se não, deletamos manualmente)
    // Mas primeiro precisamos deletar pagamentos associados se houver restrições
    const regIds = regs.map(r => r.id);

    for (const id of regIds) {
        const delRes = await fetch(`${supabaseUrl}/rest/v1/registrations?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (delRes.ok) {
            console.log(`Inscrição ${id} removida.`);
        } else {
            const error = await delRes.text();
            console.error(`Erro ao remover inscrição ${id}:`, error);
        }
    }

    console.log('Limpeza concluída.');
}

cleanup();
