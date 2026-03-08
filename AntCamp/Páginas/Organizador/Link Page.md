# Link Page (Página de Divulgação)
**Rota:** `/championships/:id/links`
**Acesso:** Organizador
**Componente:** `LinkPageConfig`

---

## O que faz
Permite configurar a página pública de divulgação do campeonato — funciona como uma bio do Instagram, centralizando os links importantes do evento.

## Campos configuráveis
- **Slug** — define a URL pública da página (`/links/:slug`)
- **Link da Bio** — link do Instagram do campeonato ou organizador
- **Link de Inscrição** — link direto para a [[Inscrição Wizard]], para o atleta cair direto na página de inscrição
- **Cor do Tema** — define a cor dos botões da página (apenas os botões do link da bio)
- **Banner** — upload de imagem de capa da página
  - Campo de texto alternativo (**Alt**) para acessibilidade
- **Botões** — botões de ação configuráveis pelo organizador (ex: regulamento, cronograma, redes sociais)

## Resultado
- Gera a [[Landing Page do Campeonato]] em `/links/:slug`
