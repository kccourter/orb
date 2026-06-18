import {
  DEFAULT_PROPAGATION_FRAME,
  PROPAGATION_FRAME_OPTIONS,
  labelForPropagationFrame,
  normalizePropagationFrame,
} from "./frameSettings";

assertFrameSettings("defaults to native", () => {
  assert(DEFAULT_PROPAGATION_FRAME === "native");
  assert(normalizePropagationFrame("not-a-frame") === DEFAULT_PROPAGATION_FRAME);
});

assertFrameSettings("lists approved frame values", () => {
  assert(
    PROPAGATION_FRAME_OPTIONS.map((option) => option.value).join(",") ===
      "native,TEME,EME2000,ITRF,QSW",
  );
});

assertFrameSettings("labels display categories with exact frame names", () => {
  assert(labelForPropagationFrame("EME2000") === "ECI (EME2000)");
  assert(labelForPropagationFrame("ITRF") === "ECEF (ITRF)");
});

function assertFrameSettings(label: string, assertion: () => void): void {
  try {
    assertion();
  } catch (error) {
    throw new Error(`Frame settings fixture failed: ${label}`, {
      cause: error,
    });
  }
}

function assert(condition: unknown): asserts condition {
  if (!condition) {
    throw new Error("Assertion failed.");
  }
}
