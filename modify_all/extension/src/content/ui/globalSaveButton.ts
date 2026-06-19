import { GENIE_ATTR } from "../grouping";

export type GlobalSaveCallbacks = {
  onSave: () => void;
};

export class GlobalSaveButton {
  readonly root: HTMLButtonElement;
  private toast: HTMLDivElement;
  private callbacks: GlobalSaveCallbacks;

  constructor(callbacks: GlobalSaveCallbacks) {
    this.callbacks = callbacks;

    this.root = document.createElement("button");
    this.root.type = "button";
    this.root.className = "genie-global-save";
    this.root.setAttribute(GENIE_ATTR, "global-save");
    this.root.textContent = "Save all changes";
    this.root.style.display = "none";
    this.root.addEventListener("click", () => this.callbacks.onSave());

    this.toast = document.createElement("div");
    this.toast.className = "genie-global-save-toast";
    this.toast.setAttribute(GENIE_ATTR, "global-save-toast");
    this.toast.style.display = "none";
    this.toast.textContent = "All changes saved";
  }

  mount(): void {
    document.documentElement.appendChild(this.root);
    document.documentElement.appendChild(this.toast);
  }

  unmount(): void {
    this.root.remove();
    this.toast.remove();
  }

  update(count: number): void {
    if (count <= 0) {
      this.root.style.display = "none";
      return;
    }

    this.root.style.display = "block";
    this.root.textContent = count === 1 ? "Save changes" : `Save ${count} changes`;
    this.root.disabled = false;
  }

  showSaving(): void {
    this.root.disabled = true;
    this.root.textContent = "Saving…";
  }

  showSuccess(): void {
    this.root.style.display = "none";
    this.toast.style.display = "block";
    window.setTimeout(() => {
      this.toast.style.display = "none";
    }, 2200);
  }

  showError(message: string): void {
    this.root.disabled = false;
    this.toast.textContent = message;
    this.toast.classList.add("is-error");
    this.toast.style.display = "block";
    window.setTimeout(() => {
      this.toast.style.display = "none";
      this.toast.classList.remove("is-error");
      this.toast.textContent = "All changes saved";
    }, 2800);
  }
}
