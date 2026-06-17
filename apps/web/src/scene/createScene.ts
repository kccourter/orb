import * as THREE from "three";

import { updateOrbitTrace, type OrbitTrace } from "./orbitTrace";

export const SCENE_CONSTANTS = {
  backgroundColor: 0x071014,
  earthColor: 0x2f86d6,
  earthRadiusUnits: 6.371,
  earthRotationStepRadians: 0.0008,
  orbitTraceColor: 0xffd166,
  satelliteColor: 0xfafafa,
  satelliteEmissiveColor: 0x284b63,
  satelliteRadiusUnits: 0.12,
} as const;

export type OrbitScene = {
  setOrbitPoints: (points: readonly THREE.Vector3[]) => void;
  setSatellitePosition: (point: THREE.Vector3) => void;
  rotateEarth: () => void;
  resize: (width: number, height: number) => void;
  render: () => void;
  dispose: () => void;
};

export function createOrbitScene(canvas: HTMLCanvasElement): OrbitScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SCENE_CONSTANTS.backgroundColor);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  camera.position.set(0, -18, 10);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(5, -8, 6);
  scene.add(sun);

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(SCENE_CONSTANTS.earthRadiusUnits, 96, 48),
    new THREE.MeshStandardMaterial({
      color: SCENE_CONSTANTS.earthColor,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );
  scene.add(earth);

  const orbitTrace: OrbitTrace = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: SCENE_CONSTANTS.orbitTraceColor }),
  );
  scene.add(orbitTrace);

  const satelliteMarker = new THREE.Mesh(
    new THREE.SphereGeometry(SCENE_CONSTANTS.satelliteRadiusUnits, 24, 12),
    new THREE.MeshStandardMaterial({
      color: SCENE_CONSTANTS.satelliteColor,
      emissive: SCENE_CONSTANTS.satelliteEmissiveColor,
    }),
  );
  scene.add(satelliteMarker);

  return {
    setOrbitPoints(points) {
      updateOrbitTrace(orbitTrace, points);
    },
    setSatellitePosition(point) {
      satelliteMarker.position.copy(point);
    },
    rotateEarth() {
      earth.rotation.z += SCENE_CONSTANTS.earthRotationStepRadians;
    },
    resize(width, height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    render() {
      renderer.render(scene, camera);
    },
    dispose() {
      earth.geometry.dispose();
      orbitTrace.geometry.dispose();
      satelliteMarker.geometry.dispose();
      earth.material.dispose();
      orbitTrace.material.dispose();
      satelliteMarker.material.dispose();
      renderer.dispose();
    },
  };
}
