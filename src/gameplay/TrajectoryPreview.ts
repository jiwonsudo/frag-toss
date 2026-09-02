import * as THREE from 'three';
import { TRAJECTORY, PHYSICS, COLORS } from '../config/constants';

/**
 * 스와이프 도중 포물선 궤적을 점(구)들로 미리보기.
 * Rapier 를 돌리지 않고 가벼운 해석적 적분으로 표시 (조준 보조).
 */
export class TrajectoryPreview {
  private scene: THREE.Scene;
  private dots: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private maxDots: number;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.maxDots = Math.ceil(TRAJECTORY.steps / TRAJECTORY.dotEvery) + 1;
    this.dots = new THREE.InstancedMesh(
      new THREE.SphereGeometry(TRAJECTORY.dotRadius, 8, 6),
      new THREE.MeshBasicMaterial({ color: COLORS.trajectory, transparent: true, opacity: 0.7 }),
      this.maxDots
    );
    this.dots.frustumCulled = false;
    this.dots.count = 0;
    this.dots.visible = false;
    scene.add(this.dots);
  }

  show(start: THREE.Vector3, velocity: THREE.Vector3): void {
    const px = start.x;
    const py = start.y;
    const pz = start.z;
    let x = px;
    let y = py;
    let z = pz;
    let vx = velocity.x;
    let vy = velocity.y;
    let vz = velocity.z;
    const dt = TRAJECTORY.dt;

    let count = 0;
    for (let i = 0; i < TRAJECTORY.steps && count < this.maxDots; i++) {
      vy += PHYSICS.gravity * dt;
      x += vx * dt;
      y += vy * dt;
      z += vz * dt;
      if (y <= PHYSICS.grenade.radius) {
        this.placeDot(count++, x, PHYSICS.grenade.radius, z, 1.6);
        break;
      }
      if (i % TRAJECTORY.dotEvery === 0) this.placeDot(count++, x, y, z, 1);
    }
    this.dots.count = count;
    this.dots.instanceMatrix.needsUpdate = true;
    this.dots.visible = count > 0;
  }

  private placeDot(i: number, x: number, y: number, z: number, scale: number): void {
    this.dummy.position.set(x, y, z);
    this.dummy.scale.setScalar(scale);
    this.dummy.updateMatrix();
    this.dots.setMatrixAt(i, this.dummy.matrix);
  }

  hide(): void {
    this.dots.visible = false;
    this.dots.count = 0;
  }

  dispose(): void {
    this.scene.remove(this.dots);
    this.dots.geometry.dispose();
    (this.dots.material as THREE.Material).dispose();
  }
}
