
Objetivo
- Deixar a página “Consulta Médica” mais rápida e intuitiva para o médico:
  - Ver consultas de hoje e dos próximos 3 dias.
  - Escolher o consultório (sala) com 1 clique (cards).
  - Selecionar um agendamento facilmente (lista agrupada por data).
  - Só permitir “Iniciar Atendimento” para consultas do dia de hoje.

O que existe hoje (diagnóstico rápido)
- A tela atual (src/pages/ConsultaMedica.tsx) funciona assim:
  - Usuário escolhe uma data manualmente (input type="date").
  - Escolhe um agendamento em um Select (dropdown).
  - Escolhe consultório em outro Select.
  - Clica em “Iniciar Atendimento”.
- A busca de agendamentos é apenas “agendado” + “service ilike %consulta%” e apenas para 1 dia (queryDate).
- Há múltiplas queries para enriquecer (appointments -> pets -> tutors), o que deixa mais lento e mais “trabalhoso” para manter.

Decisão de UX (com base nas suas respostas)
- Mostrar “Hoje + 3 dias”
- Lista agrupada por data (Hoje, Amanhã, etc.)
- Consultórios como cards clicáveis
- Iniciar atendimento somente para consultas de hoje

Plano de implementação (frontend)
1) Redesenhar a área “Selecionar consulta agendada” para um fluxo em 2 passos, bem visual
   1.1) Bloco “Consultas (Hoje + 3 dias)” (lado esquerdo no desktop, topo no mobile)
   - Substituir o Select de “Cliente/Pet” por uma lista clicável de agendamentos.
   - Agrupar por data:
     - Seção “Hoje” (data atual)
     - Seção “Amanhã”
     - Seção “Depois de amanhã”
     - Seção “+3 dias”
   - Cada item da lista (linha/card) deve mostrar:
     - Hora (HH:mm) em destaque
     - Pet e Tutor
     - (Opcional) Observação/flag “Em andamento” caso no futuro você exiba outros status (por enquanto só “agendado”)
   - Clique no item seleciona o appointmentId (e atualiza os “contextPetName/contextTutorName”).
   - Exibir um estado vazio amigável quando não houver consultas no período.

   1.2) Bloco “Escolha a sala (consultório)” (lado direito no desktop)
   - Substituir Select por um grid de cards/botões:
     - Cards com nome do consultório
     - Card selecionado com borda/realce (ex.: ring-primary)
     - Clique define officeId
   - Se não houver consultórios ativos, mostrar aviso “Cadastre consultórios em Configurações” (ou onde fizer sentido no seu app).

2) Regras de habilitação do botão “Iniciar Atendimento”
- O botão fica desabilitado até:
  - ter agendamento selecionado E
  - ter consultório selecionado E
  - não existir atendimento current em andamento
- Regra adicional: só permitir iniciar se o agendamento for de hoje:
  - Se o usuário clicar em uma consulta de amanhã/+2/+3:
    - manter seleção (para “pré-visualizar” e já deixar pronto), mas mostrar aviso acima do botão:
      - “Você só pode iniciar atendimentos agendados para hoje.”
    - botão permanece desabilitado (ou habilita e mostra toast bloqueando; recomendado: desabilitar para ficar bem claro)

3) Melhorar a performance e reduzir complexidade das queries de agendamentos
- Trocar a estratégia de “appointments -> pets -> tutors” por 1 query com relacionamento:
  - appointments.select("id,pet_id,scheduled_date,scheduled_time,status,service_id, pet:pets(name,tutor:tutors(name))")
  - Filtrar:
    - status = "agendado"
    - scheduled_date entre [hoje .. hoje+3]
    - service_id IN (ids de serviços contendo “consulta”)
  - Ordenar por scheduled_date, scheduled_time
- Manter loadMedicalServices (ilike %consulta%) como hoje, mas:
  - Rodar 1 vez ao entrar na tela (ou cachear em state e só recarregar se necessário)
  - Depois buscar os agendamentos do range

4) Ajustes de layout para “ficar fácil no dia a dia”
- Layout responsivo em 2 colunas no desktop:
  - Coluna esquerda: lista de consultas (scroll interno)
  - Coluna direita: cards de consultório + CTA “Iniciar Atendimento”
- No mobile:
  - Primeiro lista de consultas
  - Depois consultórios
  - Botão “Iniciar Atendimento” pode ficar “sticky” na parte de baixo (opcional) para reduzir rolagem
- Manter o card “Atendimento em andamento” no topo como está, mas:
  - Quando current existir, travar a área de seleção (como já faz) e deixar visualmente claro:
    - “Finalize o atendimento atual para iniciar outro.”
  - A lista pode permanecer visível, porém desabilitada (ou ocultar e mostrar apenas o atendimento em andamento). Recomendação: manter visível porém desabilitada com uma camada/opacity, para o médico ainda “ver o que vem a seguir”.

5) Pequenos refinamentos que aumentam a usabilidade (sem mudar regras)
- Adicionar um campo de “Busca rápida” (opcional) acima da lista:
  - Filtra por tutor/pet dentro do período carregado (client-side, sem nova query)
- Exibir contadores por dia no cabeçalho de cada seção (ex.: “Hoje (3)”)

6) Garantir que o fluxo atual de atendimento (anotações/PDF/finalização) não seja quebrado
- Não mexer no bloco de atendimento em andamento além de ajustes visuais.
- “Iniciar Atendimento” continua inserindo em medical_consultations com:
  - office_id
  - created_by
  - appointment_id
  - pet_id
- PDF e notas permanecem iguais.

Arquivos que serão alterados
- src/pages/ConsultaMedica.tsx
  - Reestruturar UI da seleção
  - Refatorar loadTodayAppointments para loadUpcomingAppointments (hoje..hoje+3)
  - Ajustar a tipagem TodayAppointment para incluir scheduled_date e nomes vindos do join

Opcional (se você quiser deixar mais “componente” e reutilizável)
- Criar componentes simples em src/components/medical/ (somente se fizer sentido para manter organização):
  - UpcomingMedicalAppointmentsList.tsx (lista agrupada)
  - MedicalOfficePicker.tsx (cards de consultório)
Obs: isso é opcional; dá para fazer tudo dentro da própria página mantendo legibilidade.

Critérios de aceite (o que você deve conseguir fazer após a mudança)
- Ao entrar em “Consulta Médica”:
  - Enxergo consultas de Hoje, Amanhã, +2 e +3, agrupadas por data.
  - Clico em uma consulta e ela fica selecionada.
  - Clico em um consultório (card) e ele fica selecionado.
  - Se a consulta for de hoje, o botão “Iniciar Atendimento” habilita e inicia normalmente.
  - Se a consulta for de outro dia, o botão fica desabilitado com mensagem explicando.
  - Se já houver atendimento em andamento, não consigo iniciar outro e a tela deixa isso óbvio.

Testes (end-to-end) que faremos depois de implementar
- Com consultas no período:
  - Selecionar consulta de hoje + selecionar consultório + iniciar atendimento.
  - Selecionar consulta de amanhã + selecionar consultório + confirmar que não inicia.
- Sem consultórios ativos: ver mensagem e não permitir iniciar.
- Com atendimento current em andamento: não permitir iniciar outro; salvar notas; gerar PDF; finalizar; depois iniciar um novo.
- Testar no mobile: seleção com toque e rolagem confortável.

Riscos/atenções
- Timezone: continuar usando isoDateInTimeZone("America/Sao_Paulo") para “hoje” e para calcular +1/+2/+3, para não “virar o dia” errado.
- Serviços médicos: depende do nome conter “consulta”; manter isso como regra atual.
