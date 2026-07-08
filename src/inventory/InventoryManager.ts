import type { EventBus } from '../utils/EventBus';
import type { GameEvents } from '../core/Events';
import { ITEMS, type ItemId } from '../data/items';

export interface InventorySlot {
  id: ItemId;
  qty: number;
}

/**
 * Simple, mobile-friendly inventory: quest items, historical collectibles,
 * icons, names, descriptions, inspection and delivery (consume-on-use)
 * actions.
 */
export class InventoryManager {
  private slots = new Map<ItemId, number>();

  constructor(private bus: EventBus<GameEvents>) {}

  addItem(id: ItemId, qty = 1): void {
    this.slots.set(id, (this.slots.get(id) ?? 0) + qty);
    this.bus.emit('item-added', { id, qty });
    this.bus.emit('inventory-changed', undefined);
    const def = ITEMS[id];
    if (def) this.bus.emit('notify', { text: `獲得物品：${def.name} · ${def.nameEn}` });
  }

  hasItem(id: ItemId, qty = 1): boolean {
    return (this.slots.get(id) ?? 0) >= qty;
  }

  removeItem(id: ItemId, qty = 1): boolean {
    const cur = this.slots.get(id) ?? 0;
    if (cur < qty) return false;
    const next = cur - qty;
    if (next <= 0) this.slots.delete(id);
    else this.slots.set(id, next);
    this.bus.emit('inventory-changed', undefined);
    return true;
  }

  getSlots(): InventorySlot[] {
    return Array.from(this.slots.entries()).map(([id, qty]) => ({ id, qty }));
  }

  serialize(): InventorySlot[] {
    return this.getSlots();
  }

  deserialize(data: InventorySlot[] | undefined): void {
    if (!data) return;
    this.slots.clear();
    data.forEach((s) => this.slots.set(s.id, s.qty));
    this.bus.emit('inventory-changed', undefined);
  }
}
