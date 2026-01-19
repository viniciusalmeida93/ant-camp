# Instruções de Deploy - Integração Asaas (Fase 1)

Como o comando automático falhou (CLI não encontrado), por favor execute os passos abaixo no seu terminal para colocar as funções no ar.

## 1. Deploy das Funções
Execute no terminal na raiz do projeto:

```bash
npx supabase functions deploy create-payment --no-verify-jwt
npx supabase functions deploy asaas-webhook --no-verify-jwt
```
*(Se preferir e tiver o supabase instalado globalmente, pode remover o `npx`)*

## 2. Configurar Variáveis de Ambiente
Vá no painel do Supabase (Project Settings > Edge Functions) e adicione as seguintes variáveis:

*   `ASAAS_API_KEY`: Sua chave de API do Asaas (começa com `$` geralmente).
*   `PLATFORM_WALLET_ID`: (Opcional) O ID da sua carteira se quiser separar o saldo da taxa. Se não colocar, o saldo fica na conta principal.

## 3. Testar
1.  Vá em **Inscrições** no site.
2.  Escolha uma categoria.
3.  Faça login/cadastro.
4.  No passo 3, clique em **"Pagar com PIX"**.
5.  O QR Code deve aparecer!
