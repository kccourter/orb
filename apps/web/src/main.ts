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
let localPoints = recomputeOrbit(currentSettings);
let displayPoints = localPoints;
let displayEpochs = localSamples.map((sample) => sample.epoch);
let frame = 0;

function updateOrbit(settings: OrbitSettings) {
  currentSettings = normalizeOrbitSettings(settings);
  localPoints = recomputeOrbit(currentSettings);
  showLocalDisplay();
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
  const comparableOrekitSamples = orekitSamples.map(orekitSampleToComparable);
  const alignmentResult = alignOrbitSamples(
    localSamples.map(satelliteJsSampleToComparable),
    comparableOrekitSamples,
  );

  if (!alignmentResult.ok) {
    sampleAlignment = null;
    divergenceSeries = null;

    if (alignmentResult.error.code === "frame_mismatch") {
      showOrekitDisplayMode(comparableOrekitSamples);
      orekitControls.setStatus({
        status: "ready",
        sampleCount: orekitSamples.length,
        frame: result.response.frame.name,
      });
      orekitControls.setLegend("Orekit display");
      orekitControls.setDivergenceSummary(null, result.response.frame.name);
      return;
    }

    orekitControls.setStatus({
      status: "error",
      message: alignmentResult.error.message,
    });
    orekitControls.setDivergenceSummary(null);
    return;
  }

  sampleAlignment = alignmentResult.alignment;
  divergenceSeries = computeDivergenceSeries(sampleAlignment);
  showComparableDisplay();
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
  orekitControls.setLegend("Local / Orekit");
  updateDivergenceReadout(displayEpochs[frame]);
}

function clearOrekitComparison(message: string) {
  orekitRequestId += 1;
  orekitSamples = [];
  sampleAlignment = null;
  divergenceSeries = null;
  showLocalDisplay();
  orbitScene.clearTrace("orekit");
  orekitControls.setStatus({
    status: "idle",
    message,
  });
  orekitControls.setLegend("Local / Orekit");
  orekitControls.setDivergenceSummary(null);
}

function showLocalDisplay() {
  orbitScene.setOrbitPoints(localPoints);
  displayPoints = localPoints;
  displayEpochs = localSamples.map((sample) => sample.epoch);

  if (displayPoints[0]) {
    orbitScene.setSatellitePosition(displayPoints[0]);
  }
}

function showComparableDisplay() {
  showLocalDisplay();
}

function showOrekitDisplayMode(
  comparableOrekitSamples: ReturnType<typeof orekitSampleToComparable>[],
) {
  const orekitPoints = comparableSamplesToScenePoints(comparableOrekitSamples);
  orbitScene.clearTrace("satellite-js");
  orbitScene.setTracePoints("orekit", orekitPoints);
  displayPoints = orekitPoints;
  displayEpochs = orekitSamples.map((sample) => sample.epoch);
  frame = 0;

  if (displayPoints[0]) {
    orbitScene.setSatellitePosition(displayPoints[0]);
  }
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  orbitScene.resize(width, height);
}

function animate() {
  requestAnimationFrame(animate);

  frame = (frame + 1) % Math.max(displayPoints.length, 1);
  const point = displayPoints[frame];
  if (point) {
    orbitScene.setSatellitePosition(point);
  }
  updateDivergenceReadout(displayEpochs[frame]);

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
