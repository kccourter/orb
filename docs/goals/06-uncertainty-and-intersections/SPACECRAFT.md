# Goal 06 Spacecraft Target Research

## Recommendation

Use **ORB-SAT-1** as the Goal 06 spacecraft under inspection: a synthetic
reference spacecraft that combines PRISMA-like small agile LEO geometry and
maneuver behavior with GRACE-FO-inspired drag and precise-orbit uncertainty
research assumptions.

ORB-SAT-1 is better than selecting a single real spacecraft because the real
candidates have complementary gaps. PRISMA Mango is the best physical and
mission-profile inspiration for a small agile inspector, but it lacks public
high-fidelity drag and covariance products. GRACE-FO has unusually strong public
tracking and non-gravitational acceleration context, but it is not an agile
inspection spacecraft.

The synthetic target keeps the model honest: the app can inspect one coherent
spacecraft while every parameter is labeled as published, derived, synthetic, or
calibrated-reference.

## Selection Criteria

- Smaller than ISS and in LEO.
- Publicly documented mass, dimensions, and orbit regime.
- Some public basis for drag modeling: dimensions, attitude/geometry, or
  accelerometer/POD data.
- Some public basis for delta-v or maneuver modeling: propulsion, maneuver
  mission, or station-keeping behavior.
- Can be represented without proprietary operations data in the first
  implementation.

## Candidate Summary

| Candidate | Fit | Public Physical Model | Drag/POD Support | Maneuver Support | Main Gap |
| --- | --- | --- | --- | --- | --- |
| ORB-SAT-1 | Best primary target | Synthetic composite from documented references | GRACE-FO-inspired uncertainty and drag assumptions | PRISMA-inspired small-spacecraft maneuver assumptions | Must clearly label every synthetic or calibrated field |
| PRISMA Mango | Best physical/agility reference | Published 145 kg class, roughly 0.8 m class bus | Geometry supports first drag proxy; TLEs should be available historically | Formation-flying mission; HPGP monopropellant demo | Detailed delta-v budget and full aero model are not in high-level public docs |
| GRACE-FO 1/2 | Best reference target | Published mission/orbit and instrument descriptions | Strong: accelerometer, GNSS, KBR/LRI, SLR context | Not an agile inspection spacecraft | Maneuver authority is not the user-facing story |
| SkySat-C class | Good visual/agility proxy | Public mass/size estimates exist, but scattered | Weak public drag/POD data | Tasking, off-nadir imaging, ECAPS propulsion on later units | Commercial details are limited |
| Sentinel-2A/B/C | Good operational LEO reference | Strong public mass/orbit facts | GNSS and maintained orbit, but not drag/POD rich | Dedicated propulsion for orbit maintenance | Large spacecraft, not inspection-like or agile |

## ORB-SAT-1

### Purpose

ORB-SAT-1 is a clean-room synthetic spacecraft for Orb Lab uncertainty and
intersection experiments. It is not a claim about a flown vehicle. Its job is to
give the app one coherent spacecraft under inspection while preserving explicit
provenance for every assumption.

### Reference Blend

- Physical size and agile mission personality: PRISMA Mango.
- Maneuver-class assumptions: PRISMA/HPGP-style 1 N class small-spacecraft
  propulsion.
- Drag and non-gravitational force research: GRACE-FO accelerometer and POD
  context.
- Ephemeris and covariance direction: OEM/POD products investigated in later
  increments, with GRACE-FO as the public reference case.

### First Scenario Defaults

- Spacecraft id: `orb-sat-1`.
- Display name: `ORB-SAT-1`.
- Role: synthetic agile LEO inspection spacecraft.
- Geometry: compact box proxy inspired by PRISMA Mango.
- Mass: 145 kg derived from PRISMA Mango public mass.
- Drag model: configurable ballistic coefficient, initialized from box geometry
  and calibrated-reference GRACE-FO drag/POD research notes.
- Maneuver model: synthetic impulse or finite-burn events constrained by a
  PRISMA/HPGP-style 1 N class thruster assumption.
- Data source: generated scenario fixture first; real TLE/OEM/POD comparison
  cases stay separate.
- Provenance labels: required for mass, geometry, drag coefficient, maneuver
  authority, covariance, and any generated ephemeris.

### Classification Of Assumptions

- Published reference: PRISMA Mango mass/geometry/mission role; GRACE-FO
  drag/POD instrument context.
- Derived: ORB-SAT-1 box cross-section and ballistic coefficient seed.
- Synthetic: maneuver schedule, total delta-v budget, covariance growth model,
  generated ephemeris, and WEZ/intersection scenarios.
- Calibrated-reference: drag and covariance behaviors tuned against GRACE-FO or
  other public POD/accelerometer examples when available.

### Why This Is Preferable

- Avoids pretending PRISMA has GRACE-grade drag/POD data.
- Avoids pretending GRACE-FO is an agile inspector.
- Makes synthetic uncertainty explicit instead of hiding it behind a real
  spacecraft name.
- Gives fixtures a stable identity for tests, UI, and docs.

## PRISMA Mango

### Why It Fits

PRISMA was a Swedish-led two-spacecraft demonstration mission for autonomous
formation flying and rendezvous. Mango was the active spacecraft and Tango was
the passive or less-capable target. That makes Mango a strong conceptual match
for “spacecraft under inspection” workflows where maneuver capability and
relative geometry matter.

The public mission summaries report:

