
## Escopo (PDV + Comprovante + Configurações)
1) No PDV (/vendas), a 2ª forma de pagamento só aparece quando o operador ativar (atalho **F2**)  
2) Exibir rodapé com atalhos (incluindo F2) e implementar outros atalhos padrão  
3) No comprovante/recibo (PDF), mostrar **logo, nome, endereço e WhatsApp** (vindos de Configurações) em layout padrão BR  
4) Em Configurações → Dados da Loja, permitir **upload do logo** (Supabase Storage bucket público) e salvar em `store_settings.logo_url`

---

## 1) PDV: 2ª forma opcional (F2) + regras de validação
**Arquivo:** `src/pages/Vendas.tsx`

### 1.1 Estado novo
- Criar `const [useTwoPayments, setUseTwoPayments] = useState(false);` (default: **false**)
- Ajustar inicialização do split:
  - Se carrinho vazio: reset para defaults e `useTwoPayments=false`
  - Se `useTwoPayments=false`: `payment1Amount = total`, `payment2Amount = 0`

### 1.2 Atalho de teclado (F2)
- Adicionar `useEffect` com `window.addEventListener("keydown", ...)`
- Se `e.key === "F2"`:
  - `e.preventDefault()`
  - Toggle `useTwoPayments`
  - Ao **desativar** (voltar para 1 pagamento): aplicar seu comportamento escolhido **“Auto 100% no 1º”**
    - `payment1AmountText = total`
    - `payment2AmountText = "0,00"`
    - manter método 1 como está
  - Ao **ativar** (2 pagamentos): manter método 2 default (pix) e **recalcular** sugestão:
    - se ainda estiver 100% no 1, manter 0 no 2 (operador ajusta)

### 1.3 UI do carrinho
- Trocar label “Formas de Pagamento (2)” por:
  - “Formas de Pagamento” + badge/indicador “1” ou “2”
- Renderização condicional:
  - Sempre renderizar **Forma 1**
  - Renderizar **Forma 2** somente se `useTwoPayments === true`
  - Se `useTwoPayments=false`, esconder também a linha de resumo da forma 2 no modal “Resumo/Recibo (prévia)”

### 1.4 Validação
- Atualizar `paymentSplitError`:
  - Se `useTwoPayments=false`:
    - validar apenas: `payment1Amount === total` (com tolerância) e `payment1Amount >= 0`
    - **não** exigir métodos diferentes
  - Se `useTwoPayments=true`:
    - manter as regras atuais (métodos diferentes + soma bate total)

### 1.5 Resumo de pagamento e persistência
- `paymentMethodSummary`:
  - Se `useTwoPayments=false`: usar apenas `formatPaymentSummary(payment1Method, payment1Amount)`
  - Se `true`: manter “Forma1 + Forma2”

---

## 2) PDV: Rodapé de atalhos + outros atalhos padrão
**Arquivo:** `src/pages/Vendas.tsx`

### 2.1 Rodapé fixo no fim da página (não modal)
- Inserir ao final do conteúdo (antes dos `<Dialog/>` ou no final do layout) um card/box com:
  - “Atalhos do PDV”
  - Lista curta (layout em grid no desktop)
- Mostrar explicitamente:
  - **F2** — “Ativar/desativar 2 formas de pagamento”
  - **F9** — “Finalizar venda”
  - **F6** — “Abrir/Fechar caixa” (abre o dialog apropriado)
  - **F8** — “Limpar carrinho”
  - **F7** — “Reimpressão de vendas” (atalho para navegar para `/relatorios`)

### 2.2 Implementação dos atalhos
- No mesmo listener de teclado:
  - **F9**: chamar `handleFinalizeSale()` (se `canSell` e carrinho > 0)
  - **F6**:
    - se `cashSession` existe: abrir dialog de fechar caixa (`setCloseCashDialog(true)`)
    - senão: abrir dialog abrir caixa (`setOpenCashDialog(true)`)
  - **F8**: `setCart([])` (apenas se não estiver processando)
  - **F7**: `navigate("/relatorios")` (usar `useNavigate` do react-router-dom)
- Regras anti-conflito:
  - Ignorar atalhos se `e.target` for `INPUT|TEXTAREA|SELECT` (para não atrapalhar digitação)
  - Respeitar `isProcessing` quando necessário

---

## 3) Recibo/Comprovante: logo + dados da loja (layout BR)
**Arquivos:**
- `src/lib/pdv/saleReceiptPdf.ts`
- `src/pages/Vendas.tsx`
- `src/pages/Relatorios.tsx`

