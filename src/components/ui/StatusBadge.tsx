import { cn } from "@/lib/utils";
import { Clock, Sparkles, Bell, CheckCircle2 } from "lucide-react";
import type { AppointmentStatus } from "@/lib/petcontrol.api";

interface StatusBadgeProps {
  status: AppointmentStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const statusConfig: Record<AppointmentStatus, {
  label: string;
  icon: typeof Clock;
  className: string;
}> = {
  agendado: {
    label: "Agendado",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  em_atendimento: {
    label: "Em Atendimento",
    icon: Sparkles,
    className: "bg-blue-100 text-blue-800 border-blue-300",
  },
  aguardando_busca: {
    label: "Aguardando Busca",
    icon: Bell,
    className: "bg-orange-100 text-orange-800 border-orange-300",
  },
  finalizado: {
    label: "Finalizado",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800 border-green-300",
  },
};

const sizeClasses = {
  sm: "text-xs px-2 py-0.5 gap-1",
  md: "text-sm px-3 py-1 gap-1.5",
  lg: "text-base px-4 py-1.5 gap-2",
};

const iconSizes = {
  sm: 12,
  md: 14,
  lg: 16,
};

export function StatusBadge({ status, size = "md", showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border",
        config.className,
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      {config.label}
    </span>
  );
}
