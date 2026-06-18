import {
  buildTlePropagationRequest,
  fetchTlePropagation,
  type OrekitOrbitSample,
} from "./api/propagation";
import {
  fetchScenarioExample,
  fetchScenarioExamples,
  type NormalizedScenario,
  type ScenarioStateSample,
} from "./api/scenarios";
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
  normalizeEpochIso,
  satelliteJsSampleToComparable,
  type ComparableOrbitSample,
} from "./orbits/sampleTypes";
import { sampleTleOrbit, type TleInput, type TleOrbitSample } from "./orbits/tle";
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
  DEFAULT_SCENARIO_ID,
  stateFromNormalizedScenario,
  type ActiveScenarioState,
  type ScenarioDisplayMode,
} from "./state/scenarioState";
import {
  DEFAULT_PROPAGATION_FRAME,
  labelForPropagationFrame,
  type PropagationFrameRequest,
} from "./state/frameSettings";
import { createOrbitControls } from "./ui/controls";
import { createFrameControls } from "./ui/frameControls";
import { createOrekitOverlayControls } from "./ui/orekitOverlayControls";
import { createScenarioControls } from "./ui/scenarioControls";
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
const scenarioControls = createScenarioControls(loadScenarioExample);
const orekitControls = createOrekitOverlayControls(refreshOrekitSamples);
document.body.append(controls.element);
document.body.append(frameControls.element);
document.body.append(scenarioControls.element);
document.body.append(orekitControls.element);

let currentSettings = normalizeOrbitSettings(DEFAULT_ORBIT_SETTINGS);
let currentFrame: PropagationFrameRequest = DEFAULT_PROPAGATION_FRAME;
let activeTle: TleInput | undefined = ISS_TLE;
let activeScenarioState: ActiveScenarioState | null = null;
let activeDisplayMode: ScenarioDisplayMode = "tle-preview";
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

  if (activeDisplayMode === "tle-preview") {
    localPoints = recomputeOrbit(currentSettings);
    showLocalDisplay();
  } else if (activeScenarioState) {
    showScenarioSampleDisplay(activeScenarioState.scenario);
  }

  clearOrekitComparison(orekitRefreshMessage(), { preserveDisplay: true });
  frame = 0;
}

function updatePropagationFrame(nextFrame: PropagationFrameRequest) {
  currentFrame = nextFrame;
  frameControls.setFrame(currentFrame);
  clearOrekitComparison(orekitRefreshMessage(), { preserveDisplay: true });
}

function recomputeOrbit(settings: OrbitSettings) {
  const normalizedSettings = normalizeOrbitSettings(settings);
  controls?.setSettings(normalizedSettings);

  if (!activeTle) {
    return [];
  }

  localSamples = sampleTleOrbit(
    activeTle,
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
  if (!activeTle) {
    orekitControls.setStatus({
      status: "error",
      message: "Active scenario has no TLE propagation input.",
    });
    orekitControls.setDivergenceSummary(null);
    return;
  }

  const requestId = orekitRequestId + 1;
  orekitRequestId = requestId;

  orekitControls.setStatus({ status: "loading" });

  const result = await fetchTlePropagation(
    buildTlePropagationRequest(activeTle, currentSettings, currentFrame),
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

function clearOrekitComparison(
  message: string,
  options: { preserveDisplay?: boolean } = {},
) {
  orekitRequestId += 1;
  orekitSamples = [];
  sampleAlignment = null;
  divergenceSeries = null;
  if (!options.preserveDisplay) {
    showLocalDisplay();
  }
  orbitScene.clearTrace("orekit");
  orekitControls.setStatus({
    status: "idle",
    message,
  });
  orekitControls.setLegend("Local / Orekit");
  orekitControls.setDivergenceSummary(null);
}

async function loadScenarioExamples() {
  scenarioControls.setStatus({
    status: "loading",
    message: "Loading scenarios",
  });

  const result = await fetchScenarioExamples();

  if (!result.ok) {
    scenarioControls.setExamples([]);
    scenarioControls.setStatus({
      status: "error",
      message: result.message,
    });
    return;
  }

  scenarioControls.setExamples(result.response);
  await loadScenarioExample(DEFAULT_SCENARIO_ID);
}

async function loadScenarioExample(exampleId: string) {
  scenarioControls.setStatus({
    status: "loading",
    message: "Loading scenario",
  });

  const result = await fetchScenarioExample(exampleId);

  if (!result.ok) {
    scenarioControls.setStatus({
      status: "error",
      message: result.message,
    });
    return;
  }

  applyScenario(result.response);
}

function applyScenario(scenario: NormalizedScenario) {
  const nextState = stateFromNormalizedScenario(scenario);
  activeScenarioState = nextState;
  activeDisplayMode = nextState.displayMode;
  scenarioControls.setStatus({
    status: "ready",
    scenario,
  });

  if (nextState.activeTle) {
    activeTle = nextState.activeTle;
    localPoints = recomputeOrbit(currentSettings);
    showLocalDisplay();
  } else {
    activeTle = undefined;
    localSamples = [];
    showScenarioSampleDisplay(scenario);
  }

  clearOrekitComparison(orekitRefreshMessage(), { preserveDisplay: true });
  frame = 0;
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

function showScenarioSampleDisplay(scenario: NormalizedScenario) {
  const comparableSamples = scenarioSamplesToComparable(scenario);
  const scenarioPoints = comparableSamplesToScenePoints(comparableSamples);
  localPoints = scenarioPoints;
  displayPoints = scenarioPoints;
  displayEpochs = comparableSamples.map((sample) => sample.epoch);
  orbitScene.setTracePoints("satellite-js", scenarioPoints);

  if (displayPoints[0]) {
    orbitScene.setSatellitePosition(displayPoints[0]);
  }
}

function scenarioSamplesToComparable(
  scenario: NormalizedScenario,
): ComparableOrbitSample[] {
  const samples =
    scenario.samples.length > 0
      ? scenario.samples
      : scenario.initialState
        ? [scenario.initialState]
        : [];

  return samples.map((sample) => scenarioSampleToComparable(sample, scenario));
}

function scenarioSampleToComparable(
  sample: ScenarioStateSample,
  scenario: NormalizedScenario,
): ComparableOrbitSample {
  return {
    epoch: sample.epoch,
    epochIso: normalizeEpochIso(sample.epoch),
    source: "scenario",
    frame: scenario.frame.name,
    positionUnit: scenario.units.position,
    velocityUnit: scenario.units.velocity,
    positionKm: sample.positionKm,
    velocityKmPerSecond: sample.velocityKmPerSecond,
  };
}

function orekitRefreshMessage() {
  if (!activeTle) {
    return "No TLE propagation input";
  }

  return `Refresh ${labelForPropagationFrame(currentFrame)}`;
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
void loadScenarioExamples();
animate();
