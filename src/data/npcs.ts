export interface NPCDef {
  id: string;
  name: string;
  nameEn: string;
  role: string;
  roleEn: string;
  color: number;
  skinColor?: number;
  position: [number, number];
  /** Patrol waypoints in world XZ space; empty means the NPC stays in place. */
  waypoints: [number, number][];
  speed: number;
  radius: number; // interaction/idle radius reference
}

export const NPCS: NPCDef[] = [
  {
    id: 'tea_owner',
    name: '王掌櫃',
    nameEn: 'Shopkeeper Wang',
    role: '茶館老闆',
    roleEn: 'Tea House Owner',
    color: 0x7a2e2e,
    position: [21, 29.5],
    waypoints: [
      [21, 29.5],
      [18, 31],
      [23, 32],
    ],
    speed: 0.8,
    radius: 2.4,
  },
  {
    id: 'food_merchant',
    name: '陳嬸',
    nameEn: 'Auntie Chen',
    role: '食肆老闆',
    roleEn: 'Food Stall Merchant',
    color: 0x3f6b4a,
    position: [-15, 24],
    waypoints: [
      [-15, 24],
      [-13, 26],
      [-17, 26],
    ],
    speed: 0.7,
    radius: 2.2,
  },
  {
    id: 'fisherman',
    name: '老李',
    nameEn: 'Old Li',
    role: '漁夫',
    roleEn: 'Fisherman',
    color: 0x2f5b73,
    position: [-28, -6],
    waypoints: [
      [-28, -6],
      [-32, -4],
      [-30, -9],
    ],
    speed: 0.8,
    radius: 2.2,
  },
  {
    id: 'doctor',
    name: '孫大夫',
    nameEn: 'Physician Sun',
    role: '傳統醫館大夫',
    roleEn: 'Traditional Doctor',
    color: 0x30304a,
    position: [14, 19],
    waypoints: [
      [14, 19],
      [16, 21],
    ],
    speed: 0.6,
    radius: 2.2,
  },
  {
    id: 'guard',
    name: '張校尉',
    nameEn: 'Captain Zhang',
    role: '城門守衛',
    roleEn: 'City Guard',
    color: 0x453a2a,
    position: [-6, 44],
    waypoints: [
      [-6, 44],
      [6, 44],
    ],
    speed: 1.0,
    radius: 2.4,
  },
  {
    id: 'delivery_worker',
    name: '阿福',
    nameEn: 'Delivery Worker Fu',
    role: '送貨工人',
    roleEn: 'Delivery Worker',
    color: 0x6b5a3a,
    position: [4, 6],
    waypoints: [
      [4, 6],
      [4, -10],
      [4, -24],
    ],
    speed: 1.1,
    radius: 2.2,
  },
  {
    id: 'lost_child',
    name: '小豆',
    nameEn: 'Little Dou',
    role: '迷路的孩子',
    roleEn: 'Lost Child',
    color: 0xc79a3a,
    skinColor: 0xe8b98c,
    position: [-6, -26],
    waypoints: [
      [-6, -26],
      [-4, -23],
      [-8, -24],
    ],
    speed: 0.6,
    radius: 2.0,
  },
  {
    id: 'boat_operator',
    name: '周船夫',
    nameEn: 'Boatman Zhou',
    role: '船夫',
    roleEn: 'Boat Operator',
    color: 0x4a4a3a,
    position: [-22, -2],
    waypoints: [
      [-22, -2],
      [-18, -3],
    ],
    speed: 0.7,
    radius: 2.2,
  },
  {
    id: 'elderly_resident',
    name: '李婆婆',
    nameEn: 'Granny Li',
    role: '年邁居民',
    roleEn: 'Elderly Resident',
    color: 0x777268,
    position: [9, -32],
    waypoints: [],
    speed: 0.4,
    radius: 2.0,
  },
  {
    id: 'mother',
    name: '陳母',
    nameEn: "Worried Mother",
    role: '焦急的母親',
    roleEn: 'Worried Mother',
    color: 0x8c4a63,
    position: [-9, -37],
    waypoints: [
      [-9, -37],
      [-7, -34],
    ],
    speed: 0.7,
    radius: 2.2,
  },
];

export const NPC_BY_ID: Record<string, NPCDef> = Object.fromEntries(NPCS.map((n) => [n.id, n]));
