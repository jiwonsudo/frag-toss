import * as THREE from 'three';
import type { EnemyDef } from '../config/types';
import { COLORS } from '../config/constants';

const HEIGHT = 1.6;
const RADIUS = 0.32;

/**
 * 적. 물리 바디 없이 위치만 가짐 — 스플래시 판정은 순수 거리 기반.
 * 벽에 가려도 폭발 반경 안이면 사망(raycast 시야 안 씀).
 * 살아있을 때는 제자리에서 살짝씩 움직이는 아이들 모션.
 */
export class Enemy {
  readonly group: THREE.Group;
  readonly center = new THREE.Vector3();
  alive = true;
  private material: THREE.MeshStandardMaterial;

  private base: THREE.Vector3;
  private phase = Math.random() * Math.PI * 2;
  private swaySpeed = 1.4 + Math.random() * 0.9;
  private stepSpeed = 0.5 + Math.random() * 0.4;
  private t = 0;

  constructor(scene: THREE.Scene, def: EnemyDef) {
    this.material = new THREE.MeshStandardMaterial({ color: COLORS.enemy, roughness: 0.6 });

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(RADIUS, HEIGHT - RADIUS * 2, 6, 12),
      this.material
    );
    body.position.y = HEIGHT / 2;
    body.castShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(RADIUS * 0.8, 12, 10), this.material);
    head.position.y = HEIGHT + RADIUS * 0.3;
    head.castShadow = true;

    this.group = new THREE.Group();
    this.group.add(body, head);
    this.group.position.set(def.position.x, def.position.y, def.position.z);
    scene.add(this.group);

    this.base = new THREE.Vector3(def.position.x, def.position.y, def.position.z);
    this.center.set(def.position.x, def.position.y + HEIGHT * 0.5, def.position.z);
  }

  kill(): void {
    if (!this.alive) return;
    this.alive = false;
    this.material.color.setHex(COLORS.enemyDead);
    this.group.rotation.z = 0;
  }

  update(dt: number): void {
    this.t += dt;

    if (!this.alive) {
      // 쓰러짐 연출
      if (this.group.rotation.x > -Math.PI / 2) {
        this.group.rotation.x = Math.max(-Math.PI / 2, this.group.rotation.x - dt * 6);
        this.group.position.y = Math.max(0, this.group.position.y - dt * 0.6);
      }
      return;
    }

    // 아이들: 좌우로 몸 흔들기 + 제자리 무게중심 이동 + 살짝 위아래
    const sway = Math.sin(this.t * this.swaySpeed + this.phase);
    const step = Math.sin(this.t * this.stepSpeed + this.phase * 0.7);
    this.group.rotation.z = sway * 0.06;
    this.group.position.x = this.base.x + step * 0.18;
    this.group.position.z = this.base.z + Math.cos(this.t * this.stepSpeed * 0.8 + this.phase) * 0.1;
    this.group.position.y = this.base.y + Math.abs(sway) * 0.04;

    this.center.set(
      this.group.position.x,
      this.base.y + HEIGHT * 0.5,
      this.group.position.z
    );
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.material.dispose();
  }
}
