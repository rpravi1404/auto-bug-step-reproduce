let recording = false;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "toggleRecording") {
    recording = !recording;
    sendResponse({ status: recording });

    // Tell content script to start/stop recording
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: recording ? "startRecording" : "stopRecording"
      });
    });
  }

  if (msg.action === "getStatus") {
    sendResponse({ status: recording });
  }
});
