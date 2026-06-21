import {
  buildTlePropagationRequest,
  fetchTlePropagation,
  type OrekitOrbitSample,
} from "./api/propagation";
import "./orbits/fixtureChecks";
import { ISS_TLE } from "./orbits/fixtures";
import {
  findAscendingNodePositionKm,
  type NodeSearchSample,
} from "./orbits/nodes";
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
  createLocalUncertaintyExplorerScene,
  type LocalUncertaintyDisplay,
} from "./scene/localUncertaintyExplorer";
import { covariancePrincipalAxes } from "./scene/uncertainty";
import {
  comparableSamplesToScenePoints,
  orbitSamplesToScenePoints,
  positionKmToScenePoint,
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
import {
  createLocalUncertaintyControls,
  type LocalUncertaintySettings,
} from "./ui/localUncertaintyControls";
import { createOrekitOverlayControls } from "./ui/orekitOverlayControls";
import { ORB_SAT_1_SYNTHETIC_COVARIANCE } from "./uncertainty/orbSat1SyntheticCovariance";
import "./uncertainty/fixtureChecks";
import "./styles.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");

if (!canvas) {
  throw new Error("Scene canvas was not found.");
}

type AppView = "global" | "local";

const LOCAL_UNCERTAINTY_VISUAL_GAIN = 0.08;
const LOCAL_PLAYBACK_HOURS_PER_SECOND = 0.05;
const orbitCanvas = canvas;

const appShell = document.createElement("main");
appShell.className = "app-shell";

const controlPane = document.createElement("section");
controlPane.className = "control-pane";
controlPane.dataset.testid = "control-pane";
controlPane.setAttribute("aria-label", "Orb Lab controls");

const renderPane = document.createElement("section");
renderPane.className = "render-pane";
renderPane.dataset.testid = "render-pane";
renderPane.setAttribute("aria-label", "Orb Lab visualization");

document.body.append(appShell);
appShell.append(controlPane, renderPane);
renderPane.append(orbitCanvas);

const localCanvas = document.createElement("canvas");
localCanvas.id = "local-uncertainty-scene";
localCanvas.dataset.testid = "local-uncertainty-scene";
renderPane.append(localCanvas);

const orbitScene = createOrbitScene(orbitCanvas);
const localUncertaintyScene = createLocalUncertaintyExplorerScene(localCanvas);
const controls = createOrbitControls(DEFAULT_ORBIT_SETTINGS, updateOrbit);
const frameControls = createFrameControls(
  DEFAULT_PROPAGATION_FRAME,
  updatePropagationFrame,
);
const orekitControls = createOrekitOverlayControls(refreshOrekitSamples);
const localUncertaintyControls = createLocalUncertaintyControls(
  ORB_SAT_1_SYNTHETIC_COVARIANCE,
  updateLocalUncertainty,
);
const viewSwitch = createViewSwitch(setAppView);
const controlStack = document.createElement("div");
controlStack.className = "control-stack";
controlStack.append(
  controls.element,
  frameControls.element,
  orekitControls.element,
);
controlPane.append(
  viewSwitch.element,
  controlStack,
  localUncertaintyControls.element,
);

let appView: AppView = "global";
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
let previousAnimationTime = performance.now();

updateLocalUncertainty(localUncertaintyControls.settings);
setAppView("global");

function updateOrbit(settings: OrbitSettings) {
  currentSettings = normalizeOrbitSettings(settings);
  localPoints = recomputeOrbit(currentSettings);
  frame = 0;
  showLocalDisplay();
  clearOrekitComparison("Refresh Orekit");
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
  centerDisplayOnAscendingNode(localSamples);
  orbitScene.setOrbitPoints(nextPoints);

  if (nextPoints[0]) {
    orbitScene.setSatellitePosition(nextPoints[0]);
  }

  return nextPoints;
}

function updateLocalUncertainty(settings: LocalUncertaintySettings) {
  const { sample, sampleStatus } = covarianceSampleAtOffset(
    settings.offsetHours,
  );

  const display: LocalUncertaintyDisplay = {
    sample,
    sigma: settings.sigma,
    visualGain: LOCAL_UNCERTAINTY_VISUAL_GAIN,
  };
  const principalAxes = covariancePrincipalAxes(sample, settings.sigma);

  localUncertaintyScene.setDisplay(display);
  localUncertaintyScene.setView(settings.view);

  if (principalAxes) {
    localUncertaintyControls.setReadout({
      sample,
      offsetHours: settings.offsetHours,
      axisLengthsKm: principalAxes.sigmaAxesKm,
      frame: ORB_SAT_1_SYNTHETIC_COVARIANCE.frame.name,
      provenance: ORB_SAT_1_SYNTHETIC_COVARIANCE.source.provenance,
      units: ORB_SAT_1_SYNTHETIC_COVARIANCE.units.position_covariance,
      sampleStatus,
    });
  }
}

function setAppView(nextView: AppView) {
  appView = nextView;
  orbitCanvas.hidden = appView !== "global";
  localCanvas.hidden = appView !== "local";
  controlStack.hidden = appView !== "global";
  localUncertaintyControls.element.hidden = appView !== "local";
  viewSwitch.setView(appView);
  resize();
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
  centerDisplayOnAscendingNode(comparableOrekitSamples);
  orbitScene.clearTrace("satellite-js");
  orbitScene.setTracePoints("orekit", orekitPoints);
  displayPoints = orekitPoints;
  displayEpochs = orekitSamples.map((sample) => sample.epoch);
  frame = 0;

  if (displayPoints[0]) {
    orbitScene.setSatellitePosition(displayPoints[0]);
  }
}

