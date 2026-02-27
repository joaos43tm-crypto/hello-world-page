
## Objetivo
Preencher `cnpj` nos registros legados (cnpj `NULL`/vazio) para o CNPJ **15219072000100**, e depois endurecer o schema para evitar que isso volte a acontecer.

## 1) Diagnóstico rápido (SQL Editor)
1. Rodar contagem de legados por tabela:
```sql
select 'services' as t, count(*) total, count(*) filter (where cnpj is null or cnpj='') legados from public.services
union all select 'products', count(*), count(*) filter (where cnpj is null or cnpj='') from public.products
union all select 'medical_offices', count(*), count(*) filter (where cnpj is null or cnpj='') from public.medical_offices
union all select 'store_settings', count(*), count(*) filter (where cnpj is null or cnpj='') from public.store_settings;
```

## 2) Backfill (data fix) — atribuir legados ao CNPJ 15219072000100
> Executar no **Supabase SQL Editor** (isso é UPDATE de dados, não migration).

```sql
begin;

update public.services
set cnpj = '15219072000100'
where cnpj is null or cnpj = '';

update public.products
set cnpj = '15219072000100'
where cnpj is null or cnpj = '';

update public.medical_offices
set cnpj = '15219072000100'
where cnpj is null or cnpj = '';

-- conforme sua escolha: mover a linha atual (única) de store_settings
update public.store_settings
set cnpj = '15219072000100'
where cnpj is null or cnpj = '';

commit;
```

## 3) Validação pós-backfill
1. Conferir que “legados” viraram 0:
```sql
select 'services' as t, count(*) filter (where cnpj is null or cnpj='') legados from public.services
union all select 'products', count(*) filter (where cnpj is null or cnpj='') from public.products
union all select 'medical_offices', count(*) filter (where cnpj is null or cnpj='') from public.medical_offices
union all select 'store_settings', count(*) filter (where cnpj is null or cnpj='') from public.store_settings;
```
2. Conferir que os registros agora aparecem no app (Serviços/Produtos/Configurações) logado como empresa 15219072000100.

## 4) Endurecimento (schema) — impedir novos registros sem CNPJ
> Isso é **schema change**: fazer via **migration** (Modify database).

1. Garantir que não existe mais `NULL` antes de travar:
   - repetir validação do passo 3.
2. Migration:
   - `ALTER TABLE ... ALTER COLUMN cnpj SET NOT NULL` nas tabelas onde fizer sentido para o app:
     - `services`, `products`, `medical_offices`
   - Para `store_settings`, antes do `NOT NULL`, garantir que sempre existirá exatamente 1 row por empresa (ou, no mínimo, para todas empresas ativas). Se hoje vocês têm múltiplas empresas, planejar a criação de `store_settings` padrão por CNPJ antes de tornar `NOT NULL`.

## 5) Regressão / testes de isolamento (obrigatório)
1. Testar end-to-end com 2 contas de CNPJs diferentes:
   - Empresa A vê apenas os próprios serviços/produtos/consultórios/configs
   - Empresa B não enxerga os dados da A
2. Criar um novo serviço/produto e confirmar que o `cnpj` é preenchido automaticamente (trigger) e aparece apenas na empresa correta.
