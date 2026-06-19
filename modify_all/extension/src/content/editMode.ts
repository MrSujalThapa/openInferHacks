import type { EditableGroup, PatchOperation, Point } from "../../../shared/contracts";
import { DEMO_USER_ID } from "../../../shared/contracts";
import { apiPost, getPageContext } from "./api";
import {
  createDragState,
  endDragResize,
  startDrag,
  startResize,
  updateDrag,
  updateResize,
} from "./dragResize";
import {
  buildTargetSignature,
  collectElementsFromLasso,
  createGroupId,
  findBestGroupContainer,
  getGroupSelectionRect,
  getVisibleRect,
  isGenieElement,
  logGroupSelection,
  pickContainerAtPoint,
  polygonBounds,
  summarizeElement,
} from "./grouping";
import { LassoController, Overlay } from "./overlay";
import {
  applyOperations,
  applyVisualLayout,
  buildOperationsFromManualEdit,
  ensureLayoutBase,
  getElementTransform,
  normalizeOperationsForGroup,
  parseElementLayout,
  type ManualEditHint,
} from "./patchEngine";
import {
  ensureReapplyObserver,
  loadAndApplyCustomizations,
  saveCustomization,
  clearPageCustomizations,
} from "./persistence";
import { GeniePanel } from "./ui/geniePanel";
import { GlobalSaveButton } from "./ui/globalSaveButton";

export type EditModeState =
  | "off"
  | "hovering"
  | "selecting"
  | "group-selected"
  | "dragging"
  | "resizing"
  | "agent-open";

type SelectionEntry = {
  group: EditableGroup;
  element: HTMLElement;
  operations: PatchOperation[];
  lastManualHint: ManualEditHint | null;
};

type PendingEdit = {
  group: EditableGroup;
  element: HTMLElement;
  operations: PatchOperation[];
  lastManualHint: ManualEditHint | null;
  dirty: boolean;
};

type SaveableEntry = Omit<PendingEdit, "dirty">;

type DragSnapshot = {
  translate: { x: number; y: number };
  rect: EditableGroup["shape"]["rect"];
  layout: ReturnType<typeof parseElementLayout>;
};

const CLICK_DRAG_THRESHOLD = 8;

class EditModeController {
  state: EditModeState = "off";

  private overlay: Overlay | null = null;
  private lasso = new LassoController();
  private panel: GeniePanel | null = null;
  private globalSave: GlobalSaveButton | null = null;
  private pendingEdits = new Map<string, PendingEdit>();
  private selections: SelectionEntry[] = [];
  private primaryIndex = 0;
  private dragState = createDragState();
  private pointerDownClient: { x: number; y: number } | null = null;
  private dragSnapshots: Map<string, DragSnapshot> = new Map();
  private resizeSnapshots: Map<string, DragSnapshot> = new Map();
  private activeDragGroupId: string | null = null;

  async enter(): Promise<void> {
    if (this.state !== "off") return;

    document.body.classList.add("genie-editing");

    this.overlay = new Overlay({
      onLassoComplete: (points) => this.onLassoComplete(points),
      onBackgroundClick: () => this.closePanel(),
      onGroupDoubleClick: (groupId) => {
        this.setPrimaryByGroupId(groupId);
        this.openAgentPanel();
      },
    });

    this.overlay.mount();

    this.panel = new GeniePanel({
      onPreview: (instruction) => this.runAgent(instruction),
      onQuickAction: (instruction) => this.runAgent(instruction),
      onSave: () => this.saveCurrent(),
      onCancel: () => this.closePanel(),
    });

    this.panel.mount();
    this.panel.hide();

    this.globalSave = new GlobalSaveButton({
      onSave: () => this.saveAllPending(),
    });
    this.globalSave.mount();

    this.bindEvents();
    this.state = "hovering";

    await loadAndApplyCustomizations();
    ensureReapplyObserver();
  }

  exit(): void {
    document.body.classList.remove("genie-editing");

    this.unbindEvents();

    this.panel?.unmount();
    this.globalSave?.unmount();
    this.overlay?.unmount();

    this.selections = [];
    this.pendingEdits.clear();
    this.primaryIndex = 0;
    this.dragSnapshots.clear();
    this.resizeSnapshots.clear();
    this.activeDragGroupId = null;
    this.pointerDownClient = null;
    this.overlay = null;
    this.panel = null;
    this.globalSave = null;
    this.state = "off";
  }

  async clearCurrentPageCustomizations(): Promise<number> {
    const deletedCount = await clearPageCustomizations();
    this.pendingEdits.clear();
    this.clearSelections();
    this.updateGlobalSaveButton();
    this.closePanel();
    return deletedCount;
  }

