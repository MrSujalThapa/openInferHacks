import type { EditableGroup, PatchOperation } from "../../../shared/contracts";
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
  getVisibleRect,
  isGenieElement,
  summarizeElement,
} from "./grouping";
import { LassoController, Overlay } from "./overlay";
import {
  applyOperations,
  buildOperationsFromManualEdit,
  getElementTransform,
} from "./patchEngine";
import {
  loadAndApplyCustomizations,
  saveCustomization,
  setupReapplyObserver,
} from "./persistence";
import { GeniePanel } from "./ui/geniePanel";

export type EditModeState =
  | "off"
  | "hovering"
  | "selecting"
  | "group-selected"
  | "dragging"
  | "resizing"
  | "agent-open";

class EditModeController {
  state: EditModeState = "off";

  private overlay: Overlay | null = null;
  private lasso = new LassoController();
  private panel: GeniePanel | null = null;
  private selectedGroup: EditableGroup | null = null;
  private targetElement: HTMLElement | null = null;
  private operations: PatchOperation[] = [];
  private dragState = createDragState();
  private observer: MutationObserver | null = null;

  async enter(): Promise<void> {
    if (this.state !== "off") return;

    document.body.classList.add("genie-editing");

    this.overlay = new Overlay({
      onLassoComplete: (points) => this.onLassoComplete(points),
      onBackgroundClick: () => this.closePanel(),
      onGroupDoubleClick: () => this.openAgentPanel(),
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

    this.bindEvents();
    this.state = "hovering";

    await loadAndApplyCustomizations();
    this.observer = setupReapplyObserver();
  }

  exit(): void {
    document.body.classList.remove("genie-editing");

    this.unbindEvents();

    this.panel?.unmount();
    this.overlay?.unmount();
    this.observer?.disconnect();

    this.selectedGroup = null;
    this.targetElement = null;
    this.operations = [];
    this.overlay = null;
    this.panel = null;
    this.observer = null;
    this.state = "off";
  }

  private bindEvents(): void {
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("pointerdown", this.onPointerDown);
    document.addEventListener("pointermove", this.onPointerMove);
    document.addEventListener("pointerup", this.onPointerUp);
  }

  private unbindEvents(): void {
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("pointerdown", this.onPointerDown);
    document.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("pointerup", this.onPointerUp);
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
      this.state = "hovering";
    }
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (this.state === "off" || !this.overlay) return;

    const target = event.target as Element;

    if (!target.closest(".genie-overlay-root") && !target.closest(".genie-panel")) {
      return;
    }

    if (target.closest(".genie-selection-box") && this.selectedGroup) {
      if (target.closest(".genie-handle")) return;

      const rect = this.selectedGroup.shape.rect;
      const translate = this.targetElement
        ? getElementTransform(this.targetElement)
        : { x: 0, y: 0 };

      startDrag(this.dragState, event, rect, translate);
      this.state = "dragging";
      target.setPointerCapture?.(event.pointerId);
      return;
    }

    if (this.lasso.isActive() || this.state === "agent-open") return;
    if (target.closest(".genie-panel")) return;

    this.lasso.start(event.clientX, event.clientY);
    this.state = "selecting";
    this.overlay.hideSelection();
    this.closePanel();
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.overlay) return;

    if (this.dragState.dragging && this.selectedGroup && this.targetElement) {
      const { translateX, translateY, rect } = updateDrag(this.dragState, event);

      this.targetElement.style.transform = `translate(${translateX}px, ${translateY}px)`;
      this.selectedGroup.shape.rect = rect;
      this.overlay.updateSelectionRect(rect);
      return;
    }

    if (this.dragState.resizing && this.selectedGroup && this.targetElement) {
      const rect = updateResize(this.dragState, event);

      this.selectedGroup.shape.rect = rect;
      this.targetElement.style.width = `${rect.width}px`;
      this.targetElement.style.height = `${rect.height}px`;
      this.targetElement.style.overflow = "hidden";
      this.overlay.updateSelectionRect(rect);
      return;
    }

    if (this.lasso.isActive()) {
      const points = this.lasso.move(event.clientX, event.clientY);
      this.overlay.drawLasso(points);
    }
  };

  private onPointerUp = (_event: PointerEvent): void => {
    if (this.dragState.dragging || this.dragState.resizing) {
      endDragResize(this.dragState);

      if (this.selectedGroup && this.targetElement) {
        this.operations = buildOperationsFromManualEdit(
          this.selectedGroup.groupId,
          this.targetElement,
          this.operations,
        );
      }

      this.state = "group-selected";
      return;
    }

    if (this.lasso.isActive()) {
      const points = this.lasso.end();

      this.overlay?.clearLasso();

      if (points.length > 4) {
        void this.onLassoComplete(points);
      }

      this.lasso.reset();
    }
  };

  private async onLassoComplete(points: { x: number; y: number }[]): Promise<void> {
    const elements = collectElementsFromLasso(points);
    const container = findBestGroupContainer(elements);

    if (!container || !(container instanceof HTMLElement)) return;

    const rect = getVisibleRect(container);
    if (!rect) return;

    const { domain, path } = getPageContext();
    const groupId = createGroupId();
    const domSummary = elements
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
      shape: {
        type: "lasso",
        rect,
        points,
      },
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

    this.selectGroup(group, container);
  }

  private selectGroup(group: EditableGroup, element: HTMLElement): void {
    this.selectedGroup = group;
    this.targetElement = element;

    element.setAttribute("data-genie-group", group.groupId);

    this.operations = [];

    this.overlay?.showSelection(group.shape.rect, group.label);

    this.overlay?.renderHandles((corner, event) => {
      startResize(this.dragState, corner, event, group.shape.rect);
      this.state = "resizing";
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    });

    this.state = "group-selected";
  }

  private openAgentPanel(): void {
    if (!this.selectedGroup || !this.overlay || !this.panel) return;

    this.panel.positionBeside(this.selectedGroup.shape.rect, this.selectedGroup.label);
    this.state = "agent-open";
  }

  private closePanel(): void {
    this.panel?.hide();

    if (this.selectedGroup) {
      this.state = "group-selected";
    } else {
      this.state = "hovering";
    }
  }

  private async runAgent(instruction: string): Promise<void> {
    if (!this.selectedGroup || !this.panel || !this.targetElement) return;

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
        group: this.selectedGroup,
        instruction,
      });

      this.operations = result.operations;

      applyOperations(this.selectedGroup.groupId, this.targetElement, result.operations);

      this.selectedGroup.label = result.sectionLabel;
      this.overlay?.showSelection(this.selectedGroup.shape.rect, result.sectionLabel);
      this.panel.showResult(result);
    } catch (error) {
      this.panel.showError(String(error));
    }
  }

  private async saveCurrent(): Promise<void> {
    if (!this.selectedGroup || !this.panel) return;

    const operations =
      this.targetElement && this.operations.length
        ? buildOperationsFromManualEdit(
            this.selectedGroup.groupId,
            this.targetElement,
            this.operations,
          )
        : this.operations;

    try {
      await saveCustomization(this.selectedGroup.groupId, this.selectedGroup.target, operations);
      this.panel.showSaved();
    } catch (error) {
      this.panel.showError(String(error));
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

  // Backward compatibility with Person 1 milestone 2B message names.
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

  return false;
});