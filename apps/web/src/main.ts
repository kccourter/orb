import * as THREE from "three";

import { ISS_TLE } from "./orbits/fixtures";
import { sampleTleOrbit } from "./orbits/tle";
import "./styles.css";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");

if (!canvas) {
  throw new Error("Scene canvas was not found.");
}

const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071014);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
camera.position.set(0, -18, 10);
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(5, -8, 6);
scene.add(sun);

const earth = new THREE.Mesh(
  new THREE.SphereGeometry(6.371, 96, 48),
  new THREE.MeshStandardMaterial({
    color: 0x2f86d6,
    roughness: 0.9,
    metalness: 0.0,
  }),
);
scene.add(earth);

const orbit = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0xffd166 }),
);
scene.add(orbit);

const satelliteDot = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 24, 12),
  new THREE.MeshStandardMaterial({ color: 0xfafafa, emissive: 0x284b63 }),
);
scene.add(satelliteDot);

const samples = sampleTleOrbit(ISS_TLE, {
  epoch: new Date(),
  durationMinutes: 92.5,
  sampleCount: 180,
});
const points = samples.map(
  (sample) =>
    new THREE.Vector3(
      sample.positionKm.x / 1000,
      sample.positionKm.y / 1000,
      sample.positionKm.z / 1000,
    ),
);
orbit.geometry.setFromPoints(points);

let frame = 0;

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  requestAnimationFrame(animate);

  frame = (frame + 1) % Math.max(points.length, 1);
  const point = points[frame];
  if (point) {
    satelliteDot.position.copy(point);
  }

  earth.rotation.z += 0.0008;
  renderer.render(scene, camera);
}

window.addEventListener("resize", resize);
resize();
animate();
