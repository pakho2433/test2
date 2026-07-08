import * as THREE from 'three';
import type { Interactable } from './Interactable';
import type { ItemId } from '../data/items';

/**
 * A world-space object that can be picked up into the inventory. Once
 * collected, the visual mesh is removed and the interactable unregisters
 * itself via the onCollect callback (handled by the owning system).
 */
export class PickupItem implements Interactable {
  id: string;
  name: string;
  promptText = '按 E 拾取 · Pick Up';
  range = 3.0;
  private collected = false;

  constructor(
    id: string,
    public itemId: ItemId,
    name: string,
    public mesh: THREE.Object3D,
    private onCollect: (itemId: ItemId) => void,
    private availableCheck?: () => boolean,
  ) {
    this.id = id;
    this.name = name;
  }

  canInteract(): boolean {
    if (this.collected) return false;
    return this.availableCheck ? this.availableCheck() : true;
  }

  interact(): void {
    if (this.collected) return;
    this.collected = true;
    this.mesh.visible = false;
    this.onCollect(this.itemId);
  }

  isCollected(): boolean {
    return this.collected;
  }

  reset(): void {
    this.collected = false;
    this.mesh.visible = true;
  }
}
