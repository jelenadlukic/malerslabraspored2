(() => {
  "use strict";

  const MAX_SELECTION = 3;
  const HOURS = Array.from({ length: 11 }, (_, index) => index + 7);
  const DAYS = ["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak"];
  const DAY_SHORT = ["Pon", "Uto", "Sre", "Čet", "Pet"];
  const MONTHS = ["januar", "februar", "mart", "april", "maj", "jun", "jul", "avgust", "septembar", "oktobar", "novembar", "decembar"];
  const MONTHS_GENITIVE = ["januara", "februara", "marta", "aprila", "maja", "juna", "jula", "avgusta", "septembra", "oktobra", "novembra", "decembra"];

  const scheduleShell = document.querySelector(".schedule-shell");
  const connectionStatus = document.querySelector("#connection-status");
  const grid = document.querySelector("#schedule-grid");
  const mobileDays = document.querySelector("#mobile-days");
  const weekLabel = document.querySelector("#week-label");
  const prevWeek = document.querySelector("#prev-week");
  const nextWeek = document.querySelector("#next-week");
  const selectionBar = document.querySelector("#selection-bar");
  const selectionCount = document.querySelector("#selection-count");
  const selectionSummary = document.querySelector("#selection-summary");
  const bookingDialog = document.querySelector("#booking-dialog");
  const bookingForm = document.querySelector("#booking-form");
  const chosenSlots = document.querySelector("#chosen-slots");
  const detailsDialog = document.querySelector("#details-dialog");
  const detailsContent = document.querySelector("#details-content");
  const formError = document.querySelector("#form-error");
  const toast = document.querySelector("#toast");
  const toastCopy = document.querySelector("#toast-copy");

  let selected = [];
  let currentWeek = 0;
  let mobileDay = 0;
  let bookings = [];
  let openingMonday = getOpeningMonday();

  function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function getOpeningMonday() {
    const today = startOfDay(new Date());
    const day = today.getDay();
    const daysToMonday = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + daysToMonday);
    return monday;
  }

  function parseIsoDate(value) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function addDays(date, count) {
    const result = new Date(date);
    result.setDate(result.getDate() + count);
    return result;
  }

  function isoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function slotId(date, hour) {
    return `${isoDate(date)}-${String(hour).padStart(2, "0")}`;
  }

  function formatWeekRange(start) {
    const end = addDays(start, 4);
    if (start.getMonth() === end.getMonth()) return `${start.getDate()}–${end.getDate()}. ${MONTHS[start.getMonth()]} ${start.getFullYear()}.`;
    return `${start.getDate()}. ${MONTHS[start.getMonth()]} – ${end.getDate()}. ${MONTHS[end.getMonth()]} ${end.getFullYear()}.`;
  }

  function formatSlot(date, hour, long = false) {
    const dayIndex = (date.getDay() + 6) % 7;
    const day = long ? DAYS[dayIndex] : DAY_SHORT[dayIndex];
    return `${day}, ${date.getDate()}. ${MONTHS_GENITIVE[date.getMonth()]} · ${String(hour).padStart(2, "0")}:00–${String(hour + 1).padStart(2, "0")}:00`;
  }

  function setConnection(state, text) {
    connectionStatus.classList.toggle("is-online", state === "online");
    connectionStatus.classList.toggle("is-error", state === "error");
    connectionStatus.querySelector("span:last-child").textContent = text;
  }

  async function loadBookings({ silent = false } = {}) {
    if (!silent) scheduleShell.classList.add("is-loading");
    try {
      const response = await fetch("/api/bookings", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("Raspored trenutno nije dostupan.");
      const data = await response.json();
      bookings = Array.isArray(data.bookings) ? data.bookings : [];
      if (data.openingMonday) openingMonday = parseIsoDate(data.openingMonday);
      selected = selected.filter((id) => !getBooking(id));
      setConnection("online", "Raspored je sinhronizovan");
      render();
      return data;
    } catch (error) {
      setConnection("error", "Server trenutno nije dostupan");
      if (!silent) showToast(error.message || "Raspored trenutno nije dostupan.", false);
      throw error;
    } finally {
      scheduleShell.classList.remove("is-loading");
    }
  }

  function getBooking(id) {
    return bookings.find((booking) => Array.isArray(booking.slots) && booking.slots.includes(id));
  }

  function isPast(date, hour) {
    const end = new Date(date);
    end.setHours(hour + 1, 0, 0, 0);
    return end <= new Date();
  }

  function render() {
    renderMobileDays();
    renderGrid();
    renderSelection();
    const weekStart = addDays(openingMonday, currentWeek * 7);
    weekLabel.textContent = formatWeekRange(weekStart);
    prevWeek.disabled = currentWeek === 0;
    nextWeek.disabled = currentWeek === 1;
  }

  function renderMobileDays() {
    const weekStart = addDays(openingMonday, currentWeek * 7);
    mobileDays.innerHTML = DAYS.map((day, index) => {
      const date = addDays(weekStart, index);
      return `<button class="mobile-day" type="button" role="tab" aria-selected="${index === mobileDay}" data-day="${index}" aria-label="${day}, ${date.getDate()}. ${MONTHS[date.getMonth()]}"><span>${DAY_SHORT[index]}</span><strong>${date.getDate()}.</strong></button>`;
    }).join("");
  }

  function renderGrid() {
    const weekStart = addDays(openingMonday, currentWeek * 7);
    const todayId = isoDate(new Date());
    const isMobile = window.matchMedia("(max-width: 700px)").matches;
    let html = "";

    if (!isMobile) {
      html += '<div class="grid-corner" aria-hidden="true"></div>';
      DAYS.forEach((day, index) => {
        const date = addDays(weekStart, index);
        const todayClass = isoDate(date) === todayId ? " today" : "";
        html += `<div class="day-heading${todayClass}"><span class="day-name">${day}</span><span class="day-date">${date.getDate()}. ${MONTHS[date.getMonth()]}</span></div>`;
      });
    }

    HOURS.forEach((hour) => {
      html += `<div class="time-heading"><strong>${String(hour).padStart(2, "0")}:00</strong><span>do ${String(hour + 1).padStart(2, "0")}:00</span></div>`;
      const dayIndexes = isMobile ? [mobileDay] : [0, 1, 2, 3, 4];
      dayIndexes.forEach((dayIndex) => {
        const date = addDays(weekStart, dayIndex);
        const id = slotId(date, hour);
        const booking = getBooking(id);
        const picked = selected.includes(id);
        const past = isPast(date, hour);
        let className = "slot";
        let label = "Slobodno";
        let disabled = "";
        if (booking) {
          className += " booked";
          label = `<span>${escapeHtml(booking.teacher)}</span>`;
        } else if (picked) {
          className += " selected";
          label = "Izabrano";
        } else if (past) {
          className += " past";
          label = "Prošlo";
          disabled = " disabled";
        }
        const action = booking ? `Prikaži rezervaciju: ${booking.teacher}` : picked ? "Ukloni iz izbora" : "Izaberi termin";
        html += `<button class="${className}" type="button" data-slot="${id}" data-time="${String(hour).padStart(2, "0")}:00–${String(hour + 1).padStart(2, "0")}:00" aria-label="${escapeHtml(formatSlot(date, hour, true))} — ${escapeHtml(action)}"${disabled}>${label}</button>`;
      });
    });
    grid.innerHTML = html;
  }

  function renderSelection() {
    selectionBar.hidden = selected.length === 0;
    selectionCount.textContent = `${selected.length}/3`;
    selectionSummary.textContent = selected.map(labelForSlot).join(" · ");
  }

  function labelForSlot(id) {
    const [year, month, day, hour] = id.split("-").map(Number);
    return formatSlot(new Date(year, month - 1, day), hour);
  }

  function handleSlotClick(button) {
    const id = button.dataset.slot;
    const booking = getBooking(id);
    if (booking) {
      openDetails(booking, id);
      return;
    }
    if (selected.includes(id)) selected = selected.filter((slot) => slot !== id);
    else if (selected.length < MAX_SELECTION) selected = [...selected, id].sort();
    else showToast("Možeš da izabereš najviše tri termina.", false);
    renderGrid();
    renderSelection();
  }

  function openBookingDialog() {
    chosenSlots.innerHTML = selected.map((id) => `<span>${escapeHtml(labelForSlot(id))}</span>`).join("");
    formError.textContent = "";
    bookingDialog.showModal();
    setTimeout(() => bookingForm.elements.teacher.focus(), 40);
  }

  async function requestBooking(payload) {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || "Rezervacija nije sačuvana."), { status: response.status });
    return data.booking;
  }

  async function submitBooking(event) {
    event.preventDefault();
    formError.textContent = "";
    const submitButton = bookingForm.querySelector('[type="submit"]');
    const data = new FormData(bookingForm);
    const payload = {
      teacher: String(data.get("teacher") || "").trim(),
      purpose: String(data.get("purpose") || "").trim(),
      students: Number(data.get("students")),
      slots: [...selected]
    };
    if (!payload.teacher || !payload.purpose || !Number.isInteger(payload.students) || payload.students < 1 || payload.students > 40) {
      formError.textContent = "Proveri da li su sva polja pravilno popunjena.";
      return;
    }
    submitButton.disabled = true;
    submitButton.textContent = "Čuvanje…";
    try {
      const booking = await requestBooking(payload);
      bookings.push(booking);
      bookingDialog.close();
      bookingForm.reset();
      selected = [];
      render();
      setConnection("online", "Raspored je sinhronizovan");
      showToast(`${booking.slots.length === 1 ? "1 termin" : `${booking.slots.length} termina`} · ${booking.teacher}`, true);
    } catch (error) {
      formError.textContent = error.message;
      if (error.status === 409) await loadBookings({ silent: true }).catch(() => {});
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Potvrdi rezervaciju";
    }
  }

  function openDetails(booking, id) {
    const [year, month, day, hour] = id.split("-").map(Number);
    document.querySelector("#details-title").textContent = formatSlot(new Date(year, month - 1, day), hour, true);
    detailsContent.innerHTML = `
      <div><dt>Nastavnik</dt><dd>${escapeHtml(booking.teacher)}</dd></div>
      <div><dt>Svrha upotrebe</dt><dd>${escapeHtml(booking.purpose)}</dd></div>
      <div><dt>Broj učenika</dt><dd>${Number(booking.students)}</dd></div>
    `;
    detailsDialog.showModal();
  }

  let toastTimer;
  function showToast(message, success) {
    clearTimeout(toastTimer);
    toast.querySelector("strong").textContent = success ? "Termin je rezervisan" : "Potrebna je pažnja";
    toastCopy.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-slot]");
    if (button && !button.disabled) handleSlotClick(button);
  });

  mobileDays.addEventListener("click", (event) => {
    const button = event.target.closest("[data-day]");
    if (!button) return;
    mobileDay = Number(button.dataset.day);
    renderMobileDays();
    renderGrid();
  });

  prevWeek.addEventListener("click", () => { if (currentWeek > 0) { currentWeek -= 1; mobileDay = 0; render(); } });
  nextWeek.addEventListener("click", () => { if (currentWeek < 1) { currentWeek += 1; mobileDay = 0; render(); } });
  document.querySelector("#open-booking").addEventListener("click", openBookingDialog);
  document.querySelector("#close-booking").addEventListener("click", () => bookingDialog.close());
  document.querySelector("#close-details").addEventListener("click", () => detailsDialog.close());
  bookingForm.addEventListener("submit", submitBooking);

  [bookingDialog, detailsDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderGrid, 100);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadBookings({ silent: true }).catch(() => {});
  });
  setInterval(() => loadBookings({ silent: true }).catch(() => {}), 15000);

  if (document.modelContext?.registerTool) {
    const availabilityTool = {
      name: "read_mejkers_lab_availability",
      title: "Pročitaj dostupnost Mejkers Laba",
      description: "Vraća slobodne i zauzete termine u trenutno prikazanoj nedelji.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      async execute() {
        await loadBookings({ silent: true });
        const weekStart = addDays(openingMonday, currentWeek * 7);
        const slots = [];
        DAYS.forEach((_, dayIndex) => {
          const date = addDays(weekStart, dayIndex);
          HOURS.forEach((hour) => {
            const id = slotId(date, hour);
            slots.push({ id, status: getBooking(id) ? "zauzeto" : isPast(date, hour) ? "prošlo" : "slobodno" });
          });
        });
        return { week: formatWeekRange(weekStart), slots };
      }
    };
    const bookingTool = {
      name: "create_mejkers_lab_booking",
      title: "Rezerviši Mejkers Lab",
      description: "Rezerviše od jednog do najviše tri slobodna termina za nastavnika.",
      inputSchema: {
        type: "object",
        properties: {
          teacher: { type: "string", minLength: 3, maxLength: 80 },
          purpose: { type: "string", minLength: 3, maxLength: 240 },
          students: { type: "integer", minimum: 1, maximum: 40 },
          slots: { type: "array", minItems: 1, maxItems: 3, uniqueItems: true, items: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}-\\d{2}$" } }
        },
        required: ["teacher", "purpose", "students", "slots"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        const booking = await requestBooking(input);
        await loadBookings({ silent: true });
        return { id: booking.id, status: "potvrđeno", slots: booking.slots };
      }
    };
    Promise.all([
      Promise.resolve(document.modelContext.registerTool(availabilityTool)),
      Promise.resolve(document.modelContext.registerTool(bookingTool))
    ]).catch(() => {});
  }

  render();
  loadBookings().catch(() => {});
})();
