import * as THREE from 'three';
import { EXPLOSION, COLORS } from '../config/constants';
import type { Enemy } from './Enemy';
import type { Wall } from './Wall';

interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  ttl: number;
}

export interface ExplosionOutcome {
  killed: Enemy[];
}

/** 착탄 지점 기준 스플래시 폭발: 반경 내 적 제거 + 파티클/섬광/카메라 흔들림. */
export class ExplosionSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraBasePos = new THREE.Vector3();

  private particles: Particle[] = [];
  private pMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();

  private flashes: { mesh: THREE.Mesh; life: number; ttl: number; from: number; to: number }[] = [];
  private shakeTime = 0;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.cameraBasePos.copy(camera.position);

    this.pMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.07, 6, 5),
      new THREE.MeshBasicMaterial({ color: COLORS.explosionEdge }),
      256
    );
    this.pMesh.frustumCulled = false;
    this.pMesh.count = 0;
    scene.add(this.pMesh);
  }

  /** 카메라가 레벨 배치로 이동한 뒤 호출해 흔들림 기준점을 갱신. */
  setCameraBase(pos: THREE.Vector3): void {
    this.cameraBasePos.copy(pos);
  }

  detonate(point: THREE.Vector3, enemies: Enemy[], walls: Wall[]): ExplosionOutcome {
    const r = EXPLOSION.splashRadius;

    this.spawnFlash(point, r);
    this.spawnParticles(point);
    this.shakeTime = EXPLOSION.shakeMs / 1000;

    for (const w of walls) {
      const box = new THREE.Box3().setFromObject(w.mesh);
      const cp = box.clampPoint(point, new THREE.Vector3());
      if (cp.distanceTo(point) <= r) w.damage();
    }

    const killed: Enemy[] = [];
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.center.distanceTo(point) <= r) {
        e.kill();
        killed.push(e);
      }
    }
    return { killed };
  }

  update(dt: number): void {
    // 파티클
    let alive = 0;
    for (const p of this.particles) {
      p.life += dt;
      if (p.life >= p.ttl) continue;
      p.vel.y += -9.8 * dt;
      p.pos.addScaledVector(p.vel, dt);
      this.dummy.position.copy(p.pos);
      this.dummy.scale.setScalar(1 - p.life / p.ttl);
      this.dummy.updateMatrix();
      this.pMesh.setMatrixAt(alive, this.dummy.matrix);
      alive++;
    }
    this.pMesh.count = alive;
    this.pMesh.instanceMatrix.needsUpdate = true;
    if (alive === 0 && this.particles.length) this.particles.length = 0;

    // 섬광
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life += dt;
      const k = f.life / f.ttl;
      if (k >= 1) {
        this.scene.remove(f.mesh);
        f.mesh.geometry.dispose();
        (f.mesh.material as THREE.Material).dispose();
        this.flashes.splice(i, 1);
        continue;
      }
      const s = THREE.MathUtils.lerp(f.from, f.to, k);
      f.mesh.scale.setScalar(s);
      (f.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.8;
    }

    // 카메라 흔들림
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const amp = EXPLOSION.shakeAmp * Math.max(0, this.shakeTime / (EXPLOSION.shakeMs / 1000));
      this.camera.position.set(
        this.cameraBasePos.x + (Math.random() - 0.5) * amp,
        this.cameraBasePos.y + (Math.random() - 0.5) * amp,
        this.cameraBasePos.z + (Math.random() - 0.5) * amp
      );
      if (this.shakeTime <= 0) this.camera.position.copy(this.cameraBasePos);
    }
  }

  private spawnParticles(point: THREE.Vector3): void {
    this.particles.length = 0;
    for (let i = 0; i < EXPLOSION.particleCount; i++) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.9 + 0.1,
        Math.random() - 0.5
      ).normalize();
      this.particles.push({
        pos: point.clone(),
        vel: dir.multiplyScalar(4 + Math.random() * 7),
        life: 0,
        ttl: 0.5 + Math.random() * 0.4
      });
    }
  }

  private spawnFlash(point: THREE.Vector3, radius: number): void {
    const make = (color: number, from: number, to: number, ttl: number): void => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false })
      );
      mesh.position.copy(point);
      mesh.scale.setScalar(from);
      this.scene.add(mesh);
      this.flashes.push({ mesh, life: 0, ttl, from, to });
    };
    make(COLORS.explosionCore, radius * 0.2, radius * 0.55, 0.25);
    make(COLORS.explosionEdge, radius * 0.3, radius, 0.45);
  }

  dispose(): void {
    for (const f of this.flashes) {
      this.scene.remove(f.mesh);
      f.mesh.geometry.dispose();
      (f.mesh.material as THREE.Material).dispose();
    }
    this.flashes.length = 0;
    this.scene.remove(this.pMesh);
    this.pMesh.geometry.dispose();
    (this.pMesh.material as THREE.Material).dispose();
    this.camera.position.copy(this.cameraBasePos);
  }
}
