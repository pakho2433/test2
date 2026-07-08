import type { EventBus } from '../utils/EventBus';
import type { GameEvents } from '../core/Events';
import { DIALOGUES } from '../data/dialogues';
import { QuestManager } from '../quests/QuestManager';
import { InventoryManager } from '../inventory/InventoryManager';
import { HistoryManager } from '../quests/HistoryManager';

export interface DialogueOption {
  label: string;
  onSelect: () => void;
}

export interface DialogueResult {
  speakerName: string;
  lines: string[];
  options: DialogueOption[];
}

const WITNESS_NPCS = ['food_merchant', 'boat_operator', 'delivery_worker'];

/**
 * Resolves quest-state-aware dialogue for every NPC: which lines to show and
 * which action options (accept quest, hand in item, etc.) are available.
 * All raw dialogue text lives in src/data/dialogues.ts.
 */
export class NPCManager {
  constructor(
    private bus: EventBus<GameEvents>,
    private quests: QuestManager,
    private inventory: InventoryManager,
    private history: HistoryManager,
  ) {}

  getDialogue(npcId: string, displayName: string): DialogueResult {
    const options: DialogueOption[] = [];
    let lines: string[] = DIALOGUES[npcId]?.idle ?? ['……'];

    switch (npcId) {
      case 'tea_owner':
        return this.teaOwnerDialogue(displayName);
      case 'food_merchant':
      case 'boat_operator':
      case 'delivery_worker':
        return this.witnessDialogue(npcId, displayName);
      case 'fisherman':
        return this.fishermanDialogue(displayName);
      case 'doctor':
        return this.doctorDialogue(displayName);
      case 'elderly_resident':
        return this.elderlyDialogue(displayName);
      case 'lost_child':
        return this.lostChildDialogue(displayName);
      case 'mother':
        return this.motherDialogue(displayName);
      default:
        options.push({ label: '離開 Leave', onSelect: () => {} });
        return { speakerName: displayName, lines, options };
    }
  }

  private leave(): DialogueOption {
    return { label: '離開 Leave', onSelect: () => {} };
  }

  private teaOwnerDialogue(name: string): DialogueResult {
    const q = this.quests.getState('main_ledger');
    if (q.status === 'completed') {
      return { speakerName: name, lines: DIALOGUES.tea_owner.post_quest, options: [this.leave()] };
    }
    if (q.status === 'available') {
      return {
        speakerName: name,
        lines: DIALOGUES.tea_owner.quest_intro,
        options: [
          {
            label: '好的，我會幫你找回帳簿 · Accept Quest',
            onSelect: () => {
              this.quests.startQuest('main_ledger');
              this.quests.advanceObjective('main_ledger'); // talk_owner -> investigate_market
            },
          },
          this.leave(),
        ],
      };
    }
    // active
    const objective = this.quests.currentObjectiveId('main_ledger');
    if (objective === 'return_ledger' && this.inventory.hasItem('ledger' as any)) {
      return {
        speakerName: name,
        lines: DIALOGUES.tea_owner.quest_active_ledger_found,
        options: [
          {
            label: '交出帳簿 · Give Ledger',
            onSelect: () => {
              this.inventory.removeItem('ledger' as any, 1);
              this.quests.completeQuest('main_ledger');
              this.history.discover('qingming_scroll');
              this.bus.emit('notify', { text: this.quests.getDef('main_ledger').rewardText });
            },
          },
          this.leave(),
        ],
      };
    }
    if (objective === 'question_npcs' || objective === 'find_ledger') {
      return { speakerName: name, lines: DIALOGUES.tea_owner.quest_active_witnesses, options: [this.leave()] };
    }
    return { speakerName: name, lines: DIALOGUES.tea_owner.quest_active_investigate, options: [this.leave()] };
  }

  private witnessDialogue(npcId: string, name: string): DialogueResult {
    const clueId = { food_merchant: 'clue_merchant', boat_operator: 'clue_boatman', delivery_worker: 'clue_worker' }[
      npcId
    ] as any;
    const active = this.quests.isActive('main_ledger');
    const objective = this.quests.currentObjectiveId('main_ledger');
    const alreadyGiven = this.inventory.hasItem(clueId);

    if (active && (objective === 'question_npcs' || objective === 'investigate_market') && !alreadyGiven) {
      return {
        speakerName: name,
        lines: DIALOGUES[npcId].witness_info,
        options: [
          {
            label: '謝謝你的線索 · Thanks for the clue',
            onSelect: () => {
              this.inventory.addItem(clueId, 1);
              const count = this.quests.incrementCounter('main_ledger', 'witnesses');
              if (this.quests.currentObjectiveId('main_ledger') === 'investigate_market') {
                this.quests.advanceObjective('main_ledger');
              }
              this.quests.refreshTrackedObjective();
              if (count >= WITNESS_NPCS.length && this.quests.currentObjectiveId('main_ledger') === 'question_npcs') {
                this.quests.advanceObjective('main_ledger');
              }
            },
          },
          this.leave(),
        ],
      };
    }
    if (alreadyGiven) {
      return { speakerName: name, lines: DIALOGUES[npcId].witness_given ?? DIALOGUES[npcId].idle, options: [this.leave()] };
    }
    return { speakerName: name, lines: DIALOGUES[npcId].idle, options: [this.leave()] };
  }

