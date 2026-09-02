import type { LevelDef } from '../config/types';

/**
 * MVP 레벨 데이터 (5 스테이지) — 3D 좌표.
 * 플레이어는 z≈6.5 에서 -Z 방향을 바라봄. 적/벽은 음(-)의 z 에 배치.
 * 바닥은 y=0. 적 position.y 는 0(발밑). 벽 position.y = size.y / 2 (바닥에 닿게).
 * 적 키는 약 1.9m. 벽을 그보다 낮게 두면 머리가 보이고, 높은 벽(2m+)은 완전 엄폐.
 */
const wall = (x: number, z: number, w: number, h: number, d = 0.6) => ({
  position: { x, y: h / 2, z },
  size: { x: w, y: h, z: d }
});
const enemy = (x: number, z: number, y = 0) => ({ position: { x, y, z } });

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: '연습장',
    grenades: 5,
    walls: [wall(0, -9, 3.2, 1.1)],
    enemies: [enemy(0, -12.5), enemy(1.5, -13), enemy(-1.7, -12)]
  },
  {
    id: 2,
    name: '이중 엄폐',
    grenades: 5,
    walls: [wall(-2, -8, 3.4, 1.4), wall(2.4, -10, 3, 1.1)],
    enemies: [enemy(-2.2, -11), enemy(-0.5, -12), enemy(2.6, -13), enemy(3.4, -12.5)]
  },
  {
    id: 3,
    name: '높은 벽',
    grenades: 4,
    walls: [wall(-0.5, -8.5, 4, 2.2), wall(3, -11, 2.4, 1.2)],
    enemies: [enemy(0, -12), enemy(1.2, -13), enemy(3.2, -13.5)]
  },
  {
    id: 4,
    name: '참호',
    grenades: 4,
    walls: [wall(-3, -9, 2.6, 1.2), wall(0, -8.5, 3, 1.9), wall(3, -9, 2.6, 1.2)],
    enemies: [
      enemy(-3, -12),
      enemy(-1.4, -12.5),
      enemy(0.4, -13),
      enemy(2, -12.5),
      enemy(3.4, -12)
    ]
  },
  {
    id: 5,
    name: '요새',
    grenades: 4,
    walls: [wall(-2, -8, 4.2, 2.4, 0.7), wall(1.6, -10.5, 2, 1.1), wall(3.8, -8.5, 3.6, 2, 0.7)],
    enemies: [
      enemy(-1.6, -12),
      enemy(-0.2, -12.8),
      enemy(1.4, -13.2),
      enemy(3.6, -12.5),
      enemy(1.8, -11.2, 1.2)
    ]
  }
];

export function getLevel(id: number): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}
