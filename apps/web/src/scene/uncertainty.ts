import * as THREE from "three";

import type { TleOrbitSample } from "../orbits/tle";
import type { CovarianceSample, CovarianceSeries } from "../uncertainty/types";
import { SCENE_KILOMETERS_PER_UNIT } from "./orbitTrace";

export type UncertaintyDensity = "all" | "daily" | "current";

export type UncertaintyEllipsoidOptions = {
  visible: boolean;
  sigma: 1 | 2 | 3;
  density: UncertaintyDensity;
  visualGain: number;
  minRadiusSceneUnits: number;
  currentEpoch?: Date;
};

export type CovariancePrincipalAxes = {
  valuesKm2: [number, number, number];
  vectors: [number[], number[], number[]];
  sigmaAxesKm: [number, number, number];
};

export const DEFAULT_UNCERTAINTY_OPTIONS: UncertaintyEllipsoidOptions = {
  visible: true,
  sigma: 2,
  density: "all",
  visualGain: 80,
  minRadiusSceneUnits: 0.18,
};

const ELLIPSOID_COLOR = 0xff6b9a;
const ELLIPSOID_OPACITY = 0.38;
const ELLIPSOID_SEGMENTS = 32;
const ELLIPSOID_RINGS = 16;

export function createUncertaintyEllipsoidGroup(
  series: CovarianceSeries,
  nominalSamples: readonly TleOrbitSample[],
  options: UncertaintyEllipsoidOptions,
): THREE.Group {
  const group = new THREE.Group();
  group.name = "uncertainty-ellipsoids";
  group.visible = options.visible;

  if (!options.visible || nominalSamples.length === 0) {
    return group;
  }

  const samples = selectCovarianceSamples(series.samples, options);

  for (const sample of samples) {
    const nominalSample = findNearestSample(sample.epoch, nominalSamples);
    if (!nominalSample) {
      continue;
    }

    const mesh = createEllipsoidMesh(sample, nominalSample, options);
    if (mesh) {
      group.add(mesh);
    }
  }

  return group;
}

export function disposeUncertaintyEllipsoidGroup(group: THREE.Group): void {
  for (const child of group.children) {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        for (const entry of material) {
          entry.dispose();
        }
      } else {
        material.dispose();
      }
    }
  }
  group.clear();
}

export function covariancePrincipalAxes(
  sample: CovarianceSample,
  sigma: 1 | 2 | 3,
): CovariancePrincipalAxes | null {
  const eigensystem = eigenDecomposeSymmetric3(sample.position_covariance);
  if (!eigensystem) {
    return null;
  }

  return {
    valuesKm2: eigensystem.values,
    vectors: eigensystem.vectors,
    sigmaAxesKm: eigensystem.values.map(
      (value) => Math.sqrt(Math.max(value, 0)) * sigma,
    ) as [number, number, number],
  };
}

function selectCovarianceSamples(
  samples: readonly CovarianceSample[],
  options: UncertaintyEllipsoidOptions,
): CovarianceSample[] {
  if (options.density === "all") {
    return [...samples];
  }

  if (options.density === "daily") {
    const startTime = Date.parse(samples[0]?.epoch ?? "");
    const oneDayMs = 24 * 60 * 60 * 1000;
    return samples.filter((sample, index) => {
      if (index === 0 || !Number.isFinite(startTime)) {
        return index === 0;
      }
      const offset = Date.parse(sample.epoch) - startTime;
      return offset > 0 && Math.abs(offset % oneDayMs) < 1000;
    });
  }

  if (!options.currentEpoch) {
    return samples.slice(0, 1);
  }

  const nearest = findNearestCovarianceSample(options.currentEpoch, samples);
  return nearest ? [nearest] : [];
}

function createEllipsoidMesh(
  sample: CovarianceSample,
  nominalSample: TleOrbitSample,
  options: UncertaintyEllipsoidOptions,
): THREE.Mesh | null {
  const principalAxes = covariancePrincipalAxes(sample, options.sigma);
  if (!principalAxes) {
    return null;
  }

  const axesSceneUnits = principalAxes.sigmaAxesKm.map((axisKm) =>
    Math.max(
      (axisKm * options.visualGain) / SCENE_KILOMETERS_PER_UNIT,
      options.minRadiusSceneUnits,
    ),
  ) as [number, number, number];

  const material = new THREE.MeshBasicMaterial({
    color: ELLIPSOID_COLOR,
    transparent: true,
    opacity: ELLIPSOID_OPACITY,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    wireframe: false,
  });
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, ELLIPSOID_SEGMENTS, ELLIPSOID_RINGS),
    material,
  );

  const position = vectorFromKm(nominalSample.positionKm);
  const basis = qswBasis(nominalSample);
  const orientedBasis = multiplyBasisByEigenvectors(basis, principalAxes.vectors);

  const transform = new THREE.Matrix4().makeBasis(
    orientedBasis[0].multiplyScalar(axesSceneUnits[0]),
    orientedBasis[1].multiplyScalar(axesSceneUnits[1]),
    orientedBasis[2].multiplyScalar(axesSceneUnits[2]),
  );
  transform.setPosition(position);

  mesh.matrix.copy(transform);
  mesh.matrixAutoUpdate = false;
  mesh.userData = {
    epoch: sample.epoch,
    covarianceFrame: "QSW",
    provenance: sample.provenance,
  };

  return mesh;
}