function centerDisplayOnAscendingNode(samples: readonly NodeSearchSample[]) {
  const ascendingNodePositionKm = findAscendingNodePositionKm(samples);
  orbitScene.setDisplayOrigin(
    ascendingNodePositionKm
      ? positionKmToScenePoint(ascendingNodePositionKm)
      : positionKmToScenePoint({ x: 0, y: 0, z: 0 }),
  );
}

function resize() {
  const bounds = renderPane.getBoundingClientRect();
  const width = Math.max(Math.floor(bounds.width), 1);
  const height = Math.max(Math.floor(bounds.height), 1);
  orbitScene.resize(width, height);
  localUncertaintyScene.resize(width, height);
}

function animate(animationTime = performance.now()) {
  requestAnimationFrame(animate);
  const deltaSeconds = Math.max(
    (animationTime - previousAnimationTime) / 1000,
    0,
  );
  previousAnimationTime = animationTime;

  frame = (frame + 1) % Math.max(displayPoints.length, 1);
  const point = displayPoints[frame];
  if (point) {
    orbitScene.setSatellitePosition(point);
  }
  updateDivergenceReadout(displayEpochs[frame]);

  orbitScene.rotateEarth();
  if (appView === "global") {
    orbitScene.render();
  } else {
    advanceLocalUncertaintyPlayback(deltaSeconds);
    localUncertaintyScene.render();
  }
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
window.addEventListener("beforeunload", () => {
  orbitScene.dispose();
  localUncertaintyScene.dispose();
});
resize();
animate();

function covarianceSampleAtOffset(offsetHours: number): {
  sample: (typeof ORB_SAT_1_SYNTHETIC_COVARIANCE.samples)[number];
  sampleStatus: "exact" | "interpolated";
} {
  const samples = ORB_SAT_1_SYNTHETIC_COVARIANCE.samples;
  const targetTime =
    Date.parse(samples[0].epoch) + offsetHours * 60 * 60 * 1000;
  const firstSample = samples[0];
  const lastSample = samples[samples.length - 1];

  if (targetTime <= Date.parse(firstSample.epoch)) {
    return { sample: firstSample, sampleStatus: "exact" };
  }

  if (targetTime >= Date.parse(lastSample.epoch)) {
    return { sample: lastSample, sampleStatus: "exact" };
  }

  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const next = samples[index];
    const previousTime = Date.parse(previous.epoch);
    const nextTime = Date.parse(next.epoch);

    if (Math.abs(targetTime - previousTime) < 1) {
      return { sample: previous, sampleStatus: "exact" };
    }

    if (Math.abs(targetTime - nextTime) < 1) {
      return { sample: next, sampleStatus: "exact" };
    }

    if (targetTime > previousTime && targetTime < nextTime) {
      const fraction = (targetTime - previousTime) / (nextTime - previousTime);
      return {
        sample: interpolateCovarianceSample(previous, next, fraction, targetTime),
        sampleStatus: "interpolated",
      };
    }
  }

  return { sample: lastSample, sampleStatus: "exact" };
}

function interpolateCovarianceSample(
  previous: (typeof ORB_SAT_1_SYNTHETIC_COVARIANCE.samples)[number],
  next: (typeof ORB_SAT_1_SYNTHETIC_COVARIANCE.samples)[number],
  fraction: number,
  targetTime: number,
): (typeof ORB_SAT_1_SYNTHETIC_COVARIANCE.samples)[number] {
  return {
    ...previous,
    epoch: new Date(targetTime).toISOString(),
    position_covariance: previous.position_covariance.map((row, rowIndex) =>
      row.map(
        (value, columnIndex) =>
          value +
          (next.position_covariance[rowIndex][columnIndex] - value) * fraction,
      ),
    ) as [number[], number[], number[]],
    confidence_label: "1-sigma interpolated synthetic covariance",
  };
}

function maxCovarianceOffsetHours(): number {
  const firstEpoch = Date.parse(ORB_SAT_1_SYNTHETIC_COVARIANCE.samples[0].epoch);
  const lastEpoch = Date.parse(
    ORB_SAT_1_SYNTHETIC_COVARIANCE.samples.at(-1)?.epoch ?? "",
  );
  if (!Number.isFinite(firstEpoch) || !Number.isFinite(lastEpoch)) {
    return 0;
  }

  return (lastEpoch - firstEpoch) / (60 * 60 * 1000);
}

function advanceLocalUncertaintyPlayback(deltaSeconds: number) {
  const settings = localUncertaintyControls.settings;
  if (!settings.playing) {
    return;
  }

  const nextOffset =
    settings.offsetHours +
    deltaSeconds *
      LOCAL_PLAYBACK_HOURS_PER_SECOND *
      settings.playbackSpeed;
  const maxOffset = maxCovarianceOffsetHours();

  localUncertaintyControls.setSettings({
    ...settings,
    offsetHours: nextOffset >= maxOffset ? maxOffset : nextOffset,
    playing: nextOffset < maxOffset,
  });
}

function createViewSwitch(onChange: (view: AppView) => void) {
  const element = document.createElement("div");
  element.className = "view-switch";
  element.setAttribute("aria-label", "Scene view");

  const buttons = new Map<AppView, HTMLButtonElement>();
  for (const [view, label] of [
    ["global", "Orbit"],
    ["local", "QSW"],
  ] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "view-switch__button";
    button.textContent = label;
    button.dataset.testid = `${view}-view`;
    button.addEventListener("click", () => onChange(view));
    buttons.set(view, button);
    element.append(button);
  }

  return {
    element,
    setView(view: AppView) {
      for (const [entry, button] of buttons) {
        button.setAttribute("aria-pressed", entry === view ? "true" : "false");
      }
    },
  };
}
