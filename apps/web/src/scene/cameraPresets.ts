import * as THREE from "three";

export type CameraPresetId = "fixed_inertial_observer";

export const CAMERA_PRESETS: Record<
  CameraPresetId,
  {
    position: THREE.Vector3;
    target: THREE.Vector3;
    fieldOfViewDegrees: number;
  }
> = {
  fixed_inertial_observer: {
    position: new THREE.Vector3(0, -18, 10),
    target: new THREE.Vector3(0, 0, 0),
    fieldOfViewDegrees: 45,
  },
};

export function applyCameraPreset(
  camera: THREE.PerspectiveCamera,
  presetId: CameraPresetId,
): void {
  const preset = CAMERA_PRESETS[presetId];
  camera.fov = preset.fieldOfViewDegrees;
  camera.position.copy(preset.position);
  camera.lookAt(preset.target);
  camera.updateProjectionMatrix();
}
