export const WEAPONS = new Array(
  {
    id: 0,
    name: "AK-47 Rifle",
    price: 0,
    dmg: 24,
    rate: 170,
    speed: 44,
    mag: 30,
    spread: 0.055,
    fov: 38,
    scope: "1.5x Iron",
    moveMult: 1.0,
    barrelLen: 0.95
  },
  {
    id: 1,
    name: "MP5 SMG",
    price: 1200,
    dmg: 17,
    rate: 105,
    speed: 42,
    mag: 35,
    spread: 0.075,
    fov: 42,
    scope: "1.2x Reflex",
    moveMult: 1.12,
    barrelLen: 0.72
  },
  {
    id: 2,
    name: "VPO-101 Sniper",
    price: 2500,
    dmg: 68,
    rate: 650,
    speed: 62,
    mag: 10,
    spread: 0.015,
    fov: 28,
    scope: "4x Marksman",
    moveMult: 0.92,
    barrelLen: 1.25
  },
  {
    id: 3,
    name: "M4A1 Tactical",
    price: 3800,
    dmg: 28,
    rate: 135,
    speed: 48,
    mag: 30,
    spread: 0.04,
    fov: 35,
    scope: "2x Holo",
    moveMult: 1.04,
    barrelLen: 0.92
  },
  {
    id: 4,
    name: "Jaylab Railgun",
    price: 6500,
    dmg: 95,
    rate: 520,
    speed: 75,
    mag: 6,
    spread: 0.008,
    fov: 26,
    scope: "6x Thermal",
    moveMult: 0.95,
    barrelLen: 1.3
  }
);

export const ARMORS = new Array(
  {
    tier: 1,
    name: "Class 1 Light Rig",
    price: 0,
    ap: 50,
    absorb: 0.35,
    color: 0x546e7a,
    stormImmune: false
  },
  {
    tier: 2,
    name: "Class 2 Tactical Vest",
    price: 1600,
    ap: 100,
    absorb: 0.55,
    color: 0x2e7d32,
    stormImmune: false
  },
  {
    tier: 3,
    name: "Class 3 Juggernaut Suit",
    price: 3500,
    ap: 160,
    absorb: 0.75,
    color: 0x212121,
    stormImmune: false
  },
  {
    tier: 4,
    name: "Storm Containment Suit",
    price: 5200,
    ap: 140,
    absorb: 0.65,
    color: 0x00838f,
    stormImmune: true
  }
);

export const SKINS = new Array(
  { id: "yellow", name: "Classic Yellow Duck", hex: 0xffd54f, price: 0 },
  { id: "mallard", name: "Mallard Ranger", hex: 0x2e7d32, price: 0 },
  { id: "arctic", name: "Arctic Snow Duck", hex: 0xeceff1, price: 800 },
  { id: "shadow", name: "Night Ops Shadow", hex: 0x263238, price: 1200 },
  { id: "crimson", name: "Crimson Raider", hex: 0xc62828, price: 1500 },
  { id: "cobalt", name: "Cobalt Strikeforce", hex: 0x1565c0, price: 1800 },
  { id: "cyber", name: "Cyber Neon Duck", hex: 0x00e5ff, price: 2500 },
  { id: "toxic", name: "Biohazard Mallard", hex: 0x76ff03, price: 3000 },
  { id: "gold", name: "24K Golden Idol", hex: 0xffb300, price: 5000 }
);

export const WEAPON_CAMOS = new Array(
  { id: 0, name: "Factory Matte", reqKills: 0, color: 0x151515, metalness: 0.85, roughness: 0.35, emissive: 0x000000 },
  { id: 1, name: "Bronze Tactical", reqKills: 5, color: 0xcd7f32, metalness: 0.85, roughness: 0.3, emissive: 0x1a0d00 },
  { id: 2, name: "Crimson Tiger", reqKills: 15, color: 0xd32f2f, metalness: 0.75, roughness: 0.25, emissive: 0x2b0000 },
  { id: 3, name: "24K Gold Mastery", reqKills: 30, color: 0xffd700, metalness: 0.95, roughness: 0.18, emissive: 0x332600 },
  { id: 4, name: "Dark Matter Diamond", reqKills: 50, color: 0x00e5ff, metalness: 0.9, roughness: 0.15, emissive: 0x311b92 }
);
export const WEAPON_CHARMS = new Array(
  { id: 0, name: "No Charm", price: 0, color: 0x000000, shape: "none" },
  { id: 1, name: "Mini Golden Duck", price: 800, color: 0xffd700, shape: "duck" },
  { id: 2, name: "Tactical Frag Charm", price: 650, color: 0x558b2f, shape: "frag" },
  { id: 3, name: "Cyber Energy Cube", price: 1200, color: 0x00e5ff, shape: "cube" },
  { id: 4, name: "Crimson Royal Crown", price: 1800, color: 0xff1744, shape: "crown" }
);

