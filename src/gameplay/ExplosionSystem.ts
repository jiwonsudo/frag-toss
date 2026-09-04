import * as THREE from 'three';
import { EXPLOSION, COLORS } from '../config/constants';
import type { Enemy } from './Enemy';
import type { Wall } from './Wall';

export interface ExplosionOutcome {
  killed: Enemy[];
}

interface Debris {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
  ttl: number;
}
interface Puff {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  ttl: number;
  from: number;
  to: number;
  baseOpacity: number;
}

/**
 * 배그풍 다층 폭발: 백색 섬광 → 오렌지 파이어볼 → 검은 연기 기둥 →
 * 지면 먼지 링 + 파편 + 스파크, 그리고 카메라 흔들림.
 */
export class ExplosionSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraBasePos = new THREE.Vector3();

  private flashes: { mesh: THREE.Mesh; life: number; ttl: number; from: number; to: number; op: number }[] = [];
  private rings: { mesh: THREE.Mesh; life: number; ttl: number; from: number; to: number }[] = [];
  private debris: Debris[] = [];
  private puffs: Puff[] = [];
  private shakeTime = 0;

  private smokeTex: THREE.Texture;
  private debrisGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
  private debrisMat: THREE.MeshStandardMaterial;
  private sparkMesh: THREE.InstancedMesh;
  private sparks: { pos: THREE.Vector3; vel: THREE.Vector3; life: number; ttl: number }[] = [];
  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.cameraBasePos.copy(camera.position);

    this.smokeTex = makeSmokeTexture();
    this.debrisMat = new THREE.MeshStandardMaterial({ color: 0x3a3128, roughness: 1 });

    this.sparkMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.05, 5, 4),
      new THREE.MeshBasicMaterial({ color: COLORS.spark }),
      EXPLOSION.sparkCount
    );
    this.sparkMesh.frustumCulled = false;
    this.sparkMesh.count = 0;
    scene.add(this.sparkMesh);
  }

  setCameraBase(pos: THREE.Vector3): void {
    this.cameraBasePos.copy(pos);
  }

  detonate(point: THREE.Vector3, enemies: Enemy[], walls: Wall[]): ExplosionOutcome {
    const r = EXPLOSION.splashRadius;

    this.spawnFlash(point, r);
    this.spawnGroundRing(point, r);
    this.spawnSmoke(point, r);
    this.spawnDebris(point);
    this.spawnSparks(point);
    this.shakeTime = EXPLOSION.shakeMs / 1000;

    for (const w of walls) {
      if (w.broken) continue;
      const box = new THREE.Box3().setFromObject(w.mesh);
      const cp = box.clampPoint(point, new THREE.Vector3());
      if (cp.distanceTo(point) <= r) w.damage();
    }

    const killed: Enemy[] = [];
    for (const e of enemies) {
      if (!e.alive) continue;
      const dist = e.center.distanceTo(point);
      if (dist <= r && !blockedByWall(point, e.center, walls)) {
        // 폭심에서 적을 향하는 수평 방향 + 근접도(0~1) 를 넘겨 날아가는 세기를 조절
        const dir = new THREE.Vector3().subVectors(e.center, point);
        dir.y = 0;
        if (dir.lengthSq() < 1e-4) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        dir.normalize();
        e.kill(dir, 1 - dist / r);
        killed.push(e);
      }
    }
    return { killed };
  }

  update(dt: number): void {
    // 섬광 / 파이어볼
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life += dt;
      const k = f.life / f.ttl;
      if (k >= 1) {
        this.disposeMesh(f.mesh);
        this.flashes.splice(i, 1);
        continue;
      }
      f.mesh.scale.setScalar(THREE.MathUtils.lerp(f.from, f.to, easeOut(k)));
      (f.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * f.op;
    }

    // 지면 먼지 링
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const rg = this.rings[i];
      rg.life += dt;
      const k = rg.life / rg.ttl;
      if (k >= 1) {
        this.disposeMesh(rg.mesh);
        this.rings.splice(i, 1);
        continue;
      }
      rg.mesh.scale.setScalar(THREE.MathUtils.lerp(rg.from, rg.to, easeOut(k)));
      (rg.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.5;
    }

    // 연기 기둥
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const p = this.puffs[i];
      p.life += dt;
      const k = p.life / p.ttl;
      if (k >= 1) {
        this.scene.remove(p.sprite);
        (p.sprite.material as THREE.Material).dispose();
        this.puffs.splice(i, 1);
        continue;
      }
      p.vel.multiplyScalar(0.96);
      p.sprite.position.addScaledVector(p.vel, dt);
      p.sprite.scale.setScalar(THREE.MathUtils.lerp(p.from, p.to, k));
      const fade = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      (p.sprite.material as THREE.SpriteMaterial).opacity = fade * p.baseOpacity;
    }

    // 파편
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.life += dt;
      if (d.life >= d.ttl) {
        this.scene.remove(d.mesh);
        this.debris.splice(i, 1);
        continue;
      }
      d.vel.y += -22 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      if (d.mesh.position.y < 0.05) {
        d.mesh.position.y = 0.05;
        d.vel.y *= -0.35;
        d.vel.x *= 0.6;
        d.vel.z *= 0.6;
      }
      d.mesh.rotation.x += d.spin.x * dt;
      d.mesh.rotation.y += d.spin.y * dt;
      d.mesh.rotation.z += d.spin.z * dt;
      const k = d.life / d.ttl;
      if (k > 0.7) d.mesh.scale.setScalar(1 - (k - 0.7) / 0.3);
    }

    // 스파크
    let alive = 0;
    for (const s of this.sparks) {
      s.life += dt;
      if (s.life >= s.ttl) continue;
      s.vel.y += -14 * dt;
      s.pos.addScaledVector(s.vel, dt);
      this.dummy.position.copy(s.pos);
      this.dummy.scale.setScalar(Math.max(0.05, 1 - s.life / s.ttl));
      this.dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(alive++, this.dummy.matrix);
    }
    this.sparkMesh.count = alive;
    this.sparkMesh.instanceMatrix.needsUpdate = true;
    if (alive === 0 && this.sparks.length) this.sparks.length = 0;

    // 카메라 흔들림 (감쇠 진동)
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const k = Math.max(0, this.shakeTime / (EXPLOSION.shakeMs / 1000));
      const amp = EXPLOSION.shakeAmp * k * k;
      this.camera.position.set(
        this.cameraBasePos.x + (Math.random() - 0.5) * amp,
        this.cameraBasePos.y + (Math.random() - 0.5) * amp,
        this.cameraBasePos.z + (Math.random() - 0.5) * amp
      );
      if (this.shakeTime <= 0) this.camera.position.copy(this.cameraBasePos);
    }
  }

  private spawnFlash(point: THREE.Vector3, radius: number): void {
    const make = (color: number, from: number, to: number, ttl: number, op: number): void => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, depthWrite: false })
      );
      mesh.position.copy(point);
      mesh.scale.setScalar(from);
      this.scene.add(mesh);
      this.flashes.push({ mesh, life: 0, ttl, from, to, op });
    };
    make(0xffffff, radius * 0.15, radius * 0.5, 0.12, 1);
    make(COLORS.explosionCore, radius * 0.2, radius * 0.7, 0.28, 0.9);
    make(COLORS.explosionEdge, radius * 0.35, radius * 1.05, 0.5, 0.8);
  }

  private spawnGroundRing(point: THREE.Vector3, radius: number): void {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 1, 32),
      new THREE.MeshBasicMaterial({
        color: COLORS.smokeLight,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(point.x, 0.04, point.z);
    this.scene.add(mesh);
    this.rings.push({ mesh, life: 0, ttl: 0.6, from: radius * 0.3, to: radius * 1.4 });
  }

  private spawnSmoke(point: THREE.Vector3, radius: number): void {
    for (let i = 0; i < EXPLOSION.smokePuffs; i++) {
      const dark = i % 3 !== 0;
      const mat = new THREE.SpriteMaterial({
        map: this.smokeTex,
        color: dark ? COLORS.smokeDark : COLORS.smokeLight,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      const off = new THREE.Vector3(
        (Math.random() - 0.5) * radius * 0.8,
        Math.random() * 0.6,
        (Math.random() - 0.5) * radius * 0.8
      );
      sprite.position.copy(point).add(off);
      const from = radius * (0.3 + Math.random() * 0.3);
      sprite.scale.setScalar(from);
      this.scene.add(sprite);
      this.puffs.push({
        sprite,
        vel: new THREE.Vector3(off.x * 0.6, 1.4 + Math.random() * 1.6, off.z * 0.6),
        life: 0,
        ttl: 1.6 + Math.random() * 1.3,
        from,
        to: from * (2.2 + Math.random()),
        baseOpacity: dark ? 0.75 : 0.5
      });
    }
  }

  private spawnDebris(point: THREE.Vector3): void {
    for (let i = 0; i < EXPLOSION.debrisCount; i++) {
      const mesh = new THREE.Mesh(this.debrisGeo, this.debrisMat);
      mesh.position.copy(point);
      const s = 0.4 + Math.random() * 1.1;
      mesh.scale.setScalar(s);
      mesh.castShadow = true;
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.8 + 0.4,
        Math.random() - 0.5
      ).normalize();
      this.scene.add(mesh);
      this.debris.push({
        mesh,
        vel: dir.multiplyScalar(6 + Math.random() * 10),
        spin: new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20
        ),
        life: 0,
        ttl: 1.1 + Math.random() * 0.9
      });
    }
  }

  private spawnSparks(point: THREE.Vector3): void {
    this.sparks.length = 0;
    for (let i = 0; i < EXPLOSION.sparkCount; i++) {
      const dir = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.9 + 0.1,
        Math.random() - 0.5
      ).normalize();
      this.sparks.push({
        pos: point.clone(),
        vel: dir.multiplyScalar(8 + Math.random() * 14),
        life: 0,
        ttl: 0.35 + Math.random() * 0.4
      });
    }
  }

  private disposeMesh(mesh: THREE.Mesh): void {
    this.scene.remove(mesh);
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }

  dispose(): void {
    for (const f of this.flashes) this.disposeMesh(f.mesh);
    for (const r of this.rings) this.disposeMesh(r.mesh);
    for (const p of this.puffs) {
      this.scene.remove(p.sprite);
      (p.sprite.material as THREE.Material).dispose();
    }
    for (const d of this.debris) this.scene.remove(d.mesh);
    this.flashes.length = this.rings.length = this.puffs.length = this.debris.length = 0;
    this.sparks.length = 0;
    this.scene.remove(this.sparkMesh);
    this.sparkMesh.geometry.dispose();
    (this.sparkMesh.material as THREE.Material).dispose();
    this.debrisGeo.dispose();
    this.debrisMat.dispose();
    this.smokeTex.dispose();
    this.camera.position.copy(this.cameraBasePos);
  }
}

