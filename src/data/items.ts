export type ItemType = 'quest' | 'collectible' | 'misc';

export interface ItemDef {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  icon: string; // emoji glyph used as a lightweight icon (no external asset required)
  type: ItemType;
  historyFactId?: string; // collectibles may reveal a historical info card when picked up
}

export const ITEMS: Record<string, ItemDef> = {
  clue_merchant: {
    id: 'clue_merchant',
    name: '線索：商人證詞',
    nameEn: 'Clue: Merchant Testimony',
    description: '食肆老闆陳嬸提到，帳簿失竊當晚有個陌生腳夫在市集徘徊。',
    icon: '📝',
    type: 'quest',
  },
  clue_boatman: {
    id: 'clue_boatman',
    name: '線索：船夫證詞',
    nameEn: 'Clue: Boatman Testimony',
    description: '船夫周船夫記得那名腳夫朝著碼頭方向離開，手裡似乎抱著木盒。',
    icon: '📝',
    type: 'quest',
  },
  clue_worker: {
    id: 'clue_worker',
    name: '線索：工人證詞',
    nameEn: 'Clue: Worker Testimony',
    description: '送貨工人阿福說，他曾看見有人把一本帳簿藏在後巷的柴堆裡。',
    icon: '📝',
    type: 'quest',
  },
  ledger: {
    id: 'ledger',
    name: '失蹤的商業帳簿',
    nameEn: 'The Missing Ledger',
    description: '一本記載著茶館往來交易的帳簿，看來是被人藏在後巷柴堆中。',
    icon: '📒',
    type: 'quest',
  },
  basket: {
    id: 'basket',
    name: '漁夫的魚簍',
    nameEn: "Fisherman's Basket",
    description: '老李遺失的魚簍，被沖到岸邊的蘆葦叢裡。',
    icon: '🧺',
    type: 'quest',
  },
  medicine_pack: {
    id: 'medicine_pack',
    name: '藥包',
    nameEn: 'Medicine Pack',
    description: '孫大夫配好的藥包，需要送去給年邁的李婆婆。',
    icon: '💊',
    type: 'quest',
  },
  silver_tael: {
    id: 'silver_tael',
    name: '銀兩',
    nameEn: 'Silver Tael',
    description: '完成任務所獲得的獎賞，古代中國的通行貨幣之一。',
    icon: '🪙',
    type: 'misc',
    historyFactId: 'currency',
  },
  jade_pendant: {
    id: 'jade_pendant',
    name: '玉珮',
    nameEn: 'Jade Pendant',
    description: '孩子的母親贈送的謝禮，象徵平安吉祥。',
    icon: '🟢',
    type: 'misc',
  },
  porcelain_shard: {
    id: 'porcelain_shard',
    name: '瓷器碎片',
    nameEn: 'Porcelain Shard',
    description: '市集地上拾獲的青瓷碎片，見證了當年繁盛的河運貿易。',
    icon: '🏺',
    type: 'collectible',
    historyFactId: 'river_trade',
  },
  silk_swatch: {
    id: 'silk_swatch',
    name: '絲綢布樣',
    nameEn: 'Silk Swatch',
    description: '一小片精美絲綢，展示了當時服飾的織染工藝。',
    icon: '🧵',
    type: 'collectible',
    historyFactId: 'clothing',
  },
  tea_brick: {
    id: 'tea_brick',
    name: '茶磚',
    nameEn: 'Tea Brick',
    description: '壓製成磚的茶葉，方便長途運輸與交易。',
    icon: '🍵',
    type: 'collectible',
    historyFactId: 'food',
  },
  bronze_coin: {
    id: 'bronze_coin',
    name: '銅錢',
    nameEn: 'Bronze Coin',
    description: '市集中常見的方孔銅錢，是尋常百姓的主要貨幣。',
    icon: '🔘',
    type: 'collectible',
    historyFactId: 'occupations',
  },
};

export type ItemId = keyof typeof ITEMS;
