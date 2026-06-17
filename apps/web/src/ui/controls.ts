import {
  DEFAULT_ORBIT_SETTINGS,
  ORBIT_SETTING_LIMITS,
  normalizeOrbitSettings,
  type OrbitSettings,
} from "../state/orbitSettings";

export type OrbitControls = {
  element: HTMLElement;
  setSettings: (settings: OrbitSettings) => void;
};

export function createOrbitControls(
  initialSettings: OrbitSettings,
  onChange: (settings: OrbitSettings) => void,
): OrbitControls {
  let currentSettings = normalizeOrbitSettings(initialSettings);

  const form = document.createElement("form");
  form.className = "orbit-controls";
  form.setAttribute("aria-label", "Orbit sampling controls");

  const epochInput = createTextInput("Epoch", currentSettings.epochIso);
  epochInput.input.dataset.testid = "epoch-input";

  const durationInput = createNumberInput(
    "Duration",
    currentSettings.durationMinutes,
    ORBIT_SETTING_LIMITS.durationMinutes.min,
    ORBIT_SETTING_LIMITS.durationMinutes.max,
    0.5,
    "min",
  );
  durationInput.input.dataset.testid = "duration-input";

  const stepInput = createNumberInput(
    "Step",
    currentSettings.stepSeconds,
    ORBIT_SETTING_LIMITS.stepSeconds.min,
    ORBIT_SETTING_LIMITS.stepSeconds.max,
    5,
    "sec",
  );
  stepInput.input.dataset.testid = "step-input";

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "orbit-controls__button";
  resetButton.textContent = "Reset";
  resetButton.dataset.testid = "reset-settings";

  form.append(
    epochInput.field,
    durationInput.field,
    stepInput.field,
    resetButton,
  );

  function updateInputs(settings: OrbitSettings) {
    epochInput.input.value = settings.epochIso;
    durationInput.input.value = formatNumber(settings.durationMinutes);
    stepInput.input.value = formatNumber(settings.stepSeconds);
  }

  function commit(nextSettings: OrbitSettings) {
    currentSettings = normalizeOrbitSettings(nextSettings);
    updateInputs(currentSettings);
    onChange(currentSettings);
  }

  epochInput.input.addEventListener("change", () => {
    commit({
      ...currentSettings,
      epochIso: epochInput.input.value,
    });
  });

  durationInput.input.addEventListener("change", () => {
    commit({
      ...currentSettings,
      durationMinutes: durationInput.input.valueAsNumber,
    });
  });

  stepInput.input.addEventListener("change", () => {
    commit({
      ...currentSettings,
      stepSeconds: stepInput.input.valueAsNumber,
    });
  });

  resetButton.addEventListener("click", () => {
    commit(DEFAULT_ORBIT_SETTINGS);
  });

  updateInputs(currentSettings);

  return {
    element: form,
    setSettings(settings) {
      currentSettings = normalizeOrbitSettings(settings);
      updateInputs(currentSettings);
    },
  };
}

function createTextInput(labelText: string, value: string) {
  const field = document.createElement("label");
  field.className = "orbit-controls__field orbit-controls__field--epoch";

  const label = document.createElement("span");
  label.className = "orbit-controls__label";
  label.textContent = labelText;

  const input = document.createElement("input");
  input.className = "orbit-controls__input";
  input.type = "text";
  input.spellcheck = false;
  input.value = value;

  field.append(label, input);

  return { field, input };
}

function createNumberInput(
  labelText: string,
  value: number,
  min: number,
  max: number,
  step: number,
  suffixText: string,
) {
  const field = document.createElement("label");
  field.className = "orbit-controls__field orbit-controls__field--number";

  const label = document.createElement("span");
  label.className = "orbit-controls__label";
  label.textContent = labelText;

  const input = document.createElement("input");
  input.className = "orbit-controls__input";
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = formatNumber(value);

  const suffix = document.createElement("span");
  suffix.className = "orbit-controls__suffix";
  suffix.textContent = suffixText;

  field.append(label, input, suffix);

  return { field, input };
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}
