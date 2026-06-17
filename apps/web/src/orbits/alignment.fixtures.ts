import {
  alignOrbitSamples,
  DEFAULT_ALIGNMENT_TOLERANCE_MILLISECONDS,
} from "./alignment";
import type { ComparableOrbitSample } from "./sampleTypes";

const baseLocalSample = createSample({
  epochIso: "2024-06-21T13:31:24.000Z",
  source: "satellite-js",
});

const baseRemoteSample = createSample({
  epochIso: "2024-06-21T13:31:24.000Z",
  source: "orekit",
});

assertAlignment("pairs exact matching epochs", () => {
  const result = alignOrbitSamples([baseLocalSample], [baseRemoteSample]);

  assert(result.ok);
  assert(result.alignment.pairs.length === 1);
  assert(result.alignment.localOnly.length === 0);
  assert(result.alignment.remoteOnly.length === 0);
});

assertAlignment("reports extra remote samples", () => {
  const extraRemoteSample = createSample({
    epochIso: "2024-06-21T13:31:25.000Z",
    source: "orekit",
  });
  const result = alignOrbitSamples(
    [baseLocalSample],
    [baseRemoteSample, extraRemoteSample],
  );

  assert(result.ok);
  assert(result.alignment.pairs.length === 1);
  assert(result.alignment.remoteOnly.length === 1);
});

assertAlignment("pairs one millisecond serialization differences", () => {
  const remoteSample = createSample({
    epochIso: "2024-06-21T13:31:24.001Z",
    source: "orekit",
  });
  const result = alignOrbitSamples([baseLocalSample], [remoteSample]);

  assert(result.ok);
  assert(result.alignment.pairs.length === 1);
  assert(
    result.alignment.toleranceMilliseconds ===
      DEFAULT_ALIGNMENT_TOLERANCE_MILLISECONDS,
  );
});

assertAlignment("leaves larger timestamp differences unmatched", () => {
  const remoteSample = createSample({
    epochIso: "2024-06-21T13:31:24.002Z",
    source: "orekit",
  });
  const result = alignOrbitSamples([baseLocalSample], [remoteSample]);

  assert(result.ok);
  assert(result.alignment.pairs.length === 0);
  assert(result.alignment.localOnly.length === 1);
  assert(result.alignment.remoteOnly.length === 1);
});

assertAlignment("rejects frame mismatches", () => {
  const remoteSample = createSample({
    epochIso: "2024-06-21T13:31:24.000Z",
    frame: "EME2000",
    source: "orekit",
  });
  const result = alignOrbitSamples([baseLocalSample], [remoteSample]);

  assert(!result.ok);
  assert(result.error.code === "frame_mismatch");
});

assertAlignment("rejects position unit mismatches", () => {
  const remoteSample = createSample({
    epochIso: "2024-06-21T13:31:24.000Z",
    positionUnit: "m",
    source: "orekit",
  });
  const result = alignOrbitSamples([baseLocalSample], [remoteSample]);

  assert(!result.ok);
  assert(result.error.code === "unit_mismatch");
});

function createSample(
  overrides: Partial<ComparableOrbitSample> & {
    epochIso: string;
    source: "satellite-js" | "orekit";
  },
): ComparableOrbitSample {
  return {
    epoch: new Date(overrides.epochIso),
    epochIso: new Date(overrides.epochIso).toISOString(),
    source: overrides.source,
    frame: overrides.frame ?? "TEME",
    positionUnit: overrides.positionUnit ?? "km",
    velocityUnit: overrides.velocityUnit ?? "km/s",
    positionKm: overrides.positionKm ?? { x: 1, y: 2, z: 3 },
    velocityKmPerSecond:
      overrides.velocityKmPerSecond ?? { x: 4, y: 5, z: 6 },
  };
}

function assertAlignment(label: string, assertion: () => void): void {
  try {
    assertion();
  } catch (error) {
    throw new Error(`Alignment fixture failed: ${label}`, {
      cause: error,
    });
  }
}

function assert(condition: unknown): asserts condition {
  if (!condition) {
    throw new Error("Assertion failed.");
  }
}
