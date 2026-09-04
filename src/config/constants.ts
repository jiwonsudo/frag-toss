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
  // 낮출수록 수류탄이 더 떠서 날고(체공↑) 같은 사거리를 더 낮은 속도로 낼 수 있음.
  gravity: -17,
  // 물리 스텝 (초). 렌더 dt 를 이 값으로 누적 시뮬레이션.
  fixedStep: 1 / 60,
  maxSubSteps: 5,
  grenade: {
    radius: 0.13,
    density: 6,
    restitution: 0.22,
    friction: 1.1,
    // 공기저항: 던지는 손맛(무게감)을 위해 남겨두되, 궤적 미리보기가 이 값을
    // 그대로 반영하므로 "점선대로 안 떨어지는" 괴리는 없다.
    linearDamping: 0.32,
    angularDamping: 0.8,
    // 지면에 닿은 뒤 적용하는 담핑 — 굴러다니지 않고 빨리 멈추도록.
    restDamping: 3.2
  }
};

export const SWIPE = {
  // 유효 스와이프 최소 픽셀 이동.
  minDistancePx: 36,
  // 탭/롱프레스 방어용 지속시간 클램프 (ms).
  minDurationMs: 40,
  maxDurationMs: 420,
  // 파워 곡선: 정규화 스와이프 속도(화면높이비율/ms)를 refNormSpeed 로 나눠 0~1 파워를 얻고,
  // powerGamma 로 곡선을 먹인 뒤 min~maxSpeed 로 보간한다.
  // gamma 를 1 근처로 두어 중간 세기 구간이 넓게 퍼지도록 (예전 2.4 는 저~중속이 다 뭉쳐서
  // 5~10m 던지기가 거의 불가능했음). 최소속도를 올려 가까운 거리 사각도 메움.
  refNormSpeed: 0.0043,
  powerGamma: 1.15,
  minSpeed: 7,
  maxSpeed: 19,
  // 위로 스와이프한 정규화량이 이 값 이상이어야 유효 (dy<0 조건의 3D 버전).
  minUp: 0.05,
  // 가로 스와이프 성분 -> 좌우 조준각(rad).
  yawRange: 0.55,
  // 세로 스와이프 성분 -> 던지는 올려각(rad). base + ratio*range.
  // base 를 높여 살살 던져도 곡사(로브)로 나가게 — 얕게 나가 바닥에 처박히는 것 방지.
  pitchBase: 0.32,
  pitchRange: 0.5
};

export const TRAJECTORY = {
  steps: 150,
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
  // 스플래시 반경(m). 이 안이라도 온전한 콘크리트 벽에 가려지면 살아남는다. (섬광 이펙트도 이 값에 비례)
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
