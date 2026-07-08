export type ActionCallback = () => void;

/**
 * Unified input abstraction for keyboard+mouse (desktop) and touch (mobile).
 * PlayerController and CameraController only ever read from this class, so
 * mobile virtual controls and desktop input are fully interchangeable.
 */
export class InputManager {
  private keys = new Set<string>();
  private lookDeltaX = 0;
  private lookDeltaY = 0;
  private mobileMoveX = 0;
  private mobileMoveZ = 0;
  private mobileRunning = false;
  pointerLocked = false;

  private actionHandlers: Record<string, ActionCallback[]> = {};

  constructor(private domElement: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }

  on(action: string, cb: ActionCallback): void {
    (this.actionHandlers[action] ??= []).push(cb);
  }

  private fire(action: string): void {
    this.actionHandlers[action]?.forEach((cb) => cb());
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const code = e.code;
    this.keys.add(code);
    if (code === 'KeyE') this.fire('interact');
    if (code === 'KeyI') this.fire('inventory');
    if (code === 'KeyQ') this.fire('quest');
    if (code === 'Escape') this.fire('pause');
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.pointerLocked) return;
    this.lookDeltaX += e.movementX || 0;
    this.lookDeltaY += e.movementY || 0;
  };

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.domElement;
  };

  requestPointerLock(): void {
    this.domElement.requestPointerLock?.();
  }

  exitPointerLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  /** Consumes and returns the accumulated look delta since the previous call. */
  consumeLookDelta(): { x: number; y: number } {
    const d = { x: this.lookDeltaX, y: this.lookDeltaY };
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    return d;
  }

  addMobileLookDelta(dx: number, dy: number): void {
    this.lookDeltaX += dx;
    this.lookDeltaY += dy;
  }

  setMobileMove(x: number, z: number): void {
    this.mobileMoveX = x;
    this.mobileMoveZ = z;
  }

  setMobileRunning(running: boolean): void {
    this.mobileRunning = running;
  }

  /** Returns camera-space move axes: x = strafe, z = forward (-1 back .. 1 fwd). */
  getMoveAxes(): { x: number; z: number } {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (x === 0 && z === 0) {
      x = this.mobileMoveX;
      z = this.mobileMoveZ;
    }
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  isRunning(): boolean {
    return this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.mobileRunning;
  }
}
