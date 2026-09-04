import * as THREE from 'three';
import { SWIPE } from '../config/constants';

const UP = new THREE.Vector3(0, 1, 0);

export interface SwipeThrow {
  /** 월드 발사 속도(m/s). Rapier setLinvel 에 그대로 사용. */
  velocity: THREE.Vector3;
  /** 0~1 파워 (UI 표시용). */
  power: number;
}

type CookStartCb = () => void;
/** 쿠킹 중 손가락의 정규화 가로 이동량(-왼쪽 ~ +오른쪽, 화면높이 비율). */
type CookMoveCb = (dxNorm: number) => void;
type AimCb = (t: SwipeThrow) => void;
type ThrowCb = (t: SwipeThrow) => void;
type CancelCb = () => void;

/**
 * 화면 스와이프(아래→위) → 3D 발사 벡터.
 * - 카메라 정면을 기준으로 가로 성분은 좌우 조준각, 세로 성분은 올려각/파워.
 * - 위로 충분히(minUp) 스와이프하지 않으면 무시 (원본의 dy<0 규칙).
 * - 파워는 (정규화 거리 / 시간) 속도 기반 → 화면 크기 독립.
 */
export class SwipeController {
  private el: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private enabled = true;
  private active = false;
  private startX = 0;
  private startY = 0;
  private startT = 0;
  // 실제 스와이프 모션이 시작된 시점. 쿠킹(터치 홀딩) 시간은 던지는 세기에서 제외한다.
  private moveStartT = 0;

  private cookStartCb?: CookStartCb;
  private cookMoveCb?: CookMoveCb;
  private aimCb?: AimCb;
  private throwCb?: ThrowCb;
  private cancelCb?: CancelCb;

  constructor(el: HTMLElement, camera: THREE.PerspectiveCamera) {
    this.el = el;
    this.camera = camera;
    el.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }

  /** pointerdown 시점 (쿠킹 시작). */
  onCookStart(cb: CookStartCb): this {
    this.cookStartCb = cb;
    return this;
  }
  onCookMove(cb: CookMoveCb): this {
    this.cookMoveCb = cb;
    return this;
  }
  onAim(cb: AimCb): this {
    this.aimCb = cb;
    return this;
  }
  onThrow(cb: ThrowCb): this {
    this.throwCb = cb;
    return this;
  }
  onCancel(cb: CancelCb): this {
    this.cancelCb = cb;
    return this;
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v && this.active) {
      this.active = false;
      this.cancelCb?.();
    }
  }

  private onDown = (e: PointerEvent): void => {
    if (!this.enabled) return;
    this.active = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startT = performance.now();
    this.moveStartT = 0;
    this.cookStartCb?.();
  };

  private onMove = (e: PointerEvent): void => {
    if (!this.active || !this.enabled) return;
    // 처음으로 유의미하게 움직인 순간을 스와이프 시작으로 기록 (쿠킹 홀딩 시간 배제)
    if (this.moveStartT === 0) {
      const moved = Math.hypot(e.clientX - this.startX, e.clientY - this.startY);
      if (moved > 6) this.moveStartT = performance.now();
    }
    // 유효 스와이프 여부와 무관하게, 쿠킹 중 손가락 가로 이동을 그대로 전달 (손의 수류탄 조준)
    this.cookMoveCb?.((e.clientX - this.startX) / window.innerHeight);

    const t = this.compute(e.clientX, e.clientY);
    if (t) this.aimCb?.(t);
  };

  private onUp = (e: PointerEvent): void => {
    if (!this.active) return;
    this.active = false;
    if (!this.enabled) return;
    const t = this.compute(e.clientX, e.clientY);
    if (t) this.throwCb?.(t);
    else this.cancelCb?.();
  };

  private compute(px: number, py: number): SwipeThrow | null {
    const dx = px - this.startX;
    const dy = py - this.startY;
    const dist = Math.hypot(dx, dy);
    if (dist < SWIPE.minDistancePx) return null;

    const vh = window.innerHeight;
    const nUp = -dy / vh; // 위로가 양수
    if (nUp < SWIPE.minUp) return null;

    const nx = dx / vh;
    // 세기는 "실제 스와이프 모션" 소요 시간만으로 계산 — 홀딩(쿠킹) 시간은 제외.
    const moveMs = performance.now() - (this.moveStartT || this.startT);
    const dur = THREE.MathUtils.clamp(moveMs, SWIPE.minDurationMs, SWIPE.maxDurationMs);
    const normSpeed = dist / vh / dur; // (화면비율)/ms
    // 0~1 파워 → 감마 곡선(초반 완만) → 발사 속도
    const raw = THREE.MathUtils.clamp(normSpeed / SWIPE.refNormSpeed, 0, 1);
    const curved = Math.pow(raw, SWIPE.powerGamma);
    const speed = THREE.MathUtils.lerp(SWIPE.minSpeed, SWIPE.maxSpeed, curved);

    const yawRatio = THREE.MathUtils.clamp(nx / 0.5, -1, 1);
    const yaw = -yawRatio * SWIPE.yawRange;
    const pitchRatio = THREE.MathUtils.clamp(nUp / 0.5, 0, 1);
    const pitch = SWIPE.pitchBase + pitchRatio * SWIPE.pitchRange;

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1);
    dir.normalize();
    dir.applyAxisAngle(UP, yaw);
    const right = dir.clone().cross(UP).normalize();
    dir.applyAxisAngle(right, pitch);
    dir.normalize();

    return {
      velocity: dir.multiplyScalar(speed),
      power: (speed - SWIPE.minSpeed) / (SWIPE.maxSpeed - SWIPE.minSpeed)
    };
  }

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
  }
}
