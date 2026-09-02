import * as THREE from 'three';
import type { Game } from '../core/Game';
import type { GameScene } from '../core/Scene';
import type { LevelDef, StageResult } from '../config/types';
import { getLevel } from '../levels/levels';
import { GAMEPLAY, COOK } from '../config/constants';
import { buildEnvironment } from '../gameplay/Environment';
import { makeCamera, disposeScene, v3 } from '../utils/three';
import { PhysicsWorld } from '../gameplay/PhysicsWorld';
import { Wall } from '../gameplay/Wall';
import { Enemy } from '../gameplay/Enemy';
import { Grenade } from '../gameplay/Grenade';
import { TrajectoryPreview } from '../gameplay/TrajectoryPreview';
import { ExplosionSystem } from '../gameplay/ExplosionSystem';
import { computeStars } from '../gameplay/ScoreSystem';
import { SwipeController, type SwipeThrow } from '../input/SwipeController';
import { recordResult } from '../utils/storage';
import { el } from '../ui/overlay';

const SPAWN_OFFSET = new THREE.Vector3(0.25, -0.28, -0.55);

export class GameplayScene implements GameScene {
  readonly three = new THREE.Scene();
  readonly camera = makeCamera();

  private game: Game;
  private level: LevelDef;
  private physics = new PhysicsWorld();
  private walls: Wall[] = [];
  private enemies: Enemy[] = [];
  private grenade: Grenade | null = null;

  private swipe: SwipeController;
  private preview: TrajectoryPreview;
  private explosions: ExplosionSystem;

  private grenadesTotal: number;
  private grenadesLeft: number;
  private grenadesUsed = 0;
  private resolveTimer = -1;
  private finished = false;

  // 쿠킹: pointerdown 부터 흐르는 신관 시계. 던진 뒤에도 계속 흐름.
  private cooking = false;
  private cookStartMs = 0;

  private cameraBase = new THREE.Vector3();
  private hudGrenades!: HTMLElement;
  private hudEnemies!: HTMLElement;
  private cookGauge!: HTMLElement;
  private cookFill!: HTMLElement;
  private cookLabel!: HTMLElement;

  constructor(game: Game, levelId: number) {
    this.game = game;
    this.level = getLevel(levelId) ?? getLevel(1)!;
    this.grenadesTotal = this.level.grenades ?? GAMEPLAY.defaultGrenades;
    this.grenadesLeft = this.grenadesTotal;

    buildEnvironment(this.three);
    this.physics.addGround();

    if (this.level.camera) {
      this.camera.position.copy(v3(this.level.camera.position));
      this.camera.lookAt(v3(this.level.camera.lookAt));
    }
    this.cameraBase.copy(this.camera.position);

    for (const w of this.level.walls) this.walls.push(new Wall(this.three, this.physics, w));
    for (const e of this.level.enemies) this.enemies.push(new Enemy(this.three, e));

    this.preview = new TrajectoryPreview(this.three);
    this.explosions = new ExplosionSystem(this.three, this.camera);
    this.explosions.setCameraBase(this.cameraBase);

    this.swipe = new SwipeController(game.renderer.domElement, this.camera)
      .onCookStart(() => this.onCookStart())
      .onAim((t) => this.onAim(t))
      .onThrow((t) => this.onThrow(t))
      .onCancel(() => this.onCancel());

    this.buildHud();
    this.refreshHud();
  }

  private buildHud(): void {
    const hud = el('div', 'hud');
    this.hudGrenades = el('span', 'pill', '');
    this.hudEnemies = el('span', 'pill', '');
    const title = el('span', 'pill', `${this.level.id}. ${this.level.name}`);
    const pause = el('button', undefined, '⏸');
    pause.addEventListener('click', () => this.game.goLevelSelect());
    hud.append(this.hudGrenades, title, this.hudEnemies, pause);
    this.game.ui.appendChild(hud);

    this.game.ui.appendChild(el('div', 'crosshair'));

    this.cookLabel = el('div', 'cook-label', 'COOK');
    this.cookGauge = el('div', 'cook-gauge');
    this.cookFill = el('div', 'cook-fill');
    this.cookGauge.appendChild(this.cookFill);
    this.game.ui.append(this.cookLabel, this.cookGauge);

    this.game.ui.appendChild(
      el('div', 'hint', '누르는 순간부터 3초 신관 · 위로 스와이프해 던지고 타이밍을 노려라')
    );
  }

  private canCook(): boolean {
    return (
      !this.finished &&
      !this.cooking &&
      this.grenade === null &&
      this.resolveTimer < 0 &&
      this.grenadesLeft > 0
    );
  }

