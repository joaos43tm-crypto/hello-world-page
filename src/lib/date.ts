export function isoDateInTimeZone(
  date: Date = new Date(),
  timeZone: string = "America/Sao_Paulo"
) {
  // en-CA gives YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
