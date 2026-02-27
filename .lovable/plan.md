
## Objetivo
Em **Relatórios (/relatorios)**:
1) Em **Vendas**: adicionar opção **Relatório Simples x Detalhado** + botão **Imprimir** para gerar PDF A4 do período (simples = lista; detalhado = lista + itens de cada venda).
2) Em **Caixa**: após pesquisar o período, adicionar botão **Imprimir** para gerar PDF A4 com **lista de sessões + totais do período + observações**.

---

## Explorar/entender estado atual (sem mudanças)
- Confirmado: `Relatorios.tsx` já tem:
  - Filtro de período para Vendas (`salesStart/salesEnd`) + lista `salesList`
  - Filtro de período para Caixa (`cashStart/cashEnd`) + lista `cashSessions`
  - Impressão atual por item:
    - Vendas: reimprime **recibo 80mm** via `generateSaleReceiptPdf(saleId)`
    - Caixa: reimprime **fechamento A4 por sessão** via `generateCashClosingPdf(sessionId)`
- Confirmado: `salesApi.getById()` já traz `items:sale_items(*, product, service)` (bom para detalhamento).
- Confirmado: `cashRegisterApi.getSessionSummary(sessionId)` fornece totais necessários (vendas/sangria/suprimento).

---

## Design da solução
### A) PDF novo: Relatório de Vendas (período) – A4
**Novo arquivo:** `src/lib/reports/salesPeriodReportPdf.ts`
- Exportar `generateSalesPeriodReportPdf(input)`
- Conteúdo do PDF:
  - Cabeçalho: Nome da loja + “Relatório de Vendas” + Período (De/Até) + “Gerado em…”
  - **Resumo do período**:
    - qtd vendas, total faturado, ticket médio
  - **Detalhado por venda (se modo detalhado)**:
    - Para cada venda: data/hora, id curto, cliente, forma pagamento, total
    - Itens: (nome, qtd, unit, subtotal) com quebra de página quando necessário
  - Rodapé: “Gerado pelo PetControl”
- Implementar paginação (A4):
  - Utilitário interno `ensureSpace(minHeight)`:
    - se `y < minY + minHeight` → `addPage()` e reseta `y`
  - Tabela simples com colunas alinhadas (sem depender de libs externas)

### B) PDF novo: Relatório de Caixa (período) – A4
**Novo arquivo:** `src/lib/reports/cashPeriodReportPdf.ts`
- Exportar `generateCashPeriodReportPdf(input)`
- Conteúdo do PDF:
  - Cabeçalho: Nome da loja + “Relatório de Caixa” + Período + “Gerado em…”
  - **Totais do período** (somatório das sessões fechadas do período):
    - total vendas, total suprimentos, total sangrias
    - saldo abertura total (soma), saldo fechamento total (soma)
    - caixa esperado total (soma) e diferença total
  - **Lista de sessões**:
    - Para cada sessão: abertura/fechamento, saldo abertura, saldo fechamento
    - Totais da sessão: vendasCount/vendasTotal, sangria, suprimento, esperado, diferença
    - Observações (closing_notes) com wrap/limite de linhas e paginação

---

## Alterações de UI/fluxo em /relatorios
### 1) Aba “Vendas”
**Arquivo:** `src/pages/Relatorios.tsx`
- Adicionar estado:
  - `reportMode: "simples" | "detalhado"` (default: `"detalhado"`)
  - `isPrintingSalesReport: boolean`
- Inserir UI próxima ao botão “Buscar” ou logo abaixo:
  - `RadioGroup` com:
    - “Relatório simples”
    - “Relatório detalhado”
  - Botão **Imprimir relatório**:
    - `disabled` se `salesList.length === 0` ou `isSalesLoading` ou `isPrintingSalesReport`
- Implementar handler `printSalesReport()`:
  - Validar período e existência de dados
  - Montar dataset:
    - Se **simples**: pode usar o `salesList` já carregado
    - Se **detalhado**: buscar detalhes (com itens) via `Promise.all(salesList.map(s => salesApi.getById(s.id)))`
      - Filtrar `null`
      - (Opcional) proteger com um “limite” por segurança (ex.: avisar se >200 vendas no período)
  - Gerar PDF via `generateSalesPeriodReportPdf({ store, period, mode, sales })`
  - `openAndPrintPdfBytes(pdfBytes)`
  - Tratar erros com toast

### 2) Aba “Caixa”
**Arquivo:** `src/pages/Relatorios.tsx`
- Adicionar estado:
  - `isPrintingCashReport: boolean`
- Após a linha de filtros (onde fica o botão “Buscar”), adicionar botão **Imprimir relatório**:
  - `disabled` se `cashSessions.length === 0` ou `isCashLoading` ou `isPrintingCashReport`
- Implementar handler `printCashReport()`:
  - Para cada sessão **fechada** no `cashSessions`:
    - Buscar resumo via `cashRegisterApi.getSessionSummary(session.id)` (usar `Promise.all`)
    - Calcular `expectedCash` e `difference` usando a mesma regra já existente
  - Agregar totais do período (somatórios)
  - Gerar PDF via `generateCashPeriodReportPdf({ store, period, sessions: enriched, totals })`
  - `openAndPrintPdfBytes(pdfBytes)`
  - Tratar erros com toast
  - Se houver sessões abertas no período, listar no PDF como “ABERTO” sem totais (ou simplesmente pular e indicar “Sessões abertas não entram no somatório”)

---

## Reuso dos dados da loja
- Reutilizar os estados já existentes em `Relatorios.tsx`:
  - `storeName`, `storeAddress`, `storeWhatsapp`, `storeLogoUrl`
- Para relatórios A4, usar pelo menos `storeName` no header (endereço/whatsapp opcionais; não essencial para relatório).

---

## Checklist de validação (end-to-end)
1) Em **Relatórios → Vendas**, selecionar um período com vendas → clicar **Buscar**
2) Alternar **Simples** e **Detalhado** → clicar **Imprimir relatório**
3) Conferir:
   - simples: lista de vendas + totais do período
   - detalhado: cada venda contém itens (produtos/serviços), totais corretos e quebra de página ok
4) Em **Relatórios → Caixa**, buscar um período com sessões → **Imprimir relatório**
5) Conferir:
   - lista de sessões + observações + totais do período batendo com os fechamentos

---

## Arquivos a criar/editar
- **Criar:** `src/lib/reports/salesPeriodReportPdf.ts`
- **Criar:** `src/lib/reports/cashPeriodReportPdf.ts`
- **Editar:** `src/pages/Relatorios.tsx`
