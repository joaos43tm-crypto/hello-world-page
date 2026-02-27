
## Objetivo
Adicionar em **Relatórios (/relatorios)** uma nova seção/aba **Produtos** para:
- Ver **produtos mais vendidos** (ordenação por **quantidade**) no período
- Ver **margem de lucro** por produto (usando **custo atual do produto**)
- **Imprimir** um **PDF A4 paisagem** com **Resumo do período + Tabela** (no mesmo padrão de Vendas/Caixa)

---

## 1) Banco de dados (necessário para margem de lucro)
### 1.1 Migration: adicionar custo ao cadastro de produtos
Criar migration em `supabase/migrations/XXXXXXXX_add_product_cost_price.sql`:
- `ALTER TABLE public.products ADD COLUMN cost_price numeric NOT NULL DEFAULT 0;`
- (Opcional, mas recomendado) regra para evitar custo negativo:
  - manter simples no app (validação no front) e/ou adicionar trigger de validação (evitar CHECK com now(), mas aqui seria só `>= 0`, então CHECK seria ok; ainda assim podemos validar no app para reduzir risco).

### 1.2 RLS
- Não precisa mudar RLS: a tabela `products` já é visível para admin/atendente; admin gerencia.

---

## 2) Ajustes no Cadastro de Produtos (para preencher o custo)
### 2.1 Atualizar types e API
Editar `src/lib/petcontrol.api.ts`:
- `export interface Product` → adicionar `cost_price?: number | null` (ou `cost_price: number` se você preferir sempre presente).
- `productsApi.create(...)` e `productsApi.update(...)` devem aceitar/gravar `cost_price`.

### 2.2 UI de Produtos
Editar `src/pages/Produtos.tsx`:
- Adicionar campo no formulário: **Custo (R$)** (input number)
- Em edição: preencher `setCost(product.cost_price?.toString() ?? "0")`
- No submit: enviar `cost_price: parseFloat(cost || "0")`
- (Opcional) exibir no card/linha: “Custo: R$ …” e/ou “Margem (cadastro): …%” (apenas informativo)

Validações mínimas:
- custo >= 0
- preço >= 0
- se quiser: avisar quando custo > preço (margem negativa)

---

## 3) Dados/Agregação do Relatório de Produtos (período)
### 3.1 Estratégia de busca (seguindo padrão existente do projeto)
Para evitar joins complexos no PostgREST:
1) Em `/relatorios` (aba Produtos), após “Buscar”:
   - `salesApi.getByDateRange(start, end)` para obter as vendas do período
2) Para obter itens:
   - `Promise.all(salesList.map(s => salesApi.getById(s.id)))`
3) Agregar somente itens com `product_id`:
   - chave: `product.id`
   - somar:
     - `qty = Σ item.quantity`
     - `revenue = Σ item.subtotal`
     - `avgUnit = revenue / qty`
     - `costUnit = product.cost_price (atual)`
     - `costTotal = qty * costUnit`
     - `profit = revenue - costTotal`
     - `marginPct = revenue > 0 ? profit / revenue : 0`

Regras/observações:
- Se `product.cost_price` vier null/undefined, tratar como 0.
- Ordenação (pedido): **por quantidade desc**.
- (Opcional) limitar volume por segurança (ex.: se período tiver > 300 vendas, avisar que pode demorar).

---

## 4) UI em Relatórios: nova aba “Produtos”
Editar `src/pages/Relatorios.tsx`:
### 4.1 Tabs
- Expandir `activeTab` para incluir `"produtos"`
- Adicionar `TabsTrigger value="produtos"` com ícone (ex.: `Package` ou `ReceiptText`/`TrendingUp`)

### 4.2 Estados e handlers
Adicionar estados:
- `productsStart/productsEnd` (default `todayISO()`)
- `isProductsLoading`
- `productsRank: Array<{ productId; name; qty; revenue; costUnit; costTotal; profit; marginPct }>`
- `isPrintingProductsReport`

Handlers:
- `loadProductsReport()` (botão Buscar)
- `printProductsReport()` (botão Imprimir)

### 4.3 Layout (consistente com Vendas/Caixa)
- Filtro de período (start/end) + botão **Buscar**
- Cards de resumo do período:
  - “Itens vendidos (qtd total)”
  - “Faturamento produtos (R$)”
  - “Lucro bruto estimado (R$)”
  - “Margem média (ponderada) (%)” (profitTotal / revenueTotal)
- Tabela (usar componentes `Table` já existentes):
  - Produto | Qtd | Faturamento | Custo (unit) | Custo total | Lucro | Margem %
- Botão **Imprimir relatório**:
  - disabled se `productsRank.length === 0` ou loading/printing

Obs: usar o mesmo header da loja já carregado (`storeName`, `storeAddress`, `storeWhatsapp`, `storeLogoUrl`).

---

## 5) PDF novo: Relatório de Produtos (período) – A4 Paisagem
Criar `src/lib/reports/productsPeriodReportPdf.ts`:
- Export: `generateProductsPeriodReportPdf(input)`
- Página: `pageSize [841.89, 595.28]` (A4 paisagem), mesma paginação (`ensureSpace`, `addPage`) dos relatórios atuais
- Header padronizado (mesma lógica de logo/endereço/whatsapp já usada em `salesPeriodReportPdf.ts` e `cashPeriodReportPdf.ts`)
- Conteúdo:
  1) “Relatório de Produtos”
  2) Período + “Gerado em”
  3) **Resumo do período**
  4) **Tabela consolidada** (ranking por quantidade)
- Rodapé “Gerado pelo PetControl”

---

## 6) Integração da impressão
Editar `src/pages/Relatorios.tsx`:
- Importar `generateProductsPeriodReportPdf`
- Reutilizar `openAndPrintPdfBytes(pdfBytes)`
- `printProductsReport()` monta:
  - `period {start,end}`
  - `store {address, whatsapp, logoUrl}`
  - `summary totals`
  - `rows` (lista consolidada)
- Gerar e imprimir

---

## 7) Checklist de validação (end-to-end)
1) Em **Produtos** (cadastro): editar um produto e definir **Custo**
2) Em **Relatórios → Produtos**:
   - escolher período com vendas de produtos
   - clicar **Buscar**
   - conferir ranking (qtd) e valores de lucro/margem
3) Clicar **Imprimir relatório**:
   - confirmar PDF A4 **paisagem**
   - confirmar header com logo/endereço/whatsapp (quando configurados)
   - confirmar totais e paginação (se muitos produtos)
