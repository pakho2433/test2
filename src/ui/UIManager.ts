import type { EventBus } from '../utils/EventBus';
import type { GameEvents } from '../core/Events';
import { InventoryManager } from '../inventory/InventoryManager';
import { QuestManager } from '../quests/QuestManager';
import { HistoryManager } from '../quests/HistoryManager';
import { NPCManager, DialogueResult } from '../npc/NPCManager';
import { ITEMS } from '../data/items';
import { QUESTS } from '../data/quests';
import { HISTORY_FACTS } from '../data/historyFacts';
import { AudioManager } from '../audio/AudioManager';
import { GameSettings, applySettingsToDocument } from '../core/Settings';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing DOM element #${id}`);
  return el;
}

type ScreenId =
  | 'loading-screen'
  | 'main-menu'
  | 'hud'
  | 'dialogue-panel'
  | 'inventory-panel'
  | 'quest-panel'
  | 'history-panel'
  | 'pause-panel'
  | 'settings-panel'
  | 'mission-complete-panel'
  | 'orientation-warning';

/**
 * Owns and wires every HTML/CSS UI panel: loading screen, main menu, HUD,
 * dialogue, inventory, quest log, settings, pause, mission-complete and
 * mobile controls. Pure DOM manipulation — no game logic lives here.
 */
export class UIManager {
  private notificationTimeout = 3200;
  private activeDialogue: DialogueResult | null = null;
  private dialogueLineIndex = 0;

  constructor(
    private bus: EventBus<GameEvents>,
    private inventory: InventoryManager,
    private quests: QuestManager,
    private history: HistoryManager,
    private npcManager: NPCManager,
    private audio: AudioManager,
    private settings: GameSettings,
    private callbacks: {
      onNewGame: () => void;
      onContinue: () => void;
      onResetProgress: () => void;
      onResume: () => void;
      onSaveRequest: () => void;
      onQuitToMenu: () => void;
      onSettingsChanged: (s: GameSettings) => void;
      hasSave: () => boolean;
    },
  ) {
    this.wireEvents();
    this.wireButtons();
    this.applySettingsToInputs();
  }

  private show(id: ScreenId): void {
    $(id).classList.remove('hidden');
  }
  private hide(id: ScreenId): void {
    $(id).classList.add('hidden');
  }

  isModalOpen(): boolean {
    const ids: ScreenId[] = [
      'dialogue-panel',
      'inventory-panel',
      'quest-panel',
      'history-panel',
      'pause-panel',
      'settings-panel',
      'mission-complete-panel',
      'main-menu',
    ];
    return ids.some((id) => !$(id).classList.contains('hidden'));
  }

