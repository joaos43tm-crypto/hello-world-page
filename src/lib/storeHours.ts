import { isoDateInTimeZone } from "@/lib/date";

const SAO_PAULO_TZ = "America/Sao_Paulo";

type WeekdayId = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";

function toHHMM(value: string) {
  // Accepts "HH:MM" or "HH:MM:SS"
  return value.slice(0, 5);
}

export function normalizeTimeHHMM(value: string | null | undefined, fallback: string) {
  const v = (value ?? "").trim();
  if (!v) return fallback;
  return toHHMM(v);
}

export function getNowTimeHHMMInSaoPaulo(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function getWeekdayIdInSaoPaulo(isoDate: string): WeekdayId {
  // Use noon to avoid DST edge cases
  const base = new Date(`${isoDate}T12:00:00`);

  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TZ,
    weekday: "short",
  }).format(base);

  const w = weekday.toLowerCase();
  if (w.startsWith("seg")) return "seg";
  if (w.startsWith("ter")) return "ter";
  if (w.startsWith("qua")) return "qua";
  if (w.startsWith("qui")) return "qui";
  if (w.startsWith("sex")) return "sex";
  if (w.startsWith("sáb") || w.startsWith("sab")) return "sab";
  return "dom";
}

export function clampMinTimeHHMM(time: string, min: string) {
  return time < min ? min : time;
}

export function isTodayInSaoPaulo(isoDate: string) {
  return isoDate === isoDateInTimeZone();
}
