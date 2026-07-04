export interface HistoryFactDef {
  id: string;
  title: string;
  titleEn: string;
  text: string;
}

/**
 * Ten optional, concise historical information points inspired by the
 * "Along the River During the Qingming Festival" scroll and Song-dynasty
 * riverside city life. These are educational interpretations intended for
 * students, not a precise historical reconstruction.
 */
export const HISTORY_FACTS: Record<string, HistoryFactDef> = {
  market_life: {
    id: 'market_life',
    title: '市集生活',
    titleEn: 'Market Life',
    text: '宋代城市的市集終日喧鬧，攤販沿街叫賣，販售茶葉、布匹、瓷器與小吃，是庶民生活的中心。\nSong-dynasty markets bustled all day with vendors selling tea, cloth, porcelain and snacks — the heart of everyday city life.',
  },
  transportation: {
    id: 'transportation',
    title: '交通運輸',
    titleEn: 'Transportation',
    text: '河道是重要的交通命脈，船隻運送貨物與旅客；陸上則以獨輪車、扁擔和轎子代步。\nRivers were vital transport arteries for goods and travelers, while wheelbarrows, shoulder poles and sedan chairs served overland transport.',
  },
  architecture: {
    id: 'architecture',
    title: '建築特色',
    titleEn: 'Architecture',
    text: '木構建築以榫卯結構搭建，不用一根釘子；斗拱支撐屋簷，飛簷翹角是典型的中式屋頂設計。\nWooden buildings used mortise-and-tenon joints without nails; bracket sets (dougong) supported upturned eaves typical of Chinese roofs.',
  },
  food: {
    id: 'food',
    title: '飲食文化',
    titleEn: 'Food Culture',
    text: '茶樓與食肆林立，人們喜愛飲茶、吃湯餅與炊餅，茶磚也是遠途貿易的重要商品。\nTeahouses and food stalls were everywhere; tea, noodle soup and steamed buns were popular, and pressed tea bricks were valuable trade goods.',
  },
  clothing: {
    id: 'clothing',
    title: '服飾織物',
    titleEn: 'Clothing & Textiles',
    text: '絲綢與麻布是主要衣料，顏色與紋樣往往顯示穿著者的身分與職業。\nSilk and hemp cloth were the main materials; colors and patterns often signaled a person\'s social status or occupation.',
  },
  river_trade: {
    id: 'river_trade',
    title: '河運貿易',
    titleEn: 'River Trade',
    text: '河運讓貨物得以大量且低成本地流通，糧食、瓷器與茶葉經由船隻運往各地城市。\nRiver transport allowed goods to move cheaply in bulk — grain, porcelain and tea traveled by boat to cities across the region.',
  },
  medicine: {
    id: 'medicine',
    title: '傳統醫藥',
    titleEn: 'Traditional Medicine',
    text: '中醫館以草藥、針灸為主要療法，醫師會依脈象與症狀調配藥方。\nTraditional medicine shops relied on herbal remedies and acupuncture; physicians prescribed formulas based on pulse diagnosis and symptoms.',
  },
  occupations: {
    id: 'occupations',
    title: '職業百態',
    titleEn: 'Occupations',
    text: '城中職業多元，包括商人、船夫、腳夫、郎中、工匠與守衛，共同維繫城市的日常運作。\nCity life supported diverse occupations — merchants, boatmen, porters, physicians, craftsmen and guards — that kept the city running.',
  },
  currency: {
    id: 'currency',
    title: '貨幣制度',
    titleEn: 'Currency',
    text: '銅錢是日常交易的主要貨幣，大額交易則會使用銀兩，部分城市甚至已出現紙幣的雛形。\nBronze coins were used for everyday transactions, silver for larger trades, and some cities had even begun using early forms of paper currency.',
  },
  entertainment: {
    id: 'entertainment',
    title: '娛樂生活',
    titleEn: 'Entertainment',
    text: '說書、雜耍與皮影戲是常見的街頭娛樂，橋邊與市集廣場常聚集觀眾駐足欣賞。\nStorytelling, acrobatics and shadow puppetry were common street entertainments, often drawing crowds near bridges and market squares.',
  },
  qingming_scroll: {
    id: 'qingming_scroll',
    title: '清明上河圖',
    titleEn: 'Along the River During the Qingming Festival',
    text: '本遊戲的城市場景參考自北宋畫家張擇端的名畫《清明上河圖》，畫中描繪了汴京城的繁華景象。此遊戲為教育性詮釋，並非精確的歷史復原。\nThis city is inspired by the famous Song-dynasty scroll painting by Zhang Zeduan, depicting the bustling life of the capital. This game is an educational interpretation, not an exact historical reconstruction.',
  },
};

export type HistoryFactId = keyof typeof HISTORY_FACTS;
