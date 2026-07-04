/**
 * Editable dialogue data. Lines are written in Traditional Chinese; important
 * historical terms include an English translation beneath. Branching state
 * keys are resolved by NPCManager/QuestManager based on quest progress.
 */
export const DIALOGUES: Record<string, Record<string, string[]>> = {
  tea_owner: {
    idle: [
      '客官，來喝杯茶嗎？\n(Traveler, care for a cup of tea?)',
      '本店的龍井可是遠近馳名。\n(Our Longjing tea is famous far and wide.)',
    ],
    quest_intro: [
      '哎呀，客官來得正好！我的商業帳簿不見了！\n(Ah, traveler, just in time! My ledger has gone missing!)',
      '那本帳簿記著茶館所有的往來帳目，若落入他人之手，麻煩可大了。\n(That ledger records all our transactions — if it falls into the wrong hands, it will cause serious trouble.)',
      '能否請你幫我到市集打聽打聽？\n(Could you please ask around the market for me?)',
    ],
    quest_active_investigate: [
      '帳簿的事，還請你多留意市集裡的風吹草動。\n(Please keep an eye out in the market for any clues about the ledger.)',
    ],
    quest_active_witnesses: [
      '市集裡有些人當晚在場，也許他們看到了什麼。\n(Some people were in the market that night — perhaps they saw something.)',
    ],
    quest_active_ledger_found: [
      '你找到帳簿了？太好了，快拿來給我看看！\n(You found the ledger? Wonderful, let me see it!)',
    ],
    quest_complete: [
      '太感謝你了！這帳簿對茶館非常重要。\n(Thank you so much! This ledger means everything to the tea house.)',
      '這是給你的謝禮，還有一個小秘密要告訴你……\n(Here is your reward, and a little secret to share with you…)',
    ],
    post_quest: [
      '多虧了你，茶館又恢復了往日的熱鬧。\n(Thanks to you, the tea house has returned to its former bustle.)',
    ],
  },
  food_merchant: {
    idle: ['要不要嚐嚐我的湯餅？熱騰騰的！\n(Care to try my noodle soup? Piping hot!)'],
    witness_info: [
      '那天晚上啊……我記得有個陌生的腳夫在市集裡鬼鬼祟祟的。\n(That night… I remember a strange porter lurking around the market.)',
      '他行色匆匆，往碼頭的方向去了。\n(He was in a hurry, heading toward the docks.)',
    ],
    witness_given: ['我知道的都告訴你了，希望能幫上忙。\n(I\'ve told you everything I know — I hope it helps.)'],
  },
  fisherman: {
    idle: ['河水今天挺平靜的。\n(The river is calm today.)'],
    side_quest_intro: [
      '哎，我的魚簍被水沖走了，就在岸邊的蘆葦叢附近，能幫我找找嗎？\n(Ugh, my fishing basket got swept away — it should be near the reeds by the shore. Could you help me find it?)',
    ],
    side_quest_active: ['魚簍應該還在附近，麻煩你了。\n(The basket should still be nearby, thank you.)'],
    side_quest_complete: ['太好了！這個魚簍是我祖傳的，謝謝你！\n(Wonderful! This basket has been in my family for generations, thank you!)'],
    post_quest: ['今天運氣不錯，多虧了你。\n(Good luck today, thanks to you.)'],
    witness_info: ['那晚我看見一個人抱著木盒往碼頭去了，行色匆忙。\n(That night I saw someone carrying a wooden box toward the dock, in a hurry.)'],
  },
  boat_operator: {
    idle: ['要不要搭船遊河？\n(Care to take a boat ride on the river?)'],
    witness_info: ['我記得那名腳夫抱著個木盒子，朝碼頭方向走了。\n(I recall that porter carrying a wooden box, walking toward the docks.)'],
    witness_given: ['希望這消息對你有幫助。\n(I hope this information helps.)'],
  },
  doctor: {
    idle: ['把把脈吧，最近可有不適？\n(Let me check your pulse — feeling unwell lately?)'],
    side_quest_intro: [
      '李婆婆年事已高，行動不便，能否替我把這藥包送去給她？\n(Granny Li is elderly and has trouble walking — could you deliver this medicine to her for me?)',
    ],
    side_quest_active: ['藥包還在你身上嗎？李婆婆等著呢。\n(Do you still have the medicine? Granny Li is waiting.)'],
    side_quest_complete: ['謝謝你幫忙送藥，這是我的一點心意。\n(Thank you for delivering the medicine — here is a small token of my appreciation.)'],
    post_quest: ['若有不適，隨時歡迎前來。\n(If you feel unwell, you are welcome to visit anytime.)'],
  },
  guard: {
    idle: [
      '城內一切安好，通行請小心。\n(All is well in the city — travel safely.)',
      '若見到可疑之人，記得向我通報。\n(If you see anything suspicious, be sure to report it to me.)',
    ],
  },
  delivery_worker: {
    idle: ['貨物送不完啊，忙得很！\n(So many deliveries, I\'m swamped!)'],
    witness_info: ['我曾看見有人把一本帳簿藏進後巷的柴堆裡。\n(I once saw someone hide a ledger in the woodpile in the back alley.)'],
  },
  lost_child: {
    idle: ['嗚……我找不到娘親了……\n(Sob… I can\'t find my mother…)'],
    side_quest_intro: [
      '大哥哥姐姐，可以帶我去找娘親嗎？我在巷子口和她走散了。\n(Big brother, can you help me find my mother? We got separated near the alley entrance.)',
    ],
    side_quest_active: ['娘親會不會還在附近找我呢？\n(I wonder if mother is still nearby looking for me?)'],
    side_quest_complete: ['娘親！太好了，謝謝你！\n(Mother! Wonderful, thank you!)'],
  },
  elderly_resident: {
    idle: ['老身腿腳不便，甚少出門了。\n(My legs aren\'t what they used to be — I rarely go out these days.)'],
    waiting_medicine: ['孫大夫的藥還沒送來嗎？老身這咳嗽總不見好。\n(Hasn\'t Physician Sun\'s medicine arrived yet? This cough of mine won\'t go away.)'],
    medicine_delivered: ['謝謝你，孩子，這藥真是及時雨。\n(Thank you, child, this medicine is exactly what I needed.)'],
  },
  mother: {
    idle: ['我的孩子不見了，你有看到一個小男孩嗎？\n(My child is missing — have you seen a little boy?)'],
    child_found: ['真的嗎？他在哪裡？快帶我去！\n(Really? Where is he? Please take me to him!)'],
    reunited: ['謝謝你，好心人，真是太感謝了！\n(Thank you, kind stranger, thank you so much!)'],
  },
};
