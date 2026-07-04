import type { ItemId } from '../data/items';

/** Central typed event map shared across all game systems via a single EventBus instance. */
export interface GameEvents {
  notify: { text: string };
  subtitle: { text: string };
  'interaction-target': { name: string | null; prompt?: string };
  'dialogue-open': { npcId: string };
  'dialogue-close': undefined;
  'item-added': { id: ItemId; qty: number };
  'inventory-changed': undefined;
  'quest-updated': { questId: string };
  'quest-completed': { questId: string };
  'objective-changed': { text: string };
  'history-unlocked': { id: string };
  'save-game': undefined;
  'load-game': undefined;
  'pause-toggled': { paused: boolean };
  footstep: undefined;
  'door-toggled': { open: boolean };
}
