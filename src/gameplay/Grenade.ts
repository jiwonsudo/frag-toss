import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { PHYSICS } from '../config/constants';
import type { PhysicsWorld } from './PhysicsWorld';
import type { Vec3 } from '../config/types';
import { createGrenadeMesh } from './models';

/**
 * 던져진 M67 프래그 수류탄 하나. GLB 메쉬 + Rapier 강체.
 * 폭발은 오직 신관(fuse) 타이머로 결정 — "쿠킹"으로 남은 신관을 조절해 공중 폭발이 가능.
 * 던지는 순간 안전 손잡이(레버)가 튕겨 날아간다.
 */
export class Grenade {
  readonly group: THREE.Group;
  readonly position = new THREE.Vector3();
  exploded = false;

  private body: RAPIER.RigidBody;
  private physics: PhysicsWorld;
  private scene: THREE.Scene;
  private fuseMs: number;
  private ageMs = 0;

  private lever: THREE.Mesh;
  private leverGeo: THREE.BufferGeometry;
  private leverMat: THREE.Material;
  private leverFlying = true;
  private grounded = false;
  private leverVel = new THREE.Vector3();
  private leverSpin = new THREE.Vector3();

  constructor(
    scene: THREE.Scene,
    physics: PhysicsWorld,
    spawn: Vec3,
    velocity: Vec3,
    fuseMs: number
  ) {
    this.scene = scene;
    this.physics = physics;
    this.fuseMs = Math.max(0, fuseMs);

    const R = PHYSICS.grenade.radius;
    this.group = new THREE.Group();

    const model = createGrenadeMesh();
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    this.group.add(model);

    // 튕겨나가는 안전 레버 (절차적 금속 조각)
    this.leverGeo = new THREE.BoxGeometry(R * 0.24, R * 2, R * 0.6);
    this.leverMat = new THREE.MeshStandardMaterial({
      color: 0xb9bdc2,
      roughness: 0.3,
      metalness: 0.9
    });
    this.lever = new THREE.Mesh(this.leverGeo, this.leverMat);
    this.lever.position.set(R * 0.6, R * 0.8, 0);
    this.group.add(this.lever);

    const v = new THREE.Vector3(velocity.x, velocity.y, velocity.z);
    const side = new THREE.Vector3(-v.z, 0, v.x).normalize();
    this.leverVel
      .copy(v)
      .multiplyScalar(0.15)
      .addScaledVector(side, 3.5 + Math.random() * 1.5)
      .add(new THREE.Vector3(0, 3 + Math.random() * 1.5, 0));
    this.leverSpin.set(18 + Math.random() * 10, 14, 26 + Math.random() * 10);

    this.group.position.set(spawn.x, spawn.y, spawn.z);
    scene.add(this.group);

    this.body = physics.addGrenade(spawn, velocity);
    this.position.set(spawn.x, spawn.y, spawn.z);
  }

  /** 매 프레임. 신관이 다하면 true. */
  update(dt: number): boolean {
    if (this.exploded) return false;
    this.ageMs += dt * 1000;

    // 착지/정착 감지: 속도가 충분히 죽으면 담핑을 올려 굴러다니지 않게.
    // (공중 최고점에서도 수평 속도는 살아 있으므로 낮은 총속도 = 지면 접촉)
    if (!this.grounded && this.ageMs > 200) {
      const lv = this.body.linvel();
      const speed = Math.hypot(lv.x, lv.y, lv.z);
      if (speed < 2.5 && Math.abs(lv.y) < 1) {
        this.grounded = true;
        this.body.setLinearDamping(PHYSICS.grenade.restDamping);
      }
    }

    const t = this.body.translation();
    const r = this.body.rotation();
    this.group.position.set(t.x, t.y, t.z);
    this.group.quaternion.set(r.x, r.y, r.z, r.w);
    this.position.set(t.x, t.y, t.z);

    if (this.leverFlying) {
      if (this.lever.parent === this.group) {
        this.group.remove(this.lever);
        this.scene.add(this.lever);
        this.lever.position.copy(this.group.position);
      }
      this.leverVel.y += -12 * dt;
      this.lever.position.addScaledVector(this.leverVel, dt);
      this.lever.rotation.x += this.leverSpin.x * dt;
      this.lever.rotation.y += this.leverSpin.y * dt;
      this.lever.rotation.z += this.leverSpin.z * dt;
      if (this.lever.position.y < 0.02) this.leverFlying = false;
    }

    return this.ageMs >= this.fuseMs;
  }

  dispose(): void {
    this.scene.remove(this.group);
    if (this.lever.parent) this.lever.parent.remove(this.lever);
    this.leverGeo.dispose();
    this.leverMat.dispose();
    this.physics.remove(this.body);
  }
}
