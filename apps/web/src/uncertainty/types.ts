export type UncertaintyProvenance =
  | "published_reference"
  | "derived"
  | "synthetic"
  | "calibrated_reference"
  | "imported";

export type CovarianceFrameName = "QSW" | "TEME" | "EME2000" | "ITRF";
export type CovarianceFrameOrigin = "geocentric" | "spacecraft";
export type CovarianceType = "position_3x3";

export type UncertaintySourceMetadata = {
  type: string;
  provenance: UncertaintyProvenance;
  description?: string;
};

export type CovarianceFrameMetadata = {
  name: CovarianceFrameName;
  origin: CovarianceFrameOrigin;
  reference: string;
};

export type UncertaintyUnitsMetadata = {
  position: "km";
  position_covariance: "km^2";
};

export type CovarianceSample = {
  epoch: string;
  covariance_type: CovarianceType;
  covariance_sigma: 1;
  position_covariance: [number[], number[], number[]];
  provenance: UncertaintyProvenance;
  confidence_label?: string;
};

export type CovarianceSeries = {
  object_id: string;
  series_id: string;
  source: UncertaintySourceMetadata;
  frame: CovarianceFrameMetadata;
  units: UncertaintyUnitsMetadata;
  samples: CovarianceSample[];
};
