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
import {
  sampleTleOrbit,
  sampleTleOrbitAtEpochs,
  type TleOrbitSample,
} from "./orbits/tle";
import { createOrbitScene } from "./scene/createScene";
import {
  comparableSamplesToScenePoints,
  orbitSamplesToScenePoints,
} from "./scene/orbitTrace";
import {
  createUncertaintyEllipsoidGroup,
  DEFAULT_UNCERTAINTY_OPTIONS,
  type UncertaintyEllipsoidOptions,
} from "./scene/uncertainty";
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
import {
  createUncertaintyControls,
  type UncertaintyControlSettings,
} from "./ui/uncertaintyControls";
import "./uncertainty/fixtureChecks";
import { ORB_SAT_1_SYNTHETIC_COVARIANCE } from "./uncertainty/orbSat1SyntheticCovariance";
import type { CovarianceSeries } from "./uncertainty/types";
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
const uncertaintyControls = createUncertaintyControls(
  {
    visible: DEFAULT_UNCERTAINTY_OPTIONS.visible,
    sigma: DEFAULT_UNCERTAINTY_OPTIONS.sigma,
    density: DEFAULT_UNCERTAINTY_OPTIONS.density,
  },
  updateUncertaintySettings,
);
const controlStack = document.createElement("div");
controlStack.className = "control-stack";
controlStack.append(
  controls.element,
  frameControls.element,
  orekitControls.element,
  uncertaintyControls.element,
);
document.body.append(controlStack);

let currentSettings = normalizeOrbitSettings(DEFAULT_ORBIT_SETTINGS);
let currentFrame: PropagationFrameRequest = DEFAULT_PROPAGATION_FRAME;
let localSamples: TleOrbitSample[] = [];
let orekitSamples: OrekitOrbitSample[] = [];
let sampleAlignment: SampleAlignment | null = null;
let divergenceSeries: DivergenceSeries | null = null;
let uncertaintySettings: UncertaintyControlSettings = {
  visible: DEFAULT_UNCERTAINTY_OPTIONS.visible,
  sigma: DEFAULT_UNCERTAINTY_OPTIONS.sigma,
  density: DEFAULT_UNCERTAINTY_OPTIONS.density,
};
let orekitRequestId = 0;
let localPoints = recomputeOrbit(currentSettings);
let displayPoints = localPoints;
let displayEpochs = localSamples.map((sample) => sample.epoch);
let frame = 0;
let lastCurrentUncertaintyEpoch = "";

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
  orbitScene.setOrbitPoints(nextPoints);

  if (nextPoints[0]) {
    orbitScene.setSatellitePosition(nextPoints[0]);
  }

  return nextPoints;
}

function updateUncertaintySettings(settings: UncertaintyControlSettings) {
  uncertaintySettings = settings;
  uncertaintyControls.setSettings(uncertaintySettings);
  refreshUncertaintyLayer();
}

function refreshUncertaintyLayer() {
  lastCurrentUncertaintyEpoch = "";
  const alignedSeries = alignCovarianceSeriesEpochs(
    ORB_SAT_1_SYNTHETIC_COVARIANCE,
    new Date(currentSettings.epochIso),
  );
  const uncertaintyEpochs = alignedSeries.samples.map(
    (sample) => new Date(sample.epoch),
  );
  const nominalSamples = sampleTleOrbitAtEpochs(ISS_TLE, uncertaintyEpochs);
  const currentEpoch = displayEpochs[frame];
  const options: UncertaintyEllipsoidOptions = {
    ...DEFAULT_UNCERTAINTY_OPTIONS,
    ...uncertaintySettings,
    currentEpoch: currentEpoch ?? uncertaintyEpochs[0],
  };
  const group = createUncertaintyEllipsoidGroup(
    alignedSeries,
    nominalSamples,
    options,
  );
  orbitScene.setUncertaintyEllipsoids(group);
  uncertaintyControls.setStatus({
    frame: alignedSeries.frame.name,
    provenance: alignedSeries.source.provenance,
    visibleCount: group.children.length,
  });
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
  refreshUncertaintyLayer();
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
  refreshUncertaintyLayer();
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
  if (uncertaintySettings.density === "current") {
    const currentEpochKey = displayEpochs[frame]?.toISOString() ?? "";
    if (currentEpochKey !== lastCurrentUncertaintyEpoch) {
      lastCurrentUncertaintyEpoch = currentEpochKey;
      refreshUncertaintyLayer();
    }
  }

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

function alignCovarianceSeriesEpochs(
  series: CovarianceSeries,
  startEpoch: Date,
): CovarianceSeries {
  const fixtureStartTime = Date.parse(series.samples[0]?.epoch ?? "");

  if (!Number.isFinite(fixtureStartTime)) {
    return series;
  }

  return {
    ...series,
    samples: series.samples.map((sample) => {
      const offsetMs = Date.parse(sample.epoch) - fixtureStartTime;
      return {
        ...sample,
        epoch: toIsoNoMilliseconds(new Date(startEpoch.getTime() + offsetMs)),
      };
    }),
  };
}

function toIsoNoMilliseconds(date: Date): string {
  return date.toISOString().replace(".000", "");
}

window.addEventListener("resize", resize);
window.addEventListener("beforeunload", () => orbitScene.dispose());
refreshUncertaintyLayer();
resize();
animate();
