import { propagate, twoline2satrec } from "satellite.js";

export const SATELLITE_JS_FRAME = "TEME" as const;

export type SatelliteJsFrame = typeof SATELLITE_JS_FRAME;

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

export type TleInput = {
  name?: string;
  source: string;
  line1: string;
  line2: string;
};

export type TlePropagationSettings = {
  epoch: Date;
  durationMinutes: number;
  sampleCount: number;
};

export type TleOrbitSample = {
  epoch: Date;
  source: string;
  frame: SatelliteJsFrame;
  positionKm: CartesianVectorKm;
  velocityKmPerSecond: CartesianVectorKmPerSecond;
};

export function sampleTleOrbit(
  tle: TleInput,
  settings: TlePropagationSettings,
): TleOrbitSample[] {
  const satrec = twoline2satrec(tle.line1, tle.line2);
  const samples: TleOrbitSample[] = [];
  const boundedSampleCount = Math.max(1, Math.floor(settings.sampleCount));

  for (let index = 0; index <= boundedSampleCount; index += 1) {
    const epoch = new Date(
      settings.epoch.getTime() +
        (index / boundedSampleCount) * settings.durationMinutes * 60_000,
    );
    const propagated = propagate(satrec, epoch);

    if (
      !propagated ||
      !propagated.position ||
      typeof propagated.position === "boolean" ||
      !propagated.velocity ||
      typeof propagated.velocity === "boolean"
    ) {
      continue;
    }

    samples.push({
      epoch,
      source: tle.source,
      frame: SATELLITE_JS_FRAME,
      positionKm: {
        x: propagated.position.x,
        y: propagated.position.y,
        z: propagated.position.z,
      },
      velocityKmPerSecond: {
        x: propagated.velocity.x,
        y: propagated.velocity.y,
        z: propagated.velocity.z,
      },
    });
  }

  return samples;
}
