/**
 * 게임 밸런싱 튜닝 값 모음 (1인칭 3D 버전).
 * 단위는 대략 "미터", 좌표계는 오른손 (+X 오른쪽, +Y 위, -Z 정면).
 * 플레이어는 원점 근처에서 -Z 방향(적/벽 쪽)을 바라봄.
 */

export const RENDER = {
  fov: 72,
  near: 0.05,
  far: 2000,
  // ACES 톤매핑 노출.
  exposure: 0.95,
  // 지수 안개(FogExp2) 밀도 + 색 (배그풍 옅은 헤이즈).
  fogColor: 0xb9c4c4,
  fogDensity: 0.0085
};

/** 절차적 하늘(three Sky) + 태양. 에셋 없이 실사풍 하늘/조명 생성. */
export const SKY = {
  // 태양 위치 (도).
  // 정오에 가까운 높은 태양 + 카메라 뒤쪽에서 비추도록 (배그 에란겔 대낮 톤).
  sunElevation: 42,
  sunAzimuth: 35,
  turbidity: 4,
  rayleigh: 1.6,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.8,
  // 태양광(DirectionalLight) 세기/색.
  // 밝기는 오직 직접광(태양/반구/앰비언트)으로 결정 — IBL 미사용, 모바일/데스크톱 일관성.
  sunLightIntensity: 3.2,
  sunLightColor: 0xfff4e2,
  // 하늘 기반 보조 반구광 (IBL 미사용 → 반구광이 하늘 반사광 역할).
  hemiIntensity: 1.35,
  // 최소 보정 앰비언트 (기기 무관 일정한 하한).
  ambientIntensity: 0.45
};

export const CAMERA = {
  // 레벨에서 override 가능. 눈높이 기준, 시선은 약간 아래로.
  position: { x: 0, y: 1.85, z: 6.5 },
  lookAt: { x: 0, y: 0.8, z: -13 }
};

export const PHYSICS = {
  // 중력 가속도(m/s^2). 현실(-9.81)보다 강하게 잡아 손맛/궤적을 조절.
  gravity: -20,
  // 물리 스텝 (초). 렌더 dt 를 이 값으로 누적 시뮬레이션.
  fixedStep: 1 / 60,
  maxSubSteps: 5,
  grenade: {
    radius: 0.13,
    density: 6,
    restitution: 0.28,
    friction: 0.9,
    // 담핑을 높게 잡아 수류탄이 굴러다니지 않고 비교적 빨리 멈추도록.
    linearDamping: 0.7,
    angularDamping: 0.8
  }
};

export const SWIPE = {
  // 유효 스와이프 최소 픽셀 이동.
  minDistancePx: 36,
  // 탭/롱프레스 방어용 지속시간 클램프 (ms).
  minDurationMs: 40,
  maxDurationMs: 420,
  // 정규화 스와이프 속도(화면높이 비율/ms) -> 발사 속도(m/s) 변환 스케일. 핵심 튜닝 값.
  powerScale: 7200,
  minSpeed: 6.5,
  maxSpeed: 23,
  // 위로 스와이프한 정규화량이 이 값 이상이어야 유효 (dy<0 조건의 3D 버전).
  minUp: 0.05,
  // 가로 스와이프 성분 -> 좌우 조준각(rad).
  yawRange: 0.55,
  // 세로 스와이프 성분 -> 던지는 올려각(rad). base + ratio*range.
  pitchBase: 0.12,
  pitchRange: 0.75
};

export const TRAJECTORY = {
  steps: 110,
  dt: 1 / 60,
  // 점을 몇 스텝마다 찍을지.
  dotEvery: 4,
  dotRadius: 0.05
};

export const COOK = {
  // "쿠킹": 스와이프 시작(pointerdown)부터 폭발까지의 총 신관 시간(ms).
  // 옆 게이지가 이 시간에 걸쳐 하단→상단으로 가득 참. 던진 뒤에도 시계는 계속 흐름.
  durationMs: 3000,
  // 이 비율 이상 차오르면 게이지가 위험 색으로.
  dangerFrom: 0.72,
  // 끝까지 들고 있으면(=던지지 않으면) 손에서 폭발.
  cookOffInHand: true
};

export const EXPLOSION = {
  // 스플래시 반경(m). 이 안의 적은 벽에 가려도 사망. (섬광 이펙트도 이 값에 비례)
  splashRadius: 4.6,
  particleCount: 44,
  // 배그풍 이펙트 레이어
  debrisCount: 30,
  sparkCount: 26,
  smokePuffs: 14,
  // 카메라 흔들림
  shakeAmp: 0.18,
  shakeMs: 420
};

export const GAMEPLAY = {
  defaultGrenades: 5,
  star3RemainingGrenades: 3,
  star2RemainingGrenades: 1
};

export const COLORS = {
  ground: 0x2b2f38,
  groundGrid: 0x3d4450,
  wall: 0x9a958a,
  wallDamaged: 0x6d675d,
  grenade: 0x3f7d3f,
  enemy: 0xe94560,
  enemyDead: 0x5b3a6b,
  explosionCore: 0xfff2c4,
  explosionEdge: 0xff7043,
  trajectory: 0xffffff,
  // 배그풍 팔레트
  foliageGrass: 0x6b7d3a,
  foliageTreeTrunk: 0x5a4632,
  foliageTreeLeaf: 0x4f6136,
  rock: 0x7d7a71,
  smokeDark: 0x2e2a26,
  smokeLight: 0x9a938a,
  spark: 0xffcaa0,
  // 병사 모델 색
  soldierUniform: 0x5f6247,
  soldierVest: 0x3c3a30,
  soldierSkin: 0xc9a07a,
  soldierHelmet: 0x494b3c,
  soldierBoots: 0x2a2622
};
