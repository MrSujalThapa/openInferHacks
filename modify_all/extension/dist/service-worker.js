"use strict";
(() => {
  // src/background/service-worker.ts
  chrome.runtime.onInstalled.addListener(() => {
    console.log("[genie] extension installed");
  });
})();
//# sourceMappingURL=service-worker.js.map
