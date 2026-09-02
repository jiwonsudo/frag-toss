import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COLORS } from '../config/constants';
import { createTree } from './models';

/**
 * 배그 에란겔풍 배경 식생: 절차적 잔디(크로스 빌보드 인스턴싱) + 저폴리 소나무/관목/바위.
 * 에셋 없이 캔버스 알파 텍스처로 잔디 클러스터를 만든다.
 *
 * 규칙:
 *  - 배치는 레벨 시드로 고정 (같은 레벨은 항상 같은 풍경).
 *  - 나무/관목/바위 같은 "게임플레이에 영향 주는" 초목은 플레이 통로(플레이어↔적)에
 *    절대 들어가지 않음. 잔디만 통로 안에 성기게 허용.
 */

// 플레이어(z≈6.5) ↔ 적(z≈-14) 사이 통로 + 여유. 이 안엔 프롭 금지.
const CORRIDOR_X = 13;
const CORRIDOR_Z_NEAR = 10;
const CORRIDOR_Z_FAR = -24;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inCorridor(x: number, z: number): boolean {
  return x > -CORRIDOR_X && x < CORRIDOR_X && z > CORRIDOR_Z_FAR && z < CORRIDOR_Z_NEAR;
}

function makeGrassTexture(): THREE.Texture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, S, S);
  const blades = 34;
  for (let i = 0; i < blades; i++) {
    const x = S * (0.06 + Math.random() * 0.88);
    const w = 5 + Math.random() * 7;
    const h = S * (0.35 + Math.random() * 0.55);
    const lean = (Math.random() - 0.5) * 40;
    const shade = 0.6 + Math.random() * 0.4;
    const grd = g.createLinearGradient(0, S, 0, S - h);
    grd.addColorStop(0, `rgba(${(40 * shade) | 0},${(60 * shade) | 0},${(24 * shade) | 0},1)`);
    grd.addColorStop(1, `rgba(${(120 * shade) | 0},${(140 * shade) | 0},${(60 * shade) | 0},1)`);
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(x - w / 2, S);
    g.quadraticCurveTo(x + lean * 0.5, S - h * 0.6, x + lean, S - h);
    g.quadraticCurveTo(x + lean * 0.5, S - h * 0.6, x + w / 2, S);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

function buildGrass(scene: THREE.Scene, rnd: () => number): void {
  const tex = makeGrassTexture();
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    alphaTest: 0.5,
    transparent: false,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0
  });

  const plane = new THREE.PlaneGeometry(1, 1);
  plane.translate(0, 0.5, 0);
  const g1 = plane.clone();
  const g2 = plane.clone();
  g2.rotateY(Math.PI / 2);
  const merged = mergeGeometries([g1, g2]) ?? g1;

  const COUNT = 6500;
  const mesh = new THREE.InstancedMesh(merged, mat, COUNT);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let n = 0;
  const R = 55;
  for (let i = 0; i < COUNT * 3 && n < COUNT; i++) {
    const x = (rnd() * 2 - 1) * R;
    const z = -6 + (rnd() * 2 - 1) * R;
    // 통로 안쪽은 성기게만 (잔디는 시야/난이도에 영향 없음)
    if (inCorridor(x, z) && rnd() > 0.3) continue;
    const s = 0.3 + rnd() * 0.55;
    dummy.position.set(x, 0, z);
    dummy.rotation.y = rnd() * Math.PI;
    dummy.scale.set(s * (1.3 + rnd() * 0.6), s * 0.8, s * (1.3 + rnd() * 0.6));
    dummy.updateMatrix();
    mesh.setMatrixAt(n++, dummy.matrix);
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
}

function buildTree(rnd: () => number): THREE.Object3D {
  const t = createTree();
  t.rotation.y = rnd() * Math.PI * 2;
  t.scale.multiplyScalar(0.8 + rnd() * 0.7);
  return t;
}

function buildBush(rnd: () => number): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color: COLORS.foliageGrass,
    roughness: 1,
    flatShading: true
  });
  const geo = new THREE.IcosahedronGeometry(0.5 + rnd() * 0.35, 1);
  geo.scale(1.1 + rnd() * 0.3, 0.7 + rnd() * 0.2, 1.1 + rnd() * 0.3);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

function buildRock(rnd: () => number): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color: COLORS.rock,
    roughness: 0.95,
    flatShading: true,
    metalness: 0
  });
  const geo = new THREE.DodecahedronGeometry(0.35 + rnd() * 0.4, 0);
  geo.scale(1 + rnd() * 0.4, 0.55 + rnd() * 0.3, 1 + rnd() * 0.4);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildFoliage(scene: THREE.Scene, seed = 0): void {
  const rnd = seed ? mulberry32(seed * 2654435761) : Math.random;
  buildGrass(scene, rnd);

  // 나무: 통로 바깥 링 (측면·후방)
  for (let i = 0; i < 16; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = 16 + rnd() * 32;
    const x = Math.cos(ang) * dist;
    const z = -10 + Math.sin(ang) * dist;
    if (inCorridor(x, z)) continue;
    const t = buildTree(rnd);
    t.position.set(x, 0, z);
    scene.add(t);
  }

  // 먼 배경 숲 (통로 정면 저 멀리, 안개에 잠기는 실루엣)
  for (let i = 0; i < 12; i++) {
    const t = buildTree(rnd);
    t.position.set((rnd() * 2 - 1) * 70, 0, -36 - rnd() * 38);
    t.scale.multiplyScalar(1.2);
    scene.add(t);
  }

  // 관목 & 바위: 통로 바깥에만
  for (let i = 0; i < 24; i++) {
    const ang = rnd() * Math.PI * 2;
    const dist = 11 + rnd() * 24;
    const x = Math.cos(ang) * dist;
    const z = -10 + Math.sin(ang) * dist;
    if (inCorridor(x, z)) continue;
    const o = rnd() < 0.55 ? buildBush(rnd) : buildRock(rnd);
    o.position.set(x, 0.15, z);
    scene.add(o);
  }

  // 먼 능선 실루엣
  const hillMat = new THREE.MeshStandardMaterial({ color: 0x7a8560, roughness: 1 });
  for (let i = 0; i < 3; i++) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(40 + i * 16, 16, 8), hillMat);
    hill.position.set((i - 1) * 70, -46 - i * 6, -150 - i * 40);
    hill.scale.set(2.6, 0.55, 1);
    scene.add(hill);
  }
}
