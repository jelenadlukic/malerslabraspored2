import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { getAuthorizedAdminSession } from "./_shared/admin-access.mjs";
import { requestOriginIsValid } from "./_shared/admin-session.mjs";
import { recordAttendance } from "./_shared/attendance-store.mjs";
import { readPermanentSlots } from "./_shared/permanent-slots-store.mjs";
import { allowedSlotIds, formatDateOnly, getClosingDate, getOpeningMonday, todayInBelgrade } from "./_shared/schedule.mjs";

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

function getBookingsStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

async function readEntry(store) {
  const entry = await store.getWithMetadata(BOOKINGS_KEY, { type: "json", consistency: "strong" });
  if (entry === null) return { bookings: [], etag: null };
  return { bookings: Array.isArray(entry.data) ? entry.data : [], etag: entry.etag };
}

function validateBooking(body, permanentSlots, currentBooking = null) {
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
  const oldSlots = currentBooking ? [...currentBooking.slots].sort().join("|") : "";
  const newSlots = [...slots].sort().join("|");
  if (oldSlots !== newSlots) {
    const allowed = allowedSlotIds(permanentSlots);
    if (slots.some((slot) => !allowed.has(slot))) throw Object.assign(new Error("Novi termin mora biti u trenutno otvorenom periodu rezervacija."), { status: 400 });
  }
  return { teacher, purpose, students, slots: slots.sort() };
}

async function updateBooking(id, body) {
  const store = getBookingsStore();
  const [{ bookings }, permanentSlots] = await Promise.all([readEntry(store), readPermanentSlots(store)]);
  const index = bookings.findIndex((booking) => booking.id === id);
  if (index < 0) throw Object.assign(new Error("Rezervacija nije pronađena."), { status: 404 });
  const data = validateBooking(body, permanentSlots, bookings[index]);
  const occupied = new Set(bookings.filter((booking) => booking.id !== id).flatMap((booking) => booking.slots || []));
  if (data.slots.some((slot) => occupied.has(slot))) throw Object.assign(new Error("Jedan od izabranih termina je već zauzet."), { status: 409 });
  const updated = { ...bookings[index], ...data, updatedAt: new Date().toISOString() };
  const nextBookings = [...bookings];
  nextBookings[index] = updated;
  await store.setJSON(BOOKINGS_KEY, nextBookings);
  try {
    await recordAttendance(store, updated);
  } catch (error) {
    console.error("Izmena je sačuvana, ali arhiva nije odmah ažurirana.", error);
  }
  return updated;
}

async function createBooking(body) {
  const store = getBookingsStore();
  const [{ bookings }, permanentSlots] = await Promise.all([readEntry(store), readPermanentSlots(store)]);
  const data = validateBooking(body, permanentSlots);
  const occupied = new Set(bookings.flatMap((booking) => booking.slots || []));
  if (data.slots.some((slot) => occupied.has(slot))) throw Object.assign(new Error("Jedan od izabranih termina je već zauzet."), { status: 409 });
  const booking = { id: randomUUID(), ...data, createdAt: new Date().toISOString() };
  await store.setJSON(BOOKINGS_KEY, [...bookings, booking]);
  try {
    await recordAttendance(store, booking);
  } catch (error) {
    console.error("Rezervacija je sačuvana, ali arhiva nije odmah ažurirana.", error);
  }
  return booking;
}

async function deleteBooking(id) {
  const store = getBookingsStore();
  const { bookings } = await readEntry(store);
  const booking = bookings.find((item) => item.id === id);
  if (!booking) throw Object.assign(new Error("Rezervacija nije pronađena."), { status: 404 });
  await recordAttendance(store, booking);
  const nextBookings = bookings.filter((booking) => booking.id !== id);
  await store.setJSON(BOOKINGS_KEY, nextBookings);
}

export default async (request) => {
  try {
    const session = getAuthorizedAdminSession(request);
    if (!session) return jsonResponse({ error: "Potrebna je prijava." }, 401);
    const url = new URL(request.url);

    if (request.method === "GET") {
      const { bookings } = await readEntry(getBookingsStore());
      return jsonResponse({
        bookings: [...bookings].sort((left, right) => String(left.slots?.[0] || "").localeCompare(String(right.slots?.[0] || ""))),
        openingMonday: formatDateOnly(getOpeningMonday()),
        today: todayInBelgrade(),
        closingDate: formatDateOnly(getClosingDate()),
        username: session.username
      });
    }

    if (!requestOriginIsValid(request)) return jsonResponse({ error: "Zahtev nije dozvoljen." }, 403);

    if (request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Neispravan zahtev." }, 400);
      }
      return jsonResponse({ booking: await createBooking(body) }, 201);
    }

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
