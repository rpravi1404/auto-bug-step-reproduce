// ---------------------------
// Variables
// ---------------------------
let isRecording = false;
let steps = [];
let inputTimeout;
let lastUrl = location.href;

// ---------------------------
// Step Generator Function
// ---------------------------
function generateStep(event) {
  const el = event.target;
  const label =
    (el.innerText && el.innerText.trim()) ||
    el.placeholder ||
    el.ariaLabel ||
    el.name ||
    el.id ||
    el.value ||
    el.tagName;

  switch (event.type) {
    case "click":
      return `Clicked on '${label}'`;
    case "keyup":
    case "blur":
    case "input":
      if (el.value && label ) {
        if (el.type === "password") return `Entered password in '${label}' field`;
        return `Entered '${el.value}' in '${label}' field`;
      }
      return null;
    case "change":
      return `Changed value of '${label}'`;
    case "submit":
      return `Submitted form '${label}'`;
    default:
      return `Interacted with '${label}'`;
  }
}


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
      const formattedStep = formatStep(step);
      steps.push(formattedStep);
      chrome.storage.local.set({ steps });
      console.log(`Step ${steps.length}: ${formattedStep}`);
    }, 400);
  } else {
    const step = generateStep(event);
    const formattedStep = formatStep(step);
    steps.push(formattedStep);
    chrome.storage.local.set({ steps });
    console.log(`Step ${steps.length}: ${formattedStep}`);
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
  window.addEventListener("keyup", handleEvent, true);
  window.addEventListener("blur", handleEvent, true);
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
  steps.push(step);
  chrome.storage.local.set({ steps });
  console.log(`Step 1: ${step}`);

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

// ---------------------------
// Natural Language Formatter
// ---------------------------
function formatStep(step) {
  const pageTitle = document.title || "this page";
  const url = location.hostname.replace("www.", "");

  if (step.startsWith("Clicked on")) {
    return `User clicked on the ${step.split("'")[1]} button on ${pageTitle}.`;
  }
  if (step.startsWith("Entered")) {
    return `User entered ${step.split("'")[1]} in the ${step.split("'")[3]} field.`;
  }
  if (step.startsWith("Changed value of")) {
    return `User modified the value of ${step.split("'")[1]} on ${pageTitle}.`;
  }
  if (step.startsWith("Submitted")) {
    return `User submitted the ${step.split("'")[1]} form on ${url}.`;
  }
  if (step.startsWith("Navigated to")) {
    return `User navigated to ${step.replace("Navigated to", "").trim()}.`;
  }
  return `User performed: ${step}`;
}

