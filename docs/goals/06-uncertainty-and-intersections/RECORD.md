# Goal 06 Implementation Record

## Increment 1: Spacecraft Target Research and Selection

Status: implemented.

### Outcome

ORB-SAT-1 is the primary spacecraft under inspection for Goal 06. It is a
synthetic agile LEO reference spacecraft, not a claim about a flown vehicle.

- PRISMA Mango provides the physical and agile-mission reference: compact LEO
  spacecraft, formation-flying/rendezvous mission personality, 145 kg class
  mass, and 1 N class HPGP propulsion heritage.
- GRACE-FO provides the drag/POD uncertainty reference: public accelerometer,
  GNSS, K-band/laser ranging, and precise-orbit research context.
- Sentinel-2 and SkySat-class spacecraft remain documented comparison cases but
  are not the first target.

### Artifacts

- [SPACECRAFT.md](SPACECRAFT.md) records candidate research, assumption labels,
  and the ORB-SAT-1 decision.
- [fixtures/orb-sat-1.spacecraft.json](fixtures/orb-sat-1.spacecraft.json)
  captures the first ORB-SAT-1 metadata fixture.
- [README.md](README.md) and [PLAN.md](PLAN.md) mark Increment 1 complete.

### Implementation Notes

- The ORB-SAT-1 fixture is intentionally goal-local documentation data. It is
  not wired into the runtime API or frontend yet.
- Runtime scenario loading still belongs to the Goal 05 loader path and later
  Goal 06 increments.
- Covariance shape, sigma level, frame semantics, and uncertainty growth are
  deferred to Increment 2.
- Generated ephemeris, TLE, OEM, or maneuver timelines are deferred until the
  relevant schema decisions are approved.

### Validation

- Documentation review.
- JSON syntax check for
  `docs/goals/06-uncertainty-and-intersections/fixtures/orb-sat-1.spacecraft.json`.

Command run:

```sh
node --input-type=module -e "import fs from 'node:fs'; JSON.parse(fs.readFileSync('docs/goals/06-uncertainty-and-intersections/fixtures/orb-sat-1.spacecraft.json', 'utf8')); console.log('orb-sat-1 fixture JSON ok');"
```

Result: passed.
