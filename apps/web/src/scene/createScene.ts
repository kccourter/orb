import * as THREE from "three";

import { updateOrbitTrace, type OrbitTrace } from "./orbitTrace";
import { disposeUncertaintyEllipsoidGroup } from "./uncertainty";

export const SCENE_CONSTANTS = {
  backgroundColor: 0x071014,
  earthColor: 0x2f86d6,
  earthRadiusUnits: 6.371,
  earthRotationStepRadians: 0.0008,
  orekitTraceColor: 0x4ecdc4,
  orbitTraceColor: 0xffd166,
  satelliteColor: 0xfafafa,
  satelliteEmissiveColor: 0x284b63,
  satelliteRadiusUnits: 0.12,
} as const;

export type OrbitTraceId = "satellite-js" | "orekit";

export type OrbitScene = {
  setOrbitPoints: (points: readonly THREE.Vector3[]) => void;
  setTracePoints: (
    traceId: OrbitTraceId,
    points: readonly THREE.Vector3[],
  ) => void;
  clearTrace: (traceId: OrbitTraceId) => void;
  setSatellitePosition: (point: THREE.Vector3) => void;
  setUncertaintyEllipsoids: (group: THREE.Group) => void;
  clearUncertaintyEllipsoids: () => void;
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

  const traces: Record<OrbitTraceId, OrbitTrace> = {
    "satellite-js": createTrace(SCENE_CONSTANTS.orbitTraceColor),
    orekit: createTrace(SCENE_CONSTANTS.orekitTraceColor),
  };
  scene.add(traces["satellite-js"], traces.orekit);

  let uncertaintyEllipsoids = new THREE.Group();
  scene.add(uncertaintyEllipsoids);

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
      updateOrbitTrace(traces["satellite-js"], points);
    },
    setTracePoints(traceId, points) {
      updateOrbitTrace(traces[traceId], points);
    },
    clearTrace(traceId) {
      updateOrbitTrace(traces[traceId], []);
    },
    setSatellitePosition(point) {
      satelliteMarker.position.copy(point);
    },
    setUncertaintyEllipsoids(group) {
      scene.remove(uncertaintyEllipsoids);
      disposeUncertaintyEllipsoidGroup(uncertaintyEllipsoids);
      uncertaintyEllipsoids = group;
      scene.add(uncertaintyEllipsoids);
    },
    clearUncertaintyEllipsoids() {
      scene.remove(uncertaintyEllipsoids);
      disposeUncertaintyEllipsoidGroup(uncertaintyEllipsoids);
      uncertaintyEllipsoids = new THREE.Group();
      scene.add(uncertaintyEllipsoids);
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
      satelliteMarker.geometry.dispose();
      for (const trace of Object.values(traces)) {
        trace.geometry.dispose();
        trace.material.dispose();
      }
      disposeUncertaintyEllipsoidGroup(uncertaintyEllipsoids);
      earth.material.dispose();
      satelliteMarker.material.dispose();
      renderer.dispose();
    },
  };
}

function createTrace(color: number): OrbitTrace {
  return new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color }),
  );
}
