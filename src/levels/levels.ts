import type { LevelDef, WallDef, PropDef, EnemyDef } from '../config/types';

/**
 * 레벨 데이터 (5 스테이지) — 3D 좌표.
 * 플레이어는 z≈6.5 에서 -Z 방향을 바라봄. 적/벽은 음(-)의 z 에 배치. 바닥 y=0.
 * 벽 position.y = size.y/2 (바닥에 닿게). 적 키 ≈ 1.8m.
 *
 * 테마별 전투 양상:
 *  - field : 벽 없이 나무 기둥 뒤 엄폐 (야전)
 *  - urban : 콘크리트 벽 + 유리창. 유리는 수류탄 접촉/근접 폭발에 깨짐 (건물 전투)
 *  - mixed : 둘의 조합
 */
const wall = (x: number, z: number, w: number, h: number, d = 0.6): WallDef => ({
  position: { x, y: h / 2, z },
  size: { x: w, y: h, z: d }
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
const enemy = (x: number, z: number, y = 0): EnemyDef => ({ position: { x, y, z } });

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: '야전 정찰',
    theme: 'field',
    grenades: 5,
    props: [tree(-2.2, -11), tree(1.8, -12.5), tree(0, -15)],
    walls: [],
    enemies: [enemy(-2.2, -12), enemy(1.8, -13.4), enemy(0.2, -15.9), enemy(-0.4, -10.2)]
  },
  {
    id: 2,
    name: '검문소',
    theme: 'mixed',
    grenades: 5,
    props: [tree(3.6, -9)],
    walls: [wall(-0.6, -9, 5, 1.3)],
    enemies: [enemy(-1.8, -11), enemy(-0.2, -11.6), enemy(1.4, -11), enemy(3.6, -10)]
  },
  {
    id: 3,
    name: '폐가',
    theme: 'urban',
    grenades: 4,
    walls: [
      // ㄷ자 건물 전면 + 측벽
      wall(-3.4, -10, 2, 2.4),
      wall(3.4, -10, 2, 2.4),
      wall(0, -12.4, 8.8, 2.4, 0.6),
      wall(-4.4, -11.2, 0.6, 2.4, 3),
      wall(4.4, -11.2, 0.6, 2.4, 3),
      // 전면 개구부의 유리창 2개
      glass(-1.2, -10, 2.2, 2),
      glass(1.2, -10, 2.2, 2)
    ],
    enemies: [enemy(-1.2, -11.2), enemy(1.2, -11.4), enemy(0, -12), enemy(2.6, -11)]
  },
  {
    id: 4,
    name: '참호선',
    theme: 'mixed',
    grenades: 4,
    props: [tree(-3.4, -10.5), tree(3.2, -10.5)],
    walls: [wall(-2.4, -9, 2.8, 1.2), wall(0.4, -8.6, 3, 1.9), wall(3, -9.4, 2.6, 1.1)],
    enemies: [
      enemy(-3.4, -11.4),
      enemy(-1.6, -11),
      enemy(0.4, -11.4),
      enemy(2.2, -11),
      enemy(3.4, -12)
    ]
  },
  {
    id: 5,
    name: '점령 구역',
    theme: 'urban',
    grenades: 4,
    props: [tree(4.6, -8.5)],
    walls: [
      wall(-3.8, -9.5, 2.6, 2.6, 0.7),
      wall(3.4, -9.5, 2.4, 2.6, 0.7),
      wall(0, -12.6, 9.5, 2.6, 0.6),
      wall(-4.9, -11, 0.7, 2.6, 3.4),
      wall(4.5, -11, 0.7, 2.6, 3.4),
      glass(-1.6, -9.5, 2, 2.1),
      glass(0.6, -9.5, 1.8, 2.1),
      glass(2.2, -9.5, 1.6, 2.1)
    ],
    enemies: [
      enemy(-1.6, -10.8),
      enemy(0.6, -11),
      enemy(2, -10.8),
      enemy(0, -12.1),
      enemy(4.6, -9.6)
    ]
  }
];

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}
