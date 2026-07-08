export interface QuestObjectiveDef {
  id: string;
  text: string;
  textEn: string;
}

export interface QuestDef {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  isMain: boolean;
  objectives: QuestObjectiveDef[];
  rewardItems: string[];
  rewardText: string;
}

export const QUESTS: Record<string, QuestDef> = {
  main_ledger: {
    id: 'main_ledger',
    title: '失蹤的商業帳簿',
    titleEn: 'The Missing Ledger',
    description: '茶館老闆王掌櫃的商業帳簿不見了，協助他找回帳簿。',
    isMain: true,
    objectives: [
      { id: 'talk_owner', text: '與茶館老闆對話', textEn: 'Speak with the tea house owner' },
      { id: 'investigate_market', text: '前往市集調查', textEn: 'Investigate the market' },
      { id: 'question_npcs', text: '詢問市集中的目擊者 (0/3)', textEn: 'Question witnesses in the market (0/3)' },
      { id: 'find_ledger', text: '在後巷柴堆中尋找帳簿', textEn: 'Find the ledger hidden in the back-alley woodpile' },
      { id: 'return_ledger', text: '將帳簿交還給王掌櫃', textEn: 'Return the ledger to Shopkeeper Wang' },
    ],
    rewardItems: ['silver_tael'],
    rewardText:
      '獲得銀兩，並解鎖歷史小知識《清明上河圖》與觀景台新區域！\nReceived silver tael, and unlocked the "Along the River During Qingming Festival" history card and a new viewing area!',
  },
  side_fisherman: {
    id: 'side_fisherman',
    title: '漁夫的魚簍',
    titleEn: "The Fisherman's Basket",
    description: '幫助老李在岸邊蘆葦叢中找回遺失的魚簍。',
    isMain: false,
    objectives: [
      { id: 'talk_fisherman', text: '與漁夫老李對話', textEn: 'Speak with fisherman Old Li' },
      { id: 'find_basket', text: '在岸邊蘆葦叢尋找魚簍', textEn: 'Find the basket near the reeds by the shore' },
      { id: 'return_basket', text: '將魚簍交還給老李', textEn: 'Return the basket to Old Li' },
    ],
    rewardItems: ['bronze_coin'],
    rewardText: '獲得銅錢一枚。\nReceived a bronze coin.',
  },
  side_medicine: {
    id: 'side_medicine',
    title: '送藥給李婆婆',
    titleEn: 'Medicine for Granny Li',
    description: '孫大夫請你將藥包送去給年邁的李婆婆。',
    isMain: false,
    objectives: [
      { id: 'talk_doctor', text: '與孫大夫對話', textEn: 'Speak with Physician Sun' },
      { id: 'deliver_medicine', text: '將藥包送給李婆婆', textEn: 'Deliver the medicine to Granny Li' },
    ],
    rewardItems: ['silk_swatch'],
    rewardText: '獲得絲綢布樣一份。\nReceived a silk swatch.',
  },
  side_lost_child: {
    id: 'side_lost_child',
    title: '迷路的孩子',
    titleEn: 'The Lost Child',
    description: '幫助迷路的小豆找到他焦急的母親。',
    isMain: false,
    objectives: [
      { id: 'talk_child', text: '與小豆對話', textEn: 'Speak with the lost child, Little Dou' },
      { id: 'find_mother', text: '在後巷尋找孩子的母親', textEn: "Find the child's mother in the alley" },
      { id: 'reunite', text: '帶母親回到孩子身邊', textEn: 'Bring the mother back to the child' },
    ],
    rewardItems: ['jade_pendant'],
    rewardText: '獲得玉珮一件。\nReceived a jade pendant.',
  },
};

export type QuestId = keyof typeof QUESTS;
