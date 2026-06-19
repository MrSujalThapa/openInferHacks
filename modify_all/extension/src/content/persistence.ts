import type { PatchOperation, SiteCustomization } from "../../../shared/contracts";
import { apiGet, apiPost, apiDelete, getPageContext } from "./api";
import { applyOperations, normalizeOperationsForGroup, revertGroup } from "./patchEngine";
import { resolveTargetElement } from "./grouping";

let reapplyObserver: MutationObserver | null = null;
let bootStarted = false;

export async function loadAndApplyCustomizations(): Promise<number> {
  const { domain, path } = getPageContext();
  console.log("[genie] loading customizations", { domain, path });

  try {
    const data = await apiGet<{ customizations: SiteCustomization[] }>(
      `/api/customizations?domain=${encodeURIComponent(domain)}&path=${encodeURIComponent(path)}`,
    );
    const list = Array.isArray(data.customizations) ? data.customizations : [];
    console.log("[genie] customizations returned:", list.length);

    let applied = 0;
    for (const c of list) {
      if (c.enabled === false) continue;
      const hint = c.target.selectorHint ?? c.target.textSignature?.slice(0, 40) ?? "(no hint)";
      console.log("[genie] applying", { groupId: c.groupId, target: hint });
      if (applyCustomization(c)) applied += 1;
    }

    console.log("[genie] operations applied count:", applied);
    return applied;
  } catch (err) {
    console.warn("[genie] could not load customizations", err);
    return 0;
  }
}

export function applyCustomization(c: SiteCustomization): boolean {
  const el = resolveTargetElement(c.target);
  if (!el || !(el instanceof HTMLElement)) {
    console.log("[genie] target not resolved", { groupId: c.groupId });
    return false;
  }

  el.setAttribute("data-genie-group", c.groupId);
  const ops = normalizeOperationsForGroup(c.groupId, c.operations);
  applyOperations(c.groupId, el, ops);
  console.log("[genie] target resolved", {
    groupId: c.groupId,
    ops: ops.length,
    operationTypes: ops.map((op) => op.type),
    tag: el.tagName.toLowerCase(),
    id: el.id || undefined,
  });
  return true;
}

export function ensureReapplyObserver(): MutationObserver {
  if (reapplyObserver) return reapplyObserver;
  reapplyObserver = setupReapplyObserver();
  return reapplyObserver;
}

export function bootPersistedCustomizations(): void {
  if (bootStarted) return;
  bootStarted = true;

  const run = () => {
    void loadAndApplyCustomizations();
    ensureReapplyObserver();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}

export async function clearPageCustomizations(): Promise<number> {
  const { domain, path } = getPageContext();
  const data = await apiDelete<{ ok: boolean; deletedCount: number }>(
    `/api/customizations?domain=${encodeURIComponent(domain)}&path=${encodeURIComponent(path)}`,
  );

  for (const el of document.querySelectorAll("[data-genie-group]")) {
    if (el instanceof HTMLElement) {
      const groupId = el.getAttribute("data-genie-group");
      if (groupId) revertGroup(groupId);
      el.removeAttribute("data-genie-group");
    }
  }

  console.info("[genie] cleared page customizations", { domain, path, deletedCount: data.deletedCount });
  return data.deletedCount ?? 0;
}

export async function saveCustomization(
  groupId: string,
  target: SiteCustomization["target"],
  operations: PatchOperation[],
): Promise<void> {
  const { domain, path } = getPageContext();
  await apiPost("/api/customizations", {
    domain,
    pathPattern: path,
    groupId,
    target,
    operations,
    enabled: true,
  });
}

export function setupReapplyObserver(): MutationObserver {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      loadAndApplyCustomizations();
    }, 500);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}

export function revertPreview(groupId: string): void {
  revertGroup(groupId);
}
