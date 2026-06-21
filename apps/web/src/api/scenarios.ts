import { ORB_API_BASE_URL } from "../config";
import type { CartesianVectorKm, CartesianVectorKmPerSecond } from "../orbits/tle";

export type ScenarioSourceType = "tle" | "oem_ccsds" | "initial_state";
export type ScenarioFrame = "TEME" | "EME2000" | "ITRF" | "QSW";

type ScenarioApiVector = [number, number, number];

type ScenarioApiExampleSummary = {
  id: string;
  name: string;
  source_type: ScenarioSourceType;
  format: string;
  frame: ScenarioFrame;
};

type ScenarioApiStateVector = {
  epoch: string;
  position_km: ScenarioApiVector;
  velocity_km_s: ScenarioApiVector;
};

type ScenarioApiResponse = {
  id?: string | null;
  name: string;
  source: {
    type: ScenarioSourceType;
    format: string;
    object_id?: string | null;
    raw?: string | null;
  };
  frame: {
    name: ScenarioFrame;
    origin: "geocentric" | "spacecraft";
  };
  units: {
    position: "km";
    velocity: "km/s";
  };
  epoch?: string | null;
  tle?: {
    line1: string;
    line2: string;
  } | null;
  initial_state?: ScenarioApiStateVector | null;
  samples: ScenarioApiStateVector[];
};

type ScenarioApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

export type ScenarioExampleSummary = {
  id: string;
  name: string;
  sourceType: ScenarioSourceType;
  format: string;
  frame: ScenarioFrame;
};

export type ScenarioStateSample = {
  epoch: Date;
  epochIso: string;
  frame: ScenarioFrame;
  positionKm: CartesianVectorKm;
  velocityKmPerSecond: CartesianVectorKmPerSecond;
};

export type NormalizedScenario = {
  id?: string;
  name: string;
  source: {
    type: ScenarioSourceType;
    format: string;
    objectId?: string;
  };
  frame: {
    name: ScenarioFrame;
    origin: "geocentric" | "spacecraft";
  };
  units: {
    position: "km";
    velocity: "km/s";
  };
  epochIso?: string;
  tle?: {
    line1: string;
    line2: string;
  };
  initialState?: ScenarioStateSample;
  samples: ScenarioStateSample[];
};

export type ScenarioFetchResult<T> =
  | {
      ok: true;
      response: T;
    }
  | {
      ok: false;
      status?: number;
      code?: string;
      message: string;
    };

export async function fetchScenarioExamples(
  options: { signal?: AbortSignal; baseUrl?: string } = {},
): Promise<ScenarioFetchResult<ScenarioExampleSummary[]>> {
  const baseUrl = options.baseUrl ?? ORB_API_BASE_URL;

  try {
    const response = await fetch(`${baseUrl}/scenarios/examples`, {
      signal: options.signal,
    });
    const body = await parseJson(response);

    if (!response.ok) {
      return normalizeErrorResponse(response.status, body);
    }

    return {
      ok: true,
      response: (body as ScenarioApiExampleSummary[]).map(normalizeExample),
    };
  } catch (error) {
    return normalizeFetchError(error, "Scenario examples request failed.");
  }
}

export async function fetchScenarioExample(
  exampleId: string,
  options: { signal?: AbortSignal; baseUrl?: string } = {},
): Promise<ScenarioFetchResult<NormalizedScenario>> {
  const baseUrl = options.baseUrl ?? ORB_API_BASE_URL;

  try {
    const response = await fetch(
      `${baseUrl}/scenarios/examples/${encodeURIComponent(exampleId)}`,
      {
        signal: options.signal,
      },
    );
    const body = await parseJson(response);

    if (!response.ok) {
      return normalizeErrorResponse(response.status, body);
    }

    return {
      ok: true,
      response: normalizeScenario(body as ScenarioApiResponse),
    };
  } catch (error) {
    return normalizeFetchError(error, "Scenario example request failed.");
  }
}

export async function normalizeScenarioText(
  sourceType: ScenarioSourceType,
  text: string,
  options: { name?: string; signal?: AbortSignal; baseUrl?: string } = {},
): Promise<ScenarioFetchResult<NormalizedScenario>> {
  const baseUrl = options.baseUrl ?? ORB_API_BASE_URL;

  try {
    const response = await fetch(`${baseUrl}/scenarios/normalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_type: sourceType,
        text,
        name: options.name,
      }),
      signal: options.signal,
    });
    const body = await parseJson(response);

    if (!response.ok) {
      return normalizeErrorResponse(response.status, body);
    }

    return {
      ok: true,
      response: normalizeScenario(body as ScenarioApiResponse),
    };
  } catch (error) {
    return normalizeFetchError(error, "Scenario normalization request failed.");
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

function normalizeExample(
  example: ScenarioApiExampleSummary,
): ScenarioExampleSummary {
  return {
    id: example.id,
    name: example.name,
    sourceType: example.source_type,
    format: example.format,
    frame: example.frame,
  };
}

function normalizeScenario(response: ScenarioApiResponse): NormalizedScenario {
  const samples = response.samples.map((sample) =>
    normalizeSample(sample, response.frame.name),
  );

  return {
    id: response.id ?? undefined,
    name: response.name,
    source: {
      type: response.source.type,
      format: response.source.format,
      objectId: response.source.object_id ?? undefined,
    },
    frame: response.frame,
    units: response.units,
    epochIso: response.epoch ? normalizeEpochIso(response.epoch) : undefined,
    tle: response.tle ?? undefined,
    initialState: response.initial_state
      ? normalizeSample(response.initial_state, response.frame.name)
      : undefined,
    samples,
  };
}

function normalizeSample(
  sample: ScenarioApiStateVector,
  frame: ScenarioFrame,
): ScenarioStateSample {
  return {
    epoch: new Date(sample.epoch),
    epochIso: normalizeEpochIso(sample.epoch),
    frame,
    positionKm: vectorToObject(sample.position_km),
    velocityKmPerSecond: vectorToObject(sample.velocity_km_s),
  };
}

function vectorToObject(vector: ScenarioApiVector) {
  return {
    x: vector[0],
    y: vector[1],
    z: vector[2],
  };
}

function normalizeErrorResponse(
  status: number,
  body: unknown,
): ScenarioFetchResult<never> {
  const errorBody = body as ScenarioApiErrorResponse | undefined;

  return {
    ok: false,
    status,
    code: errorBody?.error?.code ?? `http_${status}`,
    message:
      errorBody?.error?.message ?? `Scenario request failed with ${status}.`,
  };
}

function normalizeFetchError(
  error: unknown,
  fallbackMessage: string,
): ScenarioFetchResult<never> {
  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      ok: false,
      code: "request_aborted",
      message: "Scenario request was cancelled.",
    };
  }

  return {
    ok: false,
    code: "network_error",
    message: error instanceof Error ? error.message : fallbackMessage,
  };
}

function normalizeEpochIso(epochIso: string): string {
  return new Date(epochIso).toISOString();
}
