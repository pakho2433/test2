import type { Interactable } from './Interactable';

/**
 * A generic inspectable / informational object: history sign posts, market
 * placards, and quest-relevant props that simply display a message (and
 * optionally reveal a historical info card) without altering game state.
 */
export class InspectPoint implements Interactable {
  id: string;
  name: string;
  promptText = '按 E 查看 · Inspect';
  range = 3.2;

  constructor(id: string, name: string, private onInspect: () => void, private available?: () => boolean) {
    this.id = id;
    this.name = name;
  }

  canInteract(): boolean {
    return this.available ? this.available() : true;
  }

  interact(): void {
    this.onInspect();
  }
}
