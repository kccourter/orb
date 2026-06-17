import {
  buildTlePropagationRequest,
  fetchTlePropagation,
  type OrekitOrbitSample,
} from "./api/propagation";
import { ISS_TLE } from "./orbits/fixtures";
import {
  alignOrbitSamples,
  type SampleAlignment,
} from "./orbits/alignment";
import {
  orekitSampleToComparable,
  satelliteJsSampleToComparable,
} from "./orbits/sampleTypes";
import { sampleTleOrbit, type TleOrbitSample } from "./orbits/tle";
import { createOrbitScene } from "./scene/createScene";
import { orbitSamplesToScenePoints } from "./scene/orbitTrace";
import {
  DEFAULT_ORBIT_SETTINGS,
  normalizeOrbitSettings,
  toTlePropagationSettings,
  type OrbitSettings,
} from "./state/orbitSettings";
import { createOrbitControls } from "./ui/controls";
import { createOrekitOverlayControls } from "./ui/orekitOverlayControls";
import "./styles.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");

if (!canvas) {
  throw new Error("Scene canvas was not found.");
}

const orbitScene = createOrbitScene(canvas);
const controls = createOrbitControls(DEFAULT_ORBIT_SETTINGS, updateOrbit);
const orekitControls = createOrekitOverlayControls(refreshOrekitSamples);
document.body.append(controls.element);
document.body.append(orekitControls.element);

let currentSettings = normalizeOrbitSettings(DEFAULT_ORBIT_SETTINGS);
let localSamples: TleOrbitSample[] = [];
let orekitSamples: OrekitOrbitSample[] = [];
let sampleAlignment: SampleAlignment | null = null;
let orekitRequestId = 0;
let points = recomputeOrbit(currentSettings);
let frame = 0;

function updateOrbit(settings: OrbitSettings) {
  currentSettings = normalizeOrbitSettings(settings);
  points = recomputeOrbit(currentSettings);
  orekitSamples = [];
  sampleAlignment = null;
  orekitControls.setStatus({
    status: "idle",
    message: "Refresh Orekit",
  });
  frame = 0;
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
    buildTlePropagationRequest(ISS_TLE, currentSettings),
  );

  if (requestId !== orekitRequestId) {
    return;
  }

  if (!result.ok) {
    orekitControls.setStatus({
      status: "error",
      message: result.message,
    });
    return;
  }

  orekitSamples = result.response.samples;
  const alignmentResult = alignOrbitSamples(
    localSamples.map(satelliteJsSampleToComparable),
    orekitSamples.map(orekitSampleToComparable),
  );

  if (!alignmentResult.ok) {
    sampleAlignment = null;
    orekitControls.setStatus({
      status: "error",
      message: alignmentResult.error.message,
    });
    return;
  }

  sampleAlignment = alignmentResult.alignment;
  orekitControls.setStatus({
    status: "ready",
    sampleCount: orekitSamples.length,
    frame: result.response.frame.name,
  });
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

  orbitScene.rotateEarth();
  orbitScene.render();
}

window.addEventListener("resize", resize);
window.addEventListener("beforeunload", () => orbitScene.dispose());
resize();
animate();