- Mango mass: about 145 kg.
- Tango mass: about 50 kg.
- Mango dimensions: roughly 0.8 m class.
- Orbit: sun-synchronous LEO, roughly 99 minute period.
- Mission goal: formation flying, autonomous collision avoidance/rendezvous,
  and green monopropellant thruster demonstration.
- Propulsion: HPGP/LMP-103S monopropellant demonstration, with 1 N class ECAPS
  heritage discussed in public sources.

### Classification Of Assumptions

- Published: mass, broad dimensions, LEO orbit class, formation-flying mission,
  and HPGP propulsion demonstration.
- Inferred: first-pass cross-sectional area from bus dimensions, attitude mode
  simplification, and drag coefficient defaults.
- Synthetic for Goal 06 until sourced: total delta-v budget, maneuver schedule,
  covariance growth law, and drag-area variation with attitude.

### Reference Scenario Defaults

- Spacecraft id: `prisma-mango`.
- Display name: `PRISMA Mango`.
- Role: physical/agility reference for ORB-SAT-1.
- Geometry: box proxy derived from published 0.8 m class dimensions.
- Mass: 145 kg until refined by a better source.
- Drag model: synthetic ballistic coefficient using published dimensions and a
  configurable drag coefficient.
- Maneuver model: synthetic impulse or finite-burn events constrained by a
  documented 1 N class thruster assumption.
- Data source: historical TLE/GP path first; OEM/POD path deferred until a
  suitable public ephemeris fixture is found or hand-authored.

### Risks

- PRISMA is no longer a current operational mission, so fresh public TLEs may not
  be available for live examples.
- Published high-level sources do not provide a complete delta-v budget.
- Drag modeling will be geometry-and-assumption based, not accelerometer-derived.
- It is excellent for agile-spacecraft visualization, but less ideal as a
  high-fidelity POD benchmark.

## GRACE-FO Reference Case

### Why It Stays In The Goal

GRACE-FO is not the recommended primary inspection spacecraft, but it is too
valuable to ignore for uncertainty research. PO.DAAC describes GRACE-FO as twin
satellites in formation at an initial altitude near 490 km and a nominal
separation of 220 +/- 50 km. Its instruments include K-band ranging, laser
ranging interferometry, accelerometers for non-gravitational acceleration such
as drag, star cameras, and GNSS receivers.

That makes GRACE-FO the best reference target for:

- Drag and density research using accelerometer-derived non-gravitational
  accelerations.
- POD and precise ephemeris investigation.
- Comparing TLE/SGP4 behavior against higher-fidelity products.
- Explaining why uncertainty visualization should distinguish source quality.

### Classification Of Assumptions

- Published: formation orbit, nominal separation, KBR/LRI, accelerometer, star
  camera, and GNSS instrument roles.
- Inferred: use as a data-quality reference for Orb Lab uncertainty design.
- Synthetic: any maneuver authority or agile inspection behavior.

## SkySat-C Class

### Why It Is Tempting

SkySat-class spacecraft are small commercial imaging satellites with rapid
tasking, off-nadir imaging, and later ECAPS propulsion heritage. Planet describes
SkySat as a tasking constellation with about 15 satellites, 50 cm imagery, and
sub-daily tasking. Public summaries describe SkySat-C spacecraft around
110-120 kg in a 500 km sun-synchronous orbit.

This is the best “modern commercial agile LEO” vibe.

### Why It Is Not The First Target

The public details that matter for uncertainty and force modeling are thin:
precise mass properties, attitude timelines, drag area, propellant load, and
maneuver authority are not easily available in open sources. That would make the
visualization look modern but force too many synthetic assumptions.

## Sentinel-2

### Why It Is Useful

Sentinel-2 is very well documented as an operational LEO Earth-observation
mission. Copernicus documents approximately 1.2 tonne spacecraft, a 786 km
sun-synchronous orbit, dual-frequency GNSS orbit measurement, and a dedicated
propulsion system for maintaining orbital accuracy.

### Why It Is Not The First Target

Sentinel-2 is much smaller than ISS but still large for the desired inspection
spacecraft feel. Its public story is precise imaging and maintained orbital
repeatability, not agile maneuvering or uncertainty growth under low-altitude
drag.

## Decision

Proceed with **ORB-SAT-1** for Goal 06 Increment 2. Treat PRISMA Mango as the
physical/agility reference and GRACE-FO as the drag/POD uncertainty reference.

This gives the first implementation a small agile spacecraft that is honest
about synthetic drag, delta-v, and covariance assumptions, while preserving a
path toward high-fidelity uncertainty products.

## References Checked

- PRISMA mission summary:
  <https://en.wikipedia.org/wiki/Prisma_(satellite_project)>
- PRISMA formation-flying experiment paper:
  <https://arxiv.org/abs/1308.0150>
- GRACE-FO PO.DAAC mission and instrument overview:
  <https://podaac.jpl.nasa.gov/GRACE-FO>
- Sentinel-2 Copernicus mission description:
  <https://sentinels.copernicus.eu/web/sentinel/missions/sentinel-2/satellite-description>
- Planet high-resolution tasking and SkySat overview:
  <https://www.planet.com/products/high-resolution-satellite-imagery/>
- SkySat public summary:
  <https://en.wikipedia.org/wiki/SkySat>
- ECAPS/HPGP public summary:
  <https://en.wikipedia.org/wiki/ECAPS>
