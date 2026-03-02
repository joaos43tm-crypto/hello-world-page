
## Diagnóstico (o que está acontecendo)
- O nome exibido na **Sidebar** e no topo de **Configurações** vem de `useAuth()` (`profile?.name`).
- Ao editar seu próprio usuário em **Configurações → Usuários**, a tela executa:
  - `supabase.from("profiles").update({ name })...`
  - mas **não atualiza o estado do AuthContext** (`profile`), então a UI continua mostrando o valor antigo até o contexto ser recarregado (e em alguns casos pode continuar “preso” por cache/estado do app).

## Ajuste proposto (comportamento esperado)
Após salvar a edição do usuário, se o usuário editado for o **mesmo usuário logado**, vamos atualizar o AuthContext chamando `refreshUserData()`.

### Onde mexer
Arquivo: `src/pages/Configuracoes.tsx`
Função: `handleUpdateUser`

### Lógica
1. Depois de confirmar que o update do `profiles` e `user_roles` deu certo:
2. Verificar se `editingUser.user_id === profile?.user_id`
3. Se sim, chamar `await refreshUserData()` (isso atualiza `profile` e `role` no contexto).
4. Manter o `setUsers(...)` como já está (para lista de usuários).
5. Fechar modal normalmente.

## Validação (como testar)
1. Ir em **Configurações → Usuários**
2. Editar o próprio usuário (mudar o nome) e salvar
3. Confirmar que:
   - O nome no topo de **Configurações** atualiza
   - O nome na **Sidebar** atualiza
4. (Opcional) Recarregar a página para garantir que o dado persistiu no banco e continua correto.

## Observação (robustez)
Se no futuro houver outros lugares que alterem `profiles.name`, podemos padronizar: sempre que alterar dados do usuário logado, chamar `refreshUserData()` ao final do fluxo.
