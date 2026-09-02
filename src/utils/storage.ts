import type { ProgressData } from '../config/types';
import { LEVELS } from '../levels/levels';

const KEY = 'grenade-game.progress.v1';

const DEFAULT: ProgressData = {
  stars: {},
  unlockedMaxLevel: 1
};

export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT };
    const parsed = JSON.parse(raw) as ProgressData;
    return {
      stars: parsed.stars ?? {},
      unlockedMaxLevel: parsed.unlockedMaxLevel ?? 1
    };
  } catch {
    return { ...DEFAULT };
  }
}

export function saveProgress(data: ProgressData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* private 모드 등 - 무시 */
  }
}

/** 스테이지 클리어 결과를 반영하고 다음 스테이지를 잠금 해제. */
export function recordResult(levelId: number, stars: number): ProgressData {
  const data = loadProgress();
  data.stars[levelId] = Math.max(data.stars[levelId] ?? 0, stars);
  const maxLevelId = LEVELS[LEVELS.length - 1].id;
  if (stars > 0 && levelId < maxLevelId) {
    data.unlockedMaxLevel = Math.max(data.unlockedMaxLevel, levelId + 1);
  }
  saveProgress(data);
  return data;
}

export function isUnlocked(levelId: number): boolean {
  return levelId <= loadProgress().unlockedMaxLevel;
}
