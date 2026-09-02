import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { WallDef } from '../config/types';
import { COLORS } from '../config/constants';
import { makeWallTextures, makeCrackTexture } from '../utils/procedural';
import type { PhysicsWorld } from './PhysicsWorld';

let shared: ReturnType<typeof makeWallTextures> | null = null;
let crackTex: THREE.Texture | null = null;

interface Shard {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
}

/**
 * 정적 박스 벽. concrete = 배그 건물풍 콘크리트(파괴 = 색 변화 + 균열 데칼).
 * glass = 반투명 유리창(수류탄 접촉/근접 폭발에 산산조각 + 파편 낙하, 물리 충돌 제거).
 */
export class Wall {
  readonly mesh: THREE.Mesh;
  readonly isGlass: boolean;
  broken = false;

  private scene: THREE.Scene;
  private physics: PhysicsWorld;
  private body: RAPIER.RigidBody;
  private material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial;
  private crack: THREE.Mesh | null = null;
  private def: WallDef;
  private damaged = false;
  private shards: Shard[] = [];
  private shardMat: THREE.Material | null = null;

  constructor(scene: THREE.Scene, physics: PhysicsWorld, def: WallDef) {
    this.scene = scene;
    this.physics = physics;
    this.def = def;
    this.isGlass = def.material === 'glass';

    if (this.isGlass) {
      // iOS Safari 에서 MeshPhysicalMaterial transmission 은 불안정 → 단순 반투명.
      this.material = new THREE.MeshStandardMaterial({
        color: 0xbfe2e8,
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide
      });
    } else {
      if (!shared) shared = makeWallTextures();
      const tex = shared;
      const rep = (t: THREE.Texture, sx: number, sy: number): THREE.Texture => {
        const c = t.clone();
        c.needsUpdate = true;
        c.wrapS = c.wrapT = THREE.RepeatWrapping;
        c.repeat.set(sx, sy);
        return c;
      };
      const sx = Math.max(1, def.size.x * 0.7);
      const sy = Math.max(1, def.size.y * 0.7);
      this.material = new THREE.MeshStandardMaterial({
        color: COLORS.wall,
        map: rep(tex.map, sx, sy),
        normalMap: rep(tex.normalMap, sx, sy),
        normalScale: new THREE.Vector2(1.1, 1.1),
        roughnessMap: rep(tex.roughnessMap, sx, sy),
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0.5
      });
    }

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(def.size.x, def.size.y, def.size.z),
      this.material
    );
    this.mesh.position.set(def.position.x, def.position.y, def.position.z);
    this.mesh.castShadow = !this.isGlass;
    this.mesh.receiveShadow = !this.isGlass;
    scene.add(this.mesh);
    this.body = physics.addStaticBox(def.position, def.size);
  }

  /** 폭발 반경/접촉으로 손상. */
  damage(): void {
    if (this.broken) return;
    if (this.isGlass) {
      this.shatter();
      return;
    }
    if (this.damaged) return;
    this.damaged = true;
    (this.material as THREE.MeshStandardMaterial).color.setHex(COLORS.wallDamaged);

    if (!crackTex) crackTex = makeCrackTexture();
    this.crack = new THREE.Mesh(
      new THREE.PlaneGeometry(this.def.size.x * 0.9, this.def.size.y * 0.9),
      new THREE.MeshBasicMaterial({
        map: crackTex,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2
      })
    );
    this.crack.position.set(0, 0, this.def.size.z / 2 + 0.01);
    this.mesh.add(this.crack);
  }

  private shatter(): void {
    this.broken = true;
    this.scene.remove(this.mesh);
    this.physics.remove(this.body); // 충돌 제거 → 수류탄 통과

    const { x: w, y: h } = this.def.size;
    const p = this.def.position;
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0xd6eef2,
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });
    this.shardMat = shardMat;
    const cols = Math.max(3, Math.round(w / 0.35));
    const rows = Math.max(3, Math.round(h / 0.35));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (Math.random() < 0.15) continue;
        const sw = (w / cols) * (0.7 + Math.random() * 0.5);
        const sh = (h / rows) * (0.7 + Math.random() * 0.5);
        const geo = new THREE.PlaneGeometry(sw, sh);
        const m = new THREE.Mesh(geo, shardMat);
        const lx = -w / 2 + (i + 0.5) * (w / cols);
        const ly = -h / 2 + (j + 0.5) * (h / rows);
        m.position.set(p.x + lx, p.y + ly, p.z);
        this.scene.add(m);
        this.shards.push({
          mesh: m,
          vel: new THREE.Vector3(lx * 1.6, 1 + Math.random() * 2, 1.5 + Math.random() * 2.5),
          spin: new THREE.Vector3(
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14,
            (Math.random() - 0.5) * 14
          ),
          life: 0
        });
      }
    }
  }

  update(dt: number): void {
    if (!this.shards.length) return;
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.life += dt;
      s.vel.y += -18 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += s.spin.x * dt;
      s.mesh.rotation.y += s.spin.y * dt;
      s.mesh.rotation.z += s.spin.z * dt;
      if (s.mesh.position.y <= 0.03) {
        s.mesh.position.y = 0.03;
        s.vel.set(0, 0, 0);
        s.spin.set(0, 0, 0);
      }
      if (s.life > 1.6) {
        const mat = s.mesh.material as THREE.Material & { opacity: number };
        mat.opacity = Math.max(0, 0.55 * (1 - (s.life - 1.6) / 0.8));
        if (s.life > 2.4) {
          this.scene.remove(s.mesh);
          s.mesh.geometry.dispose();
          this.shards.splice(i, 1);
        }
      }
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    const m = this.material as THREE.MeshStandardMaterial;
    for (const k of ['map', 'normalMap', 'roughnessMap'] as const) {
      if (m[k]) m[k]!.dispose();
    }
    this.material.dispose();
    if (this.crack) {
      this.crack.geometry.dispose();
      (this.crack.material as THREE.Material).dispose();
    }
    for (const s of this.shards) {
      this.scene.remove(s.mesh);
      s.mesh.geometry.dispose();
    }
    this.shards.length = 0;
    this.shardMat?.dispose();
  }
}
