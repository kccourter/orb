# Goal 04 Frame Policy

## Status

Implemented for Goal 04 on 2026-06-17.

This document defines the frame vocabulary used by the Goal 04 API and frontend frame controls.

## Principles

- API payloads use exact technical frame identifiers, not broad display categories.
- UI labels may use familiar terms such as ECI and ECEF, but they must include or map to the exact frame name.
- Orekit owns authoritative frame transforms.
- Browser-side `satellite.js` samples remain `TEME` unless an explicit, tested browser transform is added later.
- Divergence metrics are shown only when compared samples have matching frame labels and compatible units.

## Supported Frame Set For Goal 04

| API value | UI label | Category | Orekit path | Output origin | Units | Comparison-safe with local `satellite.js`? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `native` | Native TLE (TEME) | Compatibility | TLE propagator native frame | Geocentric | km, km/s | Yes, when response frame is `TEME` | Preserves Goal 02/03 behavior. The realized frame name is reported in response metadata. |
| `TEME` | TEME | TLE inertial | Orekit TEME frame or native TLE frame when equivalent | Geocentric | km, km/s | Yes | Explicit form of the current comparison frame. Useful when users should choose the frame by name rather than by compatibility mode. |
| `EME2000` | ECI (EME2000) | Inertial | Orekit `EME2000` frame | Geocentric | km, km/s | No, unless local samples are also transformed | First explicit inertial display frame. Do not expose bare `ECI` as an API value. |
| `ITRF` | ECEF (ITRF) | Earth-fixed | Orekit Earth-fixed ITRF frame | Geocentric | km, km/s | No, unless local samples are also transformed | First Earth-fixed display frame. Requires Orekit data sufficient for time scales and Earth orientation behavior. |
| `QSW` | Local QSW | Local orbital | Orekit local orbital frame or equivalent construction from propagated PV | Spacecraft-centered | km, km/s | No | First local orbital frame. Goal 04 must render it as a local-frame view or axes-aware display, not as a normal geocentric orbit trace. |

## Glossary

`ECI` is a category, not a single frame. Goal 04 uses `EME2000` as the first explicit inertial frame and may label it as `ECI (EME2000)` in the UI.

`ECEF` is a category, not a single frame. Goal 04 uses `ITRF` as the first explicit Earth-fixed frame and may label it as `ECEF (ITRF)` in the UI.

`TEME` is the frame used by the current TLE comparison path. `satellite.js` samples are labeled `TEME`, and Orekit native TLE propagation returns `TEME` for the ISS fixture.

`native` is a compatibility request mode, not a frame. It asks the backend to return the propagator's native output frame and report the realized name in metadata.

## Local QSW Convention

Goal 04 uses QSW as the first local orbital convention:

- `Q`: radial axis, parallel to the spacecraft position vector from the central body.
- `W`: angular momentum axis, parallel to `r x v`.
- `S`: completes the right-handed triad.

The local QSW origin is the propagated spacecraft. Returned QSW coordinates are spacecraft-relative unless Increment 2 discovers an Orekit API constraint that requires a different representation. Because of that origin, QSW output must not be rendered as a normal geocentric trace without an explicit display design.

Degenerate vectors are invalid for QSW construction. If position magnitude, velocity magnitude, or angular momentum magnitude is too small to define axes, the backend should fail the request with a domain error rather than fabricate axes.

## Response Metadata Policy

Goal 04 should preserve existing response metadata fields and add detail without breaking current clients:

```ts
type FrameMetadata = {
  name: string;
  authority: "orekit";
  is_native: boolean;
  requested?: "native" | "TEME" | "EME2000" | "ITRF" | "QSW";
  source?: string;
  origin?: "geocentric" | "spacecraft";
};
```

- `name`: realized output frame name.
- `requested`: frame value from the request.
- `source`: source/native frame before transform, such as `TEME`.
- `origin`: coordinate origin needed by the frontend to decide whether normal trace rendering is valid.
- `is_native`: `true` only when output is the propagator native frame without an explicit transform.

## Default Selection

The initial frontend selected frame should remain `native` for compatibility and to preserve the Goal 03 comparison path. The UI may display that as `Native (TEME)` after the first Orekit response identifies the realized frame.

## Comparison Policy

- `native`/realized `TEME` and explicit `TEME` are comparison-safe with local `satellite.js` samples.
- `EME2000`, `ITRF`, and `QSW` are Orekit display frames until a matching local transform path exists.
- Divergence metrics should be hidden or shown as unavailable for non-comparable frame combinations.
- Do not compare samples by index; continue using epoch alignment.
- Do not interpolate in Goal 04 unless a later increment explicitly changes this policy.

## Implemented Display Policy

- `native` and explicit `TEME` preserve the Goal 03 dual-trace comparison path.
- `EME2000`, `ITRF`, and `QSW` render as Orekit display modes.
- In Orekit display mode, the local `TEME` trace is cleared, the Orekit trace and marker use returned Orekit samples, and divergence metrics are unavailable.
- QSW is spacecraft-centered; it is not rendered as a geocentric comparison trace.

## Open Implementation Notes

- Earth rotation is not paused in `ITRF` display in Goal 04.
- QSW is rendered as spacecraft-centered Orekit display data without an additional axes overlay in Goal 04.
