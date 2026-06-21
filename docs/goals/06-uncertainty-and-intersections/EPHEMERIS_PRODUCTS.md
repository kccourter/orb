# Increment 7: Higher-Fidelity Ephemeris Product Investigation

## Objective

Investigate OEM, CPF, and related POD/conjunction products as paths around
TLE-only workflows, then recommend the first production-quality external
ephemeris product path for Orb Lab.

Status: implemented.

## Recommendation

Make **CCSDS OEM** the first production-quality external ephemeris loader path.

Rationale:

- OEM directly represents time-tagged Cartesian ephemeris samples, which matches
  Orb Lab's current sampled-trace and frame-label workflow.
- Orekit's CCSDS parser surface is reachable through the current
  `orekit-jpype` runtime.
- A hand-authored minimal OEM fixture parsed successfully through Orekit and was
  normalized to the project's existing `km` and `km/s` conventions.
- OEM can optionally carry covariance blocks, but covariance should remain a
  separate ingestion concern until the nominal ephemeris loader is stable.
- OEM aligns with Goal 05's scenario-loader direction better than CPF or CDM.

CPF should be treated as **adapter-only / deferred** for now. It is useful for
SLR prediction workflows, but it is prediction-center/station oriented rather
than the first general ephemeris interchange format Orb Lab needs.

CDM and POD-adjacent covariance products should feed later intersection
probability increments. They are important for covariance and conjunction
semantics, but they should not displace OEM as the first ephemeris loader.

## Feasibility Spike

Implemented a small Python helper:

- `src/orb_lab/ephemeris_products.py`
- `tests/fixtures/orb-sat-1-minimal.oem`
- `tests/test_ephemeris_products.py`

The spike:

- initializes the existing Orekit runtime/data path;
- imports `ParserBuilder` and builds an OEM parser;
- parses a minimal KVN OEM fixture through Orekit;
- extracts first-segment metadata: object name, object id, center, frame, time
  system, interpolation method, interpolation degree, start/stop times;
- extracts ephemeris samples;
- converts Orekit SI vectors to Orb Lab `km` and `km/s` values;
- normalizes parsed `AbsoluteDate` values to timezone-aware UTC datetimes.

The fixture is hand-authored format/loader test data. It is not a physical truth
product and is not intended as a real ORB-SAT-1 trajectory.

## Product Comparison

| Product | Primary Purpose | State Representation | Frame/Time Handling | Interpolation | Covariance | Fixture Practicality | Orekit Support | Orb Lab Role |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GP/TLE | Public general perturbations data for SGP4 | Mean elements fit for SGP4 | TEME-like SGP4 conventions; exact frame handling needs care | SGP4 propagation, not ephemeris interpolation | No direct covariance | Easy public fixtures | Existing TLE path works | Browser preview, SGP4 comparison, baseline limitations |
| CCSDS OEM | Ephemeris exchange | Time-tagged Cartesian position/velocity samples; optional acceleration | Explicit `CENTER_NAME`, `REF_FRAME`, `TIME_SYSTEM`, start/stop metadata | Metadata can specify method and degree | Optional covariance blocks | Hand-authored minimal fixture works; public fixtures need licensing review | `ParserBuilder.buildOemParser()` works locally | First production-quality external ephemeris loader |
| CPF | ILRS prediction exchange for laser ranging | Daily/sub-daily prediction tables for SLR targets | Prediction-center/station workflow; target class/location metadata | Intended for interpolation by stations | Not the main covariance carrier | Public CPF archives exist, but workflow is specialized | No local parser spike in this increment | Deferred adapter path for SLR/prediction workflows |
| CDM / conjunction products | Conjunction assessment and collision-risk exchange | Encounter metadata for two objects, often with state and covariance context | Event/conjunction-centered rather than generic trajectory-centered | Not a general ephemeris interpolation product | Central product value is covariance/conjunction context | Public examples may be harder; synthetic fixtures likely needed | Orekit has CDM parser builder support | Later intersection probability and covariance semantics |
| POD products | Precise orbit determination outputs | Varies by provider; often precise ephemeris plus quality metadata | Provider-specific frames/time scales | Product-specific | May be adjacent or implicit rather than embedded | Public availability varies by mission | Could map through OEM/SP3-like adapters later | Research input for calibration, not first loader |

## Key Findings

### TLE/GP

CelesTrak documents GP data as Brouwer mean elements fit for SGP4. GP/TLE data
remains useful for browser-side preview and SGP4 comparison, but it is not a
high-fidelity Cartesian ephemeris source and does not carry direct covariance.

### OEM

CCSDS Orbit Data Messages define OEM as an orbit ephemeris message. OEM metadata
includes frame, time system, start/stop time, and interpolation fields. OEM data
lines include epoch, position, and velocity, with acceleration optional.

The standard also permits covariance blocks after ephemeris data. Those
covariance blocks have their own epoch and may specify `COV_REF_FRAME` when the
covariance frame differs from the state frame. This is important but should be
implemented after nominal OEM ephemeris loading is stable.

### CPF

ILRS describes CPF as a laser-ranging prediction format for passive
retro-reflectors and transponders. It provides position tables that stations can
interpolate for accurate ranging predictions. That makes CPF valuable, but its
center of gravity is prediction operations rather than general scenario loading.

### CDM and POD-Adjacent Products

CDM-like products are not the first ephemeris ingestion target. They are more
important for later conjunction and intersection probability work because they
bring encounter context and covariance semantics. Orekit exposes CDM parser
builder support, which is useful for later spikes.

## Implementation Boundary

This increment deliberately does not add a public API route or frontend loader.
The production loader belongs with Goal 05 scenario loading unless the project
owner decides Goal 06 should carry a temporary prototype endpoint first.

Recommended next implementation path:

1. Add a Goal 05 OEM loader around the `inspect_oem_file` spike shape.
2. Normalize parsed OEM segments into a shared scenario/ephemeris model.
3. Preserve raw source metadata and parser provenance.
4. Keep covariance extraction separate until the nominal OEM trace path is
   reliable.
5. Add browser selection only after the API loader can report actionable parse
   errors.

## Remaining Risks

- Public OEM fixtures may carry unclear licensing or mission-specific caveats.
- OEM files can contain multiple segments, discontinuities, accelerations, and
  covariance sections; the spike only normalizes the first segment.
- Frame mapping beyond common inertial frames may need explicit Orekit
  `CcsdsFrameMapper` handling.
- Covariance interpolation should not be assumed to be linear or safe without a
  domain-specific decision.
- CPF may become important if Orb Lab later targets SLR stations or prediction
  products, but it is not the first general ephemeris loader.

## Sources Checked

- CCSDS Orbit Data Messages, 502.0-B-3:
  <https://public.ccsds.org/Pubs/502x0b3e1.pdf>
- Orekit `ParserBuilder` API:
  <https://www.orekit.org/site-orekit-latest/apidocs/org/orekit/files/ccsds/ndm/ParserBuilder.html>
- ILRS Consolidated Prediction Format:
  <https://ilrs.gsfc.nasa.gov/data_and_products/formats/cpf.html>
- CelesTrak GP data format notes:
  <https://celestrak.org/NORAD/documentation/gp-data-formats.php>
- Orekit CDM API:
  <https://www.orekit.org/site-orekit-latest/apidocs/org/orekit/files/ccsds/ndm/cdm/Cdm.html>
