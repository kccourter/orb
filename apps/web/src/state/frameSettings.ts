export type PropagationFrameRequest =
  | "native"
  | "TEME"
  | "EME2000"
  | "ITRF"
  | "QSW";

export type FrameOption = {
  value: PropagationFrameRequest;
  label: string;
};

export const DEFAULT_PROPAGATION_FRAME: PropagationFrameRequest = "native";

export const PROPAGATION_FRAME_OPTIONS: readonly FrameOption[] = [
  { value: "native", label: "Native" },
  { value: "TEME", label: "TEME" },
  { value: "EME2000", label: "ECI (EME2000)" },
  { value: "ITRF", label: "ECEF (ITRF)" },
  { value: "QSW", label: "QSW" },
];

const PROPAGATION_FRAME_VALUES = new Set<PropagationFrameRequest>(
  PROPAGATION_FRAME_OPTIONS.map((option) => option.value),
);

export function normalizePropagationFrame(
  frame: string,
): PropagationFrameRequest {
  return PROPAGATION_FRAME_VALUES.has(frame as PropagationFrameRequest)
    ? (frame as PropagationFrameRequest)
    : DEFAULT_PROPAGATION_FRAME;
}

export function labelForPropagationFrame(frame: PropagationFrameRequest): string {
  return (
    PROPAGATION_FRAME_OPTIONS.find((option) => option.value === frame)?.label ??
    frame
  );
}
