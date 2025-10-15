// ---------------------------
// Background Script Logic
// ---------------------------

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Auto Bug Steps Reproducer extension installed");
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startRecording") {
    // Set recording state in storage
    chrome.storage.local.set({ isRecording: true }, () => {
      console.log("Recording started from background");
    });
  }
  
  if (message.action === "stopRecording") {
    // Clear recording state in storage
    chrome.storage.local.set({ isRecording: false }, () => {
      console.log("Recording stopped from background");
    });
  }
  
  if (message.action === "getSteps") {
    // Get recorded steps from storage
    chrome.storage.local.get(["steps"], (result) => {
      sendResponse({ steps: result.steps || [] });
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === "clearSteps") {
    // Clear all recorded steps
    chrome.storage.local.remove(["steps"], () => {
      console.log("Steps cleared from background");
      sendResponse({ success: true });
    });
    return true;
  }
});

// Handle tab updates to inject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if recording is active and inject content script
    chrome.storage.local.get(["isRecording"], (result) => {
      if (result.isRecording) {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['scripts/contentScript.js']
        }).catch(err => {
          console.log("Could not inject content script:", err);
        });
      }
    });
  }
});
