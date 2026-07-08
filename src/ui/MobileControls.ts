import type { InputManager } from '../core/InputManager';

/**
 * Wires the on-screen joystick, swipe-look area, and mobile buttons to the
 * shared InputManager. Movement axes are always camera-relative (handled by
 * PlayerController), so the joystick direction correctly follows wherever
 * the camera is currently looking.
 */
export class MobileControls {
  private joystickActive = false;
  private joystickTouchId: number | null = null;
  private joystickCenter = { x: 0, y: 0 };
  private lookTouchId: number | null = null;
  private lookLast = { x: 0, y: 0 };
  lookSensitivity = 2.2;

  constructor(private input: InputManager) {
    this.setupJoystick();
    this.setupLookZone();
  }

  private setupJoystick(): void {
    const zone = document.getElementById('joystick-zone')!;
    const thumb = document.getElementById('joystick-thumb')!;
    const maxRadius = 42;

    const start = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      this.joystickActive = true;
      this.joystickTouchId = touch.identifier;
      const rect = zone.getBoundingClientRect();
      this.joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      e.preventDefault();
    };
    const move = (e: TouchEvent) => {
      if (!this.joystickActive) return;
      const touch = Array.from(e.changedTouches).find((t) => t.identifier === this.joystickTouchId);
      if (!touch) return;
      let dx = touch.clientX - this.joystickCenter.x;
      let dy = touch.clientY - this.joystickCenter.y;
      const dist = Math.hypot(dx, dy);
      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }
      thumb.style.transform = `translate(${dx}px, ${dy}px)`;
      // Screen up (negative dy) = forward, screen right (positive dx) = strafe right.
      this.input.setMobileMove(dx / maxRadius, -dy / maxRadius);
      e.preventDefault();
    };
    const end = (e: TouchEvent) => {
      const touch = Array.from(e.changedTouches).find((t) => t.identifier === this.joystickTouchId);
      if (!touch && e.type !== 'touchcancel') return;
      this.joystickActive = false;
      this.joystickTouchId = null;
      thumb.style.transform = 'translate(0px, 0px)';
      this.input.setMobileMove(0, 0);
    };

    zone.addEventListener('touchstart', start, { passive: false });
    zone.addEventListener('touchmove', move, { passive: false });
    zone.addEventListener('touchend', end);
    zone.addEventListener('touchcancel', end);
  }

  private setupLookZone(): void {
    const zone = document.getElementById('look-zone')!;
    const start = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      this.lookTouchId = touch.identifier;
      this.lookLast = { x: touch.clientX, y: touch.clientY };
      e.preventDefault();
    };
    const move = (e: TouchEvent) => {
      const touch = Array.from(e.changedTouches).find((t) => t.identifier === this.lookTouchId);
      if (!touch) return;
      const dx = touch.clientX - this.lookLast.x;
      const dy = touch.clientY - this.lookLast.y;
      this.lookLast = { x: touch.clientX, y: touch.clientY };
      this.input.addMobileLookDelta(dx * this.lookSensitivity, dy * this.lookSensitivity);
      e.preventDefault();
    };
    const end = (e: TouchEvent) => {
      const touch = Array.from(e.changedTouches).find((t) => t.identifier === this.lookTouchId);
      if (!touch) return;
      this.lookTouchId = null;
    };

    zone.addEventListener('touchstart', start, { passive: false });
    zone.addEventListener('touchmove', move, { passive: false });
    zone.addEventListener('touchend', end);
    zone.addEventListener('touchcancel', end);
  }
}

export function isMobileDevice(): boolean {
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const uaMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return hasTouch && (uaMobile || window.innerWidth < 900);
}
