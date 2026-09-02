export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface WallDef {
  /** 중심 위치. */
  position: Vec3;
  /** 전체 크기(가로, 높이, 두께). */
  size: Vec3;
}

export interface EnemyDef {
  /** 발 밑 위치 (y 는 바닥=0 기준). */
  position: Vec3;
}

export interface LevelDef {
  id: number;
  name: string;
  grenades: number;
  camera?: {
    position: Vec3;
    lookAt: Vec3;
  };
  walls: WallDef[];
  enemies: EnemyDef[];
}

export interface StageResult {
  levelId: number;
  cleared: boolean;
  stars: number;
  grenadesUsed: number;
  enemiesKilled: number;
  enemiesTotal: number;
}

export interface ProgressData {
  stars: Record<number, number>;
  unlockedMaxLevel: number;
}
