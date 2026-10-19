import { getStore } from "@netlify/blobs";

export const STORE_NAME = "mejkers-lab-raspored";
export const BOOKINGS_KEY = "bookings-v1";
export const ATTENDANCE_KEY = "attendance-v1";

export function getBookingsStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export async function readList(store, key) {
  const entry = await store.getWithMetadata(key, { type: "json", consistency: "strong" });
  if (entry === null) return { items: [], etag: null };
  return { items: Array.isArray(entry.data) ? entry.data : [], etag: entry.etag };
}

function upsertById(items, booking) {
  const index = items.findIndex((item) => item.id === booking.id);
  if (index < 0) return [...items, booking];
  const next = [...items];
  next[index] = booking;
  return next;
}

export async function recordAttendance(store, booking) {
  const { items, etag } = await readList(store, ATTENDANCE_KEY);
  const options = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
  const result = await store.setJSON(ATTENDANCE_KEY, upsertById(items, booking), options);
  if (result.modified) return;

  const { items: latestItems } = await readList(store, ATTENDANCE_KEY);
  await store.setJSON(ATTENDANCE_KEY, upsertById(latestItems, booking));
}

export function mergeAttendance(archived, active) {
  const merged = new Map();
  archived.forEach((booking) => { if (booking?.id) merged.set(booking.id, booking); });
  active.forEach((booking) => { if (booking?.id) merged.set(booking.id, booking); });
  return [...merged.values()];
}
