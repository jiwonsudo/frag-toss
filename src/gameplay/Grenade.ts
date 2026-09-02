import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { PHYSICS, COLORS } from '../config/constants';
import type { PhysicsWorld } from './PhysicsWorld';
import type { Vec3 } from '../config/types';

/**
 * 던져진 수류탄 하나. THREE 메쉬 + Rapier 강체.
 * 폭발은 오직 신관(fuse) 타이머로 결정 — "쿠킹"으로 남은 신관을 조절해 공중 폭발이 가능.
 */
export class Grenade {
  readonly mesh: THREE.Mesh;
  readonly position = new THREE.Vector3();
  exploded = false;

  private body: RAPIER.RigidBody;
  private physics: PhysicsWorld;
  private scene: THREE.Scene;
  private fuseMs: number;
  private ageMs = 0;
  private geometry: THREE.SphereGeometry;
  private material: THREE.MeshStandardMaterial;

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
    this.geometry = new THREE.SphereGeometry(PHYSICS.grenade.radius, 16, 12);
    this.material = new THREE.MeshStandardMaterial({
      color: COLORS.grenade,
      roughness: 0.5,
      metalness: 0.3
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.position.set(spawn.x, spawn.y, spawn.z);
    scene.add(this.mesh);

    this.body = physics.addGrenade(spawn, velocity);
    this.position.set(spawn.x, spawn.y, spawn.z);
  }

  /** 매 프레임. 신관이 다하면 true. */
  update(dt: number): boolean {
    if (this.exploded) return false;
    this.ageMs += dt * 1000;

    const t = this.body.translation();
    const r = this.body.rotation();
    this.mesh.position.set(t.x, t.y, t.z);
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    this.position.set(t.x, t.y, t.z);

    return this.ageMs >= this.fuseMs;
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
    this.physics.remove(this.body);
  }
}
