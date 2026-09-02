import * as THREE from 'three';
import type { Game } from '../core/Game';
import type { GameScene } from '../core/Scene';
import type { StageResult } from '../config/types';
import { buildEnvironment } from '../gameplay/Environment';
import { makeCamera, disposeScene } from '../utils/three';
import { getLevel } from '../levels/levels';
import { centerPanel, el, button, starString } from '../ui/overlay';

export class ResultScene implements GameScene {
  readonly three = new THREE.Scene();
  readonly camera = makeCamera();
  private t = 0;

  constructor(game: Game, result: StageResult) {
    buildEnvironment(this.three);
    this.camera.position.set(0, 1.7, 6);
    this.camera.lookAt(0, 1.1, -12);

    const next = getLevel(result.levelId + 1);
    const children: (Node | null)[] = [
      el('h1', 'ui-title', result.cleared ? '스테이지 클리어!' : '실패'),
      el('div', 'stars', starString(result.stars)),
      el(
        'p',
        'ui-sub',
        `처치 ${result.enemiesKilled}/${result.enemiesTotal} · 사용 수류탄 ${result.grenadesUsed}`
      )
    ];
    if (result.cleared && next) {
      children.push(button('다음 스테이지', () => game.goGame(next.id)));
    }
    children.push(button('다시 시도', () => game.goGame(result.levelId), { secondary: true }));
    children.push(button('스테이지 선택', () => game.goLevelSelect(), { secondary: true }));

    centerPanel(game.ui, ...children);
  }

  update(dt: number): void {
    this.t += dt;
    this.camera.position.x = Math.sin(this.t * 0.3) * 1.2;
    this.camera.lookAt(0, 1.1, -12);
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    disposeScene(this.three);
  }
}