  private spawnPoint(): THREE.Vector3 {
    this.camera.updateMatrixWorld();
    return SPAWN_OFFSET.clone().applyMatrix4(this.camera.matrixWorld);
  }

  private onCookStart(): void {
    if (!this.canCook()) return;
    this.cooking = true;
    this.cookStartMs = performance.now();
    this.showGauge(true);
  }

  private onAim(t: SwipeThrow): void {
    if (!this.cooking) return;
    this.preview.show(this.spawnPoint(), t.velocity);
  }

  private onThrow(t: SwipeThrow): void {
    if (!this.cooking) return;
    this.cooking = false;
    this.preview.hide();
    this.showGauge(false);
    this.grenadesLeft--;
    this.grenadesUsed++;

    const remainMs = COOK.durationMs - (performance.now() - this.cookStartMs);
    const p = this.spawnPoint();
    this.grenade = new Grenade(this.three, this.physics, p, t.velocity, remainMs);
    this.refreshHud();
  }

  private onCancel(): void {
    this.cooking = false;
    this.preview.hide();
    if (!this.grenade) this.showGauge(false);
  }

  update(dt: number): void {
    this.physics.step(dt);
    this.explosions.update(dt);
    for (const e of this.enemies) e.update(dt);

    // 신관 게이지 (손에 들고 쿠킹하는 동안만)
    if (this.cooking) {
      const elapsed = performance.now() - this.cookStartMs;
      this.updateGauge(elapsed / COOK.durationMs);

      if (COOK.cookOffInHand && elapsed >= COOK.durationMs) {
        // 던지지 않고 끝까지 들고 있었음 → 손에서 폭발
        this.cooking = false;
        this.preview.hide();
        this.grenadesLeft--;
        this.grenadesUsed++;
        this.refreshHud();
        this.detonateAt(this.spawnPoint());
        return;
      }
    }

    if (this.grenade && this.grenade.update(dt)) {
      const point = this.grenade.position.clone();
      this.grenade.exploded = true;
      this.grenade.dispose();
      this.grenade = null;
      this.detonateAt(point);
    }

    if (this.resolveTimer >= 0) {
      this.resolveTimer -= dt;
      if (this.resolveTimer < 0) this.evaluate();
    }
  }

  private detonateAt(point: THREE.Vector3): void {
    this.explosions.detonate(point, this.enemies, this.walls);
    this.showGauge(false);
    this.refreshHud();
    this.resolveTimer = 0.7;
  }

  private evaluate(): void {
    if (this.finished) return;
    const alive = this.enemies.filter((e) => e.alive).length;
    if (alive === 0) this.endStage(true);
    else if (this.grenadesLeft === 0 && this.grenade === null) this.endStage(false);
  }

  private endStage(cleared: boolean): void {
    this.finished = true;
    this.swipe.setEnabled(false);
    this.showGauge(false);
    const killed = this.enemies.filter((e) => !e.alive).length;
    const stars = computeStars({
      cleared,
      grenadesTotal: this.grenadesTotal,
      grenadesUsed: this.grenadesUsed
    });
    if (cleared) recordResult(this.level.id, stars);

    const result: StageResult = {
      levelId: this.level.id,
      cleared,
      stars,
      grenadesUsed: this.grenadesUsed,
      enemiesKilled: killed,
      enemiesTotal: this.enemies.length
    };
    window.setTimeout(() => this.game.goResult(result), 700);
  }

  private showGauge(on: boolean): void {
    this.cookGauge.classList.toggle('on', on);
    this.cookLabel.classList.toggle('on', on);
    if (!on) {
      this.cookFill.style.height = '0%';
      this.cookGauge.classList.remove('danger');
    }
  }

  private updateGauge(ratio: number): void {
    const r = THREE.MathUtils.clamp(ratio, 0, 1);
    this.cookFill.style.height = `${r * 100}%`;
    this.cookGauge.classList.toggle('danger', r >= COOK.dangerFrom);
  }

  private refreshHud(): void {
    const alive = this.enemies.filter((e) => e.alive).length;
    this.hudGrenades.textContent = `💣 ${this.grenadesLeft}/${this.grenadesTotal}`;
    this.hudEnemies.textContent = `😈 ${alive}`;
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose(): void {
    this.swipe.dispose();
    this.preview.dispose();
    this.explosions.dispose();
    for (const w of this.walls) w.dispose();
    for (const e of this.enemies) e.dispose();
    this.grenade?.dispose();
    this.physics.dispose();
    disposeScene(this.three);
  }
}
