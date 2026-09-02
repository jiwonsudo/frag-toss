import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { RENDER, SKY } from '../config/constants';
import { makeGroundTextures } from '../utils/procedural';
import { buildFoliage } from './Foliage';

/**
 * 씬 공통 환경: 절차적 하늘(three Sky) + 결정적 직접광 + 지수 안개 + 절차적 지형 + 식생.
 * 밝기는 태양/반구/앰비언트 직접광이 결정하고 IBL 은 반사 뉘앙스만 — 모바일/데스크톱 일관성.
 * @param seed 식생 배치 시드 (레벨별 고정). 0 이면 랜덤.
 */
export function buildEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  seed = 0
): THREE.Mesh {
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

  // IBL(PMREM 환경맵) 은 쓰지 않는다.
  // iOS Safari 등에서 half-float 렌더타깃 결과가 NaN 이 되어 모든 PBR 프래그먼트를
  // 검게 만드는 사례가 있음 → 밝기는 전적으로 아래 직접광 리그가 담당.
  void renderer;

  // 안개
  scene.fog = new THREE.FogExp2(RENDER.fogColor, RENDER.fogDensity);

  // --- 결정적 직접광 리그 ---
  const hemi = new THREE.HemisphereLight(0xdfeaff, 0x5a5240, SKY.hemiIntensity);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight(0xffffff, SKY.ambientIntensity));

  const sun = new THREE.DirectionalLight(SKY.sunLightColor, SKY.sunLightIntensity);
  sun.position.copy(sunDir).multiplyScalar(60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -20;
  // 프러스텀을 광원-대상 거리에 딱 맞춰 깊이 정밀도 확보 (모바일 그림자 뭉개짐 방지)
  sun.shadow.camera.near = 30;
  sun.shadow.camera.far = 95;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);

  // 지형
  const tex = makeGroundTextures(60);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({
      // 텍스처 업로드 실패(모바일) 대비 색 폴백.
      color: 0x8a8a5c,
      map: tex.map,
      normalMap: tex.normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughnessMap: tex.roughnessMap,
      roughness: 1,
      metalness: 0
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // 배경 식생 (잔디/나무/관목/바위/능선) — 시드 고정
  buildFoliage(scene, seed);

  return ground;
}
