# Notificacao Telegram

Esta Edge Function recebe webhooks de `INSERT` do Supabase e envia uma mensagem privada no Telegram.

## 1. Criar bot

1. Abra o Telegram e fale com `@BotFather`.
2. Envie `/newbot`.
3. Escolha nome e username.
4. Copie o token do bot.
5. Abra uma conversa com o bot criado e envie qualquer mensagem, como `oi`.

## 2. Descobrir seu chat_id

Troque `<BOT_TOKEN>` pelo token do bot:

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getUpdates"
```

Procure:

```json
"chat":{"id":123456789}
```

Esse numero e o `TELEGRAM_CHAT_ID`.

## 3. Configurar secrets da Edge Function

Use um segredo aleatorio para `NOTIFICATION_WEBHOOK_SECRET`.

```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN="<BOT_TOKEN>" --project-ref <PROJECT_REF>
npx supabase secrets set TELEGRAM_CHAT_ID="<CHAT_ID>" --project-ref <PROJECT_REF>
npx supabase secrets set NOTIFICATION_WEBHOOK_SECRET="<SEGREDO_ALEATORIO>" --project-ref <PROJECT_REF>
npx supabase secrets set BACKOFFICE_URL="https://seu-dominio.com" --project-ref <PROJECT_REF>
```

`BACKOFFICE_URL` e opcional, mas deixa a notificacao com link direto para o painel.

## 4. Deploy

```bash
npx supabase functions deploy notify-telegram --no-verify-jwt --project-ref <PROJECT_REF>
```

Usamos `--no-verify-jwt` porque o Database Webhook chama a funcao server-to-server. A funcao ainda valida o header `x-musclepro-webhook-secret`.

## 5. Criar Database Webhooks

No Supabase Dashboard:

1. `Database` -> `Webhooks` -> `Create a new hook`.
2. Evento: `INSERT`.
3. Method: `POST`.
4. URL:

```txt
https://<PROJECT_REF>.supabase.co/functions/v1/notify-telegram
```

5. Header:

```txt
x-musclepro-webhook-secret: <SEGREDO_ALEATORIO>
Content-Type: application/json
```

Crie webhooks para estas tabelas:

- `public.hero_form_submissions` (lead do formulario da home: nome, telefone, e-mail, tipo de estabelecimento, unidades, alunos ativos)
- `public.accounts` (cadastro de estabelecimento pela tela `/cadastro`: estabelecimento, tipo, responsavel, telefone, e-mail, documento)

Inserts em qualquer outra tabela sao ignorados pela funcao.

## 6. Teste

Envie um lead pelo formulario da home ou um cadastro pela tela `/cadastro`. Voce deve receber uma mensagem no Telegram em poucos segundos.
