const TIME_ZONE = "Europe/Belgrade";
export const HOURS = Array.from({ length: 11 }, (_, index) => index + 7);

export function todayInBelgrade() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.valueOf()) ? null : date;
}

export function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(date, count) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + count);
  return next;
}

export function getOpeningMonday() {
  const today = parseDateOnly(todayInBelgrade());
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  return addDays(today, -daysSinceMonday);
}

export function getClosingDate() {
  return addDays(parseDateOnly(todayInBelgrade()), 14);
}

export function isMicrocontrollerSlot(date, hour) {
  const day = date.getUTCDay();
  return (day === 2 || day === 4) && (hour === 12 || hour === 13);
}

export function allowedSlotIds() {
  const today = parseDateOnly(todayInBelgrade());
  const closingDate = getClosingDate();
  const allowed = new Set();

  for (let offset = 0; offset <= 14; offset += 1) {
    const date = addDays(today, offset);
    const day = date.getUTCDay();
    if (day === 0 || day === 6) continue;
    const value = formatDateOnly(date);
    HOURS.forEach((hour) => {
      if (!isMicrocontrollerSlot(date, hour) && date <= closingDate) {
        allowed.add(`${value}-${String(hour).padStart(2, "0")}`);
      }
    });
  }

  return allowed;
}
