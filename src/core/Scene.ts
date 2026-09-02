import * as THREE from 'three';
import type { Game } from './Game';

/** 모든 씬이 구현하는 인터페이스. Game 이 생명주기를 관리. */
export interface GameScene {
  readonly three: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  /** 매 프레임. dt 는 초 단위(상한 클램프됨). */
  update(dt: number): void;
  /** 뷰포트 변경 시. */
  resize(width: number, height: number): void;
  /** 씬 전환으로 제거될 때 리소스 정리. */
  dispose(): void;
}

export type SceneFactory = (game: Game) => GameScene;
