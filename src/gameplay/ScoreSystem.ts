import { GAMEPLAY } from '../config/constants';

/** 별점: 클리어(모든 적 처치) 필수, 남은 수류탄 수로 1~3성. */
export function computeStars(params: {
  cleared: boolean;
  grenadesTotal: number;
  grenadesUsed: number;
}): number {
  if (!params.cleared) return 0;
  const remaining = params.grenadesTotal - params.grenadesUsed;
  if (remaining >= GAMEPLAY.star3RemainingGrenades) return 3;
  if (remaining >= GAMEPLAY.star2RemainingGrenades) return 2;
  return 1;
}
