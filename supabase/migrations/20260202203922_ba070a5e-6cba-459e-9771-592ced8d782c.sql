ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS whatsapp_templates jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Populate default templates for existing rows that have empty templates
UPDATE public.store_settings
SET whatsapp_templates = jsonb_build_object(
  'agendado', 'Olá{tutor}! 🐾\n\nConfirmamos o agendamento{pet} para {date} às {time}.\n\nTe esperamos! 💚',
  'em_atendimento', 'Olá{tutor}! 🐾\n\nSeu pet{pet} já está em atendimento. Assim que finalizar, te avisamos! 💚',
  'aguardando_busca', 'Olá{tutor}! 🐾✂️\n\nSeu pet{pet} está pronto e aguardando busca.\n\nPode vir quando puder! 💚',
  'finalizado', 'Olá{tutor}! 🐾\n\nAtendimento{pet} finalizado. Obrigado pela confiança! ⭐\n\nSe puder, nos envie um feedback. 💚'
)
WHERE (whatsapp_templates = '{}'::jsonb);
