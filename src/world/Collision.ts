import * as THREE from 'three';

export interface WallBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface RampRegion {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y0: number;
  y1: number;
  axis: 'x' | 'z';
}

export interface FloorRegion {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
}

/**
 * Lightweight collision + ground-height model for the whole city. Uses simple
 * axis-aligned boxes rather than a physics engine, which keeps the vertical
 * slice fast on mobile devices while still supporting walls, doors, ramps and
 * multi-storey floors.
 */
export class CollisionWorld {
  private walls: WallBox[] = [];
  private doors: Map<string, { box: WallBox; open: boolean }> = new Map();
  private ramps: RampRegion[] = [];
  private floors: FloorRegion[] = [];

  addWall(box: WallBox): void {
    this.walls.push(box);
  }

  addDoor(id: string, box: WallBox): void {
    this.doors.set(id, { box, open: false });
  }

  setDoorOpen(id: string, open: boolean): void {
    const d = this.doors.get(id);
    if (d) d.open = open;
  }

  addRamp(ramp: RampRegion): void {
    this.ramps.push(ramp);
  }

  addFloor(floor: FloorRegion): void {
    this.floors.push(floor);
  }

  /** Resolves horizontal collision by pushing a circle (player) out of any overlapping wall/door box. */
  resolveHorizontal(pos: THREE.Vector3, radius: number): void {
    const boxes: WallBox[] = [...this.walls];
    for (const d of this.doors.values()) {
      if (!d.open) boxes.push(d.box);
    }
    for (const box of boxes) {
      const closestX = THREE.MathUtils.clamp(pos.x, box.minX, box.maxX);
      const closestZ = THREE.MathUtils.clamp(pos.z, box.minZ, box.maxZ);
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius && distSq > 1e-8) {
        const dist = Math.sqrt(distSq);
        const overlap = radius - dist;
        pos.x += (dx / dist) * overlap;
        pos.z += (dz / dist) * overlap;
      } else if (distSq <= 1e-8) {
        const penX = Math.min(pos.x - box.minX, box.maxX - pos.x);
        const penZ = Math.min(pos.z - box.minZ, box.maxZ - pos.z);
        if (penX < penZ) {
          pos.x += pos.x - (box.minX + box.maxX) / 2 > 0 ? radius : -radius;
        } else {
          pos.z += pos.z - (box.minZ + box.maxZ) / 2 > 0 ? radius : -radius;
        }
      }
    }
  }

  /** Returns the ground/floor height the player should stand on at this XZ position. */
  groundHeightAt(x: number, z: number): number {
    let best = 0;
    for (const f of this.floors) {
      if (x >= f.minX && x <= f.maxX && z >= f.minZ && z <= f.maxZ) {
        best = Math.max(best, f.y);
      }
    }
    for (const r of this.ramps) {
      if (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) {
        const t = r.axis === 'x' ? (x - r.minX) / (r.maxX - r.minX) : (z - r.minZ) / (r.maxZ - r.minZ);
        const y = THREE.MathUtils.lerp(r.y0, r.y1, THREE.MathUtils.clamp(t, 0, 1));
        best = Math.max(best, y);
      }
    }
    return best;
  }
}
