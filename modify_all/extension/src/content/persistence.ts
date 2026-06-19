import type { PatchOperation, SiteCustomization } from "../../../shared/contracts";
import { apiGet, apiPost, getPageContext } from "./api";
import { applyOperations, revertGroup } from "./patchEngine";
import { resolveTargetElement } from "./grouping";

export async function loadAndApplyCustomizations(): Promise<void> {
  const { domain, path } = getPageContext();
  try {
    const data = await apiGet<{ customizations: SiteCustomization[] }>(
      `/api/customizations?domain=${encodeURIComponent(domain)}&path=${encodeURIComponent(path)}`,
    );
    for (const c of data.customizations) {
      applyCustomization(c);
    }
  } catch (err) {
    console.warn("[genie] could not load customizations", err);
  }
}

export function applyCustomization(c: SiteCustomization): void {
  const el = resolveTargetElement(c.target);
  if (!el || !(el instanceof HTMLElement)) return;
  el.setAttribute("data-genie-group", c.groupId);
  applyOperations(c.groupId, el, c.operations);
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