export const GUN_SCOPES = new Array(
  { id: 0, name: "Standard Reflex", price: 0, fovBonus: 0, spreadMult: 1.0, scale: 1.0 },
  { id: 1, name: "2x Holo Sight", price: 650, fovBonus: 4, spreadMult: 0.9, scale: 1.15 },
  { id: 2, name: "4x Tactical ACOG", price: 1400, fovBonus: 9, spreadMult: 0.8, scale: 1.35 },
  { id: 3, name: "8x Marksman Scope", price: 2400, fovBonus: 14, spreadMult: 0.72, scale: 1.6 }
);

export const GUN_GRIPS = new Array(
  { id: 0, name: "No Foregrip", price: 0, recoilMult: 1.0, style: "none" },
  { id: 1, name: "Angled Foregrip", price: 750, recoilMult: 0.8, style: "angled" },
  { id: 2, name: "Vertical Combat Grip", price: 1350, recoilMult: 0.65, style: "vertical" },
  { id: 3, name: "RK-2 Heavy Stabilizer", price: 2100, recoilMult: 0.52, style: "heavy" }
);

export const GUN_MUZZLES = new Array(
  { id: 0, name: "Standard Barrel", price: 0, recoilMult: 1.0, spreadMult: 1.0, silent: false, style: "none" },
  { id: 1, name: "Muzzle Brake", price: 850, recoilMult: 0.75, spreadMult: 0.88, silent: false, style: "brake" },
  { id: 2, name: "Tactical Compensator", price: 1450, recoilMult: 0.62, spreadMult: 0.8, silent: false, style: "comp" },
  { id: 3, name: "Tactical Suppressor", price: 1600, recoilMult: 0.78, spreadMult: 0.85, silent: true, style: "suppressor" }
);

