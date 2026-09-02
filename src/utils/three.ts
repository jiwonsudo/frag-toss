import * as THREE from 'three';
import { RENDER, CAMERA } from '../config/constants';
import type { Vec3 } from '../config/types';

export function makeCamera(): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(
    RENDER.fov,
    window.innerWidth / Math.max(1, window.innerHeight),
    RENDER.near,
    RENDER.far
  );
  cam.position.set(CAMERA.position.x, CAMERA.position.y, CAMERA.position.z);
  cam.lookAt(CAMERA.lookAt.x, CAMERA.lookAt.y, CAMERA.lookAt.z);
  return cam;
}

export function v3(v: Vec3): THREE.Vector3 {
  return new THREE.Vector3(v.x, v.y, v.z);
}

/** 씬 하위 지오메트리/머티리얼을 재귀적으로 해제. */
export function disposeScene(scene: THREE.Scene): void {
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mat = (mesh as THREE.Mesh).material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else if (mat) (mat as THREE.Material).dispose();
  });
  scene.clear();
}
