import * as THREE from 'three';
import type { EnemyDef } from '../config/types';
import { createHuman, type BoneRig } from './models';

const HEIGHT = 1.78;
const UP = new THREE.Vector3(0, 1, 0);
const PIVOT_Y = 0.92; // 허리 피벗 높이

/**
 * 적 (Mixamo 리깅 모델). 물리 바디 없이 위치만.
 * 사망: 배그 기절처럼 다리가 풀리며 앞으로 무너져 엎어짐 — 뼈를 움직여 몸을 접고,
 * 그룹은 허리를 축으로 넘기며 바닥으로 가라앉힌다.
 */
export class Enemy {
  readonly group: THREE.Group;
  readonly center = new THREE.Vector3();
  alive = true;

  private inner: THREE.Object3D;
  private rig: BoneRig | null;
  private baseYaw: number;
  private base: THREE.Vector3;
  private phase = Math.random() * Math.PI * 2;
  private swaySpeed = 1.0 + Math.random() * 0.6;
  private t = 0;

  // 사망
  private deadT = 0;
  private tipAxis = new THREE.Vector3(1, 0, 0);
  private fallDir = new THREE.Vector3(0, 0, 1);
  private force = 0.6;
  private rollSign = Math.random() < 0.5 ? -1 : 1;
  private target = new Map<THREE.Object3D, THREE.Quaternion>();

  constructor(scene: THREE.Scene, def: EnemyDef, variant = 0) {
    const h = createHuman(variant);
    this.inner = h.root;
    this.rig = h.rig && Object.keys(h.rig.bones).length ? h.rig : null;
    this.inner.position.y = -PIVOT_Y;

    this.group = new THREE.Group();
    this.group.add(this.inner);
    this.group.position.set(def.position.x, def.position.y + PIVOT_Y, def.position.z);
    this.baseYaw = (Math.random() - 0.5) * 0.7;
    this.group.rotation.y = this.baseYaw;
    scene.add(this.group);

    this.base = new THREE.Vector3(def.position.x, def.position.y, def.position.z);
    this.center.set(def.position.x, def.position.y + HEIGHT * 0.5, def.position.z);
  }

  /** @param dir 폭심→적 수평 단위벡터 @param force 근접도 0~1 */
  kill(dir?: THREE.Vector3, force = 0.6): void {
    if (!this.alive) return;
    this.alive = false;

    const d = dir ? dir.clone() : new THREE.Vector3(0, 0, 1);
    d.y = 0;
    if (d.lengthSq() < 1e-4) d.set(0, 0, 1);
    d.normalize();
    this.fallDir.copy(d);
    this.tipAxis.crossVectors(UP, d).normalize();
    this.force = THREE.MathUtils.clamp(force, 0, 1);

    if (this.rig) this.buildCrumpleTarget();
  }

  /** 엎어진 최종 뼈 자세 (rest * delta). 값은 대략치 — Mixamo 기본 축 기준. */
  private buildCrumpleTarget(): void {
    const rig = this.rig!;
    const a = 0.5 + Math.random() * 0.5; // 좌우 비대칭
    const set = (key: string, x: number, y = 0, z = 0): void => {
      const b = rig.bones[key];
      const r = b && rig.rest.get(b);
      if (!b || !r) return;
      const q = r.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)));
      this.target.set(b, q);
    };
    set('hips', 0.15);
    set('spine', 0.1);
    set('spine1', 0.1);
    set('spine2', 0.08);
    set('neck', 0.1);
    set('head', 0.08, this.rollSign * 0.3);
    set('legLU', 0.28 * a, 0, 0.08);
    set('legRU', 0.28 * (1 - a) + 0.1, 0, -0.08);
    set('legL', -0.5 * a - 0.15);
    set('legR', -0.5 * (1 - a) - 0.25);
    set('armL', 0.35, 0, 0.55 + a * 0.4);
    set('armR', 0.3, 0, -(0.55 + (1 - a) * 0.4));
    set('foreL', 0.7);
    set('foreR', 0.6);
  }

  update(dt: number): void {
    this.t += dt;
    if (!this.alive) {
      this.updateDeath(dt);
      return;
    }
    const s = Math.sin(this.t * this.swaySpeed + this.phase);
    const s2 = Math.sin(this.t * this.swaySpeed * 0.5 + this.phase);
    this.group.rotation.set(0, this.baseYaw, s * 0.02);
    this.group.position.set(
      this.base.x + s2 * 0.03,
      this.base.y + PIVOT_Y + Math.abs(s) * 0.012,
      this.base.z
    );
    this.center.set(this.group.position.x, this.base.y + HEIGHT * 0.5, this.group.position.z);
  }

  private updateDeath(dt: number): void {
    this.deadT += dt;
    const DUR = 0.8;
    const p = THREE.MathUtils.clamp(this.deadT / DUR, 0, 1);
    // 앞부분 빠르게 무너지고 뒤로 갈수록 정착 (ease-out) + 착지 직전 작은 바운스
    const ease = 1 - Math.pow(1 - p, 2.2);
    const bounce = p > 0.82 ? Math.sin((p - 0.82) / 0.18 * Math.PI) * 0.04 * (1 - p) : 0;

    // --- 뼈: rest → target 로 보간 ---
    if (this.rig) {
      for (const [bone, tq] of this.target) {
        const rq = this.rig.rest.get(bone)!;
        bone.quaternion.copy(rq).slerp(tq, ease);
      }
    }

    // --- 그룹: 허리 축으로 앞으로 완전히 넘겨 바닥에 엎어놓음 ---
    // 다리가 먼저 풀리고(빠른 곡선) 그다음 상체가 넘어가는 느낌
    const dropEase = 1 - Math.pow(1 - p, 3.4);
    // 그룹 회전(~64도) + 뼈 앞굽힘(~26도) = 거의 수평으로 엎드림
    const lean = ease * 1.12;
    const roll = this.rollSign * ease * (0.1 + this.force * 0.18);
    const drop = dropEase * (PIVOT_Y - 0.16) - bounce; // 허리가 바닥까지
    const slideAmt = (0.12 + this.force * 0.4) * (1 - Math.pow(1 - p, 3));
    const hopY = this.force * 0.1 * Math.sin(Math.min(1, this.deadT / 0.32) * Math.PI);

    this.group.position.set(
      this.base.x + this.fallDir.x * slideAmt,
      this.base.y + PIVOT_Y - drop + hopY,
      this.base.z + this.fallDir.z * slideAmt
    );
    const q = new THREE.Quaternion().setFromAxisAngle(UP, this.baseYaw);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(this.tipAxis, lean));
    q.multiply(new THREE.Quaternion().setFromAxisAngle(this.fallDir, roll));
    this.group.quaternion.copy(q);

    this.center.set(this.group.position.x, this.base.y + 0.3, this.group.position.z);
  }

  dispose(): void {
    this.group.removeFromParent();
  }
}