export const LOOT_ITEMS = new Array(
  { name: "Golden Duck Idol", val: 4500, type: "rare" },
  { name: "Jaylab Keycard", val: 3800, type: "rare" },
  { name: "Military GPU", val: 2900, type: "rare" },
  { name: "Encrypted Drive", val: 1600, type: "valuables" },
  { name: "Field Medkit", val: 500, type: "medkit" },
  { name: "Armor Plate", val: 600, type: "plate" },
  { name: "Canned Duck Peas", val: 300, type: "food" },
  { name: "Purified Water", val: 250, type: "water" },
  { name: "Analgin Painkillers", val: 400, type: "pills" },
  { name: "SJ6 Energy Injector", val: 650, type: "stim" },
  { name: "F-1 Frag Grenade", val: 350, type: "frag" },
  { name: "M18 Smoke Grenade", val: 250, type: "smoke" },
  { name: "M84 Flashbang", val: 300, type: "flash" },
  { name: "Fuel Jerrycan", val: 300, type: "fuel" },
  { name: "T-7 Thermal Goggles", val: 3500, type: "thermal" },
  { name: "Tactical Suppressor", val: 1200, type: "suppressor" },
  { name: "PEQ-15 Laser Sight", val: 900, type: "laser" },
  { name: "Looted M4A1", val: 2200, type: "weapon", weaponId: 3 },
  { name: "Jaylab Railgun", val: 4800, type: "weapon", weaponId: 4 }
);
export const MAPS = {
  ground_zero: {
    label: "Ground Zero",
    hazard: "Standard Daylight • Marauder Patrols",
    bg: 0x1c2826,
    fog: 0x1c2826,
    ground: 0x33473d,
    isNight: false,
    hasStormHazard: false,
    structures: new Array(
      new Array(-18, -14, 10, 3.2, 6, 0x546e7a),
      new Array(18, -14, 10, 3.2, 6, 0x546e7a),
      new Array(0, -28, 12, 3.5, 4, 0x455a64),
      new Array(-22, 16, 8, 3.0, 8, 0x5d4037),
      new Array(22, 16, 8, 3.0, 8, 0x5d4037),
      new Array(0, 6, 5, 1.8, 3, 0x6d4c41)
    ),
    chests: new Array(
      new Array(-18, -8, false), new Array(18, -8, false), new Array(0, -22, true),
      new Array(-22, 10, false), new Array(22, 10, false), new Array(0, 0, true)
    ),
    enemies: new Array(
      new Array(-14, -20, false, "scav"), new Array(14, -20, false, "scav"),
      new Array(-26, 0, false, "scav"), new Array(26, 0, false, "scav"),
      new Array(0, -36, true, "scav")
    )
  },
  warehouse: {
    label: "Warehouse District",
    hazard: "Night Ops • Flashlight Active",
    bg: 0x0b1018,
    fog: 0x0b1018,
    ground: 0x1f2833,
    isNight: true,
    hasStormHazard: false,
    structures: new Array(
      new Array(-16, -16, 6, 3.8, 18, 0x37474f),
      new Array(16, -16, 6, 3.8, 18, 0x37474f),
      new Array(0, -32, 16, 3.8, 5, 0x263238),
      new Array(-18, 18, 12, 3.2, 5, 0x4e342e),
      new Array(18, 18, 12, 3.2, 5, 0x4e342e)
    ),
    chests: new Array(
      new Array(-10, -16, true), new Array(10, -16, true), new Array(0, -26, true),
      new Array(-18, 12, false), new Array(18, 12, false)
    ),
    enemies: new Array(
      new Array(-8, -22, false, "scav"), new Array(8, -22, false, "scav"),
      new Array(-24, 6, false, "scav"), new Array(24, 6, false, "scav"),
      new Array(0, -38, true, "scav")
    )
  },
  farm: {
    label: "Duckov Farm",
    hazard: "Open Fields • Long-Range Snipers",
    bg: 0x262b1c,
    fog: 0x262b1c,
    ground: 0x434d2e,
    isNight: false,
    hasStormHazard: false,
    structures: new Array(
      new Array(-24, -18, 14, 3.4, 8, 0x6d4c41),
      new Array(24, -18, 14, 3.4, 8, 0x6d4c41),
      new Array(0, -10, 6, 2.0, 4, 0x8d6e63),
      new Array(-16, 20, 8, 2.5, 4, 0x5d4037),
      new Array(16, 20, 8, 2.5, 4, 0x5d4037)
    ),
    chests: new Array(
      new Array(-24, -11, true), new Array(24, -11, false), new Array(0, -15, true),
      new Array(-16, 15, false), new Array(16, 15, false)
    ),
    enemies: new Array(
      new Array(-20, -28, false, "scav"), new Array(20, -28, false, "scav"),
      new Array(-12, 4, false, "scav"), new Array(12, 4, false, "scav"),
      new Array(0, -35, true, "scav")
    )
  },
  jaylab: {
    label: "Jaylab Research",
    hazard: "High-Tier Loot • Spider Bots",
    bg: 0x101c26,
    fog: 0x101c26,
    ground: 0x263238,
    isNight: false,
    hasStormHazard: false,
    structures: new Array(
      new Array(-14, -14, 8, 3.6, 8, 0x455a64),
      new Array(14, -14, 8, 3.6, 8, 0x455a64),
      new Array(-14, 14, 8, 3.6, 8, 0x455a64),
      new Array(14, 14, 8, 3.6, 8, 0x455a64),
      new Array(0, -30, 14, 3.8, 4, 0x263238)
    ),
    chests: new Array(
      new Array(-14, -6, true), new Array(14, -6, true), new Array(0, 0, true),
      new Array(-14, 6, true), new Array(14, 6, true)
    ),
    enemies: new Array(
      new Array(-8, -18, false, "spider"), new Array(8, -18, false, "spider"),
      new Array(-22, 0, false, "spider"), new Array(22, 0, false, "spider"),
      new Array(0, -36, true, "scav")
    )
  },
  storm_area: {
    label: "Storm Area (Lab 37)",
    hazard: "Toxic Storm • Wear Tier 4 Suit!",
    bg: 0x180e24,
    fog: 0x180e24,
    ground: 0x2c1e3d,
    isNight: true,
    hasStormHazard: true,
    structures: new Array(
      new Array(-16, -18, 10, 3.8, 10, 0x311b92),
      new Array(16, -18, 10, 3.8, 10, 0x311b92),
      new Array(0, -32, 16, 4.0, 6, 0x1a237e),
      new Array(-20, 14, 8, 3.0, 8, 0x4527a0),
      new Array(20, 14, 8, 3.0, 8, 0x4527a0)
    ),
    chests: new Array(
      new Array(-16, -10, true), new Array(16, -10, true), new Array(0, -24, true),
      new Array(-20, 8, true), new Array(20, 8, true)
    ),
    enemies: new Array(
      new Array(-12, -25, false, "spider"), new Array(12, -25, false, "spider"),
      new Array(-25, 0, false, "scav"), new Array(25, 0, false, "scav"),
      new Array(0, -40, true, "scav")
    )
  }
};

