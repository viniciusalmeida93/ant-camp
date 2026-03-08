# Configurações do Campeonato
**Rota:** `/championships/:id/settings`
**Acesso:** Organizador
**Componente:** `ChampionshipSettings`

---

## O que faz
Painel central de configuração do campeonato. Controla todas as informações e parâmetros do evento.

## Campos configuráveis
- Nome, slug (URL), descrição
- Data e local do evento
- Endereço completo (logradouro, cidade, UF)
- Logo e banner
- Regulamento (texto inline ou link externo)
- Publicar / despublicar campeonato
- Tornar indexável (aparecer em listagens)
- Período de inscrições (data início / fim)
- Período do evento (data início / fim)
- Total de dias do evento

> ⚠️ O horário de início de cada dia, intervalos entre baterias/categorias/provas, pausa programada e número de raias são todos configurados em [[Baterias]] na aba Horários
