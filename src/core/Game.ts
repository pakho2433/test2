import * as THREE from 'three';
import { EventBus } from '../utils/EventBus';
import type { GameEvents } from './Events';
import { InputManager } from './InputManager';
import { SaveManager } from './SaveManager';
import { DEFAULT_SETTINGS, GameSettings, applySettingsToDocument } from './Settings';
import { CollisionWorld } from '../world/Collision';
import { InteractionSystem } from '../interaction/InteractionSystem';
import { World } from '../world/World';
import { PlayerController } from '../player/PlayerController';
import { InventoryManager } from '../inventory/InventoryManager';
import { QuestManager } from '../quests/QuestManager';
import { HistoryManager } from '../quests/HistoryManager';
import { NPCManager } from '../npc/NPCManager';
import { AudioManager } from '../audio/AudioManager';
import { UIManager } from '../ui/UIManager';
import { MobileControls, isMobileDevice } from '../ui/MobileControls';

/**
 * Top-level orchestrator: owns the renderer/scene/camera, wires every
 * subsystem together, drives the main loop, and handles save/load, pause,
 * and pointer-lock/mobile-control mode switching.
 */
export class Game {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private bus = new EventBus<GameEvents>();

  private input!: InputManager;
  private saveManager = new SaveManager();
  private settings: GameSettings = { ...DEFAULT_SETTINGS };

  private collision = new CollisionWorld();
  private interaction!: InteractionSystem;
  private world!: World;
  private player!: PlayerController;
  private inventory!: InventoryManager;
  private quests!: QuestManager;
  private history!: HistoryManager;
  private npcManager!: NPCManager;
  private audio = new AudioManager();
  private ui!: UIManager;
  private mobileControls: MobileControls | null = null;

  private running = false;
  private paused = false;
  private footstepAccumulator = 0;
  private wasIndoor = false;
  private mobile = false;

  async start(): Promise<void> {
    this.mobile = isMobileDevice();
    this.setupRenderer();
    this.setupScene();

    this.loadSettingsOnly();

    this.audio.init();
    this.audio.setVolumes(this.settings.masterVolume, this.settings.sfxVolume, this.settings.musicVolume);

    this.input = new InputManager(this.renderer.domElement);
    this.interaction = new InteractionSystem(this.bus);
    this.inventory = new InventoryManager(this.bus);
    this.quests = new QuestManager(this.bus, this.inventory);
    this.history = new HistoryManager(this.bus);
    this.npcManager = new NPCManager(this.bus, this.quests, this.inventory, this.history);

    this.player = new PlayerController(this.camera, this.collision);

    const quality = this.qualitySettingsFor(this.settings.quality);
    this.world = new World(
      this.scene,
      this.collision,
      this.interaction,
      this.bus,
      this.quests,
      this.inventory,
      this.history,
      this.npcManager,
      quality,
    );
    this.world.build();

    this.ui = new UIManager(this.bus, this.inventory, this.quests, this.history, this.npcManager, this.audio, this.settings, {
      onNewGame: () => this.newGame(),
      onContinue: () => this.continueGame(),
      onResetProgress: () => this.resetProgress(),
      onResume: () => this.resumeFromPause(),
      onSaveRequest: () => this.saveGame(),
      onQuitToMenu: () => this.quitToMenu(),
      onSettingsChanged: (s) => this.onSettingsChanged(s),
      hasSave: () => this.saveManager.hasSave(),
    });

    if (this.mobile) {
      document.getElementById('mobile-controls')!.classList.remove('hidden');
      this.mobileControls = new MobileControls(this.input);
      this.wireMobileButtons();
    }

    this.input.on('interact', () => this.handleInteract());
    this.input.on('inventory', () => this.ui.toggleInventory());
    this.input.on('quest', () => this.ui.toggleQuestLog());
    this.input.on('pause', () => this.togglePause());

    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('orientationchange', () => this.ui.updateOrientationWarning());
    this.ui.updateOrientationWarning();

    this.renderer.domElement.addEventListener('click', () => {
      if (!this.mobile && this.running && !this.paused && !this.ui.isModalOpen()) {
        this.input.requestPointerLock();
      }
    });

    this.ui.runLoadingSequence(() => {
      this.ui.showMainMenu();
    });

    this.animate();
  }

