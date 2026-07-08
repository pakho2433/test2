const SAVE_KEY = 'qingming_riverside_save_v1';

export interface SaveData {
  version: number;
  player: { x: number; y: number; z: number; yaw: number; pitch: number };
  inventory: { id: string; qty: number }[];
  quests: Record<string, { status: string; objectiveIndex: number; counters: Record<string, number> }>;
  discoveredHistory: string[];
  settings: Record<string, unknown>;
  savedAt: number;
}

/**
 * Wraps localStorage access with corruption-safe parsing so a broken or
 * tampered save never results in a blank screen or thrown exception.
 */
export class SaveManager {
  hasSave(): boolean {
    try {
      return localStorage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object' || typeof data.version !== 'number') {
        console.warn('[SaveManager] Save data failed validation, ignoring.');
        return null;
      }
      return data as SaveData;
    } catch (err) {
      console.warn('[SaveManager] Corrupted save data, starting fresh.', err);
      return null;
    }
  }

  save(data: SaveData): boolean {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (err) {
      console.warn('[SaveManager] Failed to write save data.', err);
      return false;
    }
  }

  reset(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  }
}
