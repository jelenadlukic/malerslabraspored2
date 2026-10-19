import { getTeacherSession } from "./_shared/teacher-session.mjs";
import {
  ATTENDANCE_KEY,
  BOOKINGS_KEY,
  getBookingsStore,
  mergeAttendance,
  readList
} from "./_shared/attendance-store.mjs";

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

export default async (request) => {
  try {
    if (!getTeacherSession(request)) return jsonResponse({ error: "Potrebna je prijava nastavnika." }, 401);
    if (request.method !== "GET") return jsonResponse({ error: "Metoda nije dozvoljena." }, 405);

    const store = getBookingsStore();
    const [{ items: archived }, { items: active }] = await Promise.all([
      readList(store, ATTENDANCE_KEY),
      readList(store, BOOKINGS_KEY)
    ]);
    const bookings = mergeAttendance(archived, active).sort((left, right) => {
      const leftSlot = String(left.slots?.[0] || "");
      const rightSlot = String(right.slots?.[0] || "");
      return rightSlot.localeCompare(leftSlot) || String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
    });
    return jsonResponse({ bookings, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Evidencija prisustva trenutno nije dostupna." }, 500);
  }
};
