import * as THREE from 'three';
import { InputManager } from '../core/InputManager';
import { CollisionWorld } from '../world/Collision';
import { damp } from '../utils/MathUtils';

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

/**
 * First-person controller: delta-time, camera-relative movement with
 * acceleration/deceleration, gravity, ground detection, wall/building
 * collision, stair climbing via ramp regions, and fall-through-map
 * prevention. Desktop (pointer-lock mouse) and mobile (virtual joystick +
 * swipe look) share the exact same code path.
 */
export class PlayerController {
  camera: THREE.PerspectiveCamera;
  position = new THREE.Vector3(0, 0, 48);
  yaw = 0; // facing south into the city from the gate
  pitch = 0;
  radius = 0.42;
  eyeHeight = 1.62;
  walkSpeed = 3.4;
  runSpeed = 6.4;
  gravity = -22;

  private velocityXZ = new THREE.Vector2(0, 0);
  private velocityY = 0;
  private grounded = true;
  mouseSensitivityBase = 0.0022;
  sensitivityScale = 1;
  reducedMotion = false;

  constructor(camera: THREE.PerspectiveCamera, private collision: CollisionWorld) {
    this.camera = camera;
    this.updateCameraTransform();
  }

  setState(state: PlayerState): void {
    this.position.set(state.x, state.y, state.z);
    this.yaw = state.yaw;
    this.pitch = state.pitch;
    this.updateCameraTransform();
  }

  getState(): PlayerState {
    return { x: this.position.x, y: this.position.y, z: this.position.z, yaw: this.yaw, pitch: this.pitch };
  }

  private updateCameraTransform(): void {
    this.camera.position.set(this.position.x, this.position.y + this.eyeHeight, this.position.z);
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
  }

  update(dt: number, input: InputManager): void {
    // --- Look ---
    const look = input.consumeLookDelta();
    const sens = this.mouseSensitivityBase * this.sensitivityScale;
    this.yaw -= look.x * sens;
    const pitchDelta = look.y * sens * (this.reducedMotion ? 0.5 : 1);
    this.pitch = THREE.MathUtils.clamp(this.pitch - pitchDelta, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);

    // --- Move ---
    const axes = input.getMoveAxes();
    const running = input.isRunning();
    const targetSpeed = axes.x !== 0 || axes.z !== 0 ? (running ? this.runSpeed : this.walkSpeed) : 0;

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, this.yaw, 0));
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, this.yaw, 0));
    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, axes.z)
      .addScaledVector(right, axes.x);
    if (moveDir.lengthSq() > 1e-6) moveDir.normalize();

    const targetVelX = moveDir.x * targetSpeed;
    const targetVelZ = moveDir.z * targetSpeed;
    const accelLambda = targetSpeed > 0 ? 10 : 14; // faster deceleration than acceleration
    this.velocityXZ.x = damp(this.velocityXZ.x, targetVelX, accelLambda, dt);
    this.velocityXZ.y = damp(this.velocityXZ.y, targetVelZ, accelLambda, dt);

    this.position.x += this.velocityXZ.x * dt;
    this.position.z += this.velocityXZ.y * dt;
    this.collision.resolveHorizontal(this.position, this.radius);

    // --- Vertical / gravity / ground detection ---
    const groundY = this.collision.groundHeightAt(this.position.x, this.position.z);
    const heightAboveGround = this.position.y - groundY;
    if (heightAboveGround > 0.03) {
      this.velocityY += this.gravity * dt;
      this.grounded = false;
    } else {
      this.velocityY = 0;
      this.grounded = true;
      this.position.y = groundY;
    }
    this.position.y += this.velocityY * dt;
    if (this.position.y < groundY) {
      this.position.y = groundY;
      this.velocityY = 0;
      this.grounded = true;
    }

    // Fail-safe: never allow falling through the world.
    if (this.position.y < -25) {
      this.position.set(0, 0, 48);
      this.velocityY = 0;
    }

    this.updateCameraTransform();
  }

  isMoving(): boolean {
    return this.velocityXZ.length() > 0.5;
  }

  isGrounded(): boolean {
    return this.grounded;
  }
}
