import type { TleInput } from "../orbits/tle";
import type { OrbitSettings } from "../state/orbitSettings";
import type { PropagationFrameRequest } from "../state/frameSettings";
import { ORB_API_BASE_URL } from "../config";

export type PropagationApiRequest = {
  tle: {
    name?: string;
    line1: string;
    line2: string;
  };
  sampling: {
    start_epoch: string;
    duration_minutes: number;
    step_seconds: number;
  };
  frame: PropagationFrameRequest;
};

type PropagationApiVector = [number, number, number];

type PropagationApiResponse = {
  source: {
    type: "tle";
    name?: string | null;
    propagator: "orekit-tle";
  };
  frame: {
    name: string;
    authority: "orekit";
    is_native: boolean;
    requested?: PropagationFrameRequest | null;
    source?: string | null;
    origin?: "geocentric" | "spacecraft" | null;
  };
  units: {
    position: "km";
    velocity: "km/s";
  };
  sampling: {
    start_epoch: string;
    duration_minutes: number;
    step_seconds: number;
    sample_count: number;
  };
  samples: Array<{
    epoch: string;
    position_km: PropagationApiVector;
    velocity_km_s: PropagationApiVector;
  }>;
};

type PropagationApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

export type OrekitOrbitSample = {
  epoch: Date;
  epochIso: string;
  source: "orekit";
  frame: string;
  positionKm: {
    x: number;
    y: number;
    z: number;
  };
  velocityKmPerSecond: {
    x: number;
    y: number;
    z: number;
  };
};

export type NormalizedPropagationResponse = {
  source: {
    type: "tle";
    name?: string;
    propagator: "orekit-tle";
  };
  frame: {
    name: string;
    authority: "orekit";
    isNative: boolean;
    requested?: PropagationFrameRequest;
    source?: string;
    origin: "geocentric" | "spacecraft";
  };
  units: {
    position: "km";
    velocity: "km/s";
  };
  sampling: {
    startEpochIso: string;
    durationMinutes: number;
    stepSeconds: number;
    sampleCount: number;
  };
  samples: OrekitOrbitSample[];
};

export type PropagationFetchResult =
  | {
      ok: true;
      response: NormalizedPropagationResponse;
    }
  | {
      ok: false;
      status?: number;
      code?: string;
      message: string;
    };

export function buildTlePropagationRequest(
  tle: TleInput,
  settings: OrbitSettings,
  frame: PropagationFrameRequest = "native",
): PropagationApiRequest {
  return {
    tle: {
      name: tle.name,
      line1: tle.line1,
      line2: tle.line2,
    },
    sampling: {
      start_epoch: settings.epochIso,
      duration_minutes: settings.durationMinutes,
      step_seconds: settings.stepSeconds,
    },
    frame,
  };
}

export async function fetchTlePropagation(
  request: PropagationApiRequest,
  options: { signal?: AbortSignal; baseUrl?: string } = {},
): Promise<PropagationFetchResult> {
  const baseUrl = options.baseUrl ?? ORB_API_BASE_URL;

  try {
    const response = await fetch(`${baseUrl}/propagate/tle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: options.signal,
    });

    const body = await parseJson(response);

    if (!response.ok) {
      return normalizeErrorResponse(response.status, body);
    }

    return {
      ok: true,
      response: normalizePropagationResponse(body),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        ok: false,
        code: "request_aborted",
        message: "Orekit request was cancelled.",
      };
    }

    return {
      ok: false,
      code: "network_error",
      message: error instanceof Error ? error.message : "Orekit request failed.",
    };
  }
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function normalizeErrorResponse(
  status: number,
  body: unknown,
): PropagationFetchResult {
  const errorBody = body as PropagationApiErrorResponse | undefined;

  return {
    ok: false,
    status,
    code: errorBody?.error?.code ?? `http_${status}`,
    message: errorBody?.error?.message ?? `Orekit request failed with ${status}.`,
  };
}

function normalizePropagationResponse(
  body: unknown,
): NormalizedPropagationResponse {
  const response = body as PropagationApiResponse;

  return {
    source: {
      type: response.source.type,
      name: response.source.name ?? undefined,
      propagator: response.source.propagator,
    },
    frame: {
      name: response.frame.name,
      authority: response.frame.authority,
      isNative: response.frame.is_native,
      requested: response.frame.requested ?? undefined,
      source: response.frame.source ?? undefined,
      origin: response.frame.origin ?? "geocentric",
    },
    units: response.units,
    sampling: {
      startEpochIso: normalizeEpochIso(response.sampling.start_epoch),
      durationMinutes: response.sampling.duration_minutes,
      stepSeconds: response.sampling.step_seconds,
      sampleCount: response.sampling.sample_count,
    },
    samples: response.samples.map((sample) => ({
      epoch: new Date(sample.epoch),
      epochIso: normalizeEpochIso(sample.epoch),
      source: "orekit",
      frame: response.frame.name,
      positionKm: vectorToObject(sample.position_km),
      velocityKmPerSecond: vectorToObject(sample.velocity_km_s),
    })),
  };
}

function vectorToObject(vector: PropagationApiVector) {
  return {
    x: vector[0],
    y: vector[1],
    z: vector[2],
  };
}

function normalizeEpochIso(epochIso: string): string {
  return new Date(epochIso).toISOString();
}