  private fishermanDialogue(name: string): DialogueResult {
    const q = this.quests.getState('side_fisherman');
    if (q.status === 'completed') {
      return { speakerName: name, lines: DIALOGUES.fisherman.post_quest, options: [this.leave()] };
    }
    if (q.status === 'available') {
      return {
        speakerName: name,
        lines: DIALOGUES.fisherman.side_quest_intro,
        options: [
          {
            label: '好，我幫你找找 · Accept Quest',
            onSelect: () => {
              this.quests.startQuest('side_fisherman');
              this.quests.advanceObjective('side_fisherman');
            },
          },
          this.leave(),
        ],
      };
    }
    const objective = this.quests.currentObjectiveId('side_fisherman');
    if (objective === 'return_basket' && this.inventory.hasItem('basket' as any)) {
      return {
        speakerName: name,
        lines: DIALOGUES.fisherman.side_quest_active,
        options: [
          {
            label: '交還魚簍 · Return Basket',
            onSelect: () => {
              this.inventory.removeItem('basket' as any, 1);
              this.quests.completeQuest('side_fisherman');
              this.bus.emit('notify', { text: DIALOGUES.fisherman.side_quest_complete[0] });
            },
          },
          this.leave(),
        ],
      };
    }
    return { speakerName: name, lines: DIALOGUES.fisherman.side_quest_active, options: [this.leave()] };
  }

  private doctorDialogue(name: string): DialogueResult {
    const q = this.quests.getState('side_medicine');
    if (q.status === 'completed') {
      return { speakerName: name, lines: DIALOGUES.doctor.post_quest, options: [this.leave()] };
    }
    if (q.status === 'available') {
      return {
        speakerName: name,
        lines: DIALOGUES.doctor.side_quest_intro,
        options: [
          {
            label: '好的，我會送去 · Accept Quest',
            onSelect: () => {
              this.quests.startQuest('side_medicine');
              this.inventory.addItem('medicine_pack' as any, 1);
              this.quests.advanceObjective('side_medicine');
            },
          },
          this.leave(),
        ],
      };
    }
    return { speakerName: name, lines: DIALOGUES.doctor.side_quest_active, options: [this.leave()] };
  }

  private elderlyDialogue(name: string): DialogueResult {
    const objective = this.quests.currentObjectiveId('side_medicine');
    if (objective === 'deliver_medicine' && this.inventory.hasItem('medicine_pack' as any)) {
      return {
        speakerName: name,
        lines: DIALOGUES.elderly_resident.waiting_medicine,
        options: [
          {
            label: '交付藥包 · Deliver Medicine',
            onSelect: () => {
              this.inventory.removeItem('medicine_pack' as any, 1);
              this.quests.completeQuest('side_medicine');
              this.bus.emit('notify', { text: DIALOGUES.elderly_resident.medicine_delivered[0] });
            },
          },
          this.leave(),
        ],
      };
    }
    if (this.quests.isCompleted('side_medicine')) {
      return { speakerName: name, lines: DIALOGUES.elderly_resident.medicine_delivered, options: [this.leave()] };
    }
    return { speakerName: name, lines: DIALOGUES.elderly_resident.idle, options: [this.leave()] };
  }

  private lostChildDialogue(name: string): DialogueResult {
    const q = this.quests.getState('side_lost_child');
    if (q.status === 'completed') {
      return { speakerName: name, lines: DIALOGUES.lost_child.side_quest_complete, options: [this.leave()] };
    }
    if (q.status === 'available') {
      return {
        speakerName: name,
        lines: DIALOGUES.lost_child.side_quest_intro,
        options: [
          {
            label: '我來幫你找娘親 · Accept Quest',
            onSelect: () => {
              this.quests.startQuest('side_lost_child');
              this.quests.advanceObjective('side_lost_child');
            },
          },
          this.leave(),
        ],
      };
    }
    return { speakerName: name, lines: DIALOGUES.lost_child.side_quest_active, options: [this.leave()] };
  }

  private motherDialogue(name: string): DialogueResult {
    const objective = this.quests.currentObjectiveId('side_lost_child');
    if (objective === 'find_mother') {
      return {
        speakerName: name,
        lines: DIALOGUES.mother.idle,
        options: [
          {
            label: '告知孩子下落 · Tell her where the child is',
            onSelect: () => {
              this.quests.advanceObjective('side_lost_child'); // find_mother -> reunite
              this.quests.advanceObjective('side_lost_child'); // reunite is final step, complete immediately
              this.quests.completeQuest('side_lost_child');
              this.bus.emit('notify', { text: DIALOGUES.mother.reunited[0] });
            },
          },
          this.leave(),
        ],
      };
    }
    if (this.quests.isCompleted('side_lost_child')) {
      return { speakerName: name, lines: DIALOGUES.mother.reunited, options: [this.leave()] };
    }
    return { speakerName: name, lines: DIALOGUES.mother.idle, options: [this.leave()] };
  }
}
