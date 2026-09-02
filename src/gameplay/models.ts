import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import grenadeUrl from '../assets/m67_hand_grenade.glb?url';
import girlUrl from '../assets/pubg_girl_pose_t.glb?url';
import treeUrl from '../assets/urban_tree.glb?url';
import { PHYSICS } from '../config/constants';

/**
 * 외부 GLB 에셋 로더. 앱 시작 시 한 번 로드하고 인스턴스는 복제해서 쓴다
 * (지오메트리/텍스처 공유 — 씬 정리 시 dispose 하지 않도록 sharedResource 플래그).
 *
 * 적: pubg_girl_pose_t 하나만 Mixamo 스켈레톤이 있어서 이걸 사용.
 *  - 서 있을 때 T-포즈 팔을 내림(relaxArms)
 *  - 인스턴스마다 옷 색조/키를 조금씩 바꿔 다른 사람처럼 보이게
 *  - 사망 시 뼈를 움직여 배그 기절처럼 앞으로 무너지며 엎어짐
 * (pubg_female_set / pubg_female_purple_set 은 스켈레톤 없는 정적 메쉬라 코드로 리깅 불가 → 미사용)
 */

const ENEMY_HEIGHT = 1.78;

let girlSource: THREE.Object3D | null = null;
let grenadeModel: THREE.Object3D | null = null;
let treeSource: THREE.Object3D | null = null;

/** FBX→glTF 변환 모델의 눕힘/스케일/발높이를 정규화하고 그림자 설정. */
function normalize(root: THREE.Object3D, targetHeight: number, feetToGround = true): THREE.Object3D {
  const junk: THREE.Object3D[] = [];
  root.traverse((o) => {
    if ((o as THREE.Light).isLight || (o as THREE.Camera).isCamera) junk.push(o);
  });
  for (const j of junk) j.removeFromParent();

  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(root);
  let size = box.getSize(new THREE.Vector3());

  if (size.y < Math.max(size.x, size.z) * 0.8) {
    root.rotation.x = -Math.PI / 2;
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(root);
    size = box.getSize(new THREE.Vector3());
  }

  root.scale.multiplyScalar(targetHeight / (size.y || 1));
  root.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  if (feetToGround) root.position.y -= box.min.y;
  else root.position.y -= center.y;

  root.traverse((o) => {
    o.userData.sharedResource = true;
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
    }
  });
  return root;
}

/** Mixamo T-포즈 위팔 본을 내려 팔을 몸통 옆으로. */
function relaxArms(root: THREE.Object3D): void {
  root.traverse((o) => {
    const n = o.name;
    if (/LeftArm(_|$)/.test(n)) o.rotation.z -= 1.15;
    else if (/RightArm(_|$)/.test(n)) o.rotation.z += 1.15;
    else if (/LeftForeArm(_|$)/.test(n)) o.rotation.z -= 0.12;
    else if (/RightForeArm(_|$)/.test(n)) o.rotation.z += 0.12;
  });
}

export async function preloadModels(): Promise<void> {
  if (girlSource) return;
  const loader = new GLTFLoader();
  const [g, girl, tree] = await Promise.all([
    loader.loadAsync(grenadeUrl),
    loader.loadAsync(girlUrl),
    loader.loadAsync(treeUrl)
  ]);

  const gwrap = new THREE.Group();
  gwrap.add(girl.scene);
  relaxArms(gwrap);
  girlSource = normalize(gwrap, ENEMY_HEIGHT);

  const grn = new THREE.Group();
  grn.add(g.scene);
  grenadeModel = normalize(grn, PHYSICS.grenade.radius * 2.4, false);

  const tw = new THREE.Group();
  tw.add(tree.scene);
  treeSource = normalize(tw, 6.2);
  // 잎이 너무 어둡게 나와서 살짝 밝히고 양면 처리 (카드형 잎 구멍 방지)
  treeSource.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m && 'color' in m) {
      m.side = THREE.DoubleSide;
      if (/folha|leaf|folhagem/i.test(m.name || '')) m.color.multiplyScalar(1.5);
    }
  });
}

