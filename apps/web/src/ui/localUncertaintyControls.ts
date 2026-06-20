import type { CovarianceSample, CovarianceSeries } from "../uncertainty/types";
import type { LocalUncertaintyView } from "../scene/localUncertaintyExplorer";

export type LocalUncertaintySettings = {
  sampleIndex: number;
  sigma: 1 | 2 | 3;
  view: LocalUncertaintyView;
};

export type LocalUncertaintyReadout = {
  sample: CovarianceSample;
  offsetHours: number;
  axisLengthsKm: [number, number, number];
  frame: string;
  provenance: string;
  units: string;
};

export type LocalUncertaintyControls = {
  element: HTMLElement;
  settings: LocalUncertaintySettings;
  setReadout: (readout: LocalUncertaintyReadout) => void;
};

export function createLocalUncertaintyControls(
  series: CovarianceSeries,
  onChange: (settings: LocalUncertaintySettings) => void,
): LocalUncertaintyControls {
  let currentSettings: LocalUncertaintySettings = {
    sampleIndex: 0,
    sigma: 2,
    view: "iso",
  };

  const form = document.createElement("form");
  form.className = "local-uncertainty-controls";
  form.setAttribute("aria-label", "Local QSW uncertainty controls");

  const timeField = document.createElement("label");
  timeField.className = "local-uncertainty-controls__field";
  const timeLabel = document.createElement("span");
  timeLabel.className = "local-uncertainty-controls__label";
  timeLabel.textContent = "Offset";
  const timeInput = document.createElement("input");
  timeInput.className = "local-uncertainty-controls__range";
  timeInput.type = "range";
  timeInput.min = "0";
  timeInput.max = String(Math.max(series.samples.length - 1, 0));
  timeInput.step = "1";
  timeInput.value = "0";
  timeInput.dataset.testid = "local-uncertainty-time";
  timeField.append(timeLabel, timeInput);

  const sigmaField = document.createElement("label");
  sigmaField.className = "local-uncertainty-controls__field";
  const sigmaLabel = document.createElement("span");
  sigmaLabel.className = "local-uncertainty-controls__label";
  sigmaLabel.textContent = "Sigma";
  const sigmaSelect = document.createElement("select");
  sigmaSelect.className = "local-uncertainty-controls__select";
  sigmaSelect.dataset.testid = "local-uncertainty-sigma";
  for (const sigma of [1, 2, 3] as const) {
    const option = document.createElement("option");
    option.value = String(sigma);
    option.textContent = `${sigma}σ`;
    sigmaSelect.append(option);
  }
  sigmaSelect.value = String(currentSettings.sigma);
  sigmaField.append(sigmaLabel, sigmaSelect);

  const viewGroup = document.createElement("div");
  viewGroup.className = "local-uncertainty-controls__views";
  viewGroup.setAttribute("aria-label", "Local view direction");
  const viewButtons = new Map<LocalUncertaintyView, HTMLButtonElement>();
  for (const [view, label] of [
    ["iso", "Iso"],
    ["q", "+Q"],
    ["s", "+S"],
    ["w", "+W"],
  ] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "local-uncertainty-controls__button";
    button.textContent = label;
    button.dataset.testid = `local-view-${view}`;
    button.setAttribute(
      "aria-pressed",
      view === currentSettings.view ? "true" : "false",
    );
    button.addEventListener("click", () => {
      commit({ ...currentSettings, view });
    });
    viewButtons.set(view, button);
    viewGroup.append(button);
  }

  const readout = document.createElement("dl");
  readout.className = "local-uncertainty-controls__readout";
  readout.dataset.testid = "local-uncertainty-readout";
  const readoutEntries = new Map<string, HTMLElement>();
  for (const label of ["Time", "Axes", "Frame", "Source"]) {
    const term = document.createElement("dt");
    term.textContent = label;
    const value = document.createElement("dd");
    value.textContent = "--";
    readoutEntries.set(label, value);
    readout.append(term, value);
  }

  form.append(timeField, sigmaField, viewGroup, readout);

  timeInput.addEventListener("input", () => {
    commit({
      ...currentSettings,
      sampleIndex: Number(timeInput.value),
    });
  });

  sigmaSelect.addEventListener("change", () => {
    commit({
      ...currentSettings,
      sigma: Number(sigmaSelect.value) as 1 | 2 | 3,
    });
  });

  function commit(settings: LocalUncertaintySettings) {
    currentSettings = normalizeSettings(settings, series);
    timeInput.value = String(currentSettings.sampleIndex);
    sigmaSelect.value = String(currentSettings.sigma);
    for (const [view, button] of viewButtons) {
      button.setAttribute(
        "aria-pressed",
        view === currentSettings.view ? "true" : "false",
      );
    }
    onChange(currentSettings);
  }

  return {
    element: form,
    get settings() {
      return currentSettings;
    },
    setReadout(nextReadout) {
      readoutEntries
        .get("Time")
        ?.replaceChildren(
          document.createTextNode(
            `+${formatNumber(nextReadout.offsetHours)}h ${nextReadout.sample.epoch}`,
          ),
        );
      readoutEntries
        .get("Axes")
        ?.replaceChildren(
          document.createTextNode(
            `Q ${formatLength(nextReadout.axisLengthsKm[0])} / S ${formatLength(
              nextReadout.axisLengthsKm[1],
            )} / W ${formatLength(nextReadout.axisLengthsKm[2])}`,
          ),
        );
      readoutEntries
        .get("Frame")
        ?.replaceChildren(
          document.createTextNode(`${nextReadout.frame} ${nextReadout.units}`),
        );
      readoutEntries
        .get("Source")
        ?.replaceChildren(document.createTextNode(nextReadout.provenance));
    },
  };
}

function normalizeSettings(
  settings: LocalUncertaintySettings,
  series: CovarianceSeries,
): LocalUncertaintySettings {
  const sampleIndex = Math.min(
    Math.max(Math.round(settings.sampleIndex), 0),
    Math.max(series.samples.length - 1, 0),
  );
  const sigma = [1, 2, 3].includes(settings.sigma) ? settings.sigma : 2;

  return {
    sampleIndex,
    sigma,
    view: settings.view,
  };
}

function formatLength(kilometers: number): string {
  if (kilometers < 1) {
    return `${formatNumber(kilometers * 1000)} m`;
  }

  return `${formatNumber(kilometers)} km`;
}

function formatNumber(value: number): string {
  if (value >= 100) {
    return value.toFixed(0);
  }
  if (value >= 10) {
    return value.toFixed(1);
  }
  return value.toFixed(2);
}
