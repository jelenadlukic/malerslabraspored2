(() => {
  "use strict";

  const MAX_SELECTION = 3;
  const HOURS = Array.from({ length: 11 }, (_, index) => index + 7);
  const DAYS = ["Ponedeljak", "Utorak", "Sreda", "Četvrtak", "Petak"];
  const DAY_SHORT = ["Pon", "Uto", "Sre", "Čet", "Pet"];
  const MONTHS = ["januar", "februar", "mart", "april", "maj", "jun", "jul", "avgust", "septembar", "oktobar", "novembar", "decembar"];
  const MONTHS_GENITIVE = ["januara", "februara", "marta", "aprila", "maja", "juna", "jula", "avgusta", "septembra", "oktobra", "novembra", "decembra"];
  const TEACHER_AUTH_URL = "/.netlify/functions/teacher-auth";
  const BOOKINGS_URL = "/.netlify/functions/bookings";
  const ATTENDANCE_URL = "/.netlify/functions/attendance";
  const EQUIPMENT = [
    { category: "tools", name: "Kombinovana testera GTM 12 JL Professional", quantity: 1, image: "./assets/equipment/gtm-12-jl.png" },
    { category: "tools", name: "Akumulatorski set GDX 18V-200 + GSR 18V-50", quantity: 1, image: "./assets/equipment/gdx-gsr-set.png" },
    { category: "tools", name: "Ubodna testera GST 160 BCE Professional", quantity: 1, image: "./assets/equipment/gst-160-bce.png" },
    { category: "tools", name: "Stubna bušilica PBD 40", quantity: 1, image: "./assets/equipment/pbd-40.png" },
    { category: "tools", name: "Laserski daljinomer GLM 50-27 CG Professional", quantity: 1, image: "./assets/equipment/glm-50-27-cg.png" },
    { category: "tools", name: "Pištolj za lepljenje GKP 200 CE Professional", quantity: 3, image: "./assets/equipment/gkp-200-ce.png" },
    { category: "tools", name: "Fen za vreli vazduh GHG 20-63 Professional", quantity: 1, image: "./assets/equipment/ghg-20-63.png" },
    { category: "tools", name: "Ugaona brusilica GWS 12-125 S Professional", quantity: 1, image: "./assets/equipment/gws-12-125-s.png" },
    { category: "accessories", name: "GDE 125 EA-T Professional – poklopac za usisavanje prašine za ugaonu brusilicu", quantity: 1, image: "./assets/equipment/gde-125-ea-t.png" },
    { category: "accessories", name: "103-delni X-Line Titanium set", quantity: 1, image: "./assets/equipment/x-line-103.jpg" },
    { category: "accessories", name: "35-delni Extra Hard set nastavaka za odvrtače", quantity: 1, image: "./assets/equipment/extra-hard-35.png" },
    { category: "accessories", name: "37-delni set odvrtača sa drškom", quantity: 1, image: "./assets/equipment/screwdriver-37.png" },
    { category: "accessories", name: "FSN SA Professional – adapter za ubodnu testeru i vođicu", quantity: 1, image: "./assets/equipment/fsn-sa.png" },
    { category: "accessories", name: "EXPERT Self Cut Speed set pljosnatih burgija", quantity: 2, image: "./assets/equipment/self-cut-speed.png" },
    { category: "digital", name: "VR Oculus Meta Quest 3S – 256 GB", quantity: 1, image: "./assets/equipment/meta-quest-3s.png" },
    { category: "digital", name: "3D štampač", quantity: 1, image: "./assets/equipment/3d-printer.png" },
    { category: "digital", name: "Arduino set", quantity: 8, image: "./assets/equipment/arduino-starter-kit.jpg" },
    { category: "digital", name: "MIDI kontroler – Novation Launchpad Mini MK3 (8×8)", quantity: 1, image: "./assets/equipment/novation-launchpad-mini-mk3.png" },
    { category: "digital", name: "Kamera za računarski vid", quantity: 1, image: "./assets/equipment/computer-vision-camera.png" },
    { category: "digital", name: "Računar", quantity: 1, image: "./assets/equipment/computer.webp" },
    { category: "digital", name: "TV", quantity: 1, image: "./assets/equipment/tv.png" },
    { category: "furniture", name: "SKÅDIS polica, bela", quantity: 6, image: "./assets/furniture/skadis-shelf.jpg" },
    { category: "furniture", name: "SKÅDIS kuka, bela", quantity: 6, image: "./assets/furniture/skadis-hook.jpg" },
    { category: "furniture", name: "SKÅDIS posuda s poklopcem, bela", quantity: 6, image: "./assets/furniture/skadis-container.jpg" },
    { category: "furniture", name: "SKÅDIS perforirana ploča, bela, 56 × 56 cm", quantity: 6, image: "./assets/furniture/skadis-board-white.jpg" },
    { category: "furniture", name: "ADILS nogar, bela", quantity: 40, image: "./assets/furniture/adils-leg.jpg" },
    { category: "furniture", name: "LINNMON ploča stola, bela, 100 × 60 cm", quantity: 10, image: "./assets/furniture/linnmon-top.jpg" },
    { category: "furniture", name: "TROTTEN podokvir ploče stola, bela, 120 × 70 × 75 cm", quantity: 7, image: "./assets/furniture/trotten-frame.jpg" },
    { category: "furniture", name: "TROTTEN ploča stola, bela, 120 × 70 cm", quantity: 7, image: "./assets/furniture/trotten-top.jpg" },
    { category: "furniture", name: "FRÖSVI sklopiva stolica, bukovina", quantity: 15, image: "./assets/furniture/frosvi-chair.jpg" },
    { category: "furniture", name: "SKÅDIS perforirana ploča, crna, 56 × 56 cm", quantity: 2, image: "./assets/furniture/skadis-board-black.jpg" },
    { category: "furniture", name: "SKÅDIS set dodataka, 7 komada, crna", quantity: 2, image: "./assets/furniture/skadis-accessories-black.jpg" },
    { category: "furniture", name: "KALLAX spojene police, crnosmeđa, 77 × 147 cm", quantity: 2, image: "./assets/furniture/kallax.jpg" },
    { category: "furniture", name: "MICKE radni sto, bela, 105 × 50 cm", quantity: 1, image: "./assets/furniture/micke-desk.jpg" },
    { category: "furniture", name: "LÄKTARE konferencijska stolica, brezov furnir/crna", quantity: 1, image: "./assets/furniture/laktare-chair.jpg" },
    { category: "furniture", name: "BJÖRKÅSEN postolje za laptop, boja antracita", quantity: 1, image: "./assets/furniture/bjorkasen.jpg" },
    { category: "furniture", name: "TJUSIG vešalica za vrata/zid, bela, 60 cm", quantity: 3, image: "./assets/furniture/tjusig.jpg" },
    { category: "furniture", name: "Crni lejzi beg", quantity: 2, image: "./assets/furniture/black-bean-bag.webp" },
    { category: "furniture", name: "Pokretni nosač za televizor", quantity: 1, image: "./assets/furniture/mobile-tv-stand.webp" }
  ];

  const loginView = document.querySelector("#login-view");
  const loginForm = document.querySelector("#login-form");
  const loginError = document.querySelector("#login-error");
  const appContent = document.querySelector("#app-content");
  const headerActions = document.querySelector("#header-actions");
  const scheduleShell = document.querySelector(".schedule-shell");
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
  const equipmentList = document.querySelector("#equipment-list");
  const attendanceList = document.querySelector("#attendance-list");
  const attendanceMessage = document.querySelector("#attendance-message");
  const attendanceSearch = document.querySelector("#attendance-search");
  const passwordInput = document.querySelector("#teacher-password");
  const passwordToggle = document.querySelector("#password-toggle");
  const pageLinks = [...document.querySelectorAll("[data-page-link]")];
  const pageViews = [...document.querySelectorAll("[data-page]")];

  let selected = [];
  let currentWeek = 0;
  let mobileDay = 0;
  let bookings = [];
  let attendanceRecords = [];
  let attendanceLoaded = false;
  let openingMonday = currentMonday();
  let today = startOfDay(new Date());
  let closingDate = addDays(today, 14);
  let activeEquipmentTab = "tools";

  function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  function currentMonday() {
    const current = startOfDay(new Date());
    current.setDate(current.getDate() - ((current.getDay() + 6) % 7));
    return current;
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

  function formatWindow() {
    if (today.getMonth() === closingDate.getMonth()) return `${today.getDate()}–${closingDate.getDate()}. ${MONTHS[today.getMonth()]}`;
    return `${today.getDate()}. ${MONTHS[today.getMonth()]} – ${closingDate.getDate()}. ${MONTHS[closingDate.getMonth()]}`;
  }

  function formatSlot(date, hour, long = false) {
    const dayIndex = (date.getDay() + 6) % 7;
    const day = long ? DAYS[dayIndex] : DAY_SHORT[dayIndex];
    return `${day}, ${date.getDate()}. ${MONTHS_GENITIVE[date.getMonth()]} · ${String(hour).padStart(2, "0")}:00 – ${String(hour + 1).padStart(2, "0")}:00`;
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
    appContent.hidden = true;
    headerActions.hidden = true;
    document.body.classList.remove("is-authenticated");
  }

  function showApp() {
    loginView.hidden = true;
    appContent.hidden = false;
    headerActions.hidden = false;
    document.body.classList.add("is-authenticated");
    showPage(pageFromHash(), { updateHash: false });
  }

  function pageFromHash() {
    const page = window.location.hash.slice(1);
    return ["oprema", "prisustvo"].includes(page) ? page : "raspored";
  }

  function showPage(page, { updateHash = true } = {}) {
    const target = ["oprema", "prisustvo"].includes(page) ? page : "raspored";
    pageViews.forEach((view) => { view.hidden = view.dataset.page !== target; });
    pageLinks.forEach((link) => {
      const active = link.dataset.pageLink === target;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (updateHash && window.location.hash !== `#${target}`) history.pushState(null, "", `#${target}`);
    const titles = { raspored: "Raspored | Mejkers Lab", oprema: "Oprema | Mejkers Lab", prisustvo: "Prisustvo | Mejkers Lab" };
    document.title = titles[target];
    window.scrollTo({ top: 0, behavior: "auto" });
    if (target === "prisustvo" && !attendanceLoaded) loadAttendance().catch(() => {});
  }

  async function checkSession() {
    try {
      await api(TEACHER_AUTH_URL);
      showApp();
      await loadBookings();
    } catch {
      showLogin();
    }
  }

  async function loadBookings({ silent = false } = {}) {
    if (!silent) scheduleShell.classList.add("is-loading");
    try {
      const data = await api(BOOKINGS_URL);
      bookings = Array.isArray(data.bookings) ? data.bookings : [];
      if (data.openingMonday) openingMonday = parseIsoDate(data.openingMonday);
      if (data.today) today = parseIsoDate(data.today);
      if (data.closingDate) closingDate = parseIsoDate(data.closingDate);
      mobileDay = defaultMobileDay();
      currentWeek = Math.max(minWeekOffset(), Math.min(currentWeek, maxWeekOffset()));
      selected = selected.filter((id) => !getBooking(id));
      document.querySelector("#booking-window").textContent = formatWindow();
      render();
      return data;
    } catch (error) {
      if (error.status === 401) {
        showLogin();
        return null;
      }
      if (!silent) showToast(error.message || "Raspored trenutno nije dostupan.", false);
      throw error;
    } finally {
      scheduleShell.classList.remove("is-loading");
    }
  }

  async function loadAttendance({ silent = false } = {}) {
    if (!silent) attendanceMessage.textContent = "Učitavanje evidencije…";
    try {
      const data = await api(ATTENDANCE_URL);
      attendanceRecords = Array.isArray(data.bookings) ? data.bookings : [];
      attendanceLoaded = true;
      attendanceMessage.textContent = "";
      renderAttendance();
      return data;
    } catch (error) {
      if (error.status === 401) {
        showLogin();
        return null;
      }
      attendanceMessage.textContent = error.message || "Evidencija trenutno nije dostupna.";
      throw error;
    }
  }

  function defaultMobileDay() {
    const day = today.getDay();
    return day >= 1 && day <= 5 ? day - 1 : 0;
  }

  function maxWeekOffset() {
    return Math.max(0, Math.floor((startOfDay(closingDate) - startOfDay(openingMonday)) / 604800000));
  }

  function minWeekOffset() {
    const day = today.getDay();
    return day === 0 || day === 6 ? Math.min(1, maxWeekOffset()) : 0;
  }

  function getBooking(id) {
    return bookings.find((booking) => Array.isArray(booking.slots) && booking.slots.includes(id));
  }

  function isPast(date, hour) {
    const end = new Date(date);
    end.setHours(hour + 1, 0, 0, 0);
    return end <= new Date();
  }

  function isOutsideWindow(date) {
    const value = startOfDay(date);
    return value < startOfDay(today) || value > startOfDay(closingDate);
  }

  function isMicrocontrollerSlot(date, hour) {
    return (date.getDay() === 2 || date.getDay() === 4) && (hour === 12 || hour === 13);
  }

  function render() {
    renderMobileDays();
    renderGrid();
    renderSelection();
    const weekStart = addDays(openingMonday, currentWeek * 7);
    weekLabel.textContent = formatWeekRange(weekStart);
    prevWeek.disabled = currentWeek <= minWeekOffset();
    nextWeek.disabled = currentWeek >= maxWeekOffset();
  }

  function renderMobileDays() {
    const weekStart = addDays(openingMonday, currentWeek * 7);
    mobileDays.innerHTML = DAYS.map((day, index) => {
      const date = addDays(weekStart, index);
      const isToday = isoDate(date) === isoDate(today);
      const outside = startOfDay(date) > startOfDay(closingDate);
      return `<button class="mobile-day${isToday ? " is-today" : ""}" type="button" role="tab" aria-selected="${index === mobileDay}" data-day="${index}" aria-label="${day}, ${date.getDate()}. ${MONTHS[date.getMonth()]}"${outside ? " disabled" : ""}><span>${DAY_SHORT[index]}</span><strong>${date.getDate()}.</strong>${isToday ? '<em>Danas</em>' : ""}</button>`;
    }).join("");
  }

  function renderGrid() {
    const weekStart = addDays(openingMonday, currentWeek * 7);
    const isMobile = window.matchMedia("(max-width: 700px)").matches;
    let html = "";

    if (!isMobile) {
      html += '<div class="grid-corner" aria-hidden="true"></div>';
      DAYS.forEach((day, index) => {
        const date = addDays(weekStart, index);
        const todayClass = isoDate(date) === isoDate(today) ? " today" : "";
        const closedClass = startOfDay(date) > startOfDay(closingDate) ? " outside-window" : "";
        html += `<div class="day-heading${todayClass}${closedClass}"><span class="day-name">${day}</span><span class="day-date">${date.getDate()}. ${MONTHS[date.getMonth()]}</span>${todayClass ? '<span class="today-label">Danas</span>' : ""}</div>`;
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
        const outside = isOutsideWindow(date);
        const reserved = isMicrocontrollerSlot(date, hour);
        let className = "slot";
        let label = "Slobodno";
        let disabled = "";
        let action = "Izaberi termin";

        if (booking) {
          className += " booked";
          label = `<span>${escapeHtml(booking.teacher)}</span>`;
          action = `Prikaži rezervaciju: ${booking.teacher}`;
        } else if (outside || past) {
          className += outside && startOfDay(date) > startOfDay(closingDate) ? " closed" : " past";
          label = outside && startOfDay(date) > startOfDay(closingDate) ? "Van perioda" : "Nedostupno";
          action = label;
          disabled = " disabled";
        } else if (reserved) {
          className += " reserved";
          label = "Sekcija mikrokontrolera";
          action = "Trajni termin svake nedelje za sekciju mikrokontrolera";
          disabled = " disabled";
        } else if (picked) {
          className += " selected";
          label = "Izabrano";
          action = "Ukloni iz izbora";
        }

        html += `<button class="${className}" type="button" data-slot="${id}" data-time="${String(hour).padStart(2, "0")}:00 – ${String(hour + 1).padStart(2, "0")}:00" aria-label="${escapeHtml(formatSlot(date, hour, true))} — ${escapeHtml(action)}"${disabled}>${label}</button>`;
      });
    });
    grid.innerHTML = html;
  }

  function renderSelection() {
    selectionBar.hidden = selected.length === 0;
    selectionCount.textContent = `${selected.length}/3`;
    selectionSummary.textContent = selected.map(labelForSlot).join(" · ");
  }

  function renderEquipment() {
    const items = EQUIPMENT.filter((item) => item.category === activeEquipmentTab);
    equipmentList.innerHTML = items.map((item) => `
      <tr>
        <td data-label="Slika"><img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy" width="150" height="96"></td>
        <td data-label="Naziv artikla"><strong>${escapeHtml(item.name)}</strong></td>
        <td data-label="Količina"><span class="quantity-badge">${item.quantity} ${item.quantity === 1 ? "komad" : "komada"}</span></td>
      </tr>
    `).join("");
    document.querySelector("#equipment-total").textContent = String(EQUIPMENT.reduce((sum, item) => sum + item.quantity, 0));
  }

  function renderAttendance() {
    const query = attendanceSearch.value.trim().toLowerCase();
    const filtered = attendanceRecords.filter((booking) => {
      const searchable = `${booking.teacher || ""} ${booking.purpose || ""} ${(booking.slots || []).join(" ")}`.toLowerCase();
      return !query || searchable.includes(query);
    });
    const slotCount = attendanceRecords.reduce((sum, booking) => sum + (Array.isArray(booking.slots) ? booking.slots.length : 0), 0);
    const studentCount = attendanceRecords.reduce((sum, booking) => sum + (Number(booking.students) || 0), 0);
    document.querySelector("#attendance-booking-count").textContent = String(attendanceRecords.length);
    document.querySelector("#attendance-slot-count").textContent = String(slotCount);
    document.querySelector("#attendance-student-count").textContent = String(studentCount);

    if (!filtered.length) {
      attendanceList.innerHTML = `<tr><td class="attendance-empty" colspan="4">${attendanceRecords.length ? "Nema rezultata za ovu pretragu." : "Još nema sačuvanih rezervacija."}</td></tr>`;
      return;
    }

    attendanceList.innerHTML = filtered.map((booking) => `
      <tr>
        <td data-label="Termin"><div class="attendance-slots">${(booking.slots || []).map((slot) => `<span>${escapeHtml(labelForSlot(slot))}</span>`).join("")}</div></td>
        <td data-label="Nastavnik"><strong>${escapeHtml(booking.teacher || "—")}</strong></td>
        <td data-label="Svrha">${escapeHtml(booking.purpose || "—")}</td>
        <td data-label="Učenici"><span class="attendance-students">${Number(booking.students) || 0}</span></td>
      </tr>
    `).join("");
  }

  function upsertAttendanceRecord(booking) {
    attendanceRecords = [...attendanceRecords.filter((item) => item.id !== booking.id), booking]
      .sort((left, right) => String(right.slots?.[0] || "").localeCompare(String(left.slots?.[0] || "")));
    attendanceLoaded = true;
    renderAttendance();
  }

  function labelForSlot(id) {
    const [year, month, day, hour] = id.split("-").map(Number);
    return formatSlot(new Date(year, month - 1, day), hour);
  }

  function handleSlotClick(button) {
    const id = button.dataset.slot;
    const booking = getBooking(id);
    if (booking) return openDetails(booking, id);
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
    const response = await fetch(BOOKINGS_URL, {
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
      upsertAttendanceRecord(booking);
      bookingDialog.close();
      bookingForm.reset();
      selected = [];
      render();
      showToast(`${booking.slots.length === 1 ? "1 termin" : `${booking.slots.length} termina`} · ${booking.teacher}`, true);
    } catch (error) {
      if (error.status === 401) {
        bookingDialog.close();
        showLogin();
      } else {
        formError.textContent = error.message;
        if (error.status === 409) await loadBookings({ silent: true }).catch(() => {});
      }
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
    toast.querySelector("strong").textContent = success ? "Termin je rezervisan" : "Pažljivo";
    toastCopy.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.textContent = "";
    const button = loginForm.querySelector('[type="submit"]');
    const form = new FormData(loginForm);
    button.disabled = true;
    button.textContent = "Prijavljivanje…";
    try {
      await api(TEACHER_AUTH_URL, { method: "POST", body: JSON.stringify({ username: form.get("username"), password: form.get("password"), remember: form.get("remember") === "on" }) });
      loginForm.reset();
      passwordInput.type = "password";
      passwordToggle.setAttribute("aria-pressed", "false");
      passwordToggle.setAttribute("aria-label", "Prikaži lozinku");
      showApp();
      await loadBookings();
    } catch (error) {
      loginError.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "Prijavi se";
    }
  });

  passwordToggle.addEventListener("click", () => {
    const visible = passwordInput.type === "text";
    passwordInput.type = visible ? "password" : "text";
    passwordToggle.setAttribute("aria-pressed", String(!visible));
    passwordToggle.setAttribute("aria-label", visible ? "Prikaži lozinku" : "Sakrij lozinku");
    passwordInput.focus();
  });

  pageLinks.forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    showPage(link.dataset.pageLink);
  }));
  window.addEventListener("hashchange", () => { if (!appContent.hidden) showPage(pageFromHash(), { updateHash: false }); });

  document.querySelector("#logout-button").addEventListener("click", async () => {
    await api(TEACHER_AUTH_URL, { method: "DELETE" }).catch(() => {});
    bookings = [];
    attendanceRecords = [];
    attendanceLoaded = false;
    selected = [];
    showLogin();
    loginForm.elements.username.focus();
  });
  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-slot]");
    if (button && !button.disabled) handleSlotClick(button);
  });
  mobileDays.addEventListener("click", (event) => {
    const button = event.target.closest("[data-day]");
    if (!button || button.disabled) return;
    mobileDay = Number(button.dataset.day);
    renderMobileDays();
    renderGrid();
  });
  document.querySelector(".equipment-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-equipment-tab]");
    if (!button) return;
    activeEquipmentTab = button.dataset.equipmentTab;
    document.querySelectorAll("[data-equipment-tab]").forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    renderEquipment();
  });
  attendanceSearch.addEventListener("input", renderAttendance);
  prevWeek.addEventListener("click", () => { if (currentWeek > minWeekOffset()) { currentWeek -= 1; mobileDay = currentWeek === minWeekOffset() ? defaultMobileDay() : 0; render(); } });
  nextWeek.addEventListener("click", () => { if (currentWeek < maxWeekOffset()) { currentWeek += 1; mobileDay = 0; render(); } });
  weekLabel.addEventListener("click", () => { currentWeek = minWeekOffset(); mobileDay = defaultMobileDay(); render(); });
  document.querySelector("#open-booking").addEventListener("click", openBookingDialog);
  document.querySelector("#close-booking").addEventListener("click", () => bookingDialog.close());
  document.querySelector("#close-details").addEventListener("click", () => detailsDialog.close());
  bookingForm.addEventListener("submit", submitBooking);
  [bookingDialog, detailsDialog].forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
  window.addEventListener("resize", () => { if (!appContent.hidden) render(); });

  renderEquipment();
  renderAttendance();
  checkSession();
})();