### 3.1 Expandir o input do PDF (compatível)
- Em `SaleReceiptPdfInput`, adicionar opcional:
  - `store?: { name?: string; address?: string | null; whatsapp?: string | null; logoUrl?: string | null }`
- Manter `storeName` por compatibilidade, mas passar a priorizar `store.name`

### 3.2 Carregar e desenhar logo (se existir)
- No `generateSaleReceiptPdf`:
  - Se `logoUrl`:
    - `fetch(logoUrl)` → `arrayBuffer`
    - detectar tipo via `content-type` ou extensão
    - `pdfDoc.embedPng` ou `embedJpg`
    - desenhar no topo centralizado (largura ~140–170pt, preservando aspect ratio)
  - Se falhar o fetch/embeb: seguir sem logo (sem quebrar impressão)

### 3.3 Cabeçalho padrão BR (80mm)
- Ordem sugerida:
  1. Logo (se houver)
  2. **NOME DA LOJA** (bold, uppercase)
  3. Endereço (quebrado em linhas curtas se necessário)
  4. WhatsApp (ex.: “WhatsApp: (11) 99999-9999”)
  5. Linha separadora
  6. “RECIBO DE VENDA” + data + id + pagamento etc.
- Ajustar `y` e quebras para não estourar largura (maxWidth já existe)

### 3.4 Passar dados corretos para o PDF
- Em `Vendas.tsx`:
  - No `loadPrinter`, buscar também: `address, whatsapp_number, logo_url`
  - Guardar em estados: `storeAddress`, `storeWhatsapp`, `storeLogoUrl`
  - Ao chamar `generateSaleReceiptPdf`, enviar `store: { name: storeName, address, whatsapp, logoUrl }`
- Em `Relatorios.tsx`:
  - Trocar a leitura `store_settings_public` por `store_settings` selecionando `store_name, address, whatsapp_number, logo_url`
  - Guardar esses campos em estado e repassar no `generateSaleReceiptPdf`

---

## 4) Configurações → Dados da Loja: upload do logo (Storage público)
**Arquivo:** `src/pages/Configuracoes.tsx`

### 4.1 Banco/Storage (schema)
Criar migração SQL para:
- Criar bucket **público** `store-assets`
- Criar políticas RLS em `storage.objects` para permitir **apenas admins autenticados** fazer:
  - INSERT/UPDATE/DELETE em arquivos cujo caminho comece com `${cnpj}/...`
  - Usar `public.current_user_cnpj(auth.uid())` para validar a pasta do tenant

### 4.2 UI de upload
- Na aba “Dados da Loja”, adicionar bloco “Logo da Loja”:
  - Preview do logo atual (se `settings.logo_url`)
  - `<input type="file" accept="image/png,image/jpeg,image/webp">`
  - Botões: “Enviar logo” e “Remover”
- Ao enviar:
  - Path: `${cnpj}/logo` + extensão (ou `${cnpj}/logo.png`)
  - `supabase.storage.from("store-assets").upload(path, file, { upsert: true, contentType: file.type })`
  - `getPublicUrl(path)` → salvar em `store_settings.logo_url`
  - Atualizar estado local `settings.logo_url` e exibir preview

### 4.3 Persistência no salvar
- Ajustar `handleSave` para incluir `logo_url` (caso o upload atualize antes/fora do salvar, manter consistência)

---

## Checklist de validação (end-to-end)
1) Ir em **Vendas**: carrinho com itens → confirmar que só aparece “Forma 1” inicialmente  
2) Pressionar **F2**: aparecer “Forma 2” e validação exigir soma e métodos diferentes  
3) Pressionar **F2** de novo: sumir “Forma 2” e “Forma 1” virar 100% do total automaticamente  
4) Usar **F9** para finalizar venda (sem mouse)  
5) Em **Configurações → Dados da Loja**: fazer upload do logo, preencher endereço e WhatsApp, salvar  
6) Voltar no PDV e imprimir recibo (prévia e venda real): confirmar que cabeçalho saiu com logo + nome + endereço + WhatsApp  
7) Ir em **Relatórios** e reimprimir: confirmar que o recibo também mostra os dados completos

---

## Arquivos a alterar
- `src/pages/Vendas.tsx`
- `src/lib/pdv/saleReceiptPdf.ts`
- `src/pages/Configuracoes.tsx`
- `src/pages/Relatorios.tsx`
- (Migração SQL) criar bucket/policies do Storage para `store-assets`
