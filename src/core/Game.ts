import * as THREE from 'three';
import type { GameScene, SceneFactory } from './Scene';
import type { StageResult } from '../config/types';
import { MenuScene } from '../scenes/MenuScene';
import { LevelSelectScene } from '../scenes/LevelSelectScene';
import { GameplayScene } from '../scenes/GameScene';
import { ResultScene } from '../scenes/ResultScene';

/**
 * 렌더러 + 렌더 루프 + 씬 전환 소유자.
 * 씬은 각자 THREE.Scene / PerspectiveCamera 를 들고 있고, Game 은 현재 씬만 렌더.
 */
export class Game {
  readonly renderer: THREE.WebGLRenderer;
  /** 씬들이 DOM UI 를 그리는 오버레이 루트. */
  readonly ui: HTMLElement;

  private current: GameScene | null = null;
  private clock = new THREE.Clock();
  private running = false;

  constructor(canvas: HTMLCanvasElement, ui: HTMLElement) {
    this.ui = ui;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  start(): void {
    this.goMenu();
    if (!this.running) {
      this.running = true;
      this.clock.start();
      this.renderer.setAnimationLoop(this.tick);
    }
  }

  // --- 네비게이션 ---
  goMenu(): void {
    this.setScene((g) => new MenuScene(g));
  }
  goLevelSelect(): void {
    this.setScene((g) => new LevelSelectScene(g));
  }
  goGame(levelId: number): void {
    this.setScene((g) => new GameplayScene(g, levelId));
  }
  goResult(result: StageResult): void {
    this.setScene((g) => new ResultScene(g, result));
  }

  private setScene(factory: SceneFactory): void {
    this.current?.dispose();
    this.ui.replaceChildren();
    this.current = factory(this);
    this.resizeCurrent();
  }

  private tick = (): void => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.current) {
      this.current.update(dt);
      this.renderer.render(this.current.three, this.current.camera);
    }
  };

  private handleResize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.resizeCurrent();
  };

  private resizeCurrent(): void {
    this.current?.resize(window.innerWidth, window.innerHeight);
  }
}
