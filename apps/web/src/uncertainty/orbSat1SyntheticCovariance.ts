import type { CovarianceSeries } from "./types";

export const ORB_SAT_1_SYNTHETIC_COVARIANCE: CovarianceSeries = {
  object_id: "orb-sat-1",
  series_id: "orb-sat-1-synthetic-day3-qsw-v1",
  source: {
    type: "synthetic_growth",
    provenance: "synthetic",
    description:
      "Synthetic 1-sigma QSW position covariance growth for ORB-SAT-1 from epoch through day 3.",
  },
  frame: {
    name: "QSW",
    origin: "spacecraft",
    reference: "nominal_state",
  },
  units: {
    position: "km",
    position_covariance: "km^2",
  },
  samples: [
    covarianceSample("2026-06-20T00:00:00Z", [0.000001, 0.000004, 0.000001]),
    covarianceSample("2026-06-20T06:00:00Z", [0.0004, 0.01, 0.0009]),
    covarianceSample("2026-06-20T12:00:00Z", [0.0025, 0.09, 0.0064]),
    covarianceSample("2026-06-21T00:00:00Z", [0.0225, 1.0, 0.0625]),
    covarianceSample("2026-06-22T00:00:00Z", [0.25, 25.0, 0.64]),
    covarianceSample("2026-06-23T00:00:00Z", [1.0, 225.0, 4.0]),
  ],
} as const;

function covarianceSample(epoch: string, diagonalKm2: readonly [number, number, number]) {
  return {
    epoch,
    covariance_type: "position_3x3",
    covariance_sigma: 1,
    position_covariance: [
      [diagonalKm2[0], 0, 0],
      [0, diagonalKm2[1], 0],
      [0, 0, diagonalKm2[2]],
    ],
    provenance: "synthetic",
    confidence_label: "1-sigma synthetic covariance",
  } satisfies CovarianceSeries["samples"][number];
}
