"use strict";
const buttonElement = document.getElementById("toggle-edit-mode");
const statusElement = document.getElementById("status");
if (!(buttonElement instanceof HTMLButtonElement) ||
    !(statusElement instanceof HTMLElement)) {
    throw new Error("Genie popup elements were not found.");
}
const button = buttonElement;
const statusNode = statusElement;
async function getActiveTabId() {
    return new Promise((resolve, reject) => {
        chrome.tabs?.query({ active: true, currentWindow: true }, (tabs) => {
            const tabId = tabs[0]?.id;
            if (typeof tabId !== "number") {
                reject(new Error("No active tab found."));
                return;
            }
            resolve(tabId);
        });
    });
}
async function sendMessage(tabId, message) {
    return new Promise((resolve, reject) => {
        chrome.tabs?.sendMessage(tabId, message, (response) => {
            const runtimeError = chrome.runtime?.lastError;
            if (runtimeError?.message) {
                reject(new Error(runtimeError.message));
                return;
            }
            if (!response) {
                reject(new Error("No response from Genie content script."));
                return;
            }
            resolve(response);
        });
    });
}
function setUi(enabled, message) {
    button.textContent = enabled ? "Disable Edit Mode" : "Enable Edit Mode";
    statusNode.textContent =
        message ?? (enabled ? "Edit mode is on." : "Edit mode is off.");
}
async function syncState() {
    try {
        const tabId = await getActiveTabId();
        const response = await sendMessage(tabId, { type: "GENIE_GET_EDIT_MODE" });
        if (!response.ok) {
            throw new Error(response.error);
        }
        setUi(response.enabled);
    }
    catch (error) {
        setUi(false, error instanceof Error ? error.message : "Unable to reach the page.");
    }
}
button.addEventListener("click", async () => {
    button.disabled = true;
    try {
        const tabId = await getActiveTabId();
        const current = await sendMessage(tabId, { type: "GENIE_GET_EDIT_MODE" });
        if (!current.ok) {
            throw new Error(current.error);
        }
        const next = await sendMessage(tabId, {
            type: "GENIE_SET_EDIT_MODE",
            enabled: !current.enabled,
        });
        if (!next.ok) {
            throw new Error(next.error);
        }
        setUi(next.enabled);
    }
    catch (error) {
        setUi(false, error instanceof Error ? error.message : "Unable to toggle edit mode.");
    }
    finally {
        button.disabled = false;
    }
});
void syncState();