function qswBasis(sample: TleOrbitSample): [THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  const q = new THREE.Vector3(
    sample.positionKm.x,
    sample.positionKm.y,
    sample.positionKm.z,
  ).normalize();
  const velocity = new THREE.Vector3(
    sample.velocityKmPerSecond.x,
    sample.velocityKmPerSecond.y,
    sample.velocityKmPerSecond.z,
  );
  const w = new THREE.Vector3().crossVectors(q, velocity).normalize();
  const s = new THREE.Vector3().crossVectors(w, q).normalize();

  if (q.lengthSq() === 0 || w.lengthSq() === 0 || s.lengthSq() === 0) {
    return [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
    ];
  }

  return [q, s, w];
}

function multiplyBasisByEigenvectors(
  basis: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
  eigenvectors: [number[], number[], number[]],
): [THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  return [0, 1, 2].map((columnIndex) =>
    new THREE.Vector3()
      .addScaledVector(basis[0], eigenvectors[0][columnIndex])
      .addScaledVector(basis[1], eigenvectors[1][columnIndex])
      .addScaledVector(basis[2], eigenvectors[2][columnIndex])
      .normalize(),
  ) as [THREE.Vector3, THREE.Vector3, THREE.Vector3];
}

function vectorFromKm(vector: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(
    vector.x / SCENE_KILOMETERS_PER_UNIT,
    vector.y / SCENE_KILOMETERS_PER_UNIT,
    vector.z / SCENE_KILOMETERS_PER_UNIT,
  );
}

function findNearestSample(
  epochIso: string,
  samples: readonly TleOrbitSample[],
): TleOrbitSample | null {
  const targetTime = Date.parse(epochIso);
  if (!Number.isFinite(targetTime)) {
    return null;
  }

  let nearest: TleOrbitSample | null = null;
  let nearestDelta = Infinity;

  for (const sample of samples) {
    const delta = Math.abs(sample.epoch.getTime() - targetTime);
    if (delta < nearestDelta) {
      nearest = sample;
      nearestDelta = delta;
    }
  }

  return nearest;
}

function findNearestCovarianceSample(
  epoch: Date,
  samples: readonly CovarianceSample[],
): CovarianceSample | null {
  let nearest: CovarianceSample | null = null;
  let nearestDelta = Infinity;

  for (const sample of samples) {
    const delta = Math.abs(Date.parse(sample.epoch) - epoch.getTime());
    if (delta < nearestDelta) {
      nearest = sample;
      nearestDelta = delta;
    }
  }

  return nearest;
}

function eigenDecomposeSymmetric3(matrix: [number[], number[], number[]]) {
  const values = matrix.map((row) => [...row]);
  const vectors = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  for (let iteration = 0; iteration < 16; iteration += 1) {
    const [p, q, maxOffDiagonal] = largestOffDiagonal(values);
    if (maxOffDiagonal < 1e-12) {
      break;
    }

    const theta = (values[q][q] - values[p][p]) / (2 * values[p][q]);
    const tangent =
      Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
    const cosine = 1 / Math.sqrt(tangent * tangent + 1);
    const sine = tangent * cosine;

    rotate(values, vectors, p, q, cosine, sine);
  }

  return {
    values: [values[0][0], values[1][1], values[2][2]] as [number, number, number],
    vectors: vectors as [number[], number[], number[]],
  };
}

function largestOffDiagonal(matrix: number[][]): [number, number, number] {
  let p = 0;
  let q = 1;
  let max = Math.abs(matrix[0][1]);

  for (const [row, column] of [
    [0, 2],
    [1, 2],
  ] as const) {
    const value = Math.abs(matrix[row][column]);
    if (value > max) {
      p = row;
      q = column;
      max = value;
    }
  }

  return [p, q, max];
}

function rotate(
  matrix: number[][],
  vectors: number[][],
  p: number,
  q: number,
  cosine: number,
  sine: number,
) {
  const app = matrix[p][p];
  const aqq = matrix[q][q];
  const apq = matrix[p][q];

  matrix[p][p] = cosine * cosine * app - 2 * sine * cosine * apq + sine * sine * aqq;
  matrix[q][q] = sine * sine * app + 2 * sine * cosine * apq + cosine * cosine * aqq;
  matrix[p][q] = 0;
  matrix[q][p] = 0;

  for (let row = 0; row < 3; row += 1) {
    if (row !== p && row !== q) {
      const arp = matrix[row][p];
      const arq = matrix[row][q];
      matrix[row][p] = cosine * arp - sine * arq;
      matrix[p][row] = matrix[row][p];
      matrix[row][q] = sine * arp + cosine * arq;
      matrix[q][row] = matrix[row][q];
    }

    const vrp = vectors[row][p];
    const vrq = vectors[row][q];
    vectors[row][p] = cosine * vrp - sine * vrq;
    vectors[row][q] = sine * vrp + cosine * vrq;
  }
}