  private getPrimary(): SelectionEntry | null {
    return this.selections[this.primaryIndex] ?? null;
  }

  private findSelection(groupId: string): SelectionEntry | undefined {
    return this.selections.find((s) => s.group.groupId === groupId);
  }

  private bindEvents(): void {
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("pointerdown", this.onPointerDown);
    document.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp, true);
    window.addEventListener("pointercancel", this.onPointerUp, true);
  }

  private unbindEvents(): void {
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("pointerdown", this.onPointerDown);
    document.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp, true);
    window.removeEventListener("pointercancel", this.onPointerUp, true);
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (
      this.state === "off" ||
      this.lasso.isActive() ||
      this.dragState.dragging ||
      this.dragState.resizing
    ) {
      return;
    }

    const stack = document.elementsFromPoint(event.clientX, event.clientY);
    const element = stack.find(
      (node) =>
        !isGenieElement(node) &&
        node !== document.body &&
        node !== document.documentElement,
    );

    if (!element) {
      this.overlay?.hideHover();
      return;
    }

    const rect = getVisibleRect(element);

    if (rect) {
      this.overlay?.showHover(rect);
      this.state = this.selections.length > 0 ? "group-selected" : "hovering";
    }
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (this.state === "off" || !this.overlay) return;

    const target = event.target as Element;

    if (target.closest(".genie-panel")) return;
    if (target.closest(".genie-global-save")) return;
    if (target.closest(".genie-selection-box")) return;
    if (this.state === "agent-open") return;
    if (!target.closest(".genie-overlay-root")) return;

    this.pointerDownClient = { x: event.clientX, y: event.clientY };
    this.overlay.root.classList.add("is-lasso-mode");
    this.lasso.start(event.clientX, event.clientY);
    this.state = "selecting";
    this.closePanel();
  };

  private onSelectionDragStart = (groupId: string, event: PointerEvent): void => {
    if (!this.overlay) return;

    this.setPrimaryByGroupId(groupId);
    const entry = this.findSelection(groupId);
    if (!entry) return;

    this.activeDragGroupId = groupId;
    this.captureDragSnapshots();

    const rect = entry.group.shape.rect;
    const translate = getElementTransform(entry.element);

    startDrag(this.dragState, event, rect, translate);
    this.state = "dragging";
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  private onResizeHandle = (groupId: string, corner: string, event: PointerEvent): void => {
    const entry = this.findSelection(groupId);
    if (!entry) return;

    this.setPrimaryByGroupId(groupId);
    this.activeDragGroupId = groupId;
    this.captureResizeSnapshots();

    startResize(this.dragState, corner, event, entry.group.shape.rect);
    this.state = "resizing";
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  private captureDragSnapshots(): void {
    this.dragSnapshots.clear();
    for (const entry of this.selections) {
      this.dragSnapshots.set(entry.group.groupId, {
        translate: getElementTransform(entry.element),
        rect: { ...entry.group.shape.rect },
        layout: parseElementLayout(entry.element),
      });
    }
  }

  private captureResizeSnapshots(): void {
    this.resizeSnapshots.clear();
    for (const entry of this.selections) {
      ensureLayoutBase(entry.element);
      this.resizeSnapshots.set(entry.group.groupId, {
        translate: getElementTransform(entry.element),
        rect: { ...entry.group.shape.rect },
        layout: parseElementLayout(entry.element),
      });
    }
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.overlay) return;

    if (this.dragState.dragging && this.activeDragGroupId) {
      const { translateX, translateY, rect } = updateDrag(this.dragState, event);
      const dx = translateX - this.dragState.startTranslate.x;
      const dy = translateY - this.dragState.startTranslate.y;

      for (const entry of this.selections) {
        const snap = this.dragSnapshots.get(entry.group.groupId);
        if (!snap) continue;

        const newTranslateX = snap.translate.x + dx;
        const newTranslateY = snap.translate.y + dy;
        const newRect = {
          x: snap.rect.x + dx,
          y: snap.rect.y + dy,
          width: snap.rect.width,
          height: snap.rect.height,
        };

        applyVisualLayout(entry.element, {
          translateX: newTranslateX,
          translateY: newTranslateY,
          visualWidth: snap.layout.visualWidth,
          visualHeight: snap.layout.visualHeight,
        });

        entry.group.shape.rect = newRect;
        this.overlay.updateSelectionRect(entry.group.groupId, newRect);
      }

      return;
    }

    if (this.dragState.resizing && this.activeDragGroupId) {
      const primaryRect = updateResize(this.dragState, event);
      const scaleX = primaryRect.width / this.dragState.startRect.width;
      const scaleY = primaryRect.height / this.dragState.startRect.height;

      for (const entry of this.selections) {
        const snap = this.resizeSnapshots.get(entry.group.groupId);
        if (!snap) continue;

        const visualWidth = Math.max(40, snap.layout.visualWidth * scaleX);
        const visualHeight = Math.max(40, snap.layout.visualHeight * scaleY);

        applyVisualLayout(entry.element, {
          translateX: snap.translate.x,
          translateY: snap.translate.y,
          visualWidth,
          visualHeight,
        });

        let newX = snap.rect.x;
        let newY = snap.rect.y;

        if (entry.group.groupId === this.activeDragGroupId) {
          newX = primaryRect.x;
          newY = primaryRect.y;
        } else {
          if (this.dragState.corner.includes("w")) {
            newX = snap.rect.x + (snap.layout.visualWidth - visualWidth);
          }
          if (this.dragState.corner.includes("n")) {
            newY = snap.rect.y + (snap.layout.visualHeight - visualHeight);
          }
        }

        const newRect = {
          x: newX,
          y: newY,
          width: visualWidth,
          height: visualHeight,
        };

        entry.group.shape.rect = newRect;
        this.overlay.updateSelectionRect(entry.group.groupId, newRect);
      }

      return;
    }

    if (this.lasso.isActive()) {
      const points = this.lasso.move(event.clientX, event.clientY);
      this.overlay.drawLasso(points);
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.dragState.dragging || this.dragState.resizing) {
      const hint = {
        translate: this.dragState.dragging
          ? { x: this.dragState.lastTranslate.x, y: this.dragState.lastTranslate.y }
          : undefined,
        rect:
          this.dragState.resizing && this.dragState.lastRect
            ? {
                width: this.dragState.lastRect.width,
                height: this.dragState.lastRect.height,
              }
            : undefined,
      };

      endDragResize(this.dragState);
      this.activeDragGroupId = null;
      this.dragSnapshots.clear();
      this.resizeSnapshots.clear();

      for (const entry of this.selections) {
        const layout = parseElementLayout(entry.element);
        const manualHint: ManualEditHint = {
          translate: { x: layout.translateX, y: layout.translateY },
          rect: { width: layout.visualWidth, height: layout.visualHeight },
        };
        entry.lastManualHint = manualHint;
        entry.operations = buildOperationsFromManualEdit(
          entry.group.groupId,
          entry.element,
          entry.operations,
          manualHint,
        );
        this.syncPendingFromEntry(entry, true);
      }

      console.info("[genie] manual operations updated", {
        groups: this.selections.map((s) => ({
          groupId: s.group.groupId,
          operations: s.operations.map((op) => op.type),
        })),
      });

      this.state = "group-selected";
      return;
    }

    if (this.lasso.isActive()) {
      const points = this.lasso.end();
      this.overlay?.clearLasso();
      this.overlay?.root.classList.remove("is-lasso-mode");

      const down = this.pointerDownClient;
      this.pointerDownClient = null;

      const dragDist =
        down
          ? Math.hypot(event.clientX - down.x, event.clientY - down.y)
          : CLICK_DRAG_THRESHOLD + 1;

      if (dragDist < CLICK_DRAG_THRESHOLD && down) {
        const container = pickContainerAtPoint(down.x, down.y);
        if (container) {
          void this.selectContainer(container, event.shiftKey);
        }
        this.lasso.reset();
        return;
      }

      if (points.length > 4) {
        void this.onLassoComplete(points, event.shiftKey);
      }

      this.lasso.reset();
    }
  };

  private async onLassoComplete(points: Point[], addToSelection = false): Promise<void> {
    const lassoRect = polygonBounds(points);
    const elements = collectElementsFromLasso(points);
    const container = findBestGroupContainer(elements, lassoRect);

    if (!container || !(container instanceof HTMLElement)) return;

    const rect = getGroupSelectionRect(container, elements, lassoRect);
    if (!rect) return;

    logGroupSelection(elements, container, lassoRect, rect);

    await this.createAndAddSelection(container, {
      addToSelection,
      shape: { type: "lasso", rect, points },
      domElements: elements,
    });
  }

  private async selectContainer(container: HTMLElement, addToSelection: boolean): Promise<void> {
    const rect = getVisibleRect(container);
    if (!rect) return;

    await this.createAndAddSelection(container, {
      addToSelection,
      shape: { type: "rectangle", rect },
      domElements: [container],
    });
  }

  private async createAndAddSelection(
    container: HTMLElement,
    options: {
      addToSelection: boolean;
      shape: EditableGroup["shape"];
      domElements: Element[];
    },
  ): Promise<void> {
    if (!options.addToSelection) {
      this.clearSelections();
    }

    if (this.selections.some((s) => s.element === container)) {
      this.setPrimaryByElement(container);
      this.syncOverlaySelections();
      return;
    }

    const { domain, path } = getPageContext();
    const groupId = createGroupId();
    const domSummary = options.domElements
      .slice(0, 12)
      .map((element, index) => summarizeElement(element, index))
      .filter(Boolean) as EditableGroup["domSummary"];

    const target = buildTargetSignature(container);
    const now = new Date().toISOString();

    const group: EditableGroup = {
      groupId,
      userId: DEMO_USER_ID,
      domain,
      path,
      shape: options.shape,
      target,
      domSummary,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const understood = await apiPost<{ label: string }>("/api/groups/understand", {
        domain,
        path,
        group,
      });
      group.label = understood.label;
    } catch {
      group.label = target.textSignature?.slice(0, 30) ?? "Section";
    }

    this.addSelection(group, container);
  }

  private addSelection(group: EditableGroup, element: HTMLElement): void {
    ensureLayoutBase(element);
    element.setAttribute("data-genie-group", group.groupId);

    this.selections.push({
      group,
      element,
      operations: [],
      lastManualHint: null,
    });
    this.primaryIndex = this.selections.length - 1;
    this.syncOverlaySelections();
    this.state = "group-selected";
  }

  private clearSelections(): void {
    for (const entry of this.selections) {
      this.syncPendingFromEntry(entry);
    }

    this.selections = [];
    this.primaryIndex = 0;
    this.overlay?.hideAllSelections();
  }

  private setPrimaryByGroupId(groupId: string): void {
    const index = this.selections.findIndex((s) => s.group.groupId === groupId);
    if (index >= 0) this.primaryIndex = index;
  }

  private setPrimaryByElement(element: HTMLElement): void {
    const index = this.selections.findIndex((s) => s.element === element);
    if (index >= 0) this.primaryIndex = index;
  }

  private syncOverlaySelections(): void {
    if (!this.overlay) return;

    this.overlay.syncSelections(
      this.selections.map((entry, index) => ({
        groupId: entry.group.groupId,
        rect: entry.group.shape.rect,
        label: index === this.primaryIndex ? entry.group.label : undefined,
        primary: index === this.primaryIndex,
      })),
      {
        onResizeHandle: (groupId, corner, event) => this.onResizeHandle(groupId, corner, event),
        onSelectionDragStart: (groupId, event) => this.onSelectionDragStart(groupId, event),
      },
    );
  }

  private openAgentPanel(): void {
    const primary = this.getPrimary();
    if (!primary || !this.overlay || !this.panel) return;

    this.panel.positionBeside(primary.group.shape.rect, primary.group.label);
    this.state = "agent-open";
  }

  private closePanel(): void {
    this.panel?.hide();

    if (this.selections.length > 0) {
      this.state = "group-selected";
    } else {
      this.state = "hovering";
    }
  }

  private async runAgent(instruction: string): Promise<void> {
    const primary = this.getPrimary();
    if (!primary || !this.panel) return;

    if (!instruction) {
      this.panel.showError("Enter an instruction or pick a quick action");
      return;
    }

    this.panel.setLoading();

    const { domain, path } = getPageContext();

    try {
      const result = await apiPost<{
        sectionLabel: string;
        intent: string;
        operations: PatchOperation[];
        critique: {
          safe: boolean;
          reason: string;
        };
        traceId: string;
      }>("/api/agent/section-edit", {
        domain,
        path,
        group: primary.group,
        instruction,
      });

      primary.operations = normalizeOperationsForGroup(primary.group.groupId, result.operations);
      applyOperations(primary.group.groupId, primary.element, primary.operations);

      primary.group.label = result.sectionLabel;
      this.syncPendingFromEntry(primary, true);
      this.syncOverlaySelections();
      this.panel.showResult(result);
    } catch (error) {
      this.panel.showError(String(error));
    }
  }

  private syncPendingFromEntry(entry: SaveableEntry, forceDirty = false): void {
    const hasChanges = entry.operations.length > 0 || entry.lastManualHint !== null;
    const existing = this.pendingEdits.get(entry.group.groupId);
    const dirty = forceDirty || hasChanges || existing?.dirty === true;

    if (!dirty && !existing) return;

    this.pendingEdits.set(entry.group.groupId, {
      group: entry.group,
      element: entry.element,
      operations: entry.operations,
      lastManualHint: entry.lastManualHint,
      dirty,
    });
    this.updateGlobalSaveButton();
  }

  private updateGlobalSaveButton(): void {
    const count = [...this.pendingEdits.values()].filter((entry) => entry.dirty).length;
    this.globalSave?.update(count);
  }

  private buildManualHint(entry: SaveableEntry): ManualEditHint {
    return (
      entry.lastManualHint ??
      (() => {
        const layout = parseElementLayout(entry.element);
        return {
          translate: { x: layout.translateX, y: layout.translateY },
          rect: { width: layout.visualWidth, height: layout.visualHeight },
        };
      })()
    );
  }

  private async saveGroupEntry(entry: SaveableEntry): Promise<boolean> {
    const hint = this.buildManualHint(entry);

    let operations = buildOperationsFromManualEdit(
      entry.group.groupId,
      entry.element,
      entry.operations,
      hint,
    );

    operations = normalizeOperationsForGroup(entry.group.groupId, operations);
    entry.operations = operations;

    const rect = getVisibleRect(entry.element);
    if (rect) {
      entry.group.target = { ...entry.group.target, bbox: rect };
    }

    if (operations.length === 0) return false;

    console.info("[genie] saving customization", {
      groupId: entry.group.groupId,
      operationTypes: operations.map((op) => op.type),
      operationCount: operations.length,
    });

    await saveCustomization(entry.group.groupId, entry.group.target, operations);

    const pending = this.pendingEdits.get(entry.group.groupId);
    if (pending) {
      pending.dirty = false;
      pending.operations = operations;
    }

    const selection = this.findSelection(entry.group.groupId);
    if (selection) {
      selection.operations = operations;
    }

    return true;
  }

  private async saveCurrent(): Promise<void> {
    if (!this.panel || this.selections.length === 0) return;

    let savedCount = 0;

    for (const entry of this.selections) {
      this.syncPendingFromEntry(entry);
      if (await this.saveGroupEntry(entry)) savedCount += 1;
    }

    if (savedCount === 0) {
      this.panel.showError("No changes to save — drag or resize the group, or run Preview first");
      return;
    }

    this.updateGlobalSaveButton();
    this.panel.showSaved();
  }

  private async saveAllPending(): Promise<void> {
    if (!this.globalSave) return;

    for (const entry of this.selections) {
      this.syncPendingFromEntry(entry);
    }

    const dirtyEntries = [...this.pendingEdits.values()].filter((entry) => entry.dirty);
    if (dirtyEntries.length === 0) {
      this.globalSave.showError("No unsaved changes on this page");
      return;
    }

    this.globalSave.showSaving();

    let savedCount = 0;
    try {
      for (const entry of dirtyEntries) {
        if (await this.saveGroupEntry(entry)) savedCount += 1;
      }

      if (savedCount === 0) {
        this.globalSave.showError("No changes to save");
        return;
      }

      this.updateGlobalSaveButton();
      this.globalSave.showSuccess();
    } catch (error) {
      this.globalSave.showError(String(error));
    }
  }
}

