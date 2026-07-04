import * as THREE from 'three';
import type { Interactable } from './Interactable';
import type { EventBus } from '../utils/EventBus';
import type { GameEvents } from '../core/Events';

interface Registered {
  interactable: Interactable;
  meshes: THREE.Object3D[];
}

/**
 * Centre-screen raycasting interaction system shared by doors, pickups,
 * inspectables, NPCs, quest objects, shops and containers. Highlights the
 * currently targeted object and shows a name + prompt once within range.
 */
export class InteractionSystem {
  private raycaster = new THREE.Raycaster();
  private center = new THREE.Vector2(0, 0);
  private byId = new Map<string, Registered>();
  private meshToId = new Map<THREE.Object3D, string>();
  private currentId: string | null = null;
  private highlightedMeshes: THREE.Mesh[] = [];
  private savedEmissive = new Map<THREE.Mesh, THREE.Color>();
  maxDistance = 3.4;

  constructor(private bus: EventBus<GameEvents>) {
    this.raycaster.far = 20;
  }

  register(interactable: Interactable, meshes: THREE.Object3D[]): void {
    this.byId.set(interactable.id, { interactable, meshes });
    meshes.forEach((m) => this.meshToId.set(m, interactable.id));
  }

  unregister(id: string): void {
    const entry = this.byId.get(id);
    if (!entry) return;
    entry.meshes.forEach((m) => this.meshToId.delete(m));
    this.byId.delete(id);
  }

  private resolveId(obj: THREE.Object3D | null): string | null {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      const id = this.meshToId.get(cur);
      if (id) return id;
      cur = cur.parent;
    }
    return null;
  }

  update(camera: THREE.Camera, scene: THREE.Scene, playerPos: THREE.Vector3): void {
    this.raycaster.setFromCamera(this.center, camera);
    const hits = this.raycaster.intersectObjects(scene.children, true);
    let foundId: string | null = null;
    let foundEntry: Registered | undefined;
    for (const hit of hits) {
      const id = this.resolveId(hit.object);
      if (!id) continue;
      const entry = this.byId.get(id);
      if (!entry) continue;
      const dist = playerPos.distanceTo(hit.point);
      if (dist <= entry.interactable.range) {
        foundId = id;
        foundEntry = entry;
      }
      break; // first solid hit blocks further checks (nearest object wins)
    }

    if (foundId !== this.currentId) {
      this.clearHighlight();
      this.currentId = foundId;
      if (foundEntry) {
        this.applyHighlight(foundEntry.meshes);
        this.bus.emit('interaction-target', {
          name: foundEntry.interactable.name,
          prompt: foundEntry.interactable.promptText,
        });
      } else {
        this.bus.emit('interaction-target', { name: null });
      }
    }
  }

  private applyHighlight(meshes: THREE.Object3D[]): void {
    meshes.forEach((m) => {
      m.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if ((mesh as any).isMesh && mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (mat.emissive) {
            this.savedEmissive.set(mesh, mat.emissive.clone());
            mat.emissive.setHex(0x4a3212);
            this.highlightedMeshes.push(mesh);
          }
        }
      });
    });
  }

  private clearHighlight(): void {
    this.highlightedMeshes.forEach((mesh) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const saved = this.savedEmissive.get(mesh);
      if (mat.emissive && saved) mat.emissive.copy(saved);
    });
    this.highlightedMeshes = [];
  }

  tryInteract(): void {
    if (!this.currentId) return;
    const entry = this.byId.get(this.currentId);
    if (entry && entry.interactable.canInteract()) {
      entry.interactable.interact();
    }
  }
}
