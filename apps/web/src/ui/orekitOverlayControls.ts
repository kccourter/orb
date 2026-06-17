export type OrekitOverlayStatus =
  | { status: "idle"; message?: string }
  | { status: "loading"; message?: string }
  | { status: "ready"; sampleCount: number; frame: string }
  | { status: "error"; message: string };

export type OrekitOverlayControls = {
  element: HTMLElement;
  setStatus: (status: OrekitOverlayStatus) => void;
};

export function createOrekitOverlayControls(
  onRefresh: () => void,
): OrekitOverlayControls {
  const element = document.createElement("section");
  element.className = "orekit-overlay";
  element.setAttribute("aria-label", "Orekit overlay controls");

  const refreshButton = document.createElement("button");
  refreshButton.type = "button";
  refreshButton.className = "orekit-overlay__button";
  refreshButton.textContent = "Refresh Orekit";
  refreshButton.dataset.testid = "refresh-orekit";

  const statusText = document.createElement("span");
  statusText.className = "orekit-overlay__status";
  statusText.dataset.testid = "orekit-status";

  element.append(refreshButton, statusText);

  refreshButton.addEventListener("click", () => {
    onRefresh();
  });

  function setStatus(status: OrekitOverlayStatus) {
    refreshButton.disabled = status.status === "loading";
    element.dataset.status = status.status;
    statusText.textContent = statusTextFor(status);
  }

  setStatus({ status: "idle" });

  return {
    element,
    setStatus,
  };
}

function statusTextFor(status: OrekitOverlayStatus): string {
  switch (status.status) {
    case "idle":
      return status.message ?? "Orekit idle";
    case "loading":
      return status.message ?? "Loading Orekit";
    case "ready":
      return `Orekit ${status.frame}: ${status.sampleCount} samples`;
    case "error":
      return status.message;
  }
}
