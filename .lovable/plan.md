
## Objetivo
Fazer com que **Plano atual / Vencimento / Últimos pagamentos** atualizem corretamente após o pagamento no Stripe, corrigindo a sincronização `sync-subscription`.

## Diagnóstico (baseado nos logs + Stripe)
- Logs da função: `"[SYNC-SUBSCRIPTION] Invalid current_period_end - {\"subId\":\"sub_1T594jR0szaLj9kg9ypthQGP\"}"`
- No Stripe, essa assinatura existe e está **active**. Porém, pelo retorno observado, o campo **`subscription.current_period_end` está vindo ausente/indefinido** na resposta que a função está usando.
- O `current_period_end` aparece **no item da assinatura** (`subscription.items.data[0].current_period_end`) e não necessariamente no topo, então nossa lógica atual falha e retorna `synced:false`, deixando:
  - `company_subscriptions.current_plan_key = null`
  - `stripe_*_id = null`
  - `subscription_payments` vazio  
  (confirmado pelas queries: a tabela `subscription_payments` está vazia e `company_subscriptions` está só com dados de trial).

## Plano de correção (código)
### 1) Ajustar `sync-subscription` para calcular validade corretamente
No `supabase/functions/sync-subscription/index.ts`:
- Após selecionar a assinatura `sub`, fazer um **retrieve completo**:
  - `const fullSub = await stripe.subscriptions.retrieve(sub.id, { expand: ["items.data.price"] })`
- Determinar `periodEndSeconds` com fallback (em ordem):
  1. `fullSub.current_period_end` (se existir)
  2. `fullSub.items?.data?.[0]?.current_period_end`
  3. (fallback final) buscar invoice paga e usar `invoice.period_end`
- Só então calcular `valid_until = new Date(periodEndSeconds * 1000).toISOString()`.

### 2) Garantir que `current_plan_key` seja preenchido mesmo sem metadata
Hoje `planKey` vem de `sub.metadata.plan_key`, mas pode não existir.
Implementar derivação por Price ID:
- Pegar `const priceId = fullSub.items.data[0]?.price?.id ?? fullSub.items.data[0]?.plan?.id`
- Mapear para:
  - `mensal` se `priceId === STRIPE_PRICE_ID_MENSAL`
  - `semestral` se `priceId === STRIPE_PRICE_ID_SEMESTRAL`
  - `anual` se `priceId === STRIPE_PRICE_ID_ANUAL`
- Se nenhum bater:
  - manter `planKey` como metadata se existir
  - senão salvar `current_plan_key = null` mas logar claramente que não foi possível mapear

### 3) Sincronizar pagamentos de forma confiável (não depender só do `latest_invoice`)
Hoje tentamos apenas `sub.latest_invoice`. Vamos reforçar:
- Buscar invoices pagas vinculadas à assinatura:
  - `stripe.invoices.list({ subscription: fullSub.id, limit: 5 })`
- Para cada invoice `paid` (ou com `status_transitions.paid_at`), inserir em `subscription_payments` se ainda não existir (idempotente por `stripe_invoice_id`).
- Preencher:
  - `paid_at` via `invoice.status_transitions.paid_at`
  - `period_start` / `period_end` via `invoice.period_start` / `invoice.period_end`
  - `amount` via `invoice.amount_paid / 100`

### 4) Garantir configuração correta do JWT na Edge Function
No `supabase/config.toml`:
- Adicionar:
  - `[functions.sync-subscription]`
  - `verify_jwt = false`
(para ficar consistente com o resto do projeto, já que a função valida JWT manualmente via `getClaims()`).

### 5) Observabilidade para suporte
Adicionar logs `logStep()` com:
- `customer.id`, `sub.id`, `sub.status`
- `priceId` detectado
- `periodEndSeconds` (e de onde veio: top-level vs item vs invoice)
- `cnpj` (sem dados sensíveis além disso)

## Plano de validação (end-to-end)
1) Abrir **Configurações → Assinatura** e clicar **Atualizar**.
2) Confirmar no UI:
   - “Plano atual” deixa de aparecer “Sem Plano”
   - “Vencimento” vira ~30 dias a partir de 26/02
   - “Últimos 5 pagamentos” mostra o pagamento (valor R$ 49,90)
3) Se ainda falhar, checar logs da função `sync-subscription` no Supabase para ver qual fallback foi usado e se houve falha no mapeamento do Price ID.

## Ajuste opcional (se quisermos deixar “à prova de futuro”)
- Se `subscription.status` vier `past_due`/`incomplete` mas houver invoice paga recente, considerar sincronizar mesmo assim (porque o usuário enxerga “pago” no Stripe). Isso é uma regra de negócio que podemos ligar/desligar via código.

## Arquivos que serão alterados
- `supabase/functions/sync-subscription/index.ts` (principal)
- `supabase/config.toml` (adicionar bloco da função)
