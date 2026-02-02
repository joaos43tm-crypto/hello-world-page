import { supabase } from "@/integrations/supabase/client";
import type { AppointmentStatus } from "@/lib/petcontrol.api";

export type WhatsAppTemplates = Partial<Record<AppointmentStatus, string>>;

let cachedTemplatesPromise: Promise<WhatsAppTemplates> | null = null;

export function getDefaultWhatsAppTemplates(): Required<Record<AppointmentStatus, string>> {
  return {
    agendado:
      "Olá{tutor}! 🐾\n\nConfirmamos o agendamento{pet} para {date} às {time}.\n\nTe esperamos! 💚",
    em_atendimento:
      "Olá{tutor}! 🐾\n\nSeu pet{pet} já está em atendimento. Assim que finalizar, te avisamos! 💚",
    aguardando_busca:
      "Olá{tutor}! 🐾✂️\n\nSeu pet{pet} está pronto e aguardando busca.\n\nPode vir quando puder! 💚",
    finalizado:
      "Olá{tutor}! 🐾\n\nAtendimento{pet} finalizado. Obrigado pela confiança! ⭐\n\nSe puder, nos envie um feedback. 💚",
  };
}

export async function getWhatsAppTemplatesCached(): Promise<WhatsAppTemplates> {
  if (!cachedTemplatesPromise) {
    cachedTemplatesPromise = (async () => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("whatsapp_templates")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error loading WhatsApp templates:", error);
        return {};
      }

      // Supabase types for jsonb come as `any` here
      return (data?.whatsapp_templates as WhatsAppTemplates | null) ?? {};
    })();
  }

  return cachedTemplatesPromise;
}

export function applyWhatsAppTemplate(
  template: string,
  ctx: {
    tutorName?: string;
    petName?: string;
    date?: string;
    time?: string;
    serviceName?: string;
  }
) {
  const tutor = ctx.tutorName ? `, ${ctx.tutorName}` : "";
  const pet = ctx.petName ? ` ${ctx.petName}` : "";

  // Use replace with global regex for broad TS lib compatibility (no String.prototype.replaceAll)
  return template
    .replace(/\{tutor\}/g, tutor)
    .replace(/\{pet\}/g, pet)
    .replace(/\{date\}/g, ctx.date ?? "")
    .replace(/\{time\}/g, ctx.time ?? "")
    .replace(/\{service\}/g, ctx.serviceName ?? "");
}
