import type { LevelDef, WallDef, PropDef, EnemyDef } from '../config/types';

/**
 * 레벨 데이터 (5 스테이지) — 3D 좌표.
 * 플레이어는 z≈6.5 에서 -Z 방향을 바라봄. 적/벽은 음(-)의 z 에 배치. 바닥 y=0.
 * 수류탄 실질 최대 사거리는 ~18m (maxSpeed 19, gravity 17). 타겟은 대략 z ≥ -10 안쪽.
 *
 * 레벨별 공략 컨셉 (다 비슷하지 않도록):
 *  1 야전 정찰   — 엄폐 없는 평지. 흩어진 적을 하나씩. 감 잡기.
 *  2 검문소     — 낮은 방벽 너머로 아치를 그려 넘기기.
 *  3 2층집     — 1층은 유리창 부수고 굴려넣고, 2층은 난간 위로 로브.
 *  4 참호선     — 높이가 제각각인 방벽 라인. 각도 싸움.
 *  5 옥상 점령   — 파라펫을 넘겨 옥상에 정밀 로브 + 지상 측면 견제.
 */

/** 바닥에 닿는 벽 (position.y 자동 = h/2). */
const wall = (x: number, z: number, w: number, h: number, d = 0.6): WallDef => ({
  position: { x, y: h / 2, z },
  size: { x: w, y: h, z: d }
});
/** 중심 y 를 명시하는 박스 (공중 슬래브·난간·파라펫용). */
const box = (
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number
): WallDef => ({ position: { x, y, z }, size: { x: w, y: h, z: d } });
/** 윗면이 topY 에 오는 얇은 바닥 슬래브 (층). */
const floor = (x: number, z: number, topY: number, w: number, d: number): WallDef => ({
  position: { x, y: topY - 0.15, z },
  size: { x: w, y: 0.3, z: d }
});
const glass = (x: number, z: number, w: number, h: number): WallDef => ({
  position: { x, y: h / 2, z },
  size: { x: w, y: h, z: 0.14 },
  material: 'glass'
});
const tree = (x: number, z: number, radius = 0.34, height = 5.5): PropDef => ({
  kind: 'tree',
  position: { x, y: 0, z },
  radius,
  height
});
/** y 는 발 밑 높이 (0 = 지상, 2.65 = 2층 바닥). */
const enemy = (x: number, z: number, y = 0): EnemyDef => ({ position: { x, y, z } });

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: '야전 정찰',
    theme: 'field',
    grenades: 5,
    props: [tree(-2.6, -6), tree(2.5, -8), tree(-0.6, -9.8)],
    walls: [],
    // 넓게 흩어놓아 한 발에 여럿 정리되지 않도록. 다 사거리 안(≤14m).
    enemies: [
      enemy(-2.7, -6.5),
      enemy(2.6, -8.4),
      enemy(0.3, -10),
      enemy(-3.4, -8.6),
      enemy(3.4, -5.6)
    ]
  },
  {
    id: 2,
    name: '검문소',
    theme: 'mixed',
    grenades: 5,
    props: [tree(-4.2, -5.4)],
    // 정면 낮은 방벽(1.4m) — 직선으로는 안 닿고 넘겨야 함.
    walls: [wall(-1, -6, 6.5, 1.4), wall(3.6, -6.4, 2.2, 1.9)],
    enemies: [
      enemy(-2.6, -7.8),
      enemy(-0.6, -8.4),
      enemy(1.4, -7.8),
      enemy(3.6, -8),
      enemy(-4.2, -6.4)
    ]
  },
  {
    id: 3,
    name: '2층집',
    theme: 'urban',
    grenades: 5,
    walls: [
      // 2층 높이(5m) 전면 기둥 — 가운데는 뻥 뚫려 위로 로브 가능
      box(-3.7, 2.5, -8, 2, 5, 0.6),
      box(3.7, 2.5, -8, 2, 5, 0.6),
      // 후면/측면 벽
      wall(0, -10.4, 9, 5),
      box(-4.6, 2.5, -9.2, 0.6, 5, 3),
      box(4.6, 2.5, -9.2, 0.6, 5, 3),
      // 2층 바닥 슬래브 (윗면 y=2.65)
      floor(0, -9.1, 2.65, 7.2, 3),
      // 1층 전면 개구부 유리창 2개 (부수고 굴려넣기)
      glass(-1.3, -8, 2.3, 2.2),
      glass(1.3, -8, 2.3, 2.2),
      // 2층 전면 난간 (윗면 y≈3.35) — 이걸 넘겨야 2층 적
      box(0, 3.0, -7.7, 6.8, 0.7, 0.3)
    ],
    enemies: [
      // 1층
      enemy(-1.3, -9, 0),
      enemy(1.3, -9.2, 0),
      // 2층
      enemy(-1, -9, 2.65),
      enemy(1.2, -9.4, 2.65),
      enemy(0.1, -10, 2.65)
    ]
  },
  {
    id: 4,
    name: '참호선',
    theme: 'mixed',
    grenades: 4,
    props: [tree(-4.3, -7.5), tree(4, -8)],
    // 높이가 제각각인 방벽 — 낮은 틈으로는 직사, 높은 데는 로브.
    walls: [
      wall(-3, -6.8, 3, 1.2),
      wall(0, -6.5, 3, 1.8),
      wall(3, -7.1, 2.8, 1.05)
    ],
    enemies: [
      enemy(-3.6, -9),
      enemy(-1.4, -8.6),
      enemy(0.5, -9.2),
      enemy(2.4, -8.6),
      enemy(3.7, -9.8)
    ]
  },
  {
    id: 5,
    name: '옥상 점령',
    theme: 'urban',
    grenades: 4,
    props: [tree(5.2, -6)],
    walls: [
      // 3.2m 통벽 건물 정면
      box(0, 1.6, -8.2, 9, 3.2, 0.7),
      // 옥상 슬래브 (윗면 y=3.5)
      floor(0, -9.4, 3.5, 9, 3.4),
      // 파라펫 (전면/측면) — 윗면 y≈4.1, 이걸 넘겨 정밀 로브
      box(0, 3.85, -7.8, 9, 0.7, 0.3),
      box(-4.35, 3.85, -9.4, 0.3, 0.7, 3.4),
      box(4.35, 3.85, -9.4, 0.3, 0.7, 3.4),
      // 지상 측면 엄폐
      wall(-4.6, -6, 2, 1.5)
    ],
    enemies: [
      // 옥상
      enemy(-1.9, -9.2, 3.5),
      enemy(0.4, -9.6, 3.5),
      enemy(2.2, -9.2, 3.5),
      // 지상 측면
      enemy(-4.7, -6.8, 0),
      enemy(5.2, -6.6, 0)
    ]
  }
];

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}
