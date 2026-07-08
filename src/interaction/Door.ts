import * as THREE from 'three';
import type { Interactable } from './Interactable';
import type { CollisionWorld } from '../world/Collision';
import type { EventBus } from '../utils/EventBus';
import type { GameEvents } from '../core/Events';

/**
 * A door that swings open/closed on interact, animates smoothly, updates the
 * collision world so the player can walk through once open, and plays a
 * short creak sound via the provided callback.
 */
export class Door implements Interactable {
  id: string;
  name = '木門';
  promptText = '按 E 開/關門 · Open/Close Door';
  range = 3.0;
  open = false;
  locked = false;
  lockedMessage?: string;

  private pivot: THREE.Group;
  private targetAngle = 0;
  private currentAngle = 0;

  constructor(
    id: string,
    pivot: THREE.Group,
    private collision: CollisionWorld,
    private bus: EventBus<GameEvents>,
    private onToggle?: (open: boolean) => void,
  ) {
    this.id = id;
    this.pivot = pivot;
  }

  canInteract(): boolean {
    return true;
  }

  interact(): void {
    if (this.locked) {
      if (this.lockedMessage) this.bus.emit('notify', { text: this.lockedMessage });
      return;
    }
    this.open = !this.open;
    this.targetAngle = this.open ? -Math.PI / 2 : 0;
    this.collision.setDoorOpen(this.id, this.open);
    this.bus.emit('door-toggled', { open: this.open });
    this.onToggle?.(this.open);
  }

  setLocked(locked: boolean, message?: string): void {
    this.locked = locked;
    this.lockedMessage = message;
  }

  update(dt: number): void {
    this.currentAngle = THREE.MathUtils.damp(this.currentAngle, this.targetAngle, 8, dt);
    this.pivot.rotation.y = this.currentAngle;
  }
}
