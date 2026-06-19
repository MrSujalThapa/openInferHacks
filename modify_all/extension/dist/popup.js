"use strict";
(() => {
  // src/popup/popup.ts
  var toggle = document.getElementById("toggle");
  async function syncState() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    try {
      const res = await chrome.tabs.sendMessage(tab.id, { type: "GENIE_GET_STATE" });
      updateButton(res?.active ?? false);
    } catch {
      updateButton(false);
    }
  }
  function updateButton(active) {
    toggle.textContent = active ? "Exit Edit Mode" : "Enter Edit Mode";
    toggle.classList.toggle("active", active);
  }
  toggle.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    try {
      const res = await chrome.tabs.sendMessage(tab.id, { type: "GENIE_TOGGLE_EDIT_MODE" });
      updateButton(res?.active ?? false);
    } catch {
      alert("Genie could not reach this page. Try refreshing and ensure the extension is loaded.");
    }
  });
  syncState();
})();
//# sourceMappingURL=popup.js.map
