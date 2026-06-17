import type { AlignedSamplePair, SampleAlignment } from "./alignment";

export type DivergencePoint = {
  epochIso: string;
  distanceKm: number;
};

export type DivergenceSeries = {
  frame: string;
  points: DivergencePoint[];
  localOnlyCount: number;
  remoteOnlyCount: number;
};

export type DivergenceSummary = {
  currentDistanceKm: number | null;
  maxDistanceKm: number | null;
  meanDistanceKm: number | null;
  alignedCount: number;
  localOnlyCount: number;
  remoteOnlyCount: number;
};

export function computeDivergenceSeries(
  alignment: SampleAlignment,
): DivergenceSeries {
  const frame = alignment.pairs[0]?.local.frame ?? "unknown";

  return {
    frame,
    points: alignment.pairs.map((pair) => ({
      epochIso: pair.epochIso,
      distanceKm: distanceBetweenPair(pair),
    })),
    localOnlyCount: alignment.localOnly.length,
    remoteOnlyCount: alignment.remoteOnly.length,
  };
}

export function summarizeDivergence(
  series: DivergenceSeries | null,
  currentEpochIso: string | null,
): DivergenceSummary {
  if (!series || series.points.length === 0) {
    return {
      currentDistanceKm: null,
      maxDistanceKm: null,
      meanDistanceKm: null,
      alignedCount: 0,
      localOnlyCount: series?.localOnlyCount ?? 0,
      remoteOnlyCount: series?.remoteOnlyCount ?? 0,
    };
  }

  const distances = series.points.map((point) => point.distanceKm);
  const totalDistance = distances.reduce((total, distance) => total + distance, 0);

  return {
    currentDistanceKm: findCurrentDistance(series.points, currentEpochIso),
    maxDistanceKm: Math.max(...distances),
    meanDistanceKm: totalDistance / distances.length,
    alignedCount: series.points.length,
    localOnlyCount: series.localOnlyCount,
    remoteOnlyCount: series.remoteOnlyCount,
  };
}

export function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null || !Number.isFinite(distanceKm)) {
    return "--";
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  if (distanceKm < 1000) {
    return `${distanceKm.toFixed(2)} km`;
  }

  return `${Math.round(distanceKm).toLocaleString()} km`;
}

function distanceBetweenPair(pair: AlignedSamplePair): number {
  const deltaX = pair.local.positionKm.x - pair.remote.positionKm.x;
  const deltaY = pair.local.positionKm.y - pair.remote.positionKm.y;
  const deltaZ = pair.local.positionKm.z - pair.remote.positionKm.z;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
}

function findCurrentDistance(
  points: readonly DivergencePoint[],
  currentEpochIso: string | null,
): number | null {
  if (!currentEpochIso) {
    return null;
  }

  const exactPoint = points.find((point) => point.epochIso === currentEpochIso);

  if (exactPoint) {
    return exactPoint.distanceKm;
  }

  const currentTime = new Date(currentEpochIso).getTime();
  let nearestPoint: DivergencePoint | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const distance = Math.abs(new Date(point.epochIso).getTime() - currentTime);

    if (distance < nearestDistance) {
      nearestPoint = point;
      nearestDistance = distance;
    }
  }

  return nearestPoint?.distanceKm ?? null;
}
