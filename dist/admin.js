(() => {
  "use strict";

  const loginView = document.querySelector("#login-view");
  const dashboardView = document.querySelector("#dashboard-view");
  const loginForm = document.querySelector("#login-form");
  const loginError = document.querySelector("#login-error");
  const adminUsername = document.querySelector("#admin-username");
  const bookingCount = document.querySelector("#booking-count");
  const bookingsList = document.querySelector("#bookings-list");
  const adminMessage = document.querySelector("#admin-message");
  const searchInput = document.querySelector("#booking-search");
  const editDialog = document.querySelector("#edit-dialog");
  const editForm = document.querySelector("#edit-form");
  const editError = document.querySelector("#edit-error");
  const slotsEditor = document.querySelector("#slots-editor");
  const deleteDialog = document.querySelector("#delete-dialog");
  const adminToast = document.querySelector("#admin-toast");
  const permanentList = document.querySelector("#permanent-list");
  const permanentMessage = document.querySelector("#permanent-message");
  const permanentDialog = document.querySelector("#permanent-dialog");
  const permanentForm = document.querySelector("#permanent-form");
  const permanentError = document.querySelector("#permanent-error");

  const DAYS = ["Ned", "Pon", "Uto", "Sre", "Čet", "Pet", "Sub"];
  const MONTHS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "avg", "sep", "okt", "nov", "dec"];
  const HOURS = Array.from({ length: 11 }, (_, index) => index + 7);
  const ADMIN_AUTH_URL = "/.netlify/functions/admin-auth";
  const ADMIN_BOOKINGS_URL = "/.netlify/functions/admin-bookings";
  const TEACHER_AUTH_URL = "/.netlify/functions/teacher-auth";
  const PERMANENT_SLOTS_URL = "/.netlify/functions/permanent-slots";
  let bookings = [];
  let permanentSlots = [];
  let bookingWindow = { today: "", closingDate: "" };
  let pendingDeleteId = null;
  let toastTimer;

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  }

  function parseSlot(id) {
    const match = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})$/.exec(id);
    if (!match) return null;
    return { date: `${match[1]}-${match[2]}-${match[3]}`, hour: Number(match[4]) };
  }

  function formatSlot(id) {
    const slot = parseSlot(id);
    if (!slot) return id;
    const date = new Date(`${slot.date}T12:00:00`);
    return `${DAYS[date.getDay()]}, ${date.getDate()}. ${MONTHS[date.getMonth()]} · ${String(slot.hour).padStart(2, "0")}:00 – ${String(slot.hour + 1).padStart(2, "0")}:00`;
  }

  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(data.error || "Zahtev nije uspeo."), { status: response.status });
    return data;
  }

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
  }

  function showDashboard(username) {
    loginView.hidden = true;
    dashboardView.hidden = false;
    adminUsername.textContent = username;
  }

  async function checkSession() {
    try {
      const session = await api(ADMIN_AUTH_URL);
      showDashboard(session.username);
      await loadAdminData();
    } catch {
      showLogin();
    }
  }

  async function loadAdminData() {
    await Promise.all([loadBookings(), loadPermanentSlots()]);
  }

  async function loadBookings() {
    adminMessage.textContent = "Učitavanje rezervacija…";
    try {
      const data = await api(ADMIN_BOOKINGS_URL);
      bookings = Array.isArray(data.bookings) ? data.bookings : [];
      bookingWindow = { today: data.today || "", closingDate: data.closingDate || "" };
      adminUsername.textContent = data.username || adminUsername.textContent;
      adminMessage.textContent = "";
      renderBookings();
    } catch (error) {
      if (error.status === 401) showLogin();
      else adminMessage.textContent = error.message;
    }
  }

  async function loadPermanentSlots() {
    permanentMessage.textContent = "Učitavanje trajnih termina…";
    try {
      const data = await api(PERMANENT_SLOTS_URL);
      permanentSlots = Array.isArray(data.permanentSlots) ? data.permanentSlots : [];
      permanentMessage.textContent = "";
      renderPermanentSlots();
    } catch (error) {
      if (error.status === 401) showLogin();
      else permanentMessage.textContent = error.message;
    }
  }

  function renderBookings() {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = bookings.filter((booking) => !query || `${booking.teacher} ${booking.purpose}`.toLowerCase().includes(query));
    bookingCount.textContent = String(bookings.length);
    if (!filtered.length) {
      bookingsList.innerHTML = `<div class="empty-state">${bookings.length ? "Nema rezultata za ovu pretragu." : "Još nema rezervacija."}</div>`;
      return;
    }
    bookingsList.innerHTML = filtered.map((booking) => `
      <article class="booking-row" data-id="${escapeHtml(booking.id)}">
        <div class="booking-slots">${(booking.slots || []).map((slot) => `<span class="booking-slot">${escapeHtml(formatSlot(slot))}</span>`).join("")}</div>
        <div class="booking-teacher"><span>Nastavnik</span><strong>${escapeHtml(booking.teacher)}</strong></div>
        <div class="booking-purpose"><span>Svrha · ${Number(booking.students)} učenika</span><strong>${escapeHtml(booking.purpose)}</strong></div>
        <div class="booking-actions">
          <button class="row-button edit" type="button" data-action="edit">Izmeni</button>
          <button class="row-button delete" type="button" data-action="delete">Obriši</button>
        </div>
      </article>
    `).join("");
  }

  function renderPermanentSlots() {
    const dayNames = ["Nedelja", "Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak", "Subota"];
    const sorted = [...permanentSlots].sort((left, right) => Number(left.day) - Number(right.day) || Number(left.fromHour) - Number(right.fromHour));
    if (!sorted.length) {
      permanentList.innerHTML = '<div class="empty-state compact-empty">Nema trajnih termina.</div>';
      return;
    }
    permanentList.innerHTML = sorted.map((slot) => `
      <article class="permanent-row" data-permanent-id="${escapeHtml(slot.id)}">
        <span class="permanent-day">${escapeHtml(dayNames[Number(slot.day)] || "")}</span>
        <strong>${escapeHtml(slot.name)}</strong>
        <span class="permanent-time">${String(slot.fromHour).padStart(2, "0")}:00 – ${String(slot.toHour).padStart(2, "0")}:00</span>
        <button class="row-button delete" type="button" data-action="delete-permanent">Ukloni</button>
      </article>
    `).join("");
  }

  function slotRow(slotId = "") {
    const slot = parseSlot(slotId) || { date: "", hour: 7 };
    const options = HOURS.map((hour) => `<option value="${hour}"${hour === slot.hour ? " selected" : ""}>${String(hour).padStart(2, "0")}:00 – ${String(hour + 1).padStart(2, "0")}:00</option>`).join("");
    const limits = `${bookingWindow.today ? ` min="${escapeHtml(bookingWindow.today)}"` : ""}${bookingWindow.closingDate ? ` max="${escapeHtml(bookingWindow.closingDate)}"` : ""}`;
    return `<div class="slot-editor-row"><input type="date" value="${escapeHtml(slot.date)}"${limits} required aria-label="Datum termina"><select aria-label="Vreme termina">${options}</select><button class="remove-slot" type="button" aria-label="Ukloni termin">×</button></div>`;
  }

  function addSlotRow(slotId = "") {
    if (slotsEditor.children.length >= 3) return;
    slotsEditor.insertAdjacentHTML("beforeend", slotRow(slotId));
    updateSlotControls();
  }

  function updateSlotControls() {
    document.querySelector("#add-slot").disabled = slotsEditor.children.length >= 3;
    slotsEditor.querySelectorAll(".remove-slot").forEach((button) => { button.disabled = slotsEditor.children.length <= 1; });
  }

  function openEdit(booking) {
    editForm.elements.id.value = booking.id;
    editForm.elements.teacher.value = booking.teacher;
    editForm.elements.purpose.value = booking.purpose;
    editForm.elements.students.value = booking.students;
    slotsEditor.innerHTML = "";
    (booking.slots || []).forEach((slot) => addSlotRow(slot));
    if (!slotsEditor.children.length) addSlotRow();
    editError.textContent = "";
    document.querySelector("#edit-kicker").textContent = "Izmena rezervacije";
    document.querySelector("#edit-title").textContent = "Podaci i termini";
    document.querySelector("#save-booking").textContent = "Sačuvaj izmene";
    editDialog.showModal();
  }

  function openCreate() {
    editForm.reset();
    editForm.elements.id.value = "";
    slotsEditor.innerHTML = "";
    addSlotRow();
    editError.textContent = "";
    document.querySelector("#edit-kicker").textContent = "Nova rezervacija";
    document.querySelector("#edit-title").textContent = "Podaci i termini";
    document.querySelector("#save-booking").textContent = "Dodaj rezervaciju";
    editDialog.showModal();
  }

  function setupPermanentTimeOptions() {
    const from = permanentForm.elements.fromHour;
    const to = permanentForm.elements.toHour;
    from.innerHTML = HOURS.slice(0, -1).map((hour) => `<option value="${hour}">${String(hour).padStart(2, "0")}:00</option>`).join("");
    from.value = "12";
    updatePermanentEndOptions();
    to.value = "14";
  }

  function updatePermanentEndOptions() {
    const fromHour = Number(permanentForm.elements.fromHour.value || 7);
    const currentValue = Number(permanentForm.elements.toHour.value);
    permanentForm.elements.toHour.innerHTML = Array.from({ length: 18 - fromHour }, (_, index) => fromHour + index + 1)
      .map((hour) => `<option value="${hour}">${String(hour).padStart(2, "0")}:00</option>`).join("");
    permanentForm.elements.toHour.value = String(currentValue > fromHour ? currentValue : fromHour + 1);
  }

  function collectSlots() {
    return [...slotsEditor.querySelectorAll(".slot-editor-row")].map((row) => {
      const date = row.querySelector("input").value;
      const hour = String(row.querySelector("select").value).padStart(2, "0");
      return `${date}-${hour}`;
    });
  }

  function openDelete(booking) {
    pendingDeleteId = booking.id;
    document.querySelector("#delete-copy").textContent = `${booking.teacher} · ${(booking.slots || []).map(formatSlot).join("; ")}`;
    deleteDialog.showModal();
  }

  function showToast(title, copy) {
    clearTimeout(toastTimer);
    document.querySelector("#admin-toast-title").textContent = title;
    document.querySelector("#admin-toast-copy").textContent = copy;
    adminToast.hidden = false;
    toastTimer = setTimeout(() => { adminToast.hidden = true; }, 4000);
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    const button = loginForm.querySelector('[type="submit"]');
    const form = new FormData(loginForm);
    button.disabled = true;
    button.textContent = "Prijavljivanje…";
    try {
      const session = await api(ADMIN_AUTH_URL, { method: "POST", body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
      loginForm.reset();
      showDashboard(session.username);
      await loadAdminData();
    } catch (error) {
      loginError.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Prijavi se";
    }
  });

  document.querySelector("#logout-button").addEventListener("click", async () => {
    await Promise.all([
      api(ADMIN_AUTH_URL, { method: "DELETE" }).catch(() => {}),
      api(TEACHER_AUTH_URL, { method: "DELETE" }).catch(() => {})
    ]);
    bookings = [];
    permanentSlots = [];
    showLogin();
  });
  document.querySelector("#refresh-button").addEventListener("click", loadAdminData);
  document.querySelector("#create-booking").addEventListener("click", openCreate);
  document.querySelector("#create-permanent").addEventListener("click", () => {
    permanentForm.reset();
    setupPermanentTimeOptions();
    permanentError.textContent = "";
    permanentDialog.showModal();
  });
  searchInput.addEventListener("input", renderBookings);
  document.querySelector("#close-edit").addEventListener("click", () => editDialog.close());
  document.querySelector("#close-permanent").addEventListener("click", () => permanentDialog.close());
  document.querySelector("#add-slot").addEventListener("click", () => addSlotRow());
  slotsEditor.addEventListener("click", (event) => {
    const button = event.target.closest(".remove-slot");
    if (!button || button.disabled) return;
    button.closest(".slot-editor-row").remove();
    updateSlotControls();
  });
  bookingsList.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const booking = bookings.find((item) => item.id === action.closest("[data-id]").dataset.id);
    if (!booking) return;
    if (action.dataset.action === "edit") openEdit(booking);
    if (action.dataset.action === "delete") openDelete(booking);
  });

  permanentList.addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="delete-permanent"]');
    if (!button) return;
    const row = button.closest("[data-permanent-id]");
    const slot = permanentSlots.find((item) => item.id === row?.dataset.permanentId);
    if (!slot || !window.confirm(`Ukloniti trajni termin „${slot.name}“?`)) return;
    button.disabled = true;
    try {
      await api(`${PERMANENT_SLOTS_URL}?id=${encodeURIComponent(slot.id)}`, { method: "DELETE" });
      await loadPermanentSlots();
      showToast("Trajni termin je uklonjen", slot.name);
    } catch (error) {
      permanentMessage.textContent = error.message;
      button.disabled = false;
    }
  });

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    editError.textContent = "";
    const button = editForm.querySelector('[type="submit"]');
    const form = new FormData(editForm);
    const payload = { teacher: form.get("teacher"), purpose: form.get("purpose"), students: Number(form.get("students")), slots: collectSlots() };
    button.disabled = true;
    button.textContent = "Čuvanje…";
    const id = String(form.get("id") || "");
    try {
      const url = id ? `${ADMIN_BOOKINGS_URL}?id=${encodeURIComponent(id)}` : ADMIN_BOOKINGS_URL;
      await api(url, { method: id ? "PATCH" : "POST", body: JSON.stringify(payload) });
      editDialog.close();
      await loadBookings();
      showToast(id ? "Izmene su sačuvane" : "Rezervacija je dodata", payload.teacher);
    } catch (error) {
      if (error.status === 401) { editDialog.close(); showLogin(); }
      else editError.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = id ? "Sačuvaj izmene" : "Dodaj rezervaciju";
    }
  });

  permanentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    permanentError.textContent = "";
    const button = permanentForm.querySelector('[type="submit"]');
    const form = new FormData(permanentForm);
    const payload = { name: form.get("name"), day: Number(form.get("day")), fromHour: Number(form.get("fromHour")), toHour: Number(form.get("toHour")) };
    button.disabled = true;
    button.textContent = "Dodavanje…";
    try {
      await api(PERMANENT_SLOTS_URL, { method: "POST", body: JSON.stringify(payload) });
      permanentDialog.close();
      await loadPermanentSlots();
      showToast("Trajni termin je dodat", payload.name);
    } catch (error) {
      permanentError.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Dodaj trajni termin";
    }
  });
  permanentForm.elements.fromHour.addEventListener("change", updatePermanentEndOptions);

  document.querySelector("#cancel-delete").addEventListener("click", () => { pendingDeleteId = null; deleteDialog.close(); });
  document.querySelector("#confirm-delete").addEventListener("click", async () => {
    if (!pendingDeleteId) return;
    const button = document.querySelector("#confirm-delete");
    button.disabled = true;
    button.textContent = "Brisanje…";
    try {
      await api(`${ADMIN_BOOKINGS_URL}?id=${encodeURIComponent(pendingDeleteId)}`, { method: "DELETE" });
      pendingDeleteId = null;
      deleteDialog.close();
      await loadBookings();
      showToast("Rezervacija je obrisana", "Termin je ponovo slobodan.");
    } catch (error) {
      document.querySelector("#delete-copy").textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Obriši rezervaciju";
    }
  });

  [editDialog, permanentDialog, deleteDialog].forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
  setupPermanentTimeOptions();
  checkSession();
})();