function easeOut(k: number): number {
  return 1 - (1 - k) * (1 - k);
}

const _ray = new THREE.Ray();
const _box = new THREE.Box3();
const _hit = new THREE.Vector3();
const _dir = new THREE.Vector3();

/**
 * 폭심과 적 사이를 온전한 콘크리트 벽이 가로막으면 파편이 닿지 않는다.
 * 유리(깨졌든 아니든)와 이미 파괴된 벽은 통과. 층 슬래브도 콘크리트 벽이라 위/아래를 가린다.
 */
function blockedByWall(from: THREE.Vector3, to: THREE.Vector3, walls: Wall[]): boolean {
  _dir.subVectors(to, from);
  const len = _dir.length();
  if (len < 1e-4) return false;
  _dir.divideScalar(len);
  _ray.set(from, _dir);
  for (const w of walls) {
    if (w.broken || w.isGlass) continue;
    _box.setFromObject(w.mesh);
    const p = _ray.intersectBox(_box, _hit);
    // 교차점이 폭심~적 구간 안쪽(양끝 살짝 여유)에 있으면 차폐된 것.
    if (p && from.distanceTo(p) > 0.2 && from.distanceTo(p) < len - 0.2) return true;
  }
  return false;
}

function makeSmokeTexture(): THREE.Texture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  // 뭉게뭉게: 여러 방사형 그라디언트 블롭
  for (let i = 0; i < 10; i++) {
    const x = S * (0.3 + Math.random() * 0.4);
    const y = S * (0.3 + Math.random() * 0.4);
    const rad = S * (0.16 + Math.random() * 0.22);
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(255,255,255,0.5)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  return t;
}
