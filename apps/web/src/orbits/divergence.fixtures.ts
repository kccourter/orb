import type { SampleAlignment } from "./alignment";
import {
  computeDivergenceSeries,
  formatDistance,
  summarizeDivergence,
} from "./divergence";
import type { ComparableOrbitSample } from "./sampleTypes";

const alignment: SampleAlignment = {
  pairs: [
    {
      epochIso: "2024-06-21T13:31:24.000Z",
      local: createSample("2024-06-21T13:31:24.000Z", { x: 0, y: 0, z: 0 }),
      remote: createSample("2024-06-21T13:31:24.000Z", { x: 3, y: 4, z: 0 }),
    },
    {
      epochIso: "2024-06-21T13:31:54.000Z",
      local: createSample("2024-06-21T13:31:54.000Z", { x: 0, y: 0, z: 0 }),
      remote: createSample("2024-06-21T13:31:54.000Z", { x: 0, y: 0, z: 12 }),
    },
  ],
  localOnly: [createSample("2024-06-21T13:32:24.000Z", { x: 0, y: 0, z: 0 })],
  remoteOnly: [
    createSample("2024-06-21T13:32:54.000Z", { x: 0, y: 0, z: 0 }),
    createSample("2024-06-21T13:33:24.000Z", { x: 0, y: 0, z: 0 }),
  ],
  toleranceMilliseconds: 1,
};

assertDivergence("computes series and summary", () => {
  const series = computeDivergenceSeries(alignment);
  const summary = summarizeDivergence(series, "2024-06-21T13:31:24.000Z");

  assert(series.points.length === 2);
  assert(series.points[0]?.distanceKm === 5);
  assert(series.points[1]?.distanceKm === 12);
  assert(summary.currentDistanceKm === 5);
  assert(summary.maxDistanceKm === 12);
  assert(summary.meanDistanceKm === 8.5);
  assert(summary.alignedCount === 2);
  assert(summary.localOnlyCount === 1);
  assert(summary.remoteOnlyCount === 2);
});

assertDivergence("uses nearest aligned epoch for current sample", () => {
  const series = computeDivergenceSeries(alignment);
  const summary = summarizeDivergence(series, "2024-06-21T13:31:53.000Z");

  assert(summary.currentDistanceKm === 12);
});

assertDivergence("handles empty series", () => {
  const summary = summarizeDivergence(null, "2024-06-21T13:31:24.000Z");

  assert(summary.currentDistanceKm === null);
  assert(summary.alignedCount === 0);
});

assertDivergence("formats distances", () => {
  assert(formatDistance(null) === "--");
  assert(formatDistance(0.042) === "42 m");
  assert(formatDistance(12.3456) === "12.35 km");
  assert(formatDistance(1234.5) === "1,235 km");
});

function createSample(
  epochIso: string,
  positionKm: ComparableOrbitSample["positionKm"],
): ComparableOrbitSample {
  return {
    epoch: new Date(epochIso),
    epochIso,
    source: "satellite-js",
    frame: "TEME",
    positionUnit: "km",
    velocityUnit: "km/s",
    positionKm,
    velocityKmPerSecond: { x: 0, y: 0, z: 0 },
  };
}

function assertDivergence(label: string, assertion: () => void): void {
  try {
    assertion();
  } catch (error) {
    throw new Error(`Divergence fixture failed: ${label}`, {
      cause: error,
    });
  }
}

function assert(condition: unknown): asserts condition {
  if (!condition) {
    throw new Error("Assertion failed.");
  }
}
