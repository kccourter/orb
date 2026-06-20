import * as THREE from "three";

import type { ComparableOrbitSample } from "../orbits/sampleTypes";
import type { TleOrbitSample } from "../orbits/tle";

export const SCENE_KILOMETERS_PER_UNIT = 1000;

export type OrbitTrace = THREE.Line<
  THREE.BufferGeometry,
  THREE.LineBasicMaterial
>;

export function orbitSamplesToScenePoints(
  samples: readonly TleOrbitSample[],
): THREE.Vector3[] {
  return samplesToScenePoints(samples);
}

export function comparableSamplesToScenePoints(
  samples: readonly ComparableOrbitSample[],
): THREE.Vector3[] {
  return samplesToScenePoints(samples);
}

export function positionKmToScenePoint(positionKm: {
  x: number;
  y: number;
  z: number;
}): THREE.Vector3 {
  return new THREE.Vector3(
    positionKm.x / SCENE_KILOMETERS_PER_UNIT,
    positionKm.y / SCENE_KILOMETERS_PER_UNIT,
    positionKm.z / SCENE_KILOMETERS_PER_UNIT,
  );
}

function samplesToScenePoints(
  samples: readonly { positionKm: { x: number; y: number; z: number } }[],
): THREE.Vector3[] {
  return samples.map((sample) => positionKmToScenePoint(sample.positionKm));
}

export function updateOrbitTrace(
  orbitTrace: OrbitTrace,
  points: readonly THREE.Vector3[],
): void {
  const nextGeometry = new THREE.BufferGeometry().setFromPoints([...points]);
  orbitTrace.geometry.dispose();
  orbitTrace.geometry = nextGeometry;
}
