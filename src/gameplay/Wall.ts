import * as THREE from 'three';
import type { WallDef } from '../config/types';
import { COLORS } from '../config/constants';
import type { PhysicsWorld } from './PhysicsWorld';

/** 정적 박스 벽. 파괴는 물리 대신 색/흔들림으로 표현. */
export class Wall {
  readonly mesh: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, physics: PhysicsWorld, def: WallDef) {
    this.material = new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.9 });
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(def.size.x, def.size.y, def.size.z),
      this.material
    );
    this.mesh.position.set(def.position.x, def.position.y, def.position.z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
    physics.addStaticBox(def.position, def.size);
  }

  damage(): void {
    this.material.color.setHex(COLORS.wallDamaged);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