/** Mixamo 리그의 주요 본 + 사망 연출용 rest 자세. */
export interface BoneRig {
  bones: Record<string, THREE.Object3D>;
  rest: Map<THREE.Object3D, THREE.Quaternion>;
}

const BONE_KEYS: [string, RegExp][] = [
  ['hips', /Hips(_|$)/],
  ['spine', /Spine(_|$)/],
  ['spine1', /Spine1(_|$)/],
  ['spine2', /Spine2(_|$)/],
  ['neck', /Neck(_|$)/],
  ['head', /Head(_|$)/],
  ['legLU', /LeftUpLeg(_|$)/],
  ['legRU', /RightUpLeg(_|$)/],
  ['legL', /LeftLeg(_|$)/],
  ['legR', /RightLeg(_|$)/],
  ['armL', /LeftArm(_|$)/],
  ['armR', /RightArm(_|$)/],
  ['foreL', /LeftForeArm(_|$)/],
  ['foreR', /RightForeArm(_|$)/]
];

function extractRig(root: THREE.Object3D): BoneRig {
  const bones: Record<string, THREE.Object3D> = {};
  root.traverse((o) => {
    for (const [key, re] of BONE_KEYS) {
      if (!bones[key] && re.test(o.name)) bones[key] = o;
    }
  });
  const rest = new Map<THREE.Object3D, THREE.Quaternion>();
  for (const b of Object.values(bones)) rest.set(b, b.quaternion.clone());
  return { bones, rest };
}

export interface HumanInstance {
  root: THREE.Object3D;
  rig: BoneRig | null;
}

const TINTS = [0xffffff, 0xe8d8c8, 0xcfe0d0, 0xf0d0d8, 0xd6d8e8, 0xe0e0c8];

/** variant 로 옷 색조/키를 살짝 바꿔 다른 사람처럼. */
export function createHuman(variant: number): HumanInstance {
  if (!girlSource) throw new Error('preloadModels() 를 먼저 호출해야 합니다');
  const root = cloneSkeleton(girlSource);
  const tint = new THREE.Color(TINTS[((variant % TINTS.length) + TINTS.length) % TINTS.length]);
  const heightScale = 0.94 + ((variant * 0.137) % 1) * 0.12;
  root.scale.multiplyScalar(heightScale);

  root.traverse((o) => {
    o.userData.sharedResource = true;
    const m = o as THREE.Mesh;
    if (m.isMesh && m.material) {
      const src = m.material as THREE.MeshStandardMaterial;
      // 얼굴/피부로 보이는 머티리얼은 건드리지 않음
      const skin = /face|skin|head|body/i.test(src.name || '');
      const mat = src.clone();
      if (!skin) mat.color.multiply(tint);
      mat.userData.sharedResource = true;
      m.material = mat;
    }
  });

  return { root, rig: extractRig(root) };
}

export function createGrenadeMesh(): THREE.Object3D {
  if (!grenadeModel) throw new Error('preloadModels() 를 먼저 호출해야 합니다');
  const c = cloneSkeleton(grenadeModel);
  c.traverse((o) => (o.userData.sharedResource = true));
  return c;
}

export function createTree(): THREE.Object3D {
  if (!treeSource) throw new Error('preloadModels() 를 먼저 호출해야 합니다');
  const c = cloneSkeleton(treeSource);
  c.traverse((o) => (o.userData.sharedResource = true));
  return c;
}

/** 시드 기반 셔플된 variant 배열 (레벨별 고정). */
export function shuffledVariants(count: number, seed: number): number[] {
  const n = Math.max(count, TINTS.length);
  const base = Array.from({ length: n }, (_, i) => i % TINTS.length);
  let a = (seed >>> 0) || 1;
  const rnd = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base.slice(0, count);
}
