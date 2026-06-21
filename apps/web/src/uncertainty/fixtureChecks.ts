import { ORB_SAT_1_SYNTHETIC_COVARIANCE } from "./orbSat1SyntheticCovariance";

validateOrbSat1SyntheticCovariance();

function validateOrbSat1SyntheticCovariance() {
  const series = ORB_SAT_1_SYNTHETIC_COVARIANCE;

  assert(series.object_id === "orb-sat-1", "object id must be orb-sat-1");
  assert(series.frame.name === "QSW", "frame must be QSW");
  assert(series.frame.origin === "spacecraft", "QSW origin must be spacecraft");
  assert(series.units.position_covariance === "km^2", "covariance unit must be km^2");
  assert(series.samples.length === 6, "fixture should cover six day-3 samples");

  let previousTime = -Infinity;
  for (const sample of series.samples) {
    const time = Date.parse(sample.epoch);
    assert(Number.isFinite(time), `sample epoch must parse: ${sample.epoch}`);
    assert(time > previousTime, "sample epochs must be strictly increasing");
    previousTime = time;
    assert(sample.covariance_type === "position_3x3", "sample must be position_3x3");
    assert(sample.provenance === "synthetic", "sample provenance must be synthetic");
    assert(sample.position_covariance.length === 3, "covariance must have three rows");
    sample.position_covariance.forEach((row, rowIndex) => {
      assert(row.length === 3, "covariance must have three columns");
      row.forEach((value, columnIndex) => {
        assert(Number.isFinite(value), "covariance values must be finite");
        if (rowIndex === columnIndex) {
          assert(value >= 0, "diagonal covariance values must be nonnegative");
        } else {
          assert(value === 0, "initial fixture covariance should be diagonal");
        }
      });
    });
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`ORB-SAT-1 covariance fixture failed: ${message}`);
  }
}