export const MAPS_5V5 = {
  split_quack: {
    label: "Split Quack",
    hazard: "5v5 Tactical Arena • Mid Tower & Dual Bomb Sites",
    bg: 0x131d28,
    fog: 0x131d28,
    ground: 0x24313d,
    isNight: false,
    hasStormHazard: false,
    siteA: new Array(-24, -24),
    siteB: new Array(24, -24),
    structures: new Array(
      new Array(-10, 0, 6, 3.5, 14, 0x455a64),
      new Array(10, 0, 6, 3.5, 14, 0x455a64),
      new Array(0, -14, 8, 3.5, 4, 0x37474f),
      new Array(-26, 6, 8, 3.0, 3, 0x5d4037),
      new Array(26, 6, 8, 3.0, 3, 0x5d4037),
      new Array(-16, -28, 3, 3.2, 8, 0x263238),
      new Array(16, -28, 3, 3.2, 8, 0x263238)
    ),
    chests: new Array(),
    enemies: new Array()
  },
  haven_pond: {
    label: "Haven Pond",
    hazard: "5v5 Courtyard • Wide Flanking Lanes & Wooden Cover",
    bg: 0x172419,
    fog: 0x172419,
    ground: 0x283828,
    isNight: false,
    hasStormHazard: false,
    siteA: new Array(-28, -20),
    siteB: new Array(28, -20),
    structures: new Array(
      new Array(0, 6, 10, 3.2, 6, 0x5d4037),
      new Array(-18, -6, 8, 3.2, 4, 0x4e342e),
      new Array(18, -6, 8, 3.2, 4, 0x4e342e),
      new Array(0, -24, 12, 3.5, 4, 0x37474f),
      new Array(-12, 22, 6, 2.2, 3, 0x6d4c41),
      new Array(12, 22, 6, 2.2, 3, 0x6d4c41)
    ),
    chests: new Array(),
    enemies: new Array()
  },
  bind_bunker: {
    label: "Bind Bunker",
    hazard: "5v5 Underground Lab • Tight Choke Points & Fast Rotations",
    bg: 0x101822,
    fog: 0x101822,
    ground: 0x1c2834,
    isNight: true,
    hasStormHazard: false,
    siteA: new Array(-22, -26),
    siteB: new Array(22, -26),
    structures: new Array(
      new Array(-12, 12, 10, 3.6, 3, 0x37474f),
      new Array(12, 12, 10, 3.6, 3, 0x37474f),
      new Array(0, -2, 8, 3.6, 8, 0x263238),
      new Array(-24, -10, 8, 3.4, 3, 0x455a64),
      new Array(24, -10, 8, 3.4, 3, 0x455a64),
      new Array(0, -32, 14, 3.8, 3, 0x1c252b)
    ),
    chests: new Array(),
    enemies: new Array()
  }
};

export const AGENT_ROLES = {
  duelist: {
    name: "TAILWIND DASH",
    desc: "High-speed directional dash + instant magazine reload + 2.5s rapid fire.",
    cooldown: 10
  },
  initiator: {
    name: "RECON SONAR SCAN",
    desc: "Pulses a 45m sonar wave that reveals all Red Team ducks through walls for 6s.",
    cooldown: 14
  },
  controller: {
    name: "TOXIC SMOKE WALL",
    desc: "Deploys a wide 3-cloud smoke screen that blocks enemy sightlines for 14s.",
    cooldown: 15
  },
  sentinel: {
    name: "AUTO-SENTRY TURRET",
    desc: "Deploys an automated sentry turret that shoots nearby enemies for 20s.",
    cooldown: 18
  }
};

export const QUESTS = new Array(
  { title: "Scav Hunter", desc: "Eliminate 3 hostile ducks in any mode.", target: 3, reward: 1500 },
  { title: "Bunker Defender", desc: "Eliminate 8 hostile ducks across raids.", target: 8, reward: 3000 },
  { title: "Apex Mallard", desc: "Eliminate 15 hostile ducks or bosses.", target: 15, reward: 6000 },
  { title: "King of Duckov", desc: "Eliminate 30 hostile ducks to prove mastery.", target: 30, reward: 12000 }
);
