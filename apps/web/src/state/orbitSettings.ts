import type { TlePropagationSettings } from "../orbits/tle";

export type OrbitSettings = {
  epochIso: string;
  durationMinutes: number;
  stepSeconds: number;
};

export const DEFAULT_ORBIT_SETTINGS: OrbitSettings = {
  epochIso: "2024-06-21T13:31:24Z",
  durationMinutes: 92.5,
  stepSeconds: 30,
};

export const ORBIT_SETTING_LIMITS = {
  durationMinutes: {
    min: 10,
    max: 360,
  },
  stepSeconds: {
    min: 5,
    max: 300,
  },
} as const;

export function normalizeOrbitSettings(settings: OrbitSettings): OrbitSettings {
  return {
    epochIso: normalizeEpochIso(settings.epochIso),
    durationMinutes: clampFiniteNumber(
      settings.durationMinutes,
      ORBIT_SETTING_LIMITS.durationMinutes.min,
      ORBIT_SETTING_LIMITS.durationMinutes.max,
      DEFAULT_ORBIT_SETTINGS.durationMinutes,
    ),
    stepSeconds: clampFiniteNumber(
      settings.stepSeconds,
      ORBIT_SETTING_LIMITS.stepSeconds.min,
      ORBIT_SETTING_LIMITS.stepSeconds.max,
      DEFAULT_ORBIT_SETTINGS.stepSeconds,
    ),
  };
}

export function toTlePropagationSettings(
  settings: OrbitSettings,
): TlePropagationSettings {
  const normalized = normalizeOrbitSettings(settings);
  const sampleCount = Math.max(
    1,
    Math.round((normalized.durationMinutes * 60) / normalized.stepSeconds),
  );

  return {
    epoch: new Date(normalized.epochIso),
    durationMinutes: normalized.durationMinutes,
    sampleCount,
  };
}

function normalizeEpochIso(epochIso: string): string {
  const epoch = new Date(epochIso);

  if (Number.isNaN(epoch.getTime())) {
    return DEFAULT_ORBIT_SETTINGS.epochIso;
  }

  return epoch.toISOString().replace(".000", "");
}

function clampFiniteNumber(
  value: number,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}
