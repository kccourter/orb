import {
  formatDistance,
  type DivergenceSummary,
} from "../orbits/divergence";

export type OrekitOverlayStatus =
  | { status: "idle"; message?: string }
  | { status: "loading"; message?: string }
  | { status: "ready"; sampleCount: number; frame: string }
  | { status: "error"; message: string };

export type OrekitOverlayControls = {
  element: HTMLElement;
  setStatus: (status: OrekitOverlayStatus) => void;
  setDivergenceSummary: (
    summary: DivergenceSummary | null,
    frame?: string,
  ) => void;
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

  const legend = document.createElement("span");
  legend.className = "orekit-overlay__legend";
  legend.dataset.testid = "orekit-legend";
  legend.textContent = "Local / Orekit";

  const metrics = document.createElement("dl");
  metrics.className = "orekit-overlay__metrics";
  metrics.dataset.testid = "divergence-readout";

  element.append(refreshButton, statusText, legend, metrics);

  refreshButton.addEventListener("click", () => {
    onRefresh();
  });

  function setStatus(status: OrekitOverlayStatus) {
    refreshButton.disabled = status.status === "loading";
    element.dataset.status = status.status;
    statusText.textContent = statusTextFor(status);
  }

  setStatus({ status: "idle" });
  setDivergenceSummary(null);

  return {
    element,
    setStatus,
    setDivergenceSummary,
  };

  function setDivergenceSummary(
    summary: DivergenceSummary | null,
    frame?: string,
  ) {
    metrics.replaceChildren(...createMetricItems(summary, frame));
  }
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

function createMetricItems(
  summary: DivergenceSummary | null,
  frame?: string,
): HTMLElement[] {
  const items = [
    ["Frame", frame ?? "--"],
    ["Current", formatDistance(summary?.currentDistanceKm ?? null)],
    ["Max", formatDistance(summary?.maxDistanceKm ?? null)],
    ["Mean", formatDistance(summary?.meanDistanceKm ?? null)],
    ["Aligned", String(summary?.alignedCount ?? 0)],
    [
      "Unmatched",
      `${summary?.localOnlyCount ?? 0}/${summary?.remoteOnlyCount ?? 0}`,
    ],
  ] as const;

  return items.flatMap(([label, value]) => {
    const term = document.createElement("dt");
    term.textContent = label;

    const description = document.createElement("dd");
    description.textContent = value;

    return [term, description];
  });
}