  private wireMobileButtons(): void {
    const interactBtn = document.getElementById('btn-mobile-interact')!;
    interactBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleInteract();
    });
    const runBtn = document.getElementById('btn-mobile-run')!;
    const setRun = (v: boolean) => this.input.setMobileRunning(v);
    runBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      setRun(true);
    });
    runBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      setRun(false);
    });
  }

  private qualitySettingsFor(quality: GameSettings['quality']) {
    if (quality === 'low') return { shadows: false, particles: false };
    if (quality === 'medium') return { shadows: true, particles: true };
    return { shadows: true, particles: true };
  }

  private setupRenderer(): void {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (err) {
      console.error('[Game] WebGL context creation failed, retrying without antialias.', err);
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 200);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.ui.updateOrientationWarning();
  }

  // ---------------------------------------------------------------------
  // Game flow
  // ---------------------------------------------------------------------
  private newGame(): void {
    this.saveManager.reset();
    this.player.setState({ x: 0, y: 0, z: 48, yaw: Math.PI, pitch: 0 });
    this.beginPlay();
  }

  private continueGame(): void {
    const data = this.saveManager.load();
    if (!data) {
      this.ui.notify('沒有找到存檔，開始新遊戲。 No save found, starting a new game.');
      this.newGame();
      return;
    }
    try {
      this.player.setState(data.player);
      this.inventory.deserialize(data.inventory as any);
      this.quests.deserialize(data.quests);
      this.history.deserialize(data.discoveredHistory);
      if (data.settings) {
        this.settings = { ...DEFAULT_SETTINGS, ...(data.settings as Partial<GameSettings>) };
        this.onSettingsChanged(this.settings);
      }
    } catch (err) {
      console.warn('[Game] Failed applying save data, starting fresh.', err);
    }
    this.quests.refreshTrackedObjective();
    this.beginPlay();
  }

  private beginPlay(): void {
    this.ui.hideMainMenuAndStartHUD();
    this.quests.refreshTrackedObjective();
    this.running = true;
    this.paused = false;
    if (!this.mobile) this.input.requestPointerLock();
  }

  private resetProgress(): void {
    this.saveManager.reset();
    this.ui.notify('進度已重置 · Progress has been reset');
    this.ui.showMainMenu();
  }

  private saveGame(): void {
    const state = this.player.getState();
    this.saveManager.save({
      version: 1,
      player: state,
      inventory: this.inventory.serialize(),
      quests: this.quests.serialize(),
      discoveredHistory: this.history.serialize(),
      settings: this.settings as unknown as Record<string, unknown>,
      savedAt: Date.now(),
    });
  }

  private togglePause(): void {
    if (this.ui.isModalOpen() && !this.paused) return;
    if (this.paused) this.resumeFromPause();
    else this.pauseGame();
  }

  private pauseGame(): void {
    this.paused = true;
    this.input.exitPointerLock();
    this.ui.openPause();
    this.bus.emit('pause-toggled', { paused: true });
  }

  private resumeFromPause(): void {
    this.paused = false;
    document.getElementById('pause-panel')!.classList.add('hidden');
    if (!this.mobile) this.input.requestPointerLock();
    this.bus.emit('pause-toggled', { paused: false });
  }

  private quitToMenu(): void {
    this.saveGame();
    this.paused = false;
    this.running = false;
    document.getElementById('pause-panel')!.classList.add('hidden');
    document.getElementById('hud')!.classList.add('hidden');
    this.input.exitPointerLock();
    this.ui.showMainMenu();
  }

  private onSettingsChanged(settings: GameSettings): void {
    this.settings = settings;
    applySettingsToDocument(settings);
    this.audio.setVolumes(settings.masterVolume, settings.sfxVolume, settings.musicVolume);
    this.player.sensitivityScale = 0.3 + settings.mouseSensitivity * 1.4;
    this.player.reducedMotion = settings.reducedMotion;
    if (this.mobileControls) this.mobileControls.lookSensitivity = 1.0 + settings.mouseSensitivity * 3;
  }

  private loadSettingsOnly(): void {
    const data = this.saveManager.load();
    if (data?.settings) {
      try {
        this.settings = { ...DEFAULT_SETTINGS, ...(data.settings as Partial<GameSettings>) };
      } catch {
        this.settings = { ...DEFAULT_SETTINGS };
      }
    }
    applySettingsToDocument(this.settings);
  }

  private handleInteract(): void {
    if (!this.running || this.paused || this.ui.isModalOpen()) return;
    this.interaction.tryInteract();
  }

  // ---------------------------------------------------------------------
  // Main loop
  // ---------------------------------------------------------------------
  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.elapsedTime;

    if (this.running && !this.paused && !this.ui.isModalOpen()) {
      this.player.update(dt, this.input);
      this.interaction.update(this.camera, this.scene, this.player.position);

      if (this.player.isMoving() && this.player.isGrounded()) {
        this.footstepAccumulator += dt;
        const interval = this.input.isRunning() ? 0.28 : 0.45;
        if (this.footstepAccumulator >= interval) {
          this.footstepAccumulator = 0;
          this.audio.footstep();
        }
      }

      const indoor = this.player.position.y > 0.5;
      if (indoor !== this.wasIndoor) {
        this.wasIndoor = indoor;
        this.audio.setIndoor(indoor);
      }
      if (elapsed < 1) {
        this.audio.startRiverAmbience();
        this.audio.startMarketAmbience();
      }
    }

    this.world?.update(dt, elapsed);
    this.renderer.render(this.scene, this.camera);
  };
}
