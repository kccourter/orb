import * as THREE from "three";

import { applyCameraPreset } from "./cameraPresets";
import { updateOrbitTrace, type OrbitTrace } from "./orbitTrace";

export const SCENE_CONSTANTS = {
  ascendingNodeMarkerColor: 0xff6b9a,
  backgroundColor: 0x071014,
  earthColor: 0x2f86d6,
  earthReferenceLineColor: 0x9fc7e8,
  earthRadiusUnits: 6.371,
  earthRotationStepRadians: 0.0008,
  orekitTraceColor: 0x4ecdc4,
  orbitTraceColor: 0xffd166,
  satelliteColor: 0xfafafa,
  satelliteEmissiveColor: 0x284b63,
  satelliteRadiusUnits: 0.12,
} as const;

const CAMERA_LOOK_TARGET = new THREE.Vector3(0, 0, 0);

export type OrbitTraceId = "satellite-js" | "orekit";

export type OrbitScene = {
  setDisplayOrigin: (point: THREE.Vector3) => void;
  setOrbitPoints: (points: readonly THREE.Vector3[]) => void;
  setTracePoints: (
    traceId: OrbitTraceId,
    points: readonly THREE.Vector3[],
  ) => void;
  clearTrace: (traceId: OrbitTraceId) => void;
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
  applyCameraPreset(camera, "fixed_inertial_observer");

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(5, -8, 6);
  scene.add(sun);

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const ascendingNodeMarker = createAscendingNodeMarker();
  scene.add(ascendingNodeMarker);

  const earthGroup = new THREE.Group();
  worldGroup.add(earthGroup);

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(SCENE_CONSTANTS.earthRadiusUnits, 96, 48),
    new THREE.MeshStandardMaterial({
      color: SCENE_CONSTANTS.earthColor,
      roughness: 0.9,
      metalness: 0.0,
    }),
  );
  earthGroup.add(earth, createEarthReferenceLines());

  const traces: Record<OrbitTraceId, OrbitTrace> = {
    "satellite-js": createTrace(SCENE_CONSTANTS.orbitTraceColor),
    orekit: createTrace(SCENE_CONSTANTS.orekitTraceColor),
  };
  worldGroup.add(traces["satellite-js"], traces.orekit);

  const satelliteMarker = new THREE.Mesh(
    new THREE.SphereGeometry(SCENE_CONSTANTS.satelliteRadiusUnits, 24, 12),
    new THREE.MeshStandardMaterial({
      color: SCENE_CONSTANTS.satelliteColor,
      emissive: SCENE_CONSTANTS.satelliteEmissiveColor,
    }),
  );
  worldGroup.add(satelliteMarker);

  return {
    setDisplayOrigin(point) {
      alignWorldToDisplayOrigin(worldGroup, point, camera.position);
    },
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
    rotateEarth() {
      earthGroup.rotation.z += SCENE_CONSTANTS.earthRotationStepRadians;
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
      disposeObject3D(earthGroup);
      disposeObject3D(ascendingNodeMarker);
      for (const trace of Object.values(traces)) {
        trace.geometry.dispose();
        trace.material.dispose();
      }
      satelliteMarker.geometry.dispose();
      satelliteMarker.material.dispose();
      renderer.dispose();
    },
  };
}

function alignWorldToDisplayOrigin(
  worldGroup: THREE.Group,
  origin: THREE.Vector3,
  cameraPosition: THREE.Vector3,
): void {
  if (origin.lengthSq() <= Number.EPSILON) {
    worldGroup.quaternion.identity();
    worldGroup.position.set(0, 0, 0);
    return;
  }

  const anchorDirection = origin.clone().normalize();
  const cameraDirection = cameraPosition
    .clone()
    .sub(CAMERA_LOOK_TARGET)
    .normalize();

  worldGroup.quaternion.setFromUnitVectors(anchorDirection, cameraDirection);
  worldGroup.position.copy(origin).applyQuaternion(worldGroup.quaternion);
  worldGroup.position.multiplyScalar(-1);
}

function disposeObject3D(object: THREE.Object3D): void {
  for (const child of object.children) {
    disposeObject3D(child);

    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose();
      disposeMaterial(child.material);
    }
  }
}

function disposeMaterial(
  material: THREE.Material | THREE.Material[],
): void {
  if (Array.isArray(material)) {
    for (const entry of material) {
      entry.dispose();
    }
    return;
  }

  material.dispose();
}

function createTrace(color: number): OrbitTrace {
  return new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color }),
  );
}

function createEarthReferenceLines(): THREE.Group {
  const group = new THREE.Group();
  const equatorMaterial = new THREE.LineBasicMaterial({
    color: SCENE_CONSTANTS.earthReferenceLineColor,
    transparent: true,
    opacity: 0.42,
  });
  const minorMeridianMaterial = equatorMaterial.clone();
  minorMeridianMaterial.opacity = 0.28;
  const majorMeridianMaterial = equatorMaterial.clone();
  majorMeridianMaterial.opacity = 0.52;

  group.add(createCircleLine("equator", equatorMaterial));
  for (let index = 0; index < 12; index += 1) {
    const material =
      index % 3 === 0 ? majorMeridianMaterial : minorMeridianMaterial;
    const meridian = createCircleLine("meridian", material.clone());
    meridian.rotation.z = (index / 12) * Math.PI;
    group.add(meridian);
  }

  return group;
}

function createAscendingNodeMarker(): THREE.Group {
  const group = new THREE.Group();
  const radius = 0.22;
  const crosshairHalfLength = 0.38;
  const points: THREE.Vector3[] = [];
  const segments = 48;

  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    points.push(
      new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0),
    );
  }

  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      createAnchorMarkerMaterial(),
    ),
  );
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-crosshairHalfLength, 0, 0),
        new THREE.Vector3(crosshairHalfLength, 0, 0),
      ]),
      createAnchorMarkerMaterial(),
    ),
  );
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -crosshairHalfLength, 0),
        new THREE.Vector3(0, crosshairHalfLength, 0),
      ]),
      createAnchorMarkerMaterial(),
    ),
  );
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -crosshairHalfLength),
        new THREE.Vector3(0, 0, crosshairHalfLength),
      ]),
      createAnchorMarkerMaterial(),
    ),
  );

  group.renderOrder = 10;

  return group;
}

function createAnchorMarkerMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: SCENE_CONSTANTS.ascendingNodeMarkerColor,
    depthTest: false,
    transparent: true,
    opacity: 0.95,
  });
}

function createCircleLine(
  kind: "equator" | "meridian",
  material: THREE.LineBasicMaterial,
): THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> {
  const points: THREE.Vector3[] = [];
  const segments = 128;

  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const referenceRadius = SCENE_CONSTANTS.earthRadiusUnits * 1.006;
    const x = Math.cos(angle) * referenceRadius;
    const y = Math.sin(angle) * referenceRadius;
    points.push(
      kind === "equator"
        ? new THREE.Vector3(x, y, 0)
        : new THREE.Vector3(x, 0, y),
    );
  }

  return new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    material,
  );
}
