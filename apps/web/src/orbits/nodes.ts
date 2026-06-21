import type { CartesianVectorKm, CartesianVectorKmPerSecond } from "./tle";

export type NodeSearchSample = {
  positionKm: CartesianVectorKm;
  velocityKmPerSecond?: CartesianVectorKmPerSecond;
};

export function findAscendingNodePositionKm(
  samples: readonly NodeSearchSample[],
): CartesianVectorKm | null {
  if (samples.length === 0) {
    return null;
  }

  for (const sample of samples) {
    if (
      Math.abs(sample.positionKm.z) <= Number.EPSILON &&
      (!sample.velocityKmPerSecond || sample.velocityKmPerSecond.z >= 0)
    ) {
      return { ...sample.positionKm };
    }
  }

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const next = samples[index];
    const previousZ = previous.positionKm.z;
    const nextZ = next.positionKm.z;

    if (previousZ <= 0 && nextZ > 0) {
      return interpolatePositionAtZZero(previous, next);
    }
  }

  return nearestEquatorSample(samples);
}

function interpolatePositionAtZZero(
  previous: NodeSearchSample,
  next: NodeSearchSample,
): CartesianVectorKm {
  const previousZ = previous.positionKm.z;
  const nextZ = next.positionKm.z;
  const fraction = previousZ / (previousZ - nextZ);

  return {
    x:
      previous.positionKm.x +
      (next.positionKm.x - previous.positionKm.x) * fraction,
    y:
      previous.positionKm.y +
      (next.positionKm.y - previous.positionKm.y) * fraction,
    z: 0,
  };
}

function nearestEquatorSample(
  samples: readonly NodeSearchSample[],
): CartesianVectorKm {
  const ascendingSamples = samples.filter(
    (sample) => (sample.velocityKmPerSecond?.z ?? 1) >= 0,
  );
  const candidates = ascendingSamples.length > 0 ? ascendingSamples : samples;
  const nearest = candidates.reduce((best, sample) =>
    Math.abs(sample.positionKm.z) < Math.abs(best.positionKm.z) ? sample : best,
  );

  return { ...nearest.positionKm };
}
