import * as THREE from 'three';
import type { Interactable } from '../interaction/Interactable';
import type { NPCDef } from '../data/npcs';
import { randRange } from '../utils/MathUtils';

/**
 * A lightweight, animated low-poly NPC built entirely from primitives (no
 * external rig required). Supports idle bobbing, waypoint patrol walking,
 * a simple procedural leg/arm swing, and acts as an Interactable so the
 * player can talk to it via centre-screen raycasting.
 */
export class NPC implements Interactable {
  id: string;
  name: string;
  promptText = '按 E 交談 · Talk';
  range = 3.4;
  group: THREE.Group;

  private def: NPCDef;
  private waypointIndex = 0;
  private idleTimer = randRange(0, 10);
  private walkPhase = 0;
  private leftLeg!: THREE.Mesh;
  private rightLeg!: THREE.Mesh;
  private leftArm!: THREE.Mesh;
  private rightArm!: THREE.Mesh;
  private head!: THREE.Mesh;
  private bodyGroup!: THREE.Group;

  constructor(def: NPCDef, private onTalk: (npcId: string) => void, sharedSkinMat: THREE.Material) {
    this.def = def;
    this.id = `npc_${def.id}`;
    this.name = `${def.name} · ${def.role}`;
    this.group = new THREE.Group();
    this.group.position.set(def.position[0], 0, def.position[1]);
    this.buildMesh(sharedSkinMat);
  }

  private buildMesh(skinMat: THREE.Material): void {
    const clothMat = new THREE.MeshStandardMaterial({ color: this.def.color, roughness: 0.85, metalness: 0.02 });
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.y = 0.9;
    this.group.add(this.bodyGroup);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.85, 8), clothMat);
    torso.position.y = 0.42;
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skinMat);
    this.head.position.y = 0.98;
    this.head.castShadow = true;
    this.bodyGroup.add(this.head);

    const hairColor = this.def.id === 'lost_child' ? 0x2a1f14 : 0x1a1410;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: hairColor, roughness: 1 }));
    hair.position.y = 1.02;
    this.bodyGroup.add(hair);

    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.55, 6);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x2a2118, roughness: 0.9 });
    this.leftLeg = new THREE.Mesh(legGeo, legMat);
    this.leftLeg.position.set(-0.11, -0.28, 0);
    this.leftLeg.castShadow = true;
    this.rightLeg = new THREE.Mesh(legGeo, legMat);
    this.rightLeg.position.set(0.11, -0.28, 0);
    this.rightLeg.castShadow = true;
    this.bodyGroup.add(this.leftLeg, this.rightLeg);

    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6);
    this.leftArm = new THREE.Mesh(armGeo, clothMat);
    this.leftArm.position.set(-0.32, 0.42, 0);
    this.rightArm = new THREE.Mesh(armGeo, clothMat);
    this.rightArm.position.set(0.32, 0.42, 0);
    this.bodyGroup.add(this.leftArm, this.rightArm);

    this.group.userData.npcId = this.def.id;
  }

  canInteract(): boolean {
    return true;
  }

  interact(): void {
    this.onTalk(this.def.id);
  }

  update(dt: number): void {
    this.idleTimer += dt;

    const waypoints = this.def.waypoints;
    let moving = false;
    if (waypoints.length > 1) {
      const target = waypoints[this.waypointIndex];
      const dx = target[0] - this.group.position.x;
      const dz = target[1] - this.group.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.15) {
        moving = true;
        const speed = this.def.speed;
        this.group.position.x += (dx / dist) * speed * dt;
        this.group.position.z += (dz / dist) * speed * dt;
        const targetYaw = Math.atan2(dx, dz);
        this.group.rotation.y = THREE.MathUtils.damp(this.group.rotation.y, targetYaw, 6, dt);
      } else {
        this.waypointIndex = (this.waypointIndex + 1) % waypoints.length;
      }
    }

    if (moving) {
      this.walkPhase += dt * 6;
      const swing = Math.sin(this.walkPhase) * 0.5;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing;
      this.rightArm.rotation.x = swing;
      this.bodyGroup.position.y = 0.9 + Math.abs(Math.sin(this.walkPhase * 2)) * 0.03;
    } else {
      this.leftLeg.rotation.x = THREE.MathUtils.damp(this.leftLeg.rotation.x, 0, 8, dt);
      this.rightLeg.rotation.x = THREE.MathUtils.damp(this.rightLeg.rotation.x, 0, 8, dt);
      this.leftArm.rotation.x = THREE.MathUtils.damp(this.leftArm.rotation.x, 0, 8, dt);
      this.rightArm.rotation.x = THREE.MathUtils.damp(this.rightArm.rotation.x, 0, 8, dt);
      this.bodyGroup.position.y = 0.9 + Math.sin(this.idleTimer * 1.6) * 0.015;
      this.head.rotation.y = Math.sin(this.idleTimer * 0.4) * 0.3;
    }
  }
}
