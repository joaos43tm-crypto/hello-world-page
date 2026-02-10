import {
  Scissors,
  Stethoscope,
  ShowerHead,
  PawPrint,
  Tag,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type ServiceIconKey = "scissors" | "bath" | "stethoscope" | "paw" | "tag" | "sparkles";

export const SERVICE_ICON_OPTIONS: Array<{
  key: ServiceIconKey;
  label: string;
  Icon: LucideIcon;
}> = [
  { key: "scissors", label: "Tesoura", Icon: Scissors },
  { key: "bath", label: "Banho", Icon: ShowerHead },
  { key: "stethoscope", label: "Consulta", Icon: Stethoscope },
  { key: "paw", label: "Pata", Icon: PawPrint },
  { key: "tag", label: "Etiqueta", Icon: Tag },
  { key: "sparkles", label: "Brilho", Icon: Sparkles },
];

export function getServiceIconByKey(key?: string | null): LucideIcon {
  const found = SERVICE_ICON_OPTIONS.find((o) => o.key === key);
  return found?.Icon ?? Scissors;
}
