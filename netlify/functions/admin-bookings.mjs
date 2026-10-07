import { getStore } from "@netlify/blobs";
import { getAdminSession, requestOriginIsValid } from "./_shared/admin-session.mjs";

const STORE_NAME = "mejkers-lab-raspored";
const BOOKINGS_KEY = "bookings-v1";
const TIME_ZONE = "Europe/Belgrade";
const HOURS = Array.from({ length: 11 }, (_, index) => index + 7);
const MAX_WRITE_ATTEMPTS = 5;

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function todayInBelgrade() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.valueOf()) ? null : date;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, count) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + count);
  return next;
}

function getOpeningMonday() {
  const today = parseDateOnly(todayInBelgrade());
  const day = today.getUTCDay();
  const daysToMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  return addDays(today, daysToMonday);
}

function allowedSlotIds() {
  const firstMonday = getOpeningMonday();
  const allowed = new Set();
  [0, 1].forEach((week) => {
    [0, 1, 2, 3, 4].forEach((day) => {
      const date = formatDateOnly(addDays(firstMonday, week * 7 + day));
      HOURS.forEach((hour) => allowed.add(`${date}-${String(hour).padStart(2, "0")}`));
    });
  });
  return allowed;
}

function getBookingsStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

async function readEntry(store) {
  const entry = await store.getWithMetadata(BOOKINGS_KEY, { type: "json", consistency: "strong" });
  if (entry === null) return { bookings: [], etag: null };
  return { bookings: Array.isArray(entry.data) ? entry.data : [], etag: entry.etag };
}

function validateUpdate(body, currentBooking) {
  const teacher = typeof body.teacher === "string" ? body.teacher.trim() : "";
  const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "";
  const students = Number(body.students);
  const slots = Array.isArray(body.slots) ? [...new Set(body.slots)] : [];
  if (teacher.length < 3 || teacher.length > 80) throw Object.assign(new Error("Ime i prezime mora imati od 3 do 80 znakova."), { status: 400 });
  if (purpose.length < 3 || purpose.length > 240) throw Object.assign(new Error("Svrha mora imati od 3 do 240 znakova."), { status: 400 });
  if (!Number.isInteger(students) || students < 1 || students > 40) throw Object.assign(new Error("Broj učenika mora biti između 1 i 40."), { status: 400 });
  if (slots.length < 1 || slots.length > 3 || slots.some((slot) => typeof slot !== "string" || !/^\d{4}-\d{2}-\d{2}-\d{2}$/.test(slot))) {
    throw Object.assign(new Error("Rezervacija mora imati od jednog do tri ispravna termina."), { status: 400 });
  }
  const oldSlots = [...currentBooking.slots].sort().join("|");
  const newSlots = [...slots].sort().join("|");
  if (oldSlots !== newSlots) {
    const allowed = allowedSlotIds();
    if (slots.some((slot) => !allowed.has(slot))) throw Object.assign(new Error("Novi termin mora biti u trenutno otvorenom periodu rezervacija."), { status: 400 });
  }
  return { teacher, purpose, students, slots: slots.sort() };
}

async function updateBooking(id, body) {
  const store = getBookingsStore();
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const { bookings, etag } = await readEntry(store);
    const index = bookings.findIndex((booking) => booking.id === id);
    if (index < 0) throw Object.assign(new Error("Rezervacija nije pronađena."), { status: 404 });
    const data = validateUpdate(body, bookings[index]);
    const occupied = new Set(bookings.filter((booking) => booking.id !== id).flatMap((booking) => booking.slots || []));
    if (data.slots.some((slot) => occupied.has(slot))) throw Object.assign(new Error("Jedan od izabranih termina je već zauzet."), { status: 409 });
    const updated = { ...bookings[index], ...data, updatedAt: new Date().toISOString() };
    const nextBookings = [...bookings];
    nextBookings[index] = updated;
    const result = await store.setJSON(BOOKINGS_KEY, nextBookings, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    if (result.modified) return updated;
  }
  throw Object.assign(new Error("Raspored je upravo promenjen. Pokušaj ponovo."), { status: 409 });
}

async function deleteBooking(id) {
  const store = getBookingsStore();
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const { bookings, etag } = await readEntry(store);
    if (!bookings.some((booking) => booking.id === id)) throw Object.assign(new Error("Rezervacija nije pronađena."), { status: 404 });
    const nextBookings = bookings.filter((booking) => booking.id !== id);
    const result = await store.setJSON(BOOKINGS_KEY, nextBookings, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
    if (result.modified) return;
  }
  throw Object.assign(new Error("Raspored je upravo promenjen. Pokušaj ponovo."), { status: 409 });
}

export default async (request) => {
  try {
    const session = getAdminSession(request);
    if (!session) return jsonResponse({ error: "Potrebna je prijava." }, 401);
    const url = new URL(request.url);

    if (request.method === "GET") {
      const { bookings } = await readEntry(getBookingsStore());
      return jsonResponse({
        bookings: [...bookings].sort((left, right) => String(left.slots?.[0] || "").localeCompare(String(right.slots?.[0] || ""))),
        openingMonday: formatDateOnly(getOpeningMonday()),
        username: session.username
      });
    }

    if (!requestOriginIsValid(request)) return jsonResponse({ error: "Zahtev nije dozvoljen." }, 403);
    const id = url.searchParams.get("id") || "";
    if (!id) return jsonResponse({ error: "Nedostaje identifikator rezervacije." }, 400);

    if (request.method === "PATCH") {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Neispravan zahtev." }, 400);
      }
      return jsonResponse({ booking: await updateBooking(id, body) });
    }

    if (request.method === "DELETE") {
      await deleteBooking(id);
      return jsonResponse({ deleted: true });
    }

    return jsonResponse({ error: "Metoda nije dozvoljena." }, 405);
  } catch (error) {
    if (!error.status || error.status >= 500) console.error(error);
    return jsonResponse({ error: error.status ? error.message : "Greška na serveru. Pokušaj ponovo." }, error.status || 500);
  }
};
