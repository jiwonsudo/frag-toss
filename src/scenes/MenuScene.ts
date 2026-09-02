import * as THREE from 'three';
import type { Game } from '../core/Game';
import type { GameScene } from '../core/Scene';
import { buildEnvironment } from '../gameplay/Environment';
import { makeCamera, disposeScene } from '../utils/three';
import { COLORS } from '../config/constants';
import { createHuman, shuffledVariants } from '../gameplay/models';
import { centerPanel, el, button } from '../ui/overlay';

export class MenuScene implements GameScene {
  readonly three = new THREE.Scene();
  readonly camera = makeCamera();
  private t = 0;

  constructor(game: Game) {
    buildEnvironment(this.three, game.renderer);

    // 배경 소품
    const wallMat = new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.9 });
    for (const [x, h, z] of [
      [-2, 2, -9],
      [2.2, 1.4, -11],
      [0, 3, -14]
    ] as const) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(3, h, 0.6), wallMat);
      m.position.set(x, h / 2, z);
      m.castShadow = true;
      m.receiveShadow = true;
      this.three.add(m);
    }
    const variants = shuffledVariants(3, 7);
    [
      [-1, -12, 0.3],
      [1.5, -13, -0.5],
      [0.2, -15, 0.1]
    ].forEach(([x, z, ry], i) => {
      const g = new THREE.Group();
      g.add(createHuman(variants[i]).root);
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      this.three.add(g);
    });

    centerPanel(
      game.ui,
      el('h1', 'ui-title', '수류탄 던지기'),
      el('p', 'ui-sub', '1인칭 3D · 아래에서 위로 스와이프해서 던지세요'),
      button('게임 시작', () => game.goLevelSelect())
    );
  }

  update(dt: number): void {
    this.t += dt;
    this.camera.position.x = Math.sin(this.t * 0.25) * 1.6;
    this.camera.position.y = 1.7 + Math.sin(this.t * 0.4) * 0.1;
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
