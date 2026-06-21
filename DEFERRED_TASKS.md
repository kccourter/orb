# Deferred Tasks

This file tracks approved or useful work that was intentionally moved out of
the current branch so it can return on a focused future branch.

## Goal 06 Follow-Up: Orbit-to-Orbit Intersection Probability Prototype

Deferred from Goal 06 after Increment 8 so the current branch can close around
uncertainty visualization, ephemeris-product investigation, UI cleanup, records,
and fixtures.

### Objective

Estimate probability of close approach between two propagated states whose
uncertainties grow over time.

### High-Level Plan

- Start with synchronized time samples and two Gaussian position covariances.
- Compute relative covariance and probability inside a spherical or ellipsoidal
  encounter volume.
- Provide deterministic test cases for separated, tangent, and overlapping
  uncertainty regions.
- Keep the first result explainable in API output and frontend text/state.
- Include frame, units, time, covariance provenance, and encounter-volume
  assumptions in inputs and outputs.
- Document limitations, especially Gaussian and synchronization assumptions.
- Decide whether the first API surface belongs in a new analysis endpoint or as
  an optional analysis block on propagation responses.

### Likely Files

- `src/orb_lab/intersections.py`
- `tests/test_intersections.py`
- Possible frontend overlay or readout after API behavior is approved.

## Goal 06 Follow-Up: Orbit-to-WEZ Ellipsoid Intersection Prototype

Deferred from Goal 06 after Increment 8 so WEZ geometry semantics can be handled
on a branch dedicated to intersection modeling.

### Objective

Estimate probability that an uncertain spacecraft state intersects a modeled
WEZ ellipsoid over time.

### High-Level Plan

- Define a WEZ ellipsoid as geometry with frame, center, axes, orientation,
  validity interval, and source metadata.
- Compute probability of the spacecraft position distribution lying inside the
  ellipsoid at sampled times.
- Add deterministic tests for outside, boundary, inside, and time-invalid cases.
- Keep WEZ semantics geometric and unclassified; no real engagement modeling.
- Report probability over time and the peak-risk sample.
- Fail clearly on frame and unit mismatches.
- Decide how to represent time-varying WEZ ellipsoids without overbuilding a
  mission planning system.

### Likely Files

- `src/orb_lab/intersections.py`
- Possible model additions in `src/orb_lab/models.py`
- `tests/test_wez_intersections.py`
- Possible frontend visualization/readout after API behavior is approved.
