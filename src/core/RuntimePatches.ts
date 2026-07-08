import { AudioManager } from '../audio/AudioManager';
import { NPC_BY_ID } from '../data/npcs';

let installed = false;

/**
 * Small production hardening fixes kept separate from the game systems so the
 * original modular architecture remains intact.
 */
export function installRuntimePatches(): void {
  if (installed) return;
  installed = true;

  // Browsers only allow WebAudio to start after a user gesture. The loading
  // sequence normally lasts longer than Game's first-second ambience window,
  // so start the procedural ambience at the same moment audio is unlocked.
  const originalUnlock = AudioManager.prototype.unlock;
  AudioManager.prototype.unlock = function patchedUnlock(this: AudioManager): void {
    originalUnlock.call(this);
    this.startRiverAmbience();
    this.startMarketAmbience();
  };

  // UIManager's pause buttons open the panel directly. Route those clicks
  // through the same Escape action used by Game so simulation state, pointer
  // lock and the pause overlay always stay synchronized.
  ['btn-hud-pause', 'btn-mobile-pause'].forEach((id) => {
    const button = document.getElementById(id);
    button?.addEventListener(
      'click',
      () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
        queueMicrotask(() => {
          window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true }));
        });
      },
      { capture: true },
    );
  });

  // Dialogue events carry an NPC id. Convert it to the bilingual display name
  // whenever UIManager writes the heading, rather than exposing internal ids.
  const dialogueName = document.getElementById('dialogue-name');
  if (dialogueName) {
    const restoreDisplayName = (): void => {
      const npc = NPC_BY_ID[dialogueName.textContent ?? ''];
      if (npc) dialogueName.textContent = `${npc.name} · ${npc.nameEn}`;
    };
    new MutationObserver(restoreDisplayName).observe(dialogueName, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
}
