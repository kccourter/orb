import type { ComparableOrbitSample } from "./sampleTypes";

export const DEFAULT_ALIGNMENT_TOLERANCE_MILLISECONDS = 1;

export type AlignedSamplePair = {
  epochIso: string;
  local: ComparableOrbitSample;
  remote: ComparableOrbitSample;
};

export type SampleAlignment = {
  pairs: AlignedSamplePair[];
  localOnly: ComparableOrbitSample[];
  remoteOnly: ComparableOrbitSample[];
  toleranceMilliseconds: number;
};

export type ComparisonPreconditionError = {
  code: "frame_mismatch" | "unit_mismatch";
  message: string;
};

export type SampleAlignmentResult =
  | {
      ok: true;
      alignment: SampleAlignment;
    }
  | {
      ok: false;
      error: ComparisonPreconditionError;
    };

export function alignOrbitSamples(
  localSamples: readonly ComparableOrbitSample[],
  remoteSamples: readonly ComparableOrbitSample[],
  options: { toleranceMilliseconds?: number } = {},
): SampleAlignmentResult {
  const toleranceMilliseconds =
    options.toleranceMilliseconds ?? DEFAULT_ALIGNMENT_TOLERANCE_MILLISECONDS;
  const preconditionError = validateComparisonPreconditions(
    localSamples,
    remoteSamples,
  );

  if (preconditionError) {
    return {
      ok: false,
      error: preconditionError,
    };
  }

  return {
    ok: true,
    alignment: pairSamples(localSamples, remoteSamples, toleranceMilliseconds),
  };
}

function validateComparisonPreconditions(
  localSamples: readonly ComparableOrbitSample[],
  remoteSamples: readonly ComparableOrbitSample[],
): ComparisonPreconditionError | null {
  const localFrames = uniqueValues(localSamples.map((sample) => sample.frame));
  const remoteFrames = uniqueValues(remoteSamples.map((sample) => sample.frame));
  const localPositionUnits = uniqueValues(
    localSamples.map((sample) => sample.positionUnit),
  );
  const remotePositionUnits = uniqueValues(
    remoteSamples.map((sample) => sample.positionUnit),
  );

  if (
    localFrames.length > 0 &&
    remoteFrames.length > 0 &&
    !setsOverlap(localFrames, remoteFrames)
  ) {
    return {
      code: "frame_mismatch",
      message: `Cannot compare ${localFrames.join(", ")} with ${remoteFrames.join(", ")}.`,
    };
  }

  if (
    localPositionUnits.length > 0 &&
    remotePositionUnits.length > 0 &&
    !setsOverlap(localPositionUnits, remotePositionUnits)
  ) {
    return {
      code: "unit_mismatch",
      message: `Cannot compare ${localPositionUnits.join(", ")} with ${remotePositionUnits.join(", ")}.`,
    };
  }

  return null;
}

function pairSamples(
  localSamples: readonly ComparableOrbitSample[],
  remoteSamples: readonly ComparableOrbitSample[],
  toleranceMilliseconds: number,
): SampleAlignment {
  const remoteByEpoch = new Map(
    remoteSamples.map((sample) => [sample.epochIso, sample]),
  );
  const pairedRemoteSamples = new Set<ComparableOrbitSample>();
  const pairs: AlignedSamplePair[] = [];
  const localOnly: ComparableOrbitSample[] = [];

  for (const localSample of localSamples) {
    const exactRemoteSample = remoteByEpoch.get(localSample.epochIso);

    if (exactRemoteSample && !pairedRemoteSamples.has(exactRemoteSample)) {
      pairs.push(createPair(localSample, exactRemoteSample));
      pairedRemoteSamples.add(exactRemoteSample);
      continue;
    }

    const nearbyRemoteSample = findNearbyUnpairedSample(
      localSample,
      remoteSamples,
      pairedRemoteSamples,
      toleranceMilliseconds,
    );

    if (nearbyRemoteSample) {
      pairs.push(createPair(localSample, nearbyRemoteSample));
      pairedRemoteSamples.add(nearbyRemoteSample);
      continue;
    }

    localOnly.push(localSample);
  }

  return {
    pairs,
    localOnly,
    remoteOnly: remoteSamples.filter(
      (sample) => !pairedRemoteSamples.has(sample),
    ),
    toleranceMilliseconds,
  };
}

function createPair(
  local: ComparableOrbitSample,
  remote: ComparableOrbitSample,
): AlignedSamplePair {
  return {
    epochIso: local.epochIso,
    local,
    remote,
  };
}

function findNearbyUnpairedSample(
  localSample: ComparableOrbitSample,
  remoteSamples: readonly ComparableOrbitSample[],
  pairedRemoteSamples: ReadonlySet<ComparableOrbitSample>,
  toleranceMilliseconds: number,
): ComparableOrbitSample | null {
  let nearestSample: ComparableOrbitSample | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  const localTime = localSample.epoch.getTime();

  for (const remoteSample of remoteSamples) {
    if (pairedRemoteSamples.has(remoteSample)) {
      continue;
    }

    const distance = Math.abs(remoteSample.epoch.getTime() - localTime);

    if (distance <= toleranceMilliseconds && distance < nearestDistance) {
      nearestSample = remoteSample;
      nearestDistance = distance;
    }
  }

  return nearestSample;
}

function uniqueValues(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function setsOverlap(left: readonly string[], right: readonly string[]): boolean {
  return left.some((value) => right.includes(value));
}
