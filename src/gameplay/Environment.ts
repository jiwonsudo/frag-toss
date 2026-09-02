import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { RENDER, SKY } from '../config/constants';
import { makeGroundTextures } from '../utils/procedural';

/**
 * 씬 공통 환경: 절차적 하늘(three Sky) + 태양광 + IBL 환경광 + 지수 안개 + 절차적 지형.
 * 에셋 없이 배그풍 실사 톤을 냄. 업그레이드 경로:
 *  (1) Sky → RGBELoader 로 실사 HDRI, (2) makeGroundTextures → 실사 PBR 텍스처.
 */
export function buildEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer): THREE.Mesh {
  // 태양 방향
  const phi = THREE.MathUtils.degToRad(90 - SKY.sunElevation);
  const theta = THREE.MathUtils.degToRad(SKY.sunAzimuth);
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

  // 하늘
  const sky = new Sky();
  sky.scale.setScalar(10000);
  const u = sky.material.uniforms;
  u.turbidity.value = SKY.turbidity;
  u.rayleigh.value = SKY.rayleigh;
  u.mieCoefficient.value = SKY.mieCoefficient;
  u.mieDirectionalG.value = SKY.mieDirectionalG;
  u.sunPosition.value.copy(sunDir);
  scene.add(sky);

  // IBL: 하늘을 환경맵으로 구워 모든 PBR 재질에 반영
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(scene).texture;
  scene.environmentIntensity = SKY.envIntensity;
  pmrem.dispose();

  // 안개
  scene.fog = new THREE.FogExp2(RENDER.fogColor, RENDER.fogDensity);

  // 조명
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x4a4034, SKY.hemiIntensity);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(SKY.sunLightColor, SKY.sunLightIntensity);
  sun.position.copy(sunDir).multiplyScalar(60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -22;
  sun.shadow.camera.right = 22;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -22;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  scene.add(sun.target);

  // 지형
  const tex = makeGroundTextures(60);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({
      map: tex.map,
      normalMap: tex.normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughnessMap: tex.roughnessMap,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.4
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  return ground;
}
