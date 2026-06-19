const toggle = document.getElementById("toggle") as HTMLButtonElement;
const clearBtn = document.getElementById("clear") as HTMLButtonElement;

async function syncState(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GENIE_GET_STATE" });
    updateButton(res?.active ?? false);
  } catch {
    updateButton(false);
  }
}

function updateButton(active: boolean): void {
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

clearBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const confirmed = confirm(
    "Remove all saved customizations for this exact page URL? Other pages on this site will not be affected.",
  );
  if (!confirmed) return;

  try {
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GENIE_CLEAR_PAGE_CUSTOMIZATIONS" });
    if (!res?.ok) {
      alert(res?.error ?? "Could not clear customizations for this page.");
    }
  } catch {
    alert("Genie could not reach this page. Try refreshing and ensure the extension is loaded.");
  }
});

syncState();
