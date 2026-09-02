import * as THREE from 'three';
import type { Game } from '../core/Game';
import type { GameScene } from '../core/Scene';
import { buildEnvironment } from '../gameplay/Environment';
import { makeCamera, disposeScene } from '../utils/three';
import { LEVELS } from '../levels/levels';
import { loadProgress } from '../utils/storage';
import { centerPanel, el, button, starString } from '../ui/overlay';

export class LevelSelectScene implements GameScene {
  readonly three = new THREE.Scene();
  readonly camera = makeCamera();

  constructor(game: Game) {
    buildEnvironment(this.three, game.renderer);
    this.camera.position.set(0, 1.7, 6);
    this.camera.lookAt(0, 1.1, -12);

    const progress = loadProgress();
    const children: (Node | null)[] = [el('h1', 'ui-title', '스테이지 선택')];

    for (const level of LEVELS) {
      const unlocked = level.id <= progress.unlockedMaxLevel;
      const stars = progress.stars[level.id] ?? 0;
      const label = unlocked
        ? `${level.id}. ${level.name}   ${starString(stars)}`
        : `🔒 ${level.name}`;
      children.push(
        button(label, () => game.goGame(level.id), { disabled: !unlocked })
      );
    }
    children.push(button('← 메뉴', () => game.goMenu(), { secondary: true }));

    centerPanel(game.ui, ...children);
  }

  update(): void {
    /* 정적 배경 */
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    disposeScene(this.three);
  }
}
