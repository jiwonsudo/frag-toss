import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { PropDef } from '../config/types';
import { createTree } from './models';

/**
 * 엄폐물 프롭. 현재는 나무 기둥만 — GLB 나무 비주얼 + 기둥 물리 충돌(수류탄이 튕김).
 * 야전(숲) 레벨에서 적이 기둥 뒤에 숨는 용도.
 */
export class Prop {
  readonly group: THREE.Group;

  constructor(scene: THREE.Scene, world: RAPIER.World, def: PropDef) {
    const r = def.radius ?? 0.34;
    const h = def.height ?? 5.5;
    const { x, y, z } = def.position;

    this.group = new THREE.Group();
    const tree = createTree();
    tree.rotation.y = Math.random() * Math.PI * 2;
    // 기본 6.2m 로 정규화돼 있으니 요청 높이에 맞춰 스케일
    tree.scale.multiplyScalar(h / 6.2);
    this.group.add(tree);
    this.group.position.set(x, y, z);
    scene.add(this.group);

    // 물리: 기둥 부분만 충돌 (캐노피는 통과)
    const bodyH = Math.min(h, 3.4);
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(x, y + bodyH / 2, z)
    );
    world.createCollider(
      RAPIER.ColliderDesc.cylinder(bodyH / 2, r * 1.1).setFriction(0.8).setRestitution(0.3),
      body
    );
  }

  dispose(): void {
    // 지오메트리/텍스처는 공유 리소스 → 제거만
    this.group.removeFromParent();
  }
}
