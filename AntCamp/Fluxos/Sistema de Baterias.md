# Sistema de Baterias

> Parte do [[🏠 AntCamp — PRD Principal]] → Fluxos

---

## Criação Inicial
- Organizador define a quantidade de raias por bateria
- Para cada evento (publicado) × categoria: o sistema calcula automaticamente quantas baterias são necessárias para acomodar todos os inscritos
- Atletas mais antigos na inscrição ficam nas primeiras baterias, os mais recentes nas últimas
- Horários calculados automaticamente considerando: hora de início do dia, Time Cap de cada evento, intervalos configurados e pausa do dia

## Cálculo de Horários
- Feito separadamente para cada dia do campeonato
- Considera em sequência: hora de início do dia + Time Cap do evento + intervalo entre baterias + intervalo entre categorias + intervalo entre provas
- **Regra da pausa:** quando configurada, a pausa **substitui** o intervalo entre provas — os dois nunca ocorrem juntos
- A pausa só é aplicada após o término da **última bateria da última categoria** do evento configurado
- Todos os horários calculados aparecem tanto para o organizador quanto nas páginas públicas

## Reorganização por Resultado
- Disponível após o organizador publicar os resultados de um evento
- Atletas com menos pontos vão para as primeiras baterias, os melhores ficam para as últimas (convenção do CrossFit — cria suspense)
- Só processa categorias com resultados publicados

## Drag and Drop Manual
- **Atletas** podem ser arrastados entre raias e entre baterias manualmente
- **Baterias inteiras** podem ser arrastadas entre dias — todos os horários se reorganizam automaticamente
- Alerta de categoria: se um atleta for arrastado para bateria de outra categoria, o sistema avisa
- Alerta de conflito: se duas pessoas estiverem editando ao mesmo tempo, o sistema detecta e avisa

## Comportamento dos Botões — Gerar Baterias e Intercalar

### Gerar Baterias Geral
- Sempre gera todas as baterias de todas as categorias e todos os eventos
- Ignora completamente o que estiver selecionado nos filtros

### Gerar Baterias
- Categoria selecionada + Evento selecionado → gera baterias só daquela combinação
- Todas as Categorias + Todos os Eventos → gera todas as baterias (mesmo comportamento do Gerar Baterias Geral)
- Categoria selecionada + Todos os Eventos → mensagem: *"Selecione um evento para gerar as baterias"*
- Todas as Categorias + Evento selecionado → mensagem: *"Selecione uma categoria para gerar as baterias"*

### Intercalar (único botão)
- Todas as Categorias + Todos os Eventos → intercala tudo
- Categoria selecionada + Todos os Eventos → mensagem: *"Selecione um evento para intercalar"*
- Todas as Categorias + Evento selecionado → mensagem: *"Selecione uma categoria para intercalar"*
- Categoria selecionada + Evento selecionado → intercala só aquela combinação
- Serve também para equilibrar baterias com número ímpar de atletas — redistribui para maximizar ocupação das raias

### Filtro de Dia
- Não existe e não é necessário — cada evento já está vinculado a um dia específico definido no Dashboard do Organizador

## WOD Cancelado no Dia
- Organizador despublica o evento na página de Eventos
- As baterias daquele evento somem automaticamente
- Os horários dos demais eventos do dia recalculam automaticamente
- Nenhuma ação manual necessária — não precisa clicar em Atualizar Baterias

## Exportação
- Exportar a programação completa por dia em formato imprimível (PDF)

---

## Dívida Técnica ⚠️
- Arquivo de baterias com **4.599 linhas** — precisa ser dividido em partes menores — ver roadmap item 13
- **Validar regra da pausa:** confirmar que o sistema aplica a pausa somente após a última bateria da última categoria do evento, e que o intervalo entre provas é descartado nesse momento — ver roadmap item 4
