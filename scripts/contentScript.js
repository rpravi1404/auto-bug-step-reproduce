// ---------------------------
// Variables
// ---------------------------
let isRecording = false;
let steps = [];
let inputTimeout;
let lastUrl = location.href;

// ---------------------------
// Event Handler
// ---------------------------
// 🔹 Maintain individual debounce timers for each element
const debounceMap = new Map();

const getDebounceDelay = (el) => {
  if (el.tagName === "TEXTAREA") return 800;
  if (el.tagName === "INPUT" && el.type === "text") return 400;
  return 200;
};

function handleEvent(event) {
  if (!isRecording) return;

  const debouncedEvents = ["input", "keyup", "blur"];
  const target = event.target;
  const DEBOUNCE_DELAY = getDebounceDelay(target);

  const recordStep = () => {
    const step = generateStep(event);
    if (!step) return;

    const formattedStep = formatStep(step);
    steps.push(formattedStep);
    chrome.storage.local.set({ steps });
    console.log(`Step ${steps.length}: ${formattedStep}`);
  };

  if (target.tagName === "INPUT" && target.type === "radio") {
    if (event.type === "change") {
      // Only record the change event, ignore other events like click
      recordStep();
    }
    return; // Skip the rest of the logic for radios
  }

  if (debouncedEvents.includes(event.type)) {
    // 🕒 Debounce specific to each input element
    const existingTimer = debounceMap.get(target);
    if (existingTimer) clearTimeout(existingTimer);

    const newTimer = setTimeout(() => {
      recordStep();
      debounceMap.delete(target); // cleanup
    }, DEBOUNCE_DELAY);

    debounceMap.set(target, newTimer);
  } else {
    recordStep();
  }
}

// ---------------------------
// Attach Event Listeners
// ---------------------------
function attachListeners() {
  window.addEventListener("click", handleEvent, true);
  window.addEventListener("input", handleEvent, true);
  window.addEventListener("keyup", handleEvent, true);
  window.addEventListener("blur", handleEvent, true);
  window.addEventListener("change", handleEvent, true);
  window.addEventListener("submit", handleEvent, true);
}

// ---------------------------
// Detach Event Listeners
// ---------------------------
function detachListeners() {
  window.removeEventListener("click", handleEvent, true);
  window.removeEventListener("input", handleEvent, true);
  window.removeEventListener("keyup", handleEvent, true);
  window.removeEventListener("blur", handleEvent, true);
  window.removeEventListener("change", handleEvent, true);
  window.removeEventListener("submit", handleEvent, true);
}

// ---------------------------
// URL Change (SPA + Reload)
// ---------------------------
function monitorUrlChanges() {
  const recordUrlChange = () => {
    if (location.href !== lastUrl && isRecording) {
      lastUrl = location.href;
      const step = `Navigated to ${location.href}`;
      const formattedStep = formatStep(step);
      steps.push(formattedStep);
      chrome.storage.local.set({ steps });
      console.log(`Step ${steps.length}: ${formattedStep}`);
      // Reattach event listeners for new DOM
      setTimeout(() => attachListeners(), 1000);
    }
  };

  // SPA: pushState, replaceState, popstate
  ["pushState", "replaceState"].forEach((method) => {
    const original = history[method];
    history[method] = function () {
      const result = original.apply(this, arguments);
      recordUrlChange();
      return result;
    };
  });

  window.addEventListener("popstate", recordUrlChange);
  // For full reloads, use MutationObserver
  const observer = new MutationObserver(() => recordUrlChange());
  observer.observe(document, { childList: true, subtree: true });
}

// ---------------------------
// Start Recording
// ---------------------------
function startRecording() {
  if (isRecording) return;
  isRecording = true;
  steps = [];

  const step = `Navigated to ${location.href}`;
  const formattedStep = formatStep(step);
  steps.push(formattedStep);
  chrome.storage.local.set({ steps });
  console.log(`Step 1: ${formattedStep}`);

  attachListeners();
  monitorUrlChanges();
}

// ---------------------------
// Stop Recording
// ---------------------------
function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  detachListeners();
  chrome.storage.local.set({ steps }, () => {
    console.log(`Recording stopped. ${steps.length} steps saved.`);
  });
}

// ---------------------------
// Message Listener
// ---------------------------
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "startRecording") startRecording();
  if (msg.action === "stopRecording") stopRecording();
});

// ---------------------------
// Auto-Resume After Navigation
// ---------------------------
chrome.storage.local.get(["isRecording"], (res) => {
  if (res.isRecording) {
    console.log("🔁 Resuming recording after reload...");
    startRecording();
  }
});