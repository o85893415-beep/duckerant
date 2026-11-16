const ACCOUNTS_KEY = 'duckov_3d_accounts_v1';
const ACTIVE_USER_KEY = 'duckov_3d_active_user_v1';

export const DEFAULT_KEYBINDS = {
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  interact: 'KeyE',
  reload: 'KeyR',
  roll: 'Space',
  backpack: 'Tab',
  scoreboard: 'KeyM',
  ping: 'KeyZ',
  frag: 'KeyG',
  smoke: 'KeyV',
  flash: 'KeyC',
  thermal: 'KeyT',
  ability: 'KeyQ',
  inspect: 'KeyY',
  horn: 'KeyH',
  headlights: 'KeyL'
};

export const DEFAULT_GRAPHICS = {
  preset: 'high',
  resScale: 100,
  shadows: true,
  fx: true,
  fog: true,
  shake: true,
  showFps: false
};

export const DEFAULT_SAVE = {
  cash: 5000,
  gymLvl: 1,
  benchLvl: 1,
  medicLvl: 1,
  medkits: 1,
  plates: 1,
  food: 1,
  water: 1,
  pills: 1,
  stims: 1,
  frags: 1,
  smokes: 1,
  flashes: 1,
  fuel: 1,
  hasThermal: false,
  hasSuppressor: false,
  equipSuppressor: false,
  hasLaser: false,
  equipLaser: false,
  unlockedWeapons: new Array(1).fill(0),
  unlockedArmors: new Array(1).fill(1),
  unlockedSkins: ["yellow", "mallard"],
  equippedSkin: "yellow",
  weaponKills: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
  equippedCamos: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 },
  unlockedCharms: new Array(1).fill(0),
  equippedCharm: 0,
  unlockedScopes: new Array(1).fill(0),
  equippedScope: 0,
  unlockedGrips: new Array(1).fill(0),
  equippedGrip: 0,
  unlockedMuzzles: new Array(1).fill(0),
  equippedMuzzle: 0,
  graphics: { ...DEFAULT_GRAPHICS },
  keybinds: { ...DEFAULT_KEYBINDS },
  stash: new Array(),
  corpse: null,
  questIdx: 0,
  questKills: 0,
  extracts: 0,
  totalKills: 0,
  dailyStreak: 1,
  lastDailyClaimDate: "",
  dailyChallengeDate: "",
  dailyBounties: new Array()
};

export function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function ensureDailyChallenges(saveData) {
  const today = getTodayKey();
  if (saveData.dailyChallengeDate !== today || !Array.isArray(saveData.dailyBounties) || saveData.dailyBounties.length === 0) {
    saveData.dailyChallengeDate = today;
    saveData.dailyBounties = new Array(
      { id: "b_kills", title: "Feather Collector", desc: "Eliminate 5 hostile ducks", type: "kills", progress: 0, target: 5, reward: 1200, claimed: false },
      { id: "b_loots", title: "Scavenger Run", desc: "Open 4 loot containers or weapon crates", type: "loots", progress: 0, target: 4, reward: 900, claimed: false },
      { id: "b_wins", title: "Safe Extraction", desc: "Extract safely or win 1 match", type: "wins", progress: 0, target: 1, reward: 1800, claimed: false }
    );
  }
}

function getAllAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getActiveGamertag() {
  return localStorage.getItem(ACTIVE_USER_KEY) || "";
}

export function registerAccount(gamertag, password) {
  const cleanTag = (gamertag || "").trim();
  if (cleanTag.length < 3) return { ok: false, error: "Gamertag must be at least 3 characters." };
  if (!password || password.length < 3) return { ok: false, error: "Password must be at least 3 characters." };

  const accounts = getAllAccounts();
  if (accounts[cleanTag.toLowerCase()]) {
    return { ok: false, error: "That Gamertag is already taken!" };
  }

  const freshData = JSON.parse(JSON.stringify(DEFAULT_SAVE));
  ensureDailyChallenges(freshData);
  accounts[cleanTag.toLowerCase()] = {
    gamertag: cleanTag,
    password,
    data: freshData
  };
  saveAllAccounts(accounts);
  localStorage.setItem(ACTIVE_USER_KEY, cleanTag);
  return { ok: true, gamertag: cleanTag, data: freshData };
}

export function loginAccount(gamertag, password) {
  const cleanTag = (gamertag || "").trim();
  const accounts = getAllAccounts();
  const entry = accounts[cleanTag.toLowerCase()];

  if (!entry) return { ok: false, error: "Gamertag not found. Click CREATE GAMERTAG!" };
  if (entry.password !== password) return { ok: false, error: "Incorrect password!" };

  const merged = Object.assign(JSON.parse(JSON.stringify(DEFAULT_SAVE)), entry.data);
  merged.graphics = Object.assign({ ...DEFAULT_GRAPHICS }, entry.data.graphics || {});
  merged.keybinds = Object.assign({ ...DEFAULT_KEYBINDS }, entry.data.keybinds || {});
  ensureDailyChallenges(merged);

  localStorage.setItem(ACTIVE_USER_KEY, entry.gamertag);
  return { ok: true, gamertag: entry.gamertag, data: merged };
}

export function logoutAccount() {
  localStorage.removeItem(ACTIVE_USER_KEY);
}

export function loadSave() {
  const activeTag = getActiveGamertag();
  if (!activeTag) {
    const guest = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    ensureDailyChallenges(guest);
    return guest;
  }

  const accounts = getAllAccounts();
  const entry = accounts[activeTag.toLowerCase()];
  if (!entry) {
    const guest = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    ensureDailyChallenges(guest);
    return guest;
  }

  const merged = Object.assign(JSON.parse(JSON.stringify(DEFAULT_SAVE)), entry.data);
  merged.graphics = Object.assign({ ...DEFAULT_GRAPHICS }, entry.data.graphics || {});
  merged.keybinds = Object.assign({ ...DEFAULT_KEYBINDS }, entry.data.keybinds || {});
  ensureDailyChallenges(merged);
  return merged;
}

export function writeSave(data) {
  const activeTag = getActiveGamertag();
  if (!activeTag) return;

  const accounts = getAllAccounts();
  const key = activeTag.toLowerCase();
  if (accounts[key]) {
    accounts[key].data = data;
    saveAllAccounts(accounts);
  }
}

export function resetSave() {
  const fresh = JSON.parse(JSON.stringify(DEFAULT_SAVE));
  ensureDailyChallenges(fresh);
  writeSave(fresh);
  return fresh;
}

let audioCtx = null;

export function playSound(freq, type = 'sine', dur = 0.08, vol = 0.08) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (e) {}
}
