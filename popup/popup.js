const recordBtn = document.getElementById("recordBtn");
const stepsList = document.getElementById("stepsList");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");

// ---------------------------
// Utility: Get Active Tab
// ---------------------------
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// ---------------------------
// Toggle Recording
// ---------------------------
recordBtn.addEventListener("click", async () => {
  const tab = await getActiveTab();
  const res = await chrome.storage.local.get(["isRecording"]);
  const isRecording = res.isRecording;

  if (!isRecording) {
    await chrome.storage.local.set({ isRecording: true, steps: [] });
    recordBtn.textContent = "Stop Recording";
    chrome.tabs.sendMessage(tab.id, { action: "startRecording" });
    console.log("Recording started");
  } else {
    await chrome.storage.local.set({ isRecording: false });
    recordBtn.textContent = "Start Recording";
    chrome.tabs.sendMessage(tab.id, { action: "stopRecording" });
    console.log("Recording stopped");
  }
});

// ---------------------------
// Display Steps
// ---------------------------
function displaySteps(steps = []) {
  stepsList.innerHTML = "";

  if (!steps.length) {
    const li = document.createElement("li");
    li.textContent = "No steps recorded yet.";
    li.style.color = "#777";
    stepsList.appendChild(li);
    return;
  }

  steps.forEach((s, idx) => {
    const text = typeof s === "string" ? s : s.natural;
    const li = document.createElement("li");
    li.textContent = `${idx + 1}. ${text}`;
    stepsList.appendChild(li);
  });
}

// ---------------------------
// Clear Steps
// ---------------------------
clearBtn.addEventListener("click", async () => {
  await chrome.storage.local.set({ steps: [] });
  displaySteps([]);
});

// ---------------------------
// Copy to Clipboard
// ---------------------------
copyBtn.addEventListener("click", async () => {
  const res = await chrome.storage.local.get(["steps"]);
  const steps = res.steps || [];

  if (!steps.length) {
    alert("No steps to copy yet!");
    return;
  }

  // Create plain-text Jira-friendly format
  const formatted = steps
    .map((s, i) => `${i + 1}. ${typeof s === "string" ? s : s.natural}`)
    .join("\n");

  try {
    await navigator.clipboard.writeText(formatted);
    copyBtn.textContent = "✅ Copied!";
    setTimeout(() => (copyBtn.textContent = "📋 Copy to Clipboard"), 1500);
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    alert("Failed to copy steps. Please try manually.");
  }
});

// ---------------------------
// Initialize Popup
// ---------------------------
async function init() {
  const res = await chrome.storage.local.get(["isRecording", "steps"]);
  const isRecording = res.isRecording;
  const steps = res.steps || [];

  recordBtn.textContent = isRecording ? "Stop Recording" : "Start Recording";
  displaySteps(steps);

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.steps) {
      displaySteps(changes.steps.newValue || []);
    }
  });
}

init();
