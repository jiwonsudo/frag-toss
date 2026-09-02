export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type WallMaterial = 'concrete' | 'glass';

export interface WallDef {
  /** 중심 위치. */
  position: Vec3;
  /** 전체 크기(가로, 높이, 두께). */
  size: Vec3;
  /** 재질. 'glass' 는 수류탄 접촉/근접 폭발에 깨지고 파편이 흩어짐. 기본 'concrete'. */
  material?: WallMaterial;
}

export interface PropDef {
  /** 지금은 나무 기둥(엄폐물)만. 물리 충돌 O, 캐노피는 시각용. */
  kind: 'tree';
  /** 밑동 위치 (y=0 기준). */
  position: Vec3;
  /** 기둥 반경(m). 기본 0.32. */
  radius?: number;
  /** 전체 높이(m). 기본 5. */
  height?: number;
}

export interface EnemyDef {
  /** 발 밑 위치 (y 는 바닥=0 기준). */
  position: Vec3;
}

export interface LevelDef {
  id: number;
  name: string;
  grenades: number;
  /** 무드/설명용 태그. */
  theme?: 'field' | 'urban' | 'mixed';
  camera?: {
    position: Vec3;
    lookAt: Vec3;
  };
  walls: WallDef[];
  /** 나무 기둥 등 엄폐물 프롭. */
  props?: PropDef[];
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