export const editMode = new EditModeController();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GENIE_TOGGLE_EDIT_MODE") {
    if (editMode.state === "off") {
      editMode.enter().then(() => sendResponse({ active: true }));
    } else {
      editMode.exit();
      sendResponse({ active: false });
    }

    return true;
  }

  if (message.type === "GENIE_GET_STATE") {
    sendResponse({ active: editMode.state !== "off" });
    return true;
  }

  if (message.type === "GENIE_SET_EDIT_MODE") {
    const enabled = Boolean(message.enabled);

    if (enabled && editMode.state === "off") {
      editMode.enter().then(() =>
        sendResponse({
          ok: true,
          state: editMode.state,
          enabled: editMode.state !== "off",
        }),
      );

      return true;
    }

    if (!enabled && editMode.state !== "off") {
      editMode.exit();
    }

    sendResponse({
      ok: true,
      state: editMode.state,
      enabled: editMode.state !== "off",
    });

    return true;
  }

  if (message.type === "GENIE_GET_EDIT_MODE") {
    sendResponse({
      ok: true,
      state: editMode.state,
      enabled: editMode.state !== "off",
    });

    return true;
  }

  if (message.type === "GENIE_CLEAR_PAGE_CUSTOMIZATIONS") {
    void editMode.clearCurrentPageCustomizations().then(
      (deletedCount) => sendResponse({ ok: true, deletedCount }),
      (error) => sendResponse({ ok: false, error: String(error) }),
    );
    return true;
  }

  return false;
});
