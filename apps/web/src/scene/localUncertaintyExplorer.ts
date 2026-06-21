import * as THREE from "three";

import { covariancePrincipalAxes } from "./uncertainty";
import type { CovarianceSample } from "../uncertainty/types";

export type LocalUncertaintyView = "iso" | "q" | "s" | "w";

export type LocalUncertaintyDisplay = {
  sample: CovarianceSample;
  sigma: 1 | 2 | 3;
  visualGain: number;
};

export type LocalUncertaintyExplorerScene = {
  setDisplay: (display: LocalUncertaintyDisplay) => void;
  setView: (view: LocalUncertaintyView) => void;
  resize: (width: number, height: number) => void;
  render: () => void;
  dispose: () => void;
};

const BACKGROUND_COLOR = 0x071014;
const ELLIPSOID_COLOR = 0xff6b9a;
const SPACECRAFT_COLOR = 0xf3f8fa;
const Q_AXIS_COLOR = 0x65d6ff;
const S_AXIS_COLOR = 0xffd166;
const W_AXIS_COLOR = 0x4ecdc4;
const GRID_COLOR = 0x60727b;
const LABEL_DISTANCE = 3.45;
const AXIS_LENGTH = 3.1;

export function createLocalUncertaintyExplorerScene(
  canvas: HTMLCanvasElement,
): LocalUncertaintyExplorerScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND_COLOR);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  applyView(camera, "iso");

  scene.add(new THREE.AmbientLight(0xffffff, 0.78));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
  keyLight.position.set(5, -6, 8);
  scene.add(keyLight);

  const root = new THREE.Group();
  scene.add(root);

  root.add(createGrid());
  root.add(createAxis("Q", new THREE.Vector3(1, 0, 0), Q_AXIS_COLOR));
  root.add(createAxis("S", new THREE.Vector3(0, 1, 0), S_AXIS_COLOR));
  root.add(createAxis("W", new THREE.Vector3(0, 0, 1), W_AXIS_COLOR));
  root.add(createSpacecraftMarker());

  let ellipsoid: THREE.Mesh | null = null;

  return {
    setDisplay(display) {
      if (ellipsoid) {
        disposeMesh(ellipsoid);
        root.remove(ellipsoid);
        ellipsoid = null;
      }

      ellipsoid = createLocalEllipsoid(display);
      if (ellipsoid) {
        root.add(ellipsoid);
      }
    },
    setView(view) {
      applyView(camera, view);
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
      if (ellipsoid) {
        disposeMesh(ellipsoid);
      }
      disposeObject3D(root);
      renderer.dispose();
    },
  };
}

function createLocalEllipsoid(
  display: LocalUncertaintyDisplay,
): THREE.Mesh | null {
  const principalAxes = covariancePrincipalAxes(display.sample, display.sigma);
  if (!principalAxes) {
    return null;
  }

  const axes = principalAxes.sigmaAxesKm.map((axis) =>
    Math.max(axis * display.visualGain, 0.12),
  ) as [number, number, number];
  const material = new THREE.MeshStandardMaterial({
    color: ELLIPSOID_COLOR,
    transparent: true,
    opacity: 0.42,
    roughness: 0.7,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), material);
  const basis = multiplyQswByEigenvectors(principalAxes.vectors);
  const transform = new THREE.Matrix4().makeBasis(
    basis[0].multiplyScalar(axes[0]),
    basis[1].multiplyScalar(axes[1]),
    basis[2].multiplyScalar(axes[2]),
  );
  mesh.matrix.copy(transform);
  mesh.matrixAutoUpdate = false;

  return mesh;
}

function multiplyQswByEigenvectors(
  eigenvectors: [number[], number[], number[]],
): [THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  const basis: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ];

  return [0, 1, 2].map((columnIndex) =>
    new THREE.Vector3()
      .addScaledVector(basis[0], eigenvectors[0][columnIndex])
      .addScaledVector(basis[1], eigenvectors[1][columnIndex])
      .addScaledVector(basis[2], eigenvectors[2][columnIndex])
      .normalize(),
  ) as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
}

function createSpacecraftMarker(): THREE.Group {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 24, 12),
    new THREE.MeshStandardMaterial({
      color: SPACECRAFT_COLOR,
      emissive: 0x23343b,
      roughness: 0.45,
    }),
  );
  const ring = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(circlePoints(0.18, "xy")),
    new THREE.LineBasicMaterial({
      color: SPACECRAFT_COLOR,
      transparent: true,
      opacity: 0.82,
    }),
  );

  group.add(core, ring);
  return group;
}

function createAxis(
  label: string,
  direction: THREE.Vector3,
  color: number,
): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
  group.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        direction.clone().multiplyScalar(-AXIS_LENGTH * 0.2),
        direction.clone().multiplyScalar(AXIS_LENGTH),
      ]),
      material,
    ),
  );

  const arrow = new THREE.ConeGeometry(0.055, 0.18, 20);
  const cone = new THREE.Mesh(
    arrow,
    new THREE.MeshBasicMaterial({ color }),
  );
  cone.position.copy(direction).multiplyScalar(AXIS_LENGTH);
  cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  group.add(cone);

  const sprite = createLabelSprite(label, color);
  sprite.position.copy(direction).multiplyScalar(LABEL_DISTANCE);
  group.add(sprite);

  return group;
}

function createGrid(): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    color: GRID_COLOR,
    transparent: true,
    opacity: 0.22,
  });
  const limit = 3;
  const step = 0.75;

  for (let value = -limit; value <= limit; value += step) {
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-limit, value, 0),
          new THREE.Vector3(limit, value, 0),
        ]),
        material.clone(),
      ),
    );
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(value, -limit, 0),
          new THREE.Vector3(value, limit, 0),
        ]),
        material.clone(),
      ),
    );
  }

  return group;
}

function createLabelSprite(label: string, color: number): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create local uncertainty label canvas.");
  }

  context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
  context.font = "700 42px Inter, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, 48, 48);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.42, 0.42, 0.42);
  return sprite;
}

function circlePoints(
  radius: number,
  plane: "xy" | "xz",
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index <= 48; index += 1) {
    const angle = (index / 48) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    points.push(
      plane === "xy" ? new THREE.Vector3(x, y, 0) : new THREE.Vector3(x, 0, y),
    );
  }
  return points;
}

function applyView(
  camera: THREE.PerspectiveCamera,
  view: LocalUncertaintyView,
): void {
  const positions: Record<LocalUncertaintyView, THREE.Vector3> = {
    iso: new THREE.Vector3(5.2, -6.2, 4.4),
    q: new THREE.Vector3(8, 0, 0),
    s: new THREE.Vector3(0, 8, 0),
    w: new THREE.Vector3(0, 0, 8),
  };

  camera.position.copy(positions[view]);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function disposeObject3D(object: THREE.Object3D): void {
  for (const child of object.children) {
    disposeObject3D(child);

    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose();
      disposeMaterial(child.material);
    }

    if (child instanceof THREE.Sprite) {
      child.material.map?.dispose();
      child.material.dispose();
    }
  }
}

function disposeMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  disposeMaterial(mesh.material);
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    for (const entry of material) {
      entry.dispose();
    }
    return;
  }

  material.dispose();
}
