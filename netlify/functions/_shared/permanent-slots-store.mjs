import { DEFAULT_PERMANENT_SLOTS } from "./schedule.mjs";

const PERMANENT_SLOTS_KEY = "permanent-slots-v1";

export async function readPermanentSlots(store) {
  const value = await store.get(PERMANENT_SLOTS_KEY, { type: "json", consistency: "strong" });
  if (!value || value.initialized !== true || !Array.isArray(value.slots)) {
    return DEFAULT_PERMANENT_SLOTS.map((slot) => ({ ...slot }));
  }
  return value.slots;
}

export async function writePermanentSlots(store, slots) {
  await store.setJSON(PERMANENT_SLOTS_KEY, { initialized: true, slots });
}
