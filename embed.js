(function () {
  "use strict";

  // Merge user overrides from window.SchedulerConfig
  var cfg = window.SchedulerConfig || {};
  var GET_SLOTS_URL = cfg.getSlotsUrl || "https://n8n.srv902909.hstgr.cloud/webhook/calendar-get-slots";
  var POST_BOOKING_URL = cfg.postBookingUrl || "https://n8n.srv902909.hstgr.cloud/webhook/calendar-book-slot";
  var TITLE = cfg.title || "Schedule a Meeting";
  var SUBTITLE = cfg.subtitle || "Select a convenient time for your appointment";
  var TIMEZONE = cfg.timezone || "CST";
  var DISABLE_WEEKENDS = cfg.disableWeekends !== undefined ? cfg.disableWeekends : true;
  var CONTAINER_ID = cfg.containerId || "scheduling-widget";

  // Find container
  var container = document.getElementById(CONTAINER_ID);
  if (!container) {
    console.error("[SchedulerEmbed] Container #" + CONTAINER_ID + " not found.");
    return;
  }

  // Build the full HTML document that will live inside the iframe
  var iframeHTML = '<!DOCTYPE html>\n\
<html lang="en">\n\
<head>\n\
<meta charset="UTF-8">\n\
<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\
<script src="https://cdn.tailwindcss.com"><\/script>\n\
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">\n\
<script src="https://cdn.jsdelivr.net/npm/flatpickr"><\/script>\n\
<style>\n\
html, body { margin: 0; padding: 0; background: transparent; }\n\
.flatpickr-calendar { border: none !important; box-shadow: none !important; font-family: inherit !important; }\n\
.flatpickr-day.selected, .flatpickr-day.selected:hover { background: #0069ff !important; border-color: #0069ff !important; }\n\
.flatpickr-day:hover { background: #e8f4ff !important; border-color: #e8f4ff !important; }\n\
.flatpickr-day.today { border-color: #0069ff !important; }\n\
.flatpickr-months .flatpickr-month { background: transparent !important; }\n\
.flatpickr-current-month .flatpickr-monthDropdown-months { font-weight: 600 !important; }\n\
.flatpickr-weekdays { background: transparent !important; }\n\
span.flatpickr-weekday { color: #64748b !important; font-weight: 500 !important; }\n\
.time-slot { transition: all 0.2s ease; }\n\
.time-slot:hover { transform: translateY(-1px); }\n\
.time-slot.selected { background: #0069ff !important; color: white !important; border-color: #0069ff !important; }\n\
.spinner { border: 2px solid #f3f3f3; border-top: 2px solid #0069ff; border-radius: 50%; width: 20px; height: 20px; animation: spin 0.8s linear infinite; }\n\
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }\n\
.fade-in { animation: fadeIn 0.3s ease-in-out; }\n\
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }\n\
.slots-container::-webkit-scrollbar { width: 6px; }\n\
.slots-container::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 3px; }\n\
.slots-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }\n\
.slots-container::-webkit-scrollbar-thumb:hover { background: #94a3b8; }\n\
</style>\n\
</head>\n\
<body>\n\
\n\
<div id="scheduler-widget" class="bg-white rounded-2xl shadow-xl shadow-slate-200/50 w-full overflow-hidden">\n\
  <div class="bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-6 text-white">\n\
    <h1 id="widget-title" class="text-2xl font-semibold"></h1>\n\
    <p id="widget-subtitle" class="text-blue-100 mt-1"></p>\n\
  </div>\n\
  <div class="flex flex-col md:flex-row">\n\
    <div class="md:w-1/2 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-100">\n\
      <h2 class="text-lg font-semibold text-slate-800 mb-4">Select a Date</h2>\n\
      <div id="calendar-container" class="flex justify-center">\n\
        <input type="text" id="date-picker" class="hidden">\n\
      </div>\n\
      <div id="selected-date-display" class="mt-4 text-center text-slate-500 hidden">\n\
        <span class="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">\n\
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>\n\
          <span id="date-text"></span>\n\
        </span>\n\
      </div>\n\
    </div>\n\
    <div class="md:w-1/2 p-6 md:p-8">\n\
      <div id="initial-state" class="h-full flex flex-col items-center justify-center text-center py-12">\n\
        <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">\n\
          <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>\n\
        </div>\n\
        <p class="text-slate-500">Select a date to view available times</p>\n\
      </div>\n\
      <div id="loading-state" class="hidden h-full flex flex-col items-center justify-center py-12">\n\
        <div class="spinner mb-4"></div>\n\
        <p class="text-slate-500">Loading available times...</p>\n\
      </div>\n\
      <div id="slots-container" class="hidden">\n\
        <h2 class="text-lg font-semibold text-slate-800 mb-4">Select a Time</h2>\n\
        <p class="text-sm text-slate-500 mb-4" id="timezone-display"></p>\n\
        <div id="slots-list" class="slots-container grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2"></div>\n\
        <div id="no-slots" class="hidden text-center py-8">\n\
          <div class="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">\n\
            <svg class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>\n\
          </div>\n\
          <p class="text-slate-600 font-medium">No available times</p>\n\
          <p class="text-slate-400 text-sm mt-1">Please select another date</p>\n\
        </div>\n\
      </div>\n\
      <div id="booking-form" class="hidden fade-in">\n\
        <div class="flex items-center gap-2 mb-6">\n\
          <button id="back-to-slots" class="text-slate-400 hover:text-slate-600 transition-colors">\n\
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>\n\
          </button>\n\
          <h2 class="text-lg font-semibold text-slate-800">Enter Your Details</h2>\n\
        </div>\n\
        <div id="selected-datetime" class="bg-slate-50 rounded-lg p-4 mb-6">\n\
          <div class="flex items-center gap-3">\n\
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">\n\
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>\n\
            </div>\n\
            <div>\n\
              <p class="font-medium text-slate-800" id="confirm-date"></p>\n\
              <p class="text-sm text-slate-500" id="confirm-time"></p>\n\
            </div>\n\
          </div>\n\
        </div>\n\
        <form id="details-form" class="space-y-4">\n\
          <div>\n\
            <label for="name" class="block text-sm font-medium text-slate-700 mb-1">Name</label>\n\
            <input type="text" id="name" name="name" required class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="John Doe">\n\
          </div>\n\
          <div>\n\
            <label for="email" class="block text-sm font-medium text-slate-700 mb-1">Email</label>\n\
            <input type="email" id="email" name="email" required class="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" placeholder="john@example.com">\n\
          </div>\n\
          <button type="submit" id="submit-btn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">\n\
            <span id="submit-text">Confirm Booking</span>\n\
            <div id="submit-spinner" class="spinner hidden" style="border-top-color: white;"></div>\n\
          </button>\n\
        </form>\n\
      </div>\n\
      <div id="success-state" class="hidden fade-in h-full flex flex-col items-center justify-center text-center py-8">\n\
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">\n\
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>\n\
        </div>\n\
        <h3 class="text-xl font-semibold text-slate-800 mb-2">Booking Confirmed!</h3>\n\
        <p class="text-slate-500 mb-6">You&#39;ll receive a confirmation email shortly.</p>\n\
        <div id="booking-summary" class="bg-slate-50 rounded-lg p-4 w-full max-w-xs text-left">\n\
          <p class="text-sm text-slate-600"><span class="font-medium">Date:</span> <span id="summary-date"></span></p>\n\
          <p class="text-sm text-slate-600 mt-1"><span class="font-medium">Time:</span> <span id="summary-time"></span></p>\n\
          <p class="text-sm text-slate-600 mt-1"><span class="font-medium">Name:</span> <span id="summary-name"></span></p>\n\
        </div>\n\
        <button id="book-another" class="mt-6 text-blue-600 hover:text-blue-700 font-medium text-sm">Schedule another meeting</button>\n\
      </div>\n\
      <div id="error-state" class="hidden fade-in text-center py-8">\n\
        <div class="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">\n\
          <svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>\n\
        </div>\n\
        <p class="text-slate-600 font-medium">Something went wrong</p>\n\
        <p class="text-slate-400 text-sm mt-1" id="error-message">Please try again later</p>\n\
        <button id="retry-btn" class="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm">Try again</button>\n\
      </div>\n\
    </div>\n\
  </div>\n\
</div>\n\
\n\
<script>\n\
var CONFIG = {\n\
  GET_SLOTS_URL: ' + JSON.stringify(GET_SLOTS_URL) + ',\n\
  POST_BOOKING_URL: ' + JSON.stringify(POST_BOOKING_URL) + ',\n\
  TITLE: ' + JSON.stringify(TITLE) + ',\n\
  SUBTITLE: ' + JSON.stringify(SUBTITLE) + ',\n\
  TIMEZONE: ' + JSON.stringify(TIMEZONE) + ',\n\
  DISABLE_WEEKENDS: ' + JSON.stringify(DISABLE_WEEKENDS) + ',\n\
  MIN_DATE: "today"\n\
};\n\
\n\
var state = { selectedDate: null, selectedTime: null, availableSlots: [] };\n\
\n\
var elements = {};\n\
\n\
function formatDate(dateStr) {\n\
  var date = new Date(dateStr + "T00:00:00");\n\
  return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });\n\
}\n\
\n\
function formatTime(timeStr) {\n\
  var parts = timeStr.split(":");\n\
  var hour = parseInt(parts[0]);\n\
  var minutes = parts[1];\n\
  var ampm = hour >= 12 ? "PM" : "AM";\n\
  var hour12 = hour % 12 || 12;\n\
  return hour12 + ":" + minutes + " " + ampm;\n\
}\n\
\n\
function showElement(el) { el.classList.remove("hidden"); }\n\
function hideElement(el) { el.classList.add("hidden"); }\n\
\n\
function notifyParentHeight() {\n\
  var h = document.documentElement.scrollHeight;\n\
  window.parent.postMessage({ type: "scheduler-resize", height: h }, "*");\n\
}\n\
\n\
function showState(stateName) {\n\
  hideElement(elements.initialState);\n\
  hideElement(elements.loadingState);\n\
  hideElement(elements.slotsContainer);\n\
  hideElement(elements.bookingForm);\n\
  hideElement(elements.successState);\n\
  hideElement(elements.errorState);\n\
  switch (stateName) {\n\
    case "initial": showElement(elements.initialState); break;\n\
    case "loading": showElement(elements.loadingState); break;\n\
    case "slots": showElement(elements.slotsContainer); break;\n\
    case "form": showElement(elements.bookingForm); break;\n\
    case "success": showElement(elements.successState); break;\n\
    case "error": showElement(elements.errorState); break;\n\
  }\n\
  setTimeout(notifyParentHeight, 50);\n\
}\n\
\n\
function fetchAvailableSlots(date) {\n\
  return fetch(CONFIG.GET_SLOTS_URL + "?date=" + date)\n\
    .then(function (r) { if (!r.ok) throw new Error("Failed to fetch"); return r.json(); });\n\
}\n\
\n\
function submitBooking(data) {\n\
  return fetch(CONFIG.POST_BOOKING_URL, {\n\
    method: "POST",\n\
    headers: { "Content-Type": "application/json" },\n\
    body: JSON.stringify(data)\n\
  }).then(function (r) { if (!r.ok) throw new Error("Failed to book"); return r.json(); });\n\
}\n\
\n\
function renderTimeSlots(slots) {\n\
  elements.slotsList.innerHTML = "";\n\
  if (slots.length === 0) {\n\
    hideElement(elements.slotsList);\n\
    showElement(elements.noSlots);\n\
    return;\n\
  }\n\
  showElement(elements.slotsList);\n\
  hideElement(elements.noSlots);\n\
  slots.forEach(function (time) {\n\
    var btn = document.createElement("button");\n\
    btn.className = "time-slot border border-slate-200 rounded-lg py-2.5 px-4 text-sm font-medium text-slate-700 hover:border-blue-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2";\n\
    btn.textContent = formatTime(time);\n\
    btn.dataset.time = time;\n\
    btn.addEventListener("click", function () { selectTimeSlot(time, btn); });\n\
    elements.slotsList.appendChild(btn);\n\
  });\n\
}\n\
\n\
function selectTimeSlot(time, button) {\n\
  document.querySelectorAll(".time-slot").forEach(function (b) { b.classList.remove("selected"); });\n\
  button.classList.add("selected");\n\
  state.selectedTime = time;\n\
  showBookingForm();\n\
}\n\
\n\
function showBookingForm() {\n\
  elements.confirmDate.textContent = formatDate(state.selectedDate);\n\
  elements.confirmTime.textContent = formatTime(state.selectedTime) + " (" + CONFIG.TIMEZONE + ")";\n\
  showState("form");\n\
  elements.nameInput.focus();\n\
}\n\
\n\
function handleDateChange(selectedDates, dateStr) {\n\
  state.selectedDate = dateStr;\n\
  state.selectedTime = null;\n\
  elements.dateText.textContent = formatDate(dateStr);\n\
  showElement(elements.dateDisplay);\n\
  showState("loading");\n\
  fetchAvailableSlots(dateStr).then(function (data) {\n\
    state.availableSlots = data.availableSlots;\n\
    renderTimeSlots(state.availableSlots);\n\
    showState("slots");\n\
  }).catch(function (err) {\n\
    console.error("Error fetching slots:", err);\n\
    elements.errorMessage.textContent = "Could not load available times";\n\
    showState("error");\n\
  });\n\
}\n\
\n\
function handleFormSubmit(e) {\n\
  e.preventDefault();\n\
  var name = elements.nameInput.value.trim();\n\
  var email = elements.emailInput.value.trim();\n\
  if (!name || !email) return;\n\
  elements.submitBtn.disabled = true;\n\
  elements.submitText.textContent = "Booking...";\n\
  showElement(elements.submitSpinner);\n\
  submitBooking({ date: state.selectedDate, time: state.selectedTime, name: name, email: email })\n\
    .then(function () {\n\
      elements.summaryDate.textContent = formatDate(state.selectedDate);\n\
      elements.summaryTime.textContent = formatTime(state.selectedTime) + " (" + CONFIG.TIMEZONE + ")";\n\
      elements.summaryName.textContent = name;\n\
      showState("success");\n\
    }).catch(function (err) {\n\
      console.error("Error submitting booking:", err);\n\
      elements.errorMessage.textContent = "Could not complete booking";\n\
      showState("error");\n\
    }).finally(function () {\n\
      elements.submitBtn.disabled = false;\n\
      elements.submitText.textContent = "Confirm Booking";\n\
      hideElement(elements.submitSpinner);\n\
    });\n\
}\n\
\n\
function resetWidget() {\n\
  state.selectedDate = null;\n\
  state.selectedTime = null;\n\
  state.availableSlots = [];\n\
  hideElement(elements.dateDisplay);\n\
  elements.detailsForm.reset();\n\
  if (window.calendarInstance) window.calendarInstance.clear();\n\
  showState("initial");\n\
}\n\
\n\
function init() {\n\
  elements = {\n\
    title: document.getElementById("widget-title"),\n\
    subtitle: document.getElementById("widget-subtitle"),\n\
    datePicker: document.getElementById("date-picker"),\n\
    dateDisplay: document.getElementById("selected-date-display"),\n\
    dateText: document.getElementById("date-text"),\n\
    timezoneDisplay: document.getElementById("timezone-display"),\n\
    initialState: document.getElementById("initial-state"),\n\
    loadingState: document.getElementById("loading-state"),\n\
    slotsContainer: document.getElementById("slots-container"),\n\
    slotsList: document.getElementById("slots-list"),\n\
    noSlots: document.getElementById("no-slots"),\n\
    bookingForm: document.getElementById("booking-form"),\n\
    detailsForm: document.getElementById("details-form"),\n\
    backToSlots: document.getElementById("back-to-slots"),\n\
    confirmDate: document.getElementById("confirm-date"),\n\
    confirmTime: document.getElementById("confirm-time"),\n\
    submitBtn: document.getElementById("submit-btn"),\n\
    submitText: document.getElementById("submit-text"),\n\
    submitSpinner: document.getElementById("submit-spinner"),\n\
    successState: document.getElementById("success-state"),\n\
    summaryDate: document.getElementById("summary-date"),\n\
    summaryTime: document.getElementById("summary-time"),\n\
    summaryName: document.getElementById("summary-name"),\n\
    bookAnother: document.getElementById("book-another"),\n\
    errorState: document.getElementById("error-state"),\n\
    errorMessage: document.getElementById("error-message"),\n\
    retryBtn: document.getElementById("retry-btn"),\n\
    nameInput: document.getElementById("name"),\n\
    emailInput: document.getElementById("email")\n\
  };\n\
  elements.title.textContent = CONFIG.TITLE;\n\
  elements.subtitle.textContent = CONFIG.SUBTITLE;\n\
  elements.timezoneDisplay.textContent = "Times shown in " + CONFIG.TIMEZONE;\n\
  window.calendarInstance = flatpickr(elements.datePicker, {\n\
    inline: true,\n\
    minDate: CONFIG.MIN_DATE,\n\
    disable: CONFIG.DISABLE_WEEKENDS ? [function (date) { return (date.getDay() === 0 || date.getDay() === 6); }] : [],\n\
    onChange: handleDateChange\n\
  });\n\
  elements.detailsForm.addEventListener("submit", handleFormSubmit);\n\
  elements.backToSlots.addEventListener("click", function () {\n\
    state.selectedTime = null;\n\
    document.querySelectorAll(".time-slot").forEach(function (b) { b.classList.remove("selected"); });\n\
    showState("slots");\n\
  });\n\
  elements.bookAnother.addEventListener("click", resetWidget);\n\
  elements.retryBtn.addEventListener("click", function () {\n\
    if (state.selectedDate) handleDateChange(null, state.selectedDate);\n\
    else showState("initial");\n\
  });\n\
  setTimeout(notifyParentHeight, 200);\n\
  new MutationObserver(function () { notifyParentHeight(); }).observe(document.body, { childList: true, subtree: true, attributes: true });\n\
}\n\
\n\
document.addEventListener("DOMContentLoaded", init);\n\
<\/script>\n\
</body>\n\
</html>';

  // Create the iframe
  var iframe = document.createElement("iframe");
  iframe.id = "scheduler-embed-iframe";
  iframe.style.cssText = "width:100%;border:none;overflow:hidden;min-height:500px;";
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute("srcdoc", iframeHTML);

  container.appendChild(iframe);

  // Listen for resize messages from the iframe
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "scheduler-resize" && typeof e.data.height === "number") {
      iframe.style.height = e.data.height + "px";
    }
  });
})();
