import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { getAuthorizedAdminSession } from "./_shared/admin-access.mjs";
import { requestOriginIsValid } from "./_shared/admin-session.mjs";
import { readPermanentSlots, writePermanentSlots } from "./_shared/permanent-slots-store.mjs";
import { getTeacherSession } from "./_shared/teacher-session.mjs";

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

function getDataStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

function validatePermanentSlot(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const day = Number(body.day);
  const fromHour = Number(body.fromHour);
  const toHour = Number(body.toHour);
  if (name.length < 3 || name.length > 80) throw Object.assign(new Error("Naziv mora imati od 3 do 80 znakova."), { status: 400 });
  if (!Number.isInteger(day) || day < 1 || day > 5) throw Object.assign(new Error("Izaberi radni dan."), { status: 400 });
  if (!Number.isInteger(fromHour) || !Number.isInteger(toHour) || fromHour < 7 || toHour > 18 || toHour <= fromHour) {
    throw Object.assign(new Error("Vreme mora biti između 07:00 i 18:00."), { status: 400 });
  }
  return { name, day, fromHour, toHour };
}

function overlaps(left, right) {
  return left.day === right.day && left.fromHour < right.toHour && right.fromHour < left.toHour;
}

async function addPermanentSlot(store, body) {
  const data = validatePermanentSlot(body);
  const permanentSlots = await readPermanentSlots(store);
  if (permanentSlots.some((slot) => overlaps(data, slot))) {
    throw Object.assign(new Error("Trajni termin se preklapa sa postojećim trajnim terminom."), { status: 409 });
  }

  const bookings = await store.get(BOOKINGS_KEY, { type: "json", consistency: "strong" }) || [];
  const conflictsWithBooking = bookings.some((booking) => (booking.slots || []).some((slotId) => {
    const match = /^(\d{4}-\d{2}-\d{2})-(\d{2})$/.exec(slotId);
    if (!match) return false;
    const day = new Date(`${match[1]}T12:00:00Z`).getUTCDay();
    const hour = Number(match[2]);
    return day === data.day && hour >= data.fromHour && hour < data.toHour;
  }));
  if (conflictsWithBooking) {
    throw Object.assign(new Error("U tom periodu već postoji rezervacija. Prvo je izmenite ili obrišite."), { status: 409 });
  }

  const permanentSlot = { id: randomUUID(), ...data, createdAt: new Date().toISOString() };
  await writePermanentSlots(store, [...permanentSlots, permanentSlot]);
  return permanentSlot;
}

export default async (request) => {
  try {
    const teacherSession = getTeacherSession(request);
    const adminSession = getAuthorizedAdminSession(request);
    if (!teacherSession && !adminSession) return jsonResponse({ error: "Potrebna je prijava." }, 401);
    const store = getDataStore();

    if (request.method === "GET") {
      return jsonResponse({ permanentSlots: await readPermanentSlots(store) });
    }

    if (!adminSession) return jsonResponse({ error: "Potrebna su administratorska ovlašćenja." }, 403);
    if (!requestOriginIsValid(request)) return jsonResponse({ error: "Zahtev nije dozvoljen." }, 403);

    if (request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Neispravan zahtev." }, 400);
      }
      return jsonResponse({ permanentSlot: await addPermanentSlot(store, body) }, 201);
    }

    if (request.method === "DELETE") {
      const id = new URL(request.url).searchParams.get("id") || "";
      if (!id) return jsonResponse({ error: "Nedostaje identifikator trajnog termina." }, 400);
      const permanentSlots = await readPermanentSlots(store);
      if (!permanentSlots.some((slot) => slot.id === id)) return jsonResponse({ error: "Trajni termin nije pronađen." }, 404);
      await writePermanentSlots(store, permanentSlots.filter((slot) => slot.id !== id));
      return jsonResponse({ deleted: true });
    }

    return jsonResponse({ error: "Metoda nije dozvoljena." }, 405);
  } catch (error) {
    if (!error.status || error.status >= 500) console.error(error);
    return jsonResponse({ error: error.status ? error.message : "Greška na serveru. Pokušaj ponovo." }, error.status || 500);
  }
};
