import RAPIER from '@dimforge/rapier3d-compat';
import type { Vec3 } from '../config/types';
import { PHYSICS } from '../config/constants';

/** main.ts 에서 게임 시작 전 1회 호출. */
export async function initPhysics(): Promise<void> {
  await RAPIER.init();
}

/** Rapier 물리 월드 래퍼. 고정 스텝 누적으로 프레임레이트 독립. */
export class PhysicsWorld {
  readonly world: RAPIER.World;
  private accumulator = 0;

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: PHYSICS.gravity, z: 0 });
    this.world.timestep = PHYSICS.fixedStep;
  }

  /** 무한 평면 바닥 (y=0). */
  addGround(): void {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(100, 0.5, 100).setTranslation(0, -0.5, 0).setFriction(0.9),
      body
    );
  }

  /** 정적 박스 (벽). size 는 전체 크기. */
  addStaticBox(position: Vec3, size: Vec3): RAPIER.RigidBody {
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z)
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setFriction(0.8),
      body
    );
    return body;
  }

  /** 던진 수류탄 (동적 구). */
  addGrenade(position: Vec3, velocity: Vec3): RAPIER.RigidBody {
    const g = PHYSICS.grenade;
    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(position.x, position.y, position.z)
        .setLinvel(velocity.x, velocity.y, velocity.z)
        .setLinearDamping(g.linearDamping)
        .setAngularDamping(g.angularDamping)
        .setCcdEnabled(true)
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.ball(g.radius)
        .setDensity(g.density)
        .setRestitution(g.restitution)
        .setFriction(g.friction),
      body
    );
    return body;
  }

  remove(body: RAPIER.RigidBody): void {
    this.world.removeRigidBody(body);
  }

  /** dt(초) 만큼 시뮬레이션 진행. */
  step(dt: number): void {
    this.accumulator += dt;
    let sub = 0;
    while (this.accumulator >= PHYSICS.fixedStep && sub < PHYSICS.maxSubSteps) {
      this.world.step();
      this.accumulator -= PHYSICS.fixedStep;
      sub++;
    }
    if (sub === PHYSICS.maxSubSteps) this.accumulator = 0;
  }

  dispose(): void {
    this.world.free();
  }
}
