# AI Rules & Tech Stack - PetControl

## Tech Stack
- **Framework**: React 18 com Vite para um desenvolvimento rápido e build otimizado.
- **Linguagem**: TypeScript para tipagem estática e maior segurança no código.
- **Estilização**: Tailwind CSS para design responsivo e utilitário.
- **Componentes de UI**: shadcn/ui (baseado em Radix UI) para componentes acessíveis e customizáveis.
- **Backend & Auth**: Supabase para banco de dados PostgreSQL, autenticação e Edge Functions.
- **Gerenciamento de Estado/Dados**: TanStack Query (React Query) para cache e sincronização de dados assíncronos.
- **Roteamento**: React Router DOM v6 para navegação SPA.
- **Formulários**: React Hook Form integrado com Zod para validação de esquemas.
- **Ícones**: Lucide React para uma biblioteca de ícones consistente e leve.
- **PDF**: pdf-lib para geração dinâmica de relatórios e prontuários médicos.

## Regras de Desenvolvimento e Bibliotecas

### 1. Componentes de Interface
- **Sempre** utilize os componentes da pasta `src/components/ui/` (shadcn/ui).
- Não instale novas bibliotecas de UI sem necessidade; prefira compor com Tailwind e Radix.
- Utilize a utilidade `cn()` de `@/lib/utils` para combinar classes Tailwind condicionalmente.

### 2. Ícones
- Utilize **exclusivamente** a biblioteca `lucide-react`.
- Para serviços específicos, utilize o mapeamento em `src/lib/serviceIcons.tsx`.

### 3. Comunicação com Backend
- Utilize o cliente do Supabase em `@/integrations/supabase/client`.
- Para operações de negócio complexas, utilize as funções exportadas em `src/lib/petcontrol.api.ts`.
- **Não** faça chamadas diretas ao Supabase dentro de componentes se a lógica puder ser centralizada na API local.

### 4. Datas e Timezones
- Utilize `date-fns` para manipulação de datas.
- Para persistência e exibição consistente no Brasil, utilize a função `isoDateInTimeZone` de `@/lib/date.ts` (America/Sao_Paulo).

### 5. Notificações
- Utilize `sonner` (via componente `Sonner`) ou o hook `useToast` do shadcn para feedbacks ao usuário.

### 6. Padrões de Código
- Mantenha os componentes focados e, preferencialmente, com menos de 100 linhas.
- Utilize `use-client` apenas quando necessário em ambientes que suportem SSR (embora este projeto seja SPA).
- Siga a estrutura de pastas: `pages/` para rotas, `components/` para lógica reutilizável e `lib/` para utilitários e APIs.