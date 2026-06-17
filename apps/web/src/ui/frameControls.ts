import {
  DEFAULT_PROPAGATION_FRAME,
  PROPAGATION_FRAME_OPTIONS,
  labelForPropagationFrame,
  normalizePropagationFrame,
  type PropagationFrameRequest,
} from "../state/frameSettings";

export type FrameControls = {
  element: HTMLElement;
  setFrame: (frame: PropagationFrameRequest) => void;
};

export function createFrameControls(
  initialFrame: PropagationFrameRequest,
  onChange: (frame: PropagationFrameRequest) => void,
): FrameControls {
  let currentFrame = normalizePropagationFrame(initialFrame);

  const field = document.createElement("label");
  field.className = "frame-controls";
  field.setAttribute("aria-label", "Propagation frame controls");

  const label = document.createElement("span");
  label.className = "frame-controls__label";
  label.textContent = "Frame";

  const select = document.createElement("select");
  select.className = "frame-controls__select";
  select.dataset.testid = "frame-select";

  for (const option of PROPAGATION_FRAME_OPTIONS) {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    select.append(item);
  }

  const valueText = document.createElement("span");
  valueText.className = "frame-controls__value";
  valueText.dataset.testid = "selected-frame-label";

  field.append(label, select, valueText);

  function update(frame: PropagationFrameRequest) {
    currentFrame = normalizePropagationFrame(frame);
    select.value = currentFrame;
    valueText.textContent = labelForPropagationFrame(currentFrame);
  }

  select.addEventListener("change", () => {
    const nextFrame = normalizePropagationFrame(select.value);
    update(nextFrame);
    onChange(nextFrame);
  });

  update(currentFrame || DEFAULT_PROPAGATION_FRAME);

  return {
    element: field,
    setFrame: update,
  };
}
