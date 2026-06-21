import type { OrekitOrbitSample } from "../api/propagation";
import type { TleOrbitSample } from "./tle";

export type OrbitSampleSource = "satellite-js" | "orekit" | "scenario";

export type CartesianVectorKm = {
  x: number;
  y: number;
  z: number;
};

export type CartesianVectorKmPerSecond = {
  x: number;
  y: number;
  z: number;
};

export type ComparableOrbitSample = {
  epoch: Date;
  epochIso: string;
  source: OrbitSampleSource;
  frame: string;
  positionUnit: "km" | string;
  velocityUnit: "km/s" | string;
  positionKm: CartesianVectorKm;
  velocityKmPerSecond: CartesianVectorKmPerSecond;
};

export function satelliteJsSampleToComparable(
  sample: TleOrbitSample,
): ComparableOrbitSample {
  return {
    epoch: sample.epoch,
    epochIso: normalizeEpochIso(sample.epoch),
    source: "satellite-js",
    frame: sample.frame,
    positionUnit: "km",
    velocityUnit: "km/s",
    positionKm: sample.positionKm,
    velocityKmPerSecond: sample.velocityKmPerSecond,
  };
}

export function orekitSampleToComparable(
  sample: OrekitOrbitSample,
): ComparableOrbitSample {
  return {
    epoch: sample.epoch,
    epochIso: normalizeEpochIso(sample.epoch),
    source: "orekit",
    frame: sample.frame,
    positionUnit: "km",
    velocityUnit: "km/s",
    positionKm: sample.positionKm,
    velocityKmPerSecond: sample.velocityKmPerSecond,
  };
}

export function normalizeEpochIso(epoch: Date | string): string {
  return new Date(epoch).toISOString();
}
