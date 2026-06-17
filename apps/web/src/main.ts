import {
  buildTlePropagationRequest,
  fetchTlePropagation,
  type OrekitOrbitSample,
} from "./api/propagation";
import "./orbits/fixtureChecks";
import { ISS_TLE } from "./orbits/fixtures";
import {
  alignOrbitSamples,
  type SampleAlignment,
} from "./orbits/alignment";
import {
  computeDivergenceSeries,
  summarizeDivergence,
  type DivergenceSeries,
} from "./orbits/divergence";
import {
  orekitSampleToComparable,
  satelliteJsSampleToComparable,
} from "./orbits/sampleTypes";
import { sampleTleOrbit, type TleOrbitSample } from "./orbits/tle";
import { createOrbitScene } from "./scene/createScene";
import {
  comparableSamplesToScenePoints,
  orbitSamplesToScenePoints,
} from "./scene/orbitTrace";
import {
  DEFAULT_ORBIT_SETTINGS,
  normalizeOrbitSettings,
  toTlePropagationSettings,
  type OrbitSettings,
} from "./state/orbitSettings";
import {
  DEFAULT_PROPAGATION_FRAME,
  labelForPropagationFrame,
  type PropagationFrameRequest,
} from "./state/frameSettings";
import { createOrbitControls } from "./ui/controls";
import { createFrameControls } from "./ui/frameControls";
import { createOrekitOverlayControls } from "./ui/orekitOverlayControls";
import "./styles.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");

if (!canvas) {
  throw new Error("Scene canvas was not found.");
}

const orbitScene = createOrbitScene(canvas);
const controls = createOrbitControls(DEFAULT_ORBIT_SETTINGS, updateOrbit);
const frameControls = createFrameControls(
  DEFAULT_PROPAGATION_FRAME,
  updatePropagationFrame,
);
const orekitControls = createOrekitOverlayControls(refreshOrekitSamples);
document.body.append(controls.element);
document.body.append(frameControls.element);
document.body.append(orekitControls.element);

let currentSettings = normalizeOrbitSettings(DEFAULT_ORBIT_SETTINGS);
let currentFrame: PropagationFrameRequest = DEFAULT_PROPAGATION_FRAME;
let localSamples: TleOrbitSample[] = [];
let orekitSamples: OrekitOrbitSample[] = [];
let sampleAlignment: SampleAlignment | null = null;
let divergenceSeries: DivergenceSeries | null = null;
let orekitRequestId = 0;
let points = recomputeOrbit(currentSettings);
let frame = 0;

function updateOrbit(settings: OrbitSettings) {
  currentSettings = normalizeOrbitSettings(settings);
  points = recomputeOrbit(currentSettings);
  clearOrekitComparison("Refresh Orekit");
  frame = 0;
}

function updatePropagationFrame(nextFrame: PropagationFrameRequest) {
  currentFrame = nextFrame;
  frameControls.setFrame(currentFrame);
  clearOrekitComparison(`Refresh ${labelForPropagationFrame(currentFrame)}`);
}

function recomputeOrbit(settings: OrbitSettings) {
  const normalizedSettings = normalizeOrbitSettings(settings);
  controls?.setSettings(normalizedSettings);

  localSamples = sampleTleOrbit(
    ISS_TLE,
    toTlePropagationSettings(normalizedSettings),
  );
  const nextPoints = orbitSamplesToScenePoints(localSamples);
  orbitScene.setOrbitPoints(nextPoints);

  if (nextPoints[0]) {
    orbitScene.setSatellitePosition(nextPoints[0]);
  }

  return nextPoints;
}

async function refreshOrekitSamples() {
  const requestId = orekitRequestId + 1;
  orekitRequestId = requestId;

  orekitControls.setStatus({ status: "loading" });

  const result = await fetchTlePropagation(
    buildTlePropagationRequest(ISS_TLE, currentSettings, currentFrame),
  );

  if (requestId !== orekitRequestId) {
    return;
  }

  if (!result.ok) {
    orekitControls.setStatus({
      status: "error",
      message: result.message,
    });
    orekitControls.setDivergenceSummary(null);
    return;
  }

  orekitSamples = result.response.samples;
  const alignmentResult = alignOrbitSamples(
    localSamples.map(satelliteJsSampleToComparable),
    orekitSamples.map(orekitSampleToComparable),
  );

  if (!alignmentResult.ok) {
    sampleAlignment = null;
    divergenceSeries = null;
    orekitControls.setStatus({
      status: "error",
      message: alignmentResult.error.message,
    });
    orekitControls.setDivergenceSummary(null);
    return;
  }

  sampleAlignment = alignmentResult.alignment;
  divergenceSeries = computeDivergenceSeries(sampleAlignment);
  orbitScene.setTracePoints(
    "orekit",
    comparableSamplesToScenePoints(
      sampleAlignment.pairs.map((pair) => pair.remote),
    ),
  );
  orekitControls.setStatus({
    status: "ready",
    sampleCount: orekitSamples.length,
    frame: result.response.frame.name,
  });
  updateDivergenceReadout(localSamples[frame]?.epoch);
}

function clearOrekitComparison(message: string) {
  orekitRequestId += 1;
  orekitSamples = [];
  sampleAlignment = null;
  divergenceSeries = null;
  orbitScene.clearTrace("orekit");
  orekitControls.setStatus({
    status: "idle",
    message,
  });
  orekitControls.setDivergenceSummary(null);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  orbitScene.resize(width, height);
}

function animate() {
  requestAnimationFrame(animate);

  frame = (frame + 1) % Math.max(points.length, 1);
  const point = points[frame];
  if (point) {
    orbitScene.setSatellitePosition(point);
  }
  updateDivergenceReadout(localSamples[frame]?.epoch);

  orbitScene.rotateEarth();
  orbitScene.render();
}

function updateDivergenceReadout(currentEpoch?: Date) {
  if (!divergenceSeries) {
    return;
  }

  orekitControls.setDivergenceSummary(
    summarizeDivergence(
      divergenceSeries,
      currentEpoch ? currentEpoch.toISOString() : null,
    ),
    `${divergenceSeries.frame}`,
  );
}

window.addEventListener("resize", resize);
window.addEventListener("beforeunload", () => orbitScene.dispose());
resize();
animate();
