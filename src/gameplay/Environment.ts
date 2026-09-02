import * as THREE from 'three';
import { RENDER, COLORS } from '../config/constants';

/** 씬 공통 환경(조명 + 안개 + 바닥)을 구성. 바닥 Mesh 를 반환. */
export function buildEnvironment(scene: THREE.Scene): THREE.Mesh {
  scene.background = new THREE.Color(RENDER.sky);
  scene.fog = new THREE.Fog(RENDER.sky, RENDER.fogNear, RENDER.fogFar);

  const hemi = new THREE.HemisphereLight(0xbcd0ff, 0x2a2320, 0.9);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.4);
  dir.position.set(8, 16, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.left = -25;
  dir.shadow.camera.right = 25;
  dir.shadow.camera.top = 25;
  dir.shadow.camera.bottom = -25;
  dir.shadow.camera.far = 60;
  scene.add(dir);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: COLORS.ground, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(200, 100, COLORS.groundGrid, COLORS.groundGrid);
  (grid.material as THREE.Material).opacity = 0.25;
  (grid.material as THREE.Material).transparent = true;
  grid.position.y = 0.01;
  scene.add(grid);

  return ground;
}
