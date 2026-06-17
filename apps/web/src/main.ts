import { ISS_TLE } from "./orbits/fixtures";
import { sampleTleOrbit } from "./orbits/tle";
import { createOrbitScene } from "./scene/createScene";
import { orbitSamplesToScenePoints } from "./scene/orbitTrace";
import "./styles.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");

if (!canvas) {
  throw new Error("Scene canvas was not found.");
}

const orbitScene = createOrbitScene(canvas);

const samples = sampleTleOrbit(ISS_TLE, {
  epoch: new Date(),
  durationMinutes: 92.5,
  sampleCount: 180,
});
const points = orbitSamplesToScenePoints(samples);
orbitScene.setOrbitPoints(points);

let frame = 0;

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
