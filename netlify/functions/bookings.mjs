import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { requestOriginIsValid } from "./_shared/admin-session.mjs";
import { getTeacherSession } from "./_shared/teacher-session.mjs";
import { recordAttendance } from "./_shared/attendance-store.mjs";
import { readPermanentSlots } from "./_shared/permanent-slots-store.mjs";
import {
  allowedSlotIds,
  formatDateOnly,
  getClosingDate,
  getOpeningMonday,
  todayInBelgrade
} from "./_shared/schedule.mjs";

const STORE_NAME = "mejkers-lab-raspored";
const BOOKINGS_KEY = "bookings-v1";

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

function validateBooking(body, permanentSlots) {
  const teacher = typeof body.teacher === "string" ? body.teacher.trim() : "";
  const purpose = typeof body.purpose === "string" ? body.purpose.trim() : "";
  const students = Number(body.students);
  const slots = Array.isArray(body.slots) ? [...new Set(body.slots)] : [];

  if (teacher.length < 3 || teacher.length > 80) throw Object.assign(new Error("Ime i prezime mora imati od 3 do 80 znakova."), { status: 400 });
  if (purpose.length < 3 || purpose.length > 240) throw Object.assign(new Error("Svrha mora imati od 3 do 240 znakova."), { status: 400 });
  if (!Number.isInteger(students) || students < 1 || students > 40) throw Object.assign(new Error("Broj učenika mora biti između 1 i 40."), { status: 400 });
  if (slots.length < 1 || slots.length > 3 || slots.some((slot) => typeof slot !== "string")) throw Object.assign(new Error("Izaberi od jednog do tri termina."), { status: 400 });
  const allowed = allowedSlotIds(permanentSlots);
  if (slots.some((slot) => !allowed.has(slot))) throw Object.assign(new Error("Izabrani termin nije u dozvoljenom periodu."), { status: 400 });
  return { teacher, purpose, students, slots: slots.sort() };
}

function getBookingsStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

async function readEntry(store) {
  const entry = await store.getWithMetadata(BOOKINGS_KEY, { type: "json", consistency: "strong" });
  if (entry === null) return { bookings: [], etag: null };
  return { bookings: Array.isArray(entry.data) ? entry.data : [], etag: entry.etag };
}

async function createBooking(body) {
  const store = getBookingsStore();
  const permanentSlots = await readPermanentSlots(store);
  const data = validateBooking(body, permanentSlots);

  const { bookings, etag } = await readEntry(store);
  const occupied = new Set(bookings.flatMap((booking) => Array.isArray(booking.slots) ? booking.slots : []));
  if (data.slots.some((slot) => occupied.has(slot))) {
    throw Object.assign(new Error("Jedan od termina je upravo rezervisan. Osveži raspored i izaberi drugi."), { status: 409 });
  }

  const booking = {
    id: randomUUID(),
    ...data,
    createdAt: new Date().toISOString()
  };
  const options = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
  const result = await store.setJSON(BOOKINGS_KEY, [...bookings, booking], options);
  if (!result.modified) {
    // Netlify's local Blobs emulator can reject conditional writes even after a
    // strong read. Re-read before the compatibility fallback so stale slots
    // are never knowingly overwritten.
    const { bookings: latestBookings } = await readEntry(store);
    const latestOccupied = new Set(latestBookings.flatMap((item) => Array.isArray(item.slots) ? item.slots : []));
    if (data.slots.some((slot) => latestOccupied.has(slot))) {
      throw Object.assign(new Error("Jedan od termina je upravo rezervisan. Osveži raspored i izaberi drugi."), { status: 409 });
    }
    await store.setJSON(BOOKINGS_KEY, [...latestBookings, booking]);
  }
  try {
    await recordAttendance(store, booking);
  } catch (error) {
    console.error("Rezervacija je sačuvana, ali arhiva nije odmah ažurirana.", error);
  }
  return booking;
}

export default async (request) => {
  try {
    if (!getTeacherSession(request)) return jsonResponse({ error: "Potrebna je prijava nastavnika." }, 401);

    if (request.method === "GET") {
      const store = getBookingsStore();
      const [{ bookings }, permanentSlots] = await Promise.all([readEntry(store), readPermanentSlots(store)]);
      return jsonResponse({
        bookings,
        permanentSlots,
        openingMonday: formatDateOnly(getOpeningMonday()),
        today: todayInBelgrade(),
        closingDate: formatDateOnly(getClosingDate()),
        hours: { from: 7, to: 18 },
        updatedAt: new Date().toISOString()
      });
    }

    if (request.method === "POST") {
      if (!requestOriginIsValid(request)) return jsonResponse({ error: "Zahtev nije dozvoljen." }, 403);
      const contentType = request.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) return jsonResponse({ error: "Očekivan je JSON zahtev." }, 415);
      const bodyText = await request.text();
      if (new TextEncoder().encode(bodyText).byteLength > 32 * 1024) return jsonResponse({ error: "Zahtev je prevelik." }, 413);
      let body;
      try {
        body = JSON.parse(bodyText || "{}");
      } catch {
        return jsonResponse({ error: "Neispravan JSON." }, 400);
      }
      const booking = await createBooking(body);
      return jsonResponse({ booking }, 201);
    }

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { Allow: "GET, POST, OPTIONS" } });
    return jsonResponse({ error: "Metoda nije dozvoljena." }, 405);
  } catch (error) {
    if (!error.status || error.status >= 500) console.error(error);
    return jsonResponse({ error: error.status ? error.message : "Greška na serveru. Pokušaj ponovo." }, error.status || 500);
  }
};
