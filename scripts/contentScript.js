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
function handleEvent(event) {
  if (!isRecording) return;

  if (["input", "keyup", "blur"].includes(event.type)) {
    // Debounce text input events
    clearTimeout(inputTimeout);
    inputTimeout = setTimeout(() => {
      const step = generateStep(event);
      if (step) {
        const formattedStep = formatStep(step);
        steps.push(formattedStep);
        chrome.storage.local.set({ steps });
        console.log(`Step ${steps.length}: ${formattedStep}`);
      }
    }, 400);
  } else {
    const step = generateStep(event);
    if (step) {
      const formattedStep = formatStep(step);
      steps.push(formattedStep);
      chrome.storage.local.set({ steps });
      console.log(`Step ${steps.length}: ${formattedStep}`);
    }
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