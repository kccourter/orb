import type { UncertaintyDensity } from "../scene/uncertainty";

export type UncertaintyControlSettings = {
  visible: boolean;
  sigma: 1 | 2 | 3;
  density: UncertaintyDensity;
};

export type UncertaintyStatus = {
  frame: string;
  provenance: string;
  visibleCount: number;
};

export type UncertaintyControls = {
  element: HTMLElement;
  setSettings: (settings: UncertaintyControlSettings) => void;
  setStatus: (status: UncertaintyStatus) => void;
};

export function createUncertaintyControls(
  initialSettings: UncertaintyControlSettings,
  onChange: (settings: UncertaintyControlSettings) => void,
): UncertaintyControls {
  let currentSettings = initialSettings;

  const form = document.createElement("form");
  form.className = "uncertainty-controls";
  form.setAttribute("aria-label", "Uncertainty controls");

  const toggleLabel = document.createElement("label");
  toggleLabel.className = "uncertainty-controls__toggle";
  const toggle = document.createElement("input");
  toggle.type = "checkbox";
  toggle.checked = currentSettings.visible;
  toggle.dataset.testid = "uncertainty-toggle";
  const toggleText = document.createElement("span");
  toggleText.textContent = "Uncertainty";
  toggleLabel.append(toggle, toggleText);

  const sigma = createSelect(
    "Sigma",
    [
      ["1", "1σ"],
      ["2", "2σ"],
      ["3", "3σ"],
    ],
    String(currentSettings.sigma),
  );
  sigma.select.dataset.testid = "uncertainty-sigma";

  const density = createSelect(
    "Samples",
    [
      ["all", "All"],
      ["daily", "Daily"],
      ["current", "Current"],
    ],
    currentSettings.density,
  );
  density.select.dataset.testid = "uncertainty-density";

  const status = document.createElement("output");
  status.className = "uncertainty-controls__status";
  status.dataset.testid = "uncertainty-status";

  form.append(toggleLabel, sigma.field, density.field, status);

  function commit(nextSettings: UncertaintyControlSettings) {
    currentSettings = nextSettings;
    updateInputs();
    onChange(currentSettings);
  }

  function updateInputs() {
    toggle.checked = currentSettings.visible;
    sigma.select.value = String(currentSettings.sigma);
    density.select.value = currentSettings.density;
  }

  toggle.addEventListener("change", () => {
    commit({ ...currentSettings, visible: toggle.checked });
  });

  sigma.select.addEventListener("change", () => {
    commit({
      ...currentSettings,
      sigma: Number(sigma.select.value) as 1 | 2 | 3,
    });
  });

  density.select.addEventListener("change", () => {
    commit({
      ...currentSettings,
      density: density.select.value as UncertaintyDensity,
    });
  });

  updateInputs();

  return {
    element: form,
    setSettings(settings) {
      currentSettings = settings;
      updateInputs();
    },
    setStatus(nextStatus) {
      status.textContent = `${nextStatus.frame} ${nextStatus.provenance}: ${nextStatus.visibleCount}`;
    },
  };
}

function createSelect(
  labelText: string,
  options: readonly (readonly [string, string])[],
  value: string,
) {
  const field = document.createElement("label");
  field.className = "uncertainty-controls__field";

  const label = document.createElement("span");
  label.className = "uncertainty-controls__label";
  label.textContent = labelText;

  const select = document.createElement("select");
  select.className = "uncertainty-controls__select";
  select.value = value;

  for (const [optionValue, optionLabel] of options) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionLabel;
    select.append(option);
  }

  field.append(label, select);
  return { field, select };
}