  runLoadingSequence(onDone: () => void): void {
    const fill = $('loading-bar-fill');
    const text = $('loading-text');
    let progress = 0;
    const steps = [
      '正在鋪設石板路 / Laying cobblestones…',
      '正在搭建茶館 / Building the tea house…',
      '正在喚醒居民 / Waking the residents…',
      '正在注入河水 / Filling the river…',
    ];
    const timer = setInterval(() => {
      progress += 14 + Math.random() * 10;
      fill.style.width = `${Math.min(progress, 100)}%`;
      text.textContent = steps[Math.min(Math.floor(progress / 26), steps.length - 1)];
      if (progress >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          this.hide('loading-screen');
          this.show('main-menu');
          ($('btn-continue') as HTMLButtonElement).disabled = !this.callbacks.hasSave();
          onDone();
        }, 250);
      }
    }, 160);
  }

  showMainMenu(): void {
    this.show('main-menu');
    ($('btn-continue') as HTMLButtonElement).disabled = !this.callbacks.hasSave();
  }

  hideMainMenuAndStartHUD(): void {
    this.hide('main-menu');
    this.show('hud');
  }

  private wireButtons(): void {
    $('btn-new-game').addEventListener('click', () => {
      this.audio.unlock();
      this.audio.uiClickSound();
      this.callbacks.onNewGame();
    });
    $('btn-continue').addEventListener('click', () => {
      this.audio.unlock();
      this.audio.uiClickSound();
      this.callbacks.onContinue();
    });
    $('btn-reset').addEventListener('click', () => {
      this.audio.uiClickSound();
      if (confirm('確定要重置所有進度嗎？ Reset all progress?')) this.callbacks.onResetProgress();
    });
    $('btn-settings').addEventListener('click', () => this.show('settings-panel'));
    $('btn-pause-settings').addEventListener('click', () => this.show('settings-panel'));

    $('btn-resume').addEventListener('click', () => {
      this.hide('pause-panel');
      this.callbacks.onResume();
    });
    $('btn-save').addEventListener('click', () => {
      this.callbacks.onSaveRequest();
      this.notify('遊戲已儲存 · Game saved');
    });
    $('btn-quit').addEventListener('click', () => this.callbacks.onQuitToMenu());

    $('btn-hud-inventory').addEventListener('click', () => this.toggleInventory());
    $('btn-hud-quest').addEventListener('click', () => this.toggleQuestLog());
    $('btn-hud-pause').addEventListener('click', () => this.openPause());
    $('btn-mobile-inventory').addEventListener('click', () => this.toggleInventory());
    $('btn-mobile-quest').addEventListener('click', () => this.toggleQuestLog());
    $('btn-mobile-pause').addEventListener('click', () => this.openPause());

    $('btn-mission-continue').addEventListener('click', () => this.hide('mission-complete-panel'));

    document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((btn) => {
      btn.addEventListener('click', () => this.hide(btn.dataset.close as ScreenId));
    });

    const settingsInputs: [string, keyof GameSettings, (v: string, el: HTMLElement) => any][] = [
      ['set-master-vol', 'masterVolume', (v) => Number(v) / 100],
      ['set-sfx-vol', 'sfxVolume', (v) => Number(v) / 100],
      ['set-music-vol', 'musicVolume', (v) => Number(v) / 100],
      ['set-sensitivity', 'mouseSensitivity', (v) => Number(v) / 100],
      ['set-text-size', 'textScale', (v) => Number(v) / 100],
      ['set-quality', 'quality', (v) => v],
      ['set-subtitles', 'subtitles', (_v, el) => (el as HTMLInputElement).checked],
      ['set-reduced-motion', 'reducedMotion', (_v, el) => (el as HTMLInputElement).checked],
      ['set-high-contrast', 'highContrast', (_v, el) => (el as HTMLInputElement).checked],
      ['set-screenshake', 'screenShake', (_v, el) => (el as HTMLInputElement).checked],
    ];
    settingsInputs.forEach(([id, key, parse]) => {
      const el = $(id) as HTMLInputElement;
      el.addEventListener('input', () => {
        (this.settings as any)[key] = parse(el.value, el);
        applySettingsToDocument(this.settings);
        this.callbacks.onSettingsChanged(this.settings);
      });
    });
  }

  private applySettingsToInputs(): void {
    ($('set-master-vol') as HTMLInputElement).value = String(this.settings.masterVolume * 100);
    ($('set-sfx-vol') as HTMLInputElement).value = String(this.settings.sfxVolume * 100);
    ($('set-music-vol') as HTMLInputElement).value = String(this.settings.musicVolume * 100);
    ($('set-sensitivity') as HTMLInputElement).value = String(this.settings.mouseSensitivity * 100);
    ($('set-text-size') as HTMLInputElement).value = String(this.settings.textScale * 100);
    ($('set-quality') as HTMLSelectElement).value = this.settings.quality;
    ($('set-subtitles') as HTMLInputElement).checked = this.settings.subtitles;
    ($('set-reduced-motion') as HTMLInputElement).checked = this.settings.reducedMotion;
    ($('set-high-contrast') as HTMLInputElement).checked = this.settings.highContrast;
    ($('set-screenshake') as HTMLInputElement).checked = this.settings.screenShake;
    applySettingsToDocument(this.settings);
  }

  openPause(): void {
    this.show('pause-panel');
  }

  toggleInventory(): void {
    const el = $('inventory-panel');
    if (el.classList.contains('hidden')) {
      this.renderInventory();
      this.show('inventory-panel');
    } else {
      this.hide('inventory-panel');
    }
  }

  toggleQuestLog(): void {
    const el = $('quest-panel');
    if (el.classList.contains('hidden')) {
      this.renderQuestLog();
      this.show('quest-panel');
    } else {
      this.hide('quest-panel');
    }
  }

  private renderInventory(): void {
    const grid = $('inventory-grid');
    grid.innerHTML = '';
    const detail = $('inventory-detail');
    detail.classList.add('hidden');
    const slots = this.inventory.getSlots();
    if (slots.length === 0) {
      grid.innerHTML = '<p style="opacity:0.7">背包是空的 · Inventory is empty</p>';
      return;
    }
    slots.forEach((slot) => {
      const def = ITEMS[slot.id];
      if (!def) return;
      const div = document.createElement('div');
      div.className = 'inventory-slot';
      div.title = def.name;
      div.innerHTML = `${def.icon}${slot.qty > 1 ? `<span class="qty-badge">x${slot.qty}</span>` : ''}`;
      div.addEventListener('click', () => {
        $('inv-detail-name').textContent = `${def.name} · ${def.nameEn}`;
        $('inv-detail-desc').textContent = def.description;
        detail.classList.remove('hidden');
      });
      grid.appendChild(div);
    });
  }

  private renderQuestLog(): void {
    const list = $('quest-list');
    list.innerHTML = '';
    Object.values(QUESTS).forEach((def) => {
      const state = this.quests.getState(def.id);
      if (state.status === 'unavailable') return;
      const div = document.createElement('div');
      div.className = `quest-entry${state.status === 'completed' ? ' completed' : ''}`;
      const statusLabel =
        state.status === 'available'
          ? '未接受 Not Accepted'
          : state.status === 'active'
            ? '進行中 In Progress'
            : '已完成 Completed';
      const objective = def.objectives[state.objectiveIndex];
      div.innerHTML = `
        <div class="quest-name">${def.isMain ? '★ ' : ''}${def.title} · ${def.titleEn}</div>
        <div class="quest-obj">${state.status === 'active' && objective ? objective.text : def.description}</div>
        <div class="quest-status">${statusLabel}</div>
      `;
      list.appendChild(div);
    });
  }

  showHistoryCard(id: string): void {
    const fact = HISTORY_FACTS[id];
    if (!fact) return;
    $('history-title').textContent = `${fact.title} · ${fact.titleEn}`;
    $('history-text').textContent = fact.text;
    this.show('history-panel');
  }

  openDialogue(npcId: string, displayName: string): void {
    this.activeDialogue = this.npcManager.getDialogue(npcId, displayName);
    this.dialogueLineIndex = 0;
    this.renderDialogueStep();
    this.show('dialogue-panel');
  }

  private renderDialogueStep(): void {
    if (!this.activeDialogue) return;
    $('dialogue-name').textContent = this.activeDialogue.speakerName;
    const isLast = this.dialogueLineIndex >= this.activeDialogue.lines.length - 1;
    $('dialogue-text').textContent = this.activeDialogue.lines[this.dialogueLineIndex] ?? '';
    if (this.settings.subtitles) {
      this.bus.emit('subtitle', { text: this.activeDialogue.lines[this.dialogueLineIndex] ?? '' });
    }
    const optionsEl = $('dialogue-options');
    optionsEl.innerHTML = '';
    if (!isLast) {
      const btn = document.createElement('button');
      btn.textContent = '繼續 Next ▶';
      btn.addEventListener('click', () => {
        this.dialogueLineIndex++;
        this.renderDialogueStep();
      });
      optionsEl.appendChild(btn);
    } else {
      this.activeDialogue.options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.textContent = opt.label;
        btn.addEventListener('click', () => {
          opt.onSelect();
          this.closeDialogue();
        });
        optionsEl.appendChild(btn);
      });
    }
  }

  closeDialogue(): void {
    this.hide('dialogue-panel');
    this.activeDialogue = null;
    this.bus.emit('dialogue-close', undefined);
  }

  isDialogueOpen(): boolean {
    return !$('dialogue-panel').classList.contains('hidden');
  }

  private wireEvents(): void {
    this.bus.on('interaction-target', ({ name, prompt }) => {
      const el = $('interaction-prompt');
      if (name) {
        el.classList.remove('hidden');
        $('interaction-name').textContent = name;
        $('interaction-hint').textContent = prompt ?? '按 E 互動 / Press E';
      } else {
        el.classList.add('hidden');
      }
    });

    this.bus.on('objective-changed', ({ text }) => {
      $('objective-text').textContent = text;
    });

    this.bus.on('notify', ({ text }) => this.notify(text));

    this.bus.on('subtitle', ({ text }) => {
      if (!this.settings.subtitles) return;
      const box = $('subtitle-box');
      box.textContent = text;
      box.classList.remove('hidden');
      window.clearTimeout((box as any)._t);
      (box as any)._t = window.setTimeout(() => box.classList.add('hidden'), 4000);
    });

    this.bus.on('dialogue-open', ({ npcId }) => {
      this.activeDialogue = this.npcManager.getDialogue(npcId, npcId);
      this.dialogueLineIndex = 0;
      this.renderDialogueStep();
      this.show('dialogue-panel');
    });

    this.bus.on('item-added', () => {
      this.audio.itemCollectSound();
    });

    this.bus.on('quest-updated', () => {
      this.audio.missionProgressSound();
    });

    this.bus.on('quest-completed', ({ questId }) => {
      const def = QUESTS[questId];
      this.audio.missionCompleteSound();
      $('mission-complete-title').textContent = def.isMain ? '主線任務完成！Main Quest Complete!' : '任務完成 Mission Complete';
      $('mission-complete-text').textContent = `${def.title} · ${def.titleEn}`;
      $('mission-complete-rewards').textContent = def.rewardText;
      this.show('mission-complete-panel');
    });

    this.bus.on('history-unlocked', ({ id }) => {
      this.showHistoryCard(id);
    });

    this.bus.on('door-toggled', ({ open }) => {
      this.audio.doorSound(open);
    });
  }

  notify(text: string): void {
    const area = $('notification-area');
    const div = document.createElement('div');
    div.className = 'notification';
    div.textContent = text;
    area.appendChild(div);
    setTimeout(() => div.remove(), this.notificationTimeout);
  }

  updateOrientationWarning(): void {
    const warn = $('orientation-warning');
    const isPortraitMobile = window.innerWidth < 900 && window.innerHeight > window.innerWidth;
    warn.classList.toggle('hidden', !isPortraitMobile);
  }
}
