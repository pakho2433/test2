import * as THREE from 'three';
import { CollisionWorld } from './Collision';
import { InteractionSystem } from '../interaction/InteractionSystem';
import { Door } from '../interaction/Door';
import { PickupItem } from '../interaction/PickupItem';
import { InspectPoint } from '../interaction/InspectPoint';
import { NPC } from '../npc/NPC';
import { River } from './Water';
import { NPCS } from '../data/npcs';
import type { EventBus } from '../utils/EventBus';
import type { GameEvents } from '../core/Events';
import { QuestManager } from '../quests/QuestManager';
import { InventoryManager } from '../inventory/InventoryManager';
import { HistoryManager } from '../quests/HistoryManager';
import { NPCManager } from '../npc/NPCManager';
import {
  woodPlankTexture,
  roofTileTexture,
  cobblestoneTexture,
  groundDirtTexture,
  wallPlasterTexture,
  clothBannerTexture,
  paperTexture,
} from '../utils/ProceduralTextures';
import { createPitchedRoof, createHangingSign, createClothBanner, SharedGeo } from './Buildings';
import { randRange } from '../utils/MathUtils';
import { ITEMS } from '../data/items';

export interface WorldQuality {
  shadows: boolean;
  particles: boolean;
}

/**
 * Builds and animates the entire vertical slice of the riverside city: the
 * ground, river, bridge, city gate, market, tea house (with interior and
 * upstairs), food stall, medicine shop, dock with boats, residential alley,
 * NPCs, animals, ambient animation and optional historical info points.
 */
export class World {
  group = new THREE.Group();
  private doors: Door[] = [];
  private npcs: NPC[] = [];
  private ambientWalkers: NPC[] = [];
  private river: River;
  private signUpdaters: ((dt: number) => void)[] = [];
  private bannerUpdaters: ((dt: number) => void)[] = [];
  private boats: { group: THREE.Group; speed: number; range: [number, number]; z: number }[] = [];
  private smokeSystems: { points: THREE.Points; velocities: Float32Array; life: Float32Array }[] = [];
  private pickups: PickupItem[] = [];

  constructor(
    private scene: THREE.Scene,
    private collision: CollisionWorld,
    private interaction: InteractionSystem,
    private bus: EventBus<GameEvents>,
    private quests: QuestManager,
    private inventory: InventoryManager,
    private history: HistoryManager,
    private npcManager: NPCManager,
    private quality: WorldQuality,
  ) {
    this.river = new River(12, 140);
  }

  build(): void {
    this.scene.add(this.group);
    this.buildLighting();
    this.buildSkyAndFog();
    this.buildGround();
    this.buildRiver();
    this.buildBridge();
    this.buildCityGate();
    this.buildMarketStalls();
    this.buildTeaHouse();
    this.buildFoodStall();
    this.buildMedicineShop();
    this.buildDockAndBoats();
    this.buildResidentialAlley();
    this.buildViewpoint();
    this.buildNPCs();
    this.buildAmbientWalkers();
    this.buildAnimals();
    this.buildHistoryPoints();
    this.buildCollectibles();
    this.buildQuestItems();
    if (this.quality.particles) this.buildSmoke();

    this.bus.on('quest-completed', ({ questId }) => {
      if (questId === 'main_ledger') {
        const gate = this.doors.find((d) => d.id === 'viewpoint_gate');
        gate?.setLocked(false);
        this.bus.emit('notify', { text: '觀景台已解鎖！ A new viewing area has been unlocked!' });
      }
    });
  }

  // ---------------------------------------------------------------------
  // Lighting / Sky
  // ---------------------------------------------------------------------
  private buildLighting(): void {
    const hemi = new THREE.HemisphereLight(0xfff2d6, 0x5a4a34, 0.9);
    this.group.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0c8, 1.4);
    sun.position.set(-40, 55, 25);
    sun.castShadow = this.quality.shadows;
    if (this.quality.shadows) {
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.left = -70;
      sun.shadow.camera.right = 70;
      sun.shadow.camera.top = 70;
      sun.shadow.camera.bottom = -70;
      sun.shadow.camera.far = 160;
      sun.shadow.bias = -0.0025;
    }
    this.group.add(sun);
    this.group.add(sun.target);

