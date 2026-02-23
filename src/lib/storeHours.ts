import { isoDateInTimeZone } from "@/lib/date";

const SAO_PAULO_TZ = "America/Sao_Paulo";

export type WeekdayId = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";

export type StoreHoursDay = {
  enabled: boolean;
  open: string; // HH:MM
  close: string; // HH:MM
};

export type StoreHoursWeek = Record<WeekdayId, StoreHoursDay>;

export type StoreHoursConfig = Partial<Record<WeekdayId, Partial<StoreHoursDay>>> | null | undefined;

function toHHMM(value: string) {
  // Accepts "HH:MM" or "HH:MM:SS"
  return value.slice(0, 5);
}

export function normalizeTimeHHMM(value: string | null | undefined, fallback: string) {
  const v = (value ?? "").trim();
  if (!v) return fallback;
  return toHHMM(v);
}

export function createDefaultStoreHours(
  openingTime: string = "08:00",
  closingTime: string = "18:00",
  workingDays: WeekdayId[] = ["seg", "ter", "qua", "qui", "sex", "sab"],
): StoreHoursWeek {
  const enabledSet = new Set<WeekdayId>(workingDays);
  const base = {
    enabled: true,
    open: normalizeTimeHHMM(openingTime, "08:00"),
    close: normalizeTimeHHMM(closingTime, "18:00"),
  } satisfies StoreHoursDay;

  return {
    seg: { ...base, enabled: enabledSet.has("seg") },
    ter: { ...base, enabled: enabledSet.has("ter") },
    qua: { ...base, enabled: enabledSet.has("qua") },
    qui: { ...base, enabled: enabledSet.has("qui") },
    sex: { ...base, enabled: enabledSet.has("sex") },
    sab: { ...base, enabled: enabledSet.has("sab") },
    dom: { ...base, enabled: enabledSet.has("dom") },
  };
}

export function normalizeStoreHours(
  config: StoreHoursConfig,
  fallbackOpening: string,
  fallbackClosing: string,
  fallbackWorkingDays: WeekdayId[],
): StoreHoursWeek {
  const base = createDefaultStoreHours(fallbackOpening, fallbackClosing, fallbackWorkingDays);
  if (!config) return base;

  const ids: WeekdayId[] = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];
  const next = { ...base } as StoreHoursWeek;

  for (const id of ids) {
    const patch = config[id];
    if (!patch) continue;

    next[id] = {
      enabled: typeof patch.enabled === "boolean" ? patch.enabled : base[id].enabled,
      open: normalizeTimeHHMM((patch as any).open, base[id].open),
      close: normalizeTimeHHMM((patch as any).close, base[id].close),
    };
  }

  return next;
}

export function getDayHours(
  config: StoreHoursConfig,
  weekday: WeekdayId,
  fallbackOpening: string,
  fallbackClosing: string,
  fallbackEnabled: boolean,
): StoreHoursDay {
  const base: StoreHoursDay = {
    enabled: fallbackEnabled,
    open: normalizeTimeHHMM(fallbackOpening, "08:00"),
    close: normalizeTimeHHMM(fallbackClosing, "18:00"),
  };

  const patch = config?.[weekday];
  if (!patch) return base;

  return {
    enabled: typeof patch.enabled === "boolean" ? patch.enabled : base.enabled,
    open: normalizeTimeHHMM((patch as any).open, base.open),
    close: normalizeTimeHHMM((patch as any).close, base.close),
  };
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