    const fill = new THREE.AmbientLight(0xffe9c2, 0.25);
    this.group.add(fill);
  }

  private buildSkyAndFog(): void {
    this.scene.background = new THREE.Color(0xbfd9e8);
    this.scene.fog = new THREE.FogExp2(0xcdd9c6, 0.0075);

    const skyGeo = new THREE.SphereGeometry(180, 24, 16);
    const colors: number[] = [];
    const pos = skyGeo.attributes.position;
    const top = new THREE.Color(0x6fa3c9);
    const horizon = new THREE.Color(0xf3d9a8);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 180;
      const t = THREE.MathUtils.clamp((y + 0.15) / 0.5, 0, 1);
      const c = horizon.clone().lerp(top, t);
      colors.push(c.r, c.g, c.b);
    }
    skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.group.add(sky);
  }

  // ---------------------------------------------------------------------
  // Ground / River / Bridge / Gate
  // ---------------------------------------------------------------------
  private buildGround(): void {
    const groundMat = new THREE.MeshStandardMaterial({ map: groundDirtTexture(20), roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    const plazaMat = new THREE.MeshStandardMaterial({ map: cobblestoneTexture(14), roughness: 0.95 });
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(56, 46), plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.set(0, 0.01, 20);
    plaza.receiveShadow = true;
    this.group.add(plaza);

    const bridgeApproach = new THREE.Mesh(new THREE.PlaneGeometry(10, 20), plazaMat);
    bridgeApproach.rotation.x = -Math.PI / 2;
    bridgeApproach.position.set(0, 0.01, -20);
    bridgeApproach.receiveShadow = true;
    this.group.add(bridgeApproach);
  }

  private buildRiver(): void {
    this.river.mesh.position.set(0, 0.05, 0);
    this.group.add(this.river.mesh);
    // River banks (gentle raised edges) purely decorative
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x7a8a63, roughness: 1 });
    [-7, 7].forEach((z) => {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(140, 0.2, 1.4), bankMat);
      bank.position.set(0, 0.05, z);
      bank.receiveShadow = true;
      this.group.add(bank);
    });
  }

  private buildBridge(): void {
    const woodMat = new THREE.MeshStandardMaterial({ map: woodPlankTexture('#5b3a22', 4), roughness: 0.9 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.7 });

    // Flat top deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 8), woodMat);
    deck.position.set(0, 1.55, 0);
    deck.castShadow = true;
    deck.receiveShadow = true;
    this.group.add(deck);
    this.collision.addFloor({ minX: -3, maxX: 3, minZ: -4, maxZ: 4, y: 1.4 });

    // Ramps
    const rampGeoLen = 8;
    [1, -1].forEach((side) => {
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, rampGeoLen), woodMat);
      ramp.position.set(0, 0.7, side * 8);
      ramp.rotation.x = side > 0 ? -0.2 : 0.2;
      ramp.castShadow = true;
      ramp.receiveShadow = true;
      this.group.add(ramp);
      this.collision.addRamp({
        minX: -3,
        maxX: 3,
        minZ: side > 0 ? 4 : -12,
        maxZ: side > 0 ? 12 : -4,
        y0: side > 0 ? 1.4 : 0,
        y1: side > 0 ? 0 : 1.4,
        axis: 'z',
      });
    });

    // Railings
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 16.4), railMat);
      rail.position.set(side * 3, 1.95, 0);
      rail.castShadow = true;
      this.group.add(rail);
    }

    // Support piers into the river
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9 });
    [-2.5, 2.5].forEach((x) => {
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.8, 8), pierMat);
      pier.position.set(x, 0.5, 0);
      pier.castShadow = true;
      this.group.add(pier);
    });
  }

  private buildCityGate(): void {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8272, roughness: 0.95 });
    const roofMat = new THREE.MeshStandardMaterial({ map: roofTileTexture('#3a4a3a', 3), roughness: 0.85 });
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, 50);

    [-6, 6].forEach((x) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 6, 2.4), stoneMat);
      pillar.position.set(x, 3, 0);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      gateGroup.add(pillar);
      this.collision.addWall({ minX: x - 1.2, maxX: x + 1.2, minZ: -1.2, maxZ: 1.2 });
    });

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(14, 1.2, 2.4), stoneMat);
    lintel.position.set(0, 6.6, 0);
    lintel.castShadow = true;
    gateGroup.add(lintel);

    const roof = createPitchedRoof(14, 3.2, roofMat);
    roof.position.set(0, 7.3, 0);
    gateGroup.add(roof);

    const plaqueTex = paperTexture();
    const plaqueMat = new THREE.MeshStandardMaterial({ map: plaqueTex, color: 0x2a1810 });
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 0.15), plaqueMat);
    plaque.position.set(0, 5.6, 1.3);
    gateGroup.add(plaque);

    this.group.add(gateGroup);
  }

  // ---------------------------------------------------------------------
  // Market
  // ---------------------------------------------------------------------
  private buildMarketStalls(): void {
    const stallPositions: [number, number, number][] = [
      [-4, 30, 0],
      [4, 34, 0.4],
      [-10, 34, -0.3],
    ];
    const woodMat = new THREE.MeshStandardMaterial({ map: woodPlankTexture('#6b4a2a', 2), roughness: 0.9 });
    const clothColors = [clothBannerTexture('#b83b2e', '#e8c15a'), clothBannerTexture('#2e6b8a', '#e8c15a'), clothBannerTexture('#3f6b2e', '#e8c15a')];

    stallPositions.forEach(([x, z, rot], i) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.rotation.y = rot;

      const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.2), woodMat);
      table.position.y = 0.45;
      table.castShadow = true;
      table.receiveShadow = true;
      group.add(table);

      for (const dx of [-1, 1]) {
        for (const dz of [-1, 1]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), woodMat);
          post.position.set(dx * 1.1, 1.5, dz * 0.55);
          post.castShadow = true;
          group.add(post);
        }
      }

      const canopyMat = new THREE.MeshStandardMaterial({ map: clothColors[i % clothColors.length], side: THREE.DoubleSide });
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.08, 1.5), canopyMat);
      canopy.position.y = 2.6;
      canopy.castShadow = true;
      group.add(canopy);

      // Crates as goods on display
      const crateMat = new THREE.MeshStandardMaterial({ map: woodPlankTexture('#7a5a34', 1), roughness: 0.9 });
      for (let c = 0; c < 2; c++) {
        const crate = new THREE.Mesh(SharedGeo.crate, crateMat);
        crate.position.set(-0.6 + c * 1.0, 0.3, 0.9);
        crate.castShadow = true;
        crate.receiveShadow = true;
        group.add(crate);
      }

      this.group.add(group);
      this.collision.addWall({ minX: x - 1.3, maxX: x + 1.3, minZ: z - 0.7, maxZ: z + 0.7 });
    });
  }

  private buildFoodStall(): void {
    const woodMat = new THREE.MeshStandardMaterial({ map: woodPlankTexture('#6b4226', 2), roughness: 0.9 });
    const group = new THREE.Group();
    group.position.set(-15, 0, 25);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 1.4), woodMat);
    counter.position.y = 0.5;
    counter.castShadow = true;
    counter.receiveShadow = true;
    group.add(counter);

    for (const dx of [-1.3, 1.3]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), woodMat);
      post.position.set(dx, 1.6, -0.5);
      post.castShadow = true;
      group.add(post);
    }
    const roofMat = new THREE.MeshStandardMaterial({ map: roofTileTexture('#8a3a2a', 2), roughness: 0.85 });
    const roof = createPitchedRoof(3.6, 2, roofMat);
    roof.position.set(0, 2.9, -0.5);
    roof.scale.set(1, 0.6, 1);
    group.add(roof);

    const sign = createHangingSign('食', 0x8a3a2a);
    sign.group.position.set(0, 2.4, 0.8);
    group.add(sign.group);
    this.signUpdaters.push(sign.update);

    this.group.add(group);
    this.collision.addWall({ minX: -15 - 1.7, maxX: -15 + 1.7, minZ: 25 - 0.9, maxZ: 25 + 0.9 });
  }

  // ---------------------------------------------------------------------
  // Tea House (enterable, with upstairs)
  // ---------------------------------------------------------------------
  private buildTeaHouse(): void {
    const bounds = { minX: 16, maxX: 28, minZ: 24, maxZ: 36 };
    const wallMat = new THREE.MeshStandardMaterial({ map: wallPlasterTexture(3), roughness: 0.9 });
    const woodMat = new THREE.MeshStandardMaterial({ map: woodPlankTexture('#6b4226', 3), roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ map: roofTileTexture('#2c3e50', 4), roughness: 0.8 });
    const group = new THREE.Group();
    this.group.add(group);

    const wallHeight = 3.6;
    const buildWallSegment = (minX: number, maxX: number, minZ: number, maxZ: number) => {
      const w = maxX - minX;
      const d = maxZ - minZ;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.25), wallHeight, Math.max(d, 0.25)), wallMat);
      mesh.position.set((minX + maxX) / 2, wallHeight / 2, (minZ + maxZ) / 2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      this.collision.addWall({ minX, maxX, minZ, maxZ });
    };

    // South wall with door gap (20-22)
    buildWallSegment(bounds.minX, 20, bounds.minZ - 0.15, bounds.minZ + 0.15);
    buildWallSegment(22, bounds.maxX, bounds.minZ - 0.15, bounds.minZ + 0.15);
    // North wall
    buildWallSegment(bounds.minX, bounds.maxX, bounds.maxZ - 0.15, bounds.maxZ + 0.15);
    // West / East walls
    buildWallSegment(bounds.minX - 0.15, bounds.minX + 0.15, bounds.minZ, bounds.maxZ);
    buildWallSegment(bounds.maxX - 0.15, bounds.maxX + 0.15, bounds.minZ, bounds.maxZ);

    // Roof
    const roof = createPitchedRoof(12, 12, roofMat);
    roof.position.set((bounds.minX + bounds.maxX) / 2, wallHeight + 1.2, (bounds.minZ + bounds.maxZ) / 2);
    roof.scale.set(1, 1.6, 1);
    group.add(roof);

    // Ground floor + mezzanine + stairs
    this.collision.addFloor({ ...bounds, y: 0 });
    this.collision.addRamp({ minX: 16, maxX: 22, minZ: 26, maxZ: 30, y0: 0, y1: 3.4, axis: 'z' });
    this.collision.addFloor({ minX: 16, maxX: 22, minZ: 30, maxZ: 36, y: 3.4 });

    const mezzanineFloor = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 6), woodMat);
    mezzanineFloor.position.set(19, 3.4, 33);
    mezzanineFloor.castShadow = true;
    mezzanineFloor.receiveShadow = true;
    group.add(mezzanineFloor);

    const stairRampMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 4.2), woodMat);
    stairRampMesh.position.set(19, 1.7, 28);
    stairRampMesh.rotation.x = -0.68;
    stairRampMesh.castShadow = true;
    stairRampMesh.receiveShadow = true;
    group.add(stairRampMesh);

    // Railing for mezzanine edge
    const railMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.8 });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.7, 0.1), railMat);
    rail.position.set(19, 3.75, 30);
    group.add(rail);

    // Ground floor furniture (tables + stools) so the interior feels lived-in, well-lit
    const tableMat = new THREE.MeshStandardMaterial({ map: woodPlankTexture('#5a3a20', 1), roughness: 0.85 });
    const tablePositions: [number, number][] = [
      [24, 27],
      [25, 32],
      [22, 34],
    ];
    tablePositions.forEach(([x, z]) => {
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.65, 10), tableMat);
      table.position.set(x, 0.33, z);
      table.castShadow = true;
      table.receiveShadow = true;
      group.add(table);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 8), tableMat);
        stool.position.set(x + Math.cos(a) * 0.9, 0.2, z + Math.sin(a) * 0.9);
        stool.castShadow = true;
        group.add(stool);
      }
    });

    // Warm interior lanterns (avoids dark interiors)
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xd48a2a, emissive: 0xaa5a10, emissiveIntensity: 1.1 });
    [
      [18, 1.6, 26],
      [26, 1.6, 26],
      [19, 3.9, 33],
    ].forEach(([x, y, z]) => {
      const lantern = new THREE.Mesh(SharedGeo.lanternBody, lanternMat);
      lantern.position.set(x, y, z);
      group.add(lantern);
      const light = new THREE.PointLight(0xffb060, 0.9, 8, 2);
      light.position.set(x, y, z);
      group.add(light);
    });

    // Door
    const doorPivot = new THREE.Group();
    doorPivot.position.set(20, 0, 24);
    const doorMat = new THREE.MeshStandardMaterial({ map: woodPlankTexture('#4a2e18', 1), roughness: 0.8 });
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 3.2, 0.15), doorMat);
    doorMesh.position.set(1, 1.6, 0);
    doorMesh.castShadow = true;
    doorPivot.add(doorMesh);
    group.add(doorPivot);
    this.collision.addDoor('tea_house_door', { minX: 20, maxX: 22, minZ: 23.85, maxZ: 24.15 });
    const door = new Door('tea_house_door', doorPivot, this.collision, this.bus);
    this.doors.push(door);
    this.interaction.register(door, [doorMesh]);

    // Hanging sign
    const sign = createHangingSign('茶', 0x7a2e2e);
    sign.group.position.set(20, 3.3, 24.6);
    group.add(sign.group);
    this.signUpdaters.push(sign.update);

    // Banners flanking entrance
    const bannerMat = new THREE.MeshStandardMaterial({ map: clothBannerTexture('#7a2e2e', '#e8c15a'), side: THREE.DoubleSide });
    [17.5, 24.5].forEach((x) => {
      const banner = createClothBanner(bannerMat, 0.7, 1.8);
      banner.mesh.position.set(x, 2.4, 24.3);
      group.add(banner.mesh);
      this.bannerUpdaters.push(banner.update);
    });
  }

  private buildMedicineShop(): void {
    const bounds = { minX: 10, maxX: 18, minZ: 16, maxZ: 22 };
    const wallMat = new THREE.MeshStandardMaterial({ map: wallPlasterTexture(2), roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ map: roofTileTexture('#3a2f4a', 2), roughness: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ map: woodPlankTexture('#5a3a20', 2), roughness: 0.85 });
    const group = new THREE.Group();
    this.group.add(group);
    const wallHeight = 3.2;

    const buildWallSegment = (minX: number, maxX: number, minZ: number, maxZ: number) => {
      const w = maxX - minX;
      const d = maxZ - minZ;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.25), wallHeight, Math.max(d, 0.25)), wallMat);
      mesh.position.set((minX + maxX) / 2, wallHeight / 2, (minZ + maxZ) / 2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      this.collision.addWall({ minX, maxX, minZ, maxZ });
    };

    buildWallSegment(bounds.minX, 13, bounds.minZ - 0.15, bounds.minZ + 0.15);
    buildWallSegment(15, bounds.maxX, bounds.minZ - 0.15, bounds.minZ + 0.15);
    buildWallSegment(bounds.minX, bounds.maxX, bounds.maxZ - 0.15, bounds.maxZ + 0.15);
    buildWallSegment(bounds.minX - 0.15, bounds.minX + 0.15, bounds.minZ, bounds.maxZ);
    buildWallSegment(bounds.maxX - 0.15, bounds.maxX + 0.15, bounds.minZ, bounds.maxZ);

    const roof = createPitchedRoof(8, 6, roofMat);
    roof.position.set((bounds.minX + bounds.maxX) / 2, wallHeight + 1, (bounds.minZ + bounds.maxZ) / 2);
    group.add(roof);

    this.collision.addFloor({ ...bounds, y: 0 });

    const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1), woodMat);
    counter.position.set(14, 0.5, 20.5);
    counter.castShadow = true;
    counter.receiveShadow = true;
    group.add(counter);

    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xd4a53d, emissive: 0x8a5a10, emissiveIntensity: 1.0 });
    const lantern = new THREE.Mesh(SharedGeo.lanternBody, lanternMat);
    lantern.position.set(14, 2.4, 19);
    group.add(lantern);
    const light = new THREE.PointLight(0xffcf8a, 0.8, 7, 2);
    light.position.set(14, 2.4, 19);
    group.add(light);

    const doorPivot = new THREE.Group();
    doorPivot.position.set(13, 0, 16);
    const doorMat = new THREE.MeshStandardMaterial({ map: woodPlankTexture('#3a2a18', 1), roughness: 0.8 });
    const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2.9, 0.15), doorMat);
    doorMesh.position.set(1, 1.45, 0);
    doorMesh.castShadow = true;
    doorPivot.add(doorMesh);
    group.add(doorPivot);
    this.collision.addDoor('medicine_shop_door', { minX: 13, maxX: 15, minZ: 15.85, maxZ: 16.15 });
    const door = new Door('medicine_shop_door', doorPivot, this.collision, this.bus);
    this.doors.push(door);
    this.interaction.register(door, [doorMesh]);

    const sign = createHangingSign('醫', 0x2f2f4a);
    sign.group.position.set(14, 3, 16.6);
    group.add(sign.group);
    this.signUpdaters.push(sign.update);
  }

  // ---------------------------------------------------------------------
  // Dock + Boats
  // ---------------------------------------------------------------------
  private buildDockAndBoats(): void {
    const woodMat = new THREE.MeshStandardMaterial({ map: woodPlankTexture('#4a3520', 3), roughness: 0.9 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 0.3, 8), woodMat);
    deck.position.set(-30, 0.55, -8);
    deck.castShadow = true;
    deck.receiveShadow = true;
    this.group.add(deck);
    this.collision.addFloor({ minX: -37, maxX: -23, minZ: -12, maxZ: -4, y: 0.4 });

    for (let i = 0; i < 5; i++) {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.6, 6), woodMat);
      piling.position.set(-36 + i * 3.5, -0.2, -3.8);
      piling.castShadow = true;
      this.group.add(piling);
    }

    // Reeds near the shore
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x5a7a3a, roughness: 1 });
    for (let i = 0; i < 14; i++) {
      const reed = new THREE.Mesh(SharedGeo.reed, reedMat);
      reed.position.set(randRange(-40, -32), 0.5, randRange(-11, -8));
      reed.rotation.z = randRange(-0.15, 0.15);
      this.group.add(reed);
    }

    // Boats (simple hull shapes) gliding along the river
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.8 });
    const canopyMat = new THREE.MeshStandardMaterial({ map: clothBannerTexture('#8a3a2a', '#e8c15a'), side: THREE.DoubleSide });
    const boatDefs: { z: number; speed: number; range: [number, number] }[] = [
      { z: -2, speed: 1.6, range: [-45, 45] },
      { z: 2.5, speed: -1.1, range: [-40, 40] },
    ];
    boatDefs.forEach((def, i) => {
      const boatGroup = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 4, 6, 1, false), hullMat);
      hull.rotation.z = Math.PI / 2;
      hull.scale.set(1, 0.6, 1);
      hull.position.y = 0.25;
      hull.castShadow = true;
      boatGroup.add(hull);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.2), canopyMat);
      canopy.position.set(0, 0.9, 0);
      canopy.castShadow = true;
      boatGroup.add(canopy);
      boatGroup.position.set(randRange(def.range[0], def.range[1]), 0.15, def.z);
      this.group.add(boatGroup);
      this.boats.push({ group: boatGroup, speed: def.speed, range: def.range, z: def.z });
    });
  }

  // ---------------------------------------------------------------------
  // Residential Alley
  // ---------------------------------------------------------------------
  private buildResidentialAlley(): void {
    const wallMat = new THREE.MeshStandardMaterial({ map: wallPlasterTexture(2), roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ map: roofTileTexture('#4a3a2a', 2), roughness: 0.85 });

    const houses: [number, number, number, number][] = [
      [6, -34, 6, 6],
      [-11, -34, 5, 6],
      [-2, -22, 5, 5],
    ];
    houses.forEach(([x, z, w, d]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), wallMat);
      mesh.position.set(x, 1.5, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
      const roof = createPitchedRoof(w, d, roofMat);
      roof.position.set(x, 3.1, z);
      this.group.add(roof);
      this.collision.addWall({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    });

    // Woodpile hiding the ledger (visual only — pickup object added separately)
    const woodMat = new THREE.MeshStandardMaterial({ map: woodPlankTexture('#5a3a20', 1), roughness: 0.9 });
    const pileGroup = new THREE.Group();
    pileGroup.position.set(5, 0, -18);
    for (let i = 0; i < 6; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.4, 6), woodMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(0, 0.16 + Math.floor(i / 3) * 0.32, (i % 3) * 0.32 - 0.32);
      log.castShadow = true;
      pileGroup.add(log);
    }
    this.group.add(pileGroup);

    // Lanterns lining the alley for warm evening ambience
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xd4a53d, emissive: 0x8a5a10, emissiveIntensity: 1.0 });
    for (let i = 0; i < 4; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), woodMat);
      const x = -8 + i * 5;
      post.position.set(x, 1.1, -28);
      this.group.add(post);
      const lantern = new THREE.Mesh(SharedGeo.lanternBody, lanternMat);
      lantern.position.set(x, 2.3, -28);
      lantern.scale.set(0.7, 0.7, 0.7);
      this.group.add(lantern);
    }
  }

  private buildViewpoint(): void {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a8272, roughness: 0.95 });
    const group = new THREE.Group();
    group.position.set(0, 0, -44);
    this.group.add(group);

    [-3, 3].forEach((x) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.6, 0.6), stoneMat);
      pillar.position.set(x, 1.3, 0);
      pillar.castShadow = true;
      group.add(pillar);
      this.collision.addWall({ minX: x - 0.3, maxX: x + 0.3, minZ: -0.3, maxZ: 0.3 });
    });

    const doorPivot = new THREE.Group();
    doorPivot.position.set(-1, 0, 0);
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.8 });
    const gateMesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2.4, 0.12), gateMat);
    gateMesh.position.set(1, 1.2, 0);
    gateMesh.castShadow = true;
    doorPivot.add(gateMesh);
    group.add(doorPivot);
    this.collision.addDoor('viewpoint_gate', { minX: -2, maxX: 0, minZ: -0.15, maxZ: 0.15 });
    const door = new Door('viewpoint_gate', doorPivot, this.collision, this.bus);
    door.setLocked(true, '此處目前封閉，完成主線任務後開放。\nThis area is currently closed — complete the main quest to unlock it.');
    this.doors.push(door);
    this.interaction.register(door, [gateMesh]);

    const plaqueMat = new THREE.MeshStandardMaterial({ color: 0x2a1810, map: paperTexture() });
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 0.1), plaqueMat);
    plaque.position.set(0, 1.4, -2.5);
    group.add(plaque);
    const inspect = new InspectPoint(
      'viewpoint_plaque',
      '觀景台石碑 · Viewpoint Monument',
      () => {
        this.history.discover('qingming_scroll');
        this.bus.emit('notify', { text: '你細細閱讀了石碑上的文字……' });
      },
    );
    this.interaction.register(inspect, [plaque]);
  }

  // ---------------------------------------------------------------------
  // NPCs / Ambient life
  // ---------------------------------------------------------------------
  private buildNPCs(): void {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ab7d, roughness: 0.85 });
    NPCS.forEach((def) => {
      const npc = new NPC(def, (id) => this.bus.emit('dialogue-open', { npcId: id }), skinMat);
      this.group.add(npc.group);
      this.npcs.push(npc);
      this.interaction.register(npc, [npc.group]);
    });
  }

  private buildAmbientWalkers(): void {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ab7d, roughness: 0.85 });
    const defs = [
      { id: 'amb1', color: 0x8a6a4a, position: [8, 26] as [number, number], waypoints: [[8, 26], [12, 22], [6, 20]] as [number, number][], speed: 0.9 },
      { id: 'amb2', color: 0x4a6a8a, position: [-6, 32] as [number, number], waypoints: [[-6, 32], [-2, 28]] as [number, number][], speed: 0.8 },
      { id: 'amb3', color: 0x8a4a6a, position: [2, -30] as [number, number], waypoints: [[2, -30], [-4, -28], [4, -25]] as [number, number][], speed: 0.7 },
    ];
    defs.forEach((d) => {
      const npc = new NPC(
        { id: d.id, name: '路人', nameEn: 'Passerby', role: '市民', roleEn: 'Citizen', color: d.color, position: d.position, waypoints: d.waypoints, speed: d.speed, radius: 2 },
        () => {},
        skinMat,
      );
      this.group.add(npc.group);
      this.ambientWalkers.push(npc);
      // Intentionally not registered with the interaction system — purely ambient life.
    });
  }

  private buildAnimals(): void {
    const brownMat = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.9 });
    const animalSpots: { pos: [number, number]; kind: 'cat' | 'dog' | 'chicken' }[] = [
      { pos: [23, 26], kind: 'cat' },
      { pos: [-3, -20], kind: 'dog' },
      { pos: [-14, 24], kind: 'chicken' },
      { pos: [-16, 26], kind: 'chicken' },
    ];
    animalSpots.forEach(({ pos, kind }) => {
      const group = new THREE.Group();
      group.position.set(pos[0], 0, pos[1]);
      if (kind === 'chicken') {
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), whiteMat);
        body.position.y = 0.18;
        body.castShadow = true;
        group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), whiteMat);
        head.position.set(0, 0.3, 0.12);
        group.add(head);
      } else {
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, kind === 'dog' ? 0.4 : 0.3, 4, 8), brownMat);
        body.rotation.z = Math.PI / 2;
        body.position.y = 0.2;
        body.castShadow = true;
        group.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), brownMat);
        head.position.set(kind === 'dog' ? 0.32 : 0.24, 0.24, 0);
        group.add(head);
      }
      this.group.add(group);
      (group as any).userData.wanderCenter = [pos[0], pos[1]];
      (group as any).userData.wanderTime = randRange(0, 10);
      this.animalGroups.push(group);
    });
  }

  private animalGroups: THREE.Group[] = [];

  // ---------------------------------------------------------------------
  // History points, collectibles and quest items
  // ---------------------------------------------------------------------
  private buildHistoryPoints(): void {
    const signSpots: { id: string; pos: [number, number]; name: string }[] = [
      { id: 'market_life', pos: [0, 26], name: '市集告示：市集生活 · Market Life' },
      { id: 'transportation', pos: [0, 11], name: '橋邊告示：交通運輸 · Transportation' },
      { id: 'architecture', pos: [23, 23.4], name: '建築說明：建築特色 · Architecture' },
      { id: 'medicine', pos: [14.5, 15.4], name: '醫館告示：傳統醫藥 · Traditional Medicine' },
      { id: 'entertainment', pos: [8, 16], name: '街頭告示：娛樂生活 · Entertainment' },
    ];
    const postMat = new THREE.MeshStandardMaterial({ map: woodPlankTexture('#4a3520', 1), roughness: 0.9 });
    const boardMat = new THREE.MeshStandardMaterial({ map: paperTexture() });
    signSpots.forEach(({ id, pos, name }) => {
      const group = new THREE.Group();
      group.position.set(pos[0], 0, pos[1]);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 6), postMat);
      post.position.y = 0.8;
      post.castShadow = true;
      group.add(post);
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.06), boardMat);
      board.position.y = 1.5;
      board.castShadow = true;
      group.add(board);
      this.group.add(group);

      const marketQuestId = 'main_ledger';
      const isMarketNotice = id === 'market_life';
      const inspect = new InspectPoint(
        `history_${id}`,
        name,
        () => {
          this.history.discover(id);
          this.bus.emit('notify', { text: '你發現了一則歷史小知識！ You discovered a historical note!' });
          if (isMarketNotice && this.quests.currentObjectiveId(marketQuestId) === 'investigate_market') {
            this.quests.advanceObjective(marketQuestId);
          }
        },
      );
      this.interaction.register(inspect, [board, post]);
    });
  }

  private buildCollectibles(): void {
    const props: { itemId: any; pos: [number, number]; color: number }[] = [
      { itemId: 'porcelain_shard', pos: [-2, 22], color: 0xdedad0 },
      { itemId: 'silk_swatch', pos: [26, 30], color: 0xb03a5a },
      { itemId: 'tea_brick', pos: [-14, 23], color: 0x3a2a1a },
      { itemId: 'bronze_coin', pos: [-24, -5], color: 0x8a6a2a },
    ];
    props.forEach(({ itemId, pos, color }) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, emissive: 0x000000 });
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), mat);
      mesh.position.set(pos[0], 0.25, pos[1]);
      mesh.castShadow = true;
      this.group.add(mesh);
      const name = `拾取：${itemId}`;
      const pickup = new PickupItem(`pickup_${itemId}`, itemId, name, mesh, (id) => {
        this.inventory.addItem(id, 1);
        const factId = ITEMS[id]?.historyFactId;
        if (factId) this.history.discover(factId);
      });
      this.pickups.push(pickup);
      this.interaction.register(pickup, [mesh]);
    });
  }

  private buildQuestItems(): void {
    // Fisherman's basket, hidden near the reeds.
    const basketMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.9 });
    const basketMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.3, 10), basketMat);
    basketMesh.position.set(-35, 0.2, -9.5);
    basketMesh.castShadow = true;
    this.group.add(basketMesh);
    const basketPickup = new PickupItem(
      'pickup_basket',
      'basket' as any,
      '漁夫的魚簍 · Fisherman\'s Basket',
      basketMesh,
      (id) => {
        this.inventory.addItem(id, 1);
        this.quests.advanceObjective('side_fisherman');
      },
      () => this.quests.isActive('side_fisherman'),
    );
    this.pickups.push(basketPickup);
    this.interaction.register(basketPickup, [basketMesh]);

    // Missing ledger, hidden in the woodpile — only appears once all 3 witnesses are found.
    const ledgerMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 });
    const ledgerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.22), ledgerMat);
    ledgerMesh.position.set(5.3, 0.42, -18);
    ledgerMesh.castShadow = true;
    this.group.add(ledgerMesh);
    const ledgerPickup = new PickupItem(
      'pickup_ledger',
      'ledger' as any,
      '藏在柴堆中的帳簿 · Ledger hidden in the woodpile',
      ledgerMesh,
      (id) => {
        this.inventory.addItem(id, 1);
        this.quests.advanceObjective('main_ledger');
      },
      () => this.quests.currentObjectiveId('main_ledger') === 'find_ledger',
    );
    this.pickups.push(ledgerPickup);
    this.interaction.register(ledgerPickup, [ledgerMesh]);
  }

  private buildSmoke(): void {
    const spots: [number, number, number][] = [
      [-15, 2.6, 25],
      [20, 4.2, 30],
    ];
    const tex = this.makeSmokeTexture();
    spots.forEach(([x, y, z]) => {
      const count = 24;
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);
      const life = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = x + randRange(-0.2, 0.2);
        positions[i * 3 + 1] = y + randRange(0, 1.5);
        positions[i * 3 + 2] = z + randRange(-0.2, 0.2);
        velocities[i * 3] = randRange(-0.05, 0.05);
        velocities[i * 3 + 1] = randRange(0.25, 0.5);
        velocities[i * 3 + 2] = randRange(-0.05, 0.05);
        life[i] = randRange(0, 3);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        map: tex,
        size: 0.9,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        color: 0xcfcfcf,
      });
      const points = new THREE.Points(geo, mat);
      this.group.add(points);
      this.smokeSystems.push({ points, velocities, life });
    });
  }

  private makeSmokeTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }

  // ---------------------------------------------------------------------
  // Update loop
  // ---------------------------------------------------------------------
  update(dt: number, elapsed: number): void {
    this.river.update(dt);
    this.doors.forEach((d) => d.update(dt));
    this.npcs.forEach((n) => n.update(dt));
    this.ambientWalkers.forEach((n) => n.update(dt));
    this.signUpdaters.forEach((fn) => fn(dt));
    this.bannerUpdaters.forEach((fn) => fn(dt));

    this.boats.forEach((b) => {
      b.group.position.x += b.speed * dt;
      if (b.group.position.x > b.range[1]) b.group.position.x = b.range[0];
      if (b.group.position.x < b.range[0]) b.group.position.x = b.range[1];
      b.group.position.y = 0.15 + Math.sin(elapsed * 1.5 + b.z) * 0.04;
      b.group.rotation.z = Math.sin(elapsed * 1.2 + b.z) * 0.03;
      b.group.rotation.y = b.speed > 0 ? Math.PI / 2 : -Math.PI / 2;
    });

    this.animalGroups.forEach((g) => {
      const center = (g as any).userData.wanderCenter as [number, number];
      const t = ((g as any).userData.wanderTime += dt);
      g.position.x = center[0] + Math.sin(t * 0.5) * 0.8;
      g.position.z = center[1] + Math.cos(t * 0.35) * 0.8;
      g.rotation.y = Math.atan2(Math.cos(t * 0.5) * 0.5, -Math.sin(t * 0.35) * 0.35);
    });

    this.smokeSystems.forEach(({ points, velocities }) => {
      const pos = points.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + velocities[i * 3 + 1] * dt;
        let x = pos.getX(i) + velocities[i * 3] * dt;
        let z = pos.getZ(i) + velocities[i * 3 + 2] * dt;
        if (y > pos.getY(i) + 3) {
          y = pos.getY(i);
        }
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    });
  }

  getDoors(): Door[] {
    return this.doors;
  }

  getPickups(): PickupItem[] {
    return this.pickups;
  }
}
