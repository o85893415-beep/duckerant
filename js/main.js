import {
  WEAPONS,
  ARMORS,
  SKINS,
  LOOT_ITEMS,
  MAPS,
  MAPS_5V5,
  QUESTS,
  AGENT_ROLES,
  WEAPON_CAMOS,
  WEAPON_CHARMS,
  GUN_SCOPES,
  GUN_GRIPS,
  GUN_MUZZLES
} from './config.js';
import {
  DEFAULT_KEYBINDS,
  DEFAULT_GRAPHICS,
  getTodayKey,
  ensureDailyChallenges,
  getActiveGamertag,
  registerAccount,
  loginAccount,
  logoutAccount,
  loadSave,
  writeSave,
  resetSave,
  playSound
} from './storage.js';
import {
  createDuckModel,
  createChestMesh,
  createCorpseMesh,
  createVehicleModel,
  createPropModel,
  createBunkerStationModel,
  createTargetDummyModel,
  createWeaponRackModel,
  createSceneryProp,
  createBattleBusModel,
  createWeaponCrateMesh,
  createHoloTableModel,
  preloadDuckGLTF
} from './models.js';
import { renderBackpackUI, sellAllStash } from './inventory.js';
import { VisionSystem } from './vision.js';
import { NetworkManager } from './network.js';
import { getProceduralTexture } from './textures.js';
import {
  populateMenus,
  populateMapDropdown,
  refreshMenuUI,
  updateHUD,
  addLootFeed,
  drawRadar,
  addKillfeedBanner
} from './ui.js';

let saveData = loadSave();
let currentGamertag = getActiveGamertag();
const vision = new VisionSystem('fog-canvas');
const network = new NetworkManager();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1628);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 260);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xb3e5fc, 0x1a2639, 0.85);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(28, 46, 22);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -65;
dirLight.shadow.camera.right = 65;
dirLight.shadow.camera.top = 65;
dirLight.shadow.camera.bottom = -65;
scene.add(dirLight);

let inRaid = false;
let backpackOpen = false;
let buyMenuOpen = false;
let scoreboardOpen = false;
let isPaused = false;
let isChatOpen = false;
let selectedMode = 'extraction';
let selectedAgentRole = 'duelist';
let camShake = 0;

let mapObjects = new Array();
let obstacles = new Array();
let chests = new Array();
let aiDucks = new Array();
let bullets = new Array();
let vehicles = new Array();
let props = new Array();
let grenades = new Array();
let smokeClouds = new Array();
let sentries = new Array();
let activePings = new Array();
let bunkerStations = new Array();
let targetDummies = new Array();
let bunkerWeaponRack = null;
let bunkerHoloTable = null;
let swayingFoliage = new Array();
let remotePlayerMeshes = new Map();
let zones = new Array();
let corpseMesh = null;
let stormWallMesh = null;
let battleBusMesh = null;

const player = {
  mesh: null,
  flashlight: null,
  pos: new THREE.Vector3(0, 0, 32),
  hp: 100, maxHp: 100,
  armor: 50, maxArmor: 50, armorTier: 1,
  stamina: 100, maxStamina: 100,
  hunger: 100, thirst: 100,
  painkillerTimer: 0,
  stimTimer: 0,
  rapidFireTimer: 0,
  abilityCooldown: 0,
  weaponIdx: 0, ammo: 30, reloading: false,
  isAiming: false, rollTimer: 0,
  rollDir: new THREE.Vector3(),
  backpack: new Array(),
  medkits: 1, plates: 1,
  food: 1, water: 1,
  pills: 1, stims: 1,
  frags: 1, smokes: 1, flashes: 1, fuelCans: 1,
  hasThermal: false, thermalActive: false,
  equipSuppressor: false, equipLaser: false,
  kills: 0, deaths: 0, shotsFired: 0, shotsHit: 0,
  killCash: 0,
  drivingVehicle: null,
  spectatingTarget: null
};

const modeState = {
  mode: 'extraction',
  mapKey: 'ground_zero',
  agentRole: 'duelist',
  extractTimer: 0,
  deployTimer: 0,
  stormRadius: 56,
  stormDamageTick: 0,
  round: 1,
  blueScore: 0,
  redScore: 0,
  playerSide: 'attack',
  halftimeSwitched: false,
  creds: 800,
  buyPhaseTimer: 0,
  bombPlanted: false,
  bombPos: new THREE.Vector3(),
  bombMesh: null,
  bombTimer: 35,
  plantProgress: 0,
  defuseProgress: 0,
  busProgress: 0,
  busDropped: false
};

const fpsEl = document.getElementById('fps-counter');
let fpsFrames = 0;
let fpsLastTime = performance.now();

function getGfx() {
  if (!saveData.graphics) saveData.graphics = { ...DEFAULT_GRAPHICS };
  return saveData.graphics;
}

function getBinds() {
  if (!saveData.keybinds) saveData.keybinds = { ...DEFAULT_KEYBINDS };
  return saveData.keybinds;
}

function formatKeyCode(code) {
  if (!code) return 'NONE';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code === 'Space') return 'SPACE';
  if (code === 'Tab') return 'TAB';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
  return code.toUpperCase();
}

function applyGraphicsSettings() {
  const gfx = getGfx();
  const scale = (gfx.resScale || 100) / 100;
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio * scale));
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.shadowMap.enabled = !!gfx.shadows;
  dirLight.castShadow = !!gfx.shadows;
  if (fpsEl) fpsEl.style.display = gfx.showFps ? 'block' : 'none';
}

const KEYBIND_LABELS = new Array(
  new Array('moveUp', 'Move Forward'),
  new Array('moveDown', 'Move Backward'),
  new Array('moveLeft', 'Move Left'),
  new Array('moveRight', 'Move Right'),
  new Array('interact', 'Loot / Enter Car / Plant'),
  new Array('reload', 'Reload Weapon / Refuel'),
  new Array('roll', 'Dodge Roll / Jump Bus'),
  new Array('backpack', 'Open Tactical Backpack'),
  new Array('scoreboard', 'Hold Match Scoreboard'),
  new Array('ping', 'Place 3D Tactical Ping'),
  new Array('frag', 'Throw F-1 Frag Grenade'),
  new Array('smoke', 'Throw M18 Smoke'),
  new Array('flash', 'Throw M84 Flashbang'),
  new Array('thermal', 'Toggle T-7 Thermal'),
  new Array('ability', '5v5 Agent Signature Ability'),
  new Array('inspect', 'Inspect Weapon (Lobby)'),
  new Array('horn', 'Vehicle Horn'),
  new Array('headlights', 'Vehicle Headlights')
);

let listeningAction = null;

function renderSettingsUI() {
  const gfx = getGfx();
  document.getElementById('set-gfx-preset').value = gfx.preset || 'high';
  document.getElementById('set-res-scale').value = gfx.resScale || 100;
  document.getElementById('set-res-label').innerText = `${gfx.resScale || 100}%`;
  document.getElementById('set-shadows').checked = !!gfx.shadows;
  document.getElementById('set-fx').checked = !!gfx.fx;
  document.getElementById('set-fog').checked = !!gfx.fog;
  document.getElementById('set-shake').checked = !!gfx.shake;
  document.getElementById('set-fps').checked = !!gfx.showFps;

  const binds = getBinds();
  const listEl = document.getElementById('keybinds-list');
  listEl.innerHTML = '';

  KEYBIND_LABELS.forEach(([action, label]) => {
    const row = document.createElement('div');
    row.className = 'bind-row';
    const isListening = listeningAction === action;
    row.innerHTML = `
      <span>${label}</span>
      <button class="btn-bind-key ${isListening ? 'listening' : ''}">
        ${isListening ? 'PRESS KEY...' : formatKeyCode(binds[action])}
      </button>
    `;
    row.querySelector('button').onclick = () => {
      listeningAction = action;
      renderSettingsUI();
    };
    listEl.appendChild(row);
  });
}

function togglePauseMenu(forceState) {
  if (!inRaid) return;
  isPaused = forceState !== undefined ? forceState : !isPaused;
  const modal = document.getElementById('pause-modal');
  if (!modal) return;

  if (isPaused) {
    firing = false;
    Object.keys(keys).forEach(k => keys[k] = false);

    const gfx = getGfx();
    document.getElementById('pause-gfx-preset').value = gfx.preset || 'high';
    document.getElementById('pause-set-fps').checked = !!gfx.showFps;
    document.getElementById('pause-set-shadows').checked = !!gfx.shadows;
    document.getElementById('pause-set-fx').checked = !!gfx.fx;
    document.getElementById('pause-set-fog').checked = !!gfx.fog;

    const binds = getBinds();
    document.getElementById('pause-binds-summary').innerHTML = new Array(
      new Array('Move', `${formatKeyCode(binds.moveUp)}/${formatKeyCode(binds.moveLeft)}/${formatKeyCode(binds.moveDown)}/${formatKeyCode(binds.moveRight)}`),
      new Array('Interact / Car', formatKeyCode(binds.interact)),
      new Array('Reload / Refuel', formatKeyCode(binds.reload)),
      new Array('Dodge Roll / Jump', formatKeyCode(binds.roll)),
      new Array('Backpack', formatKeyCode(binds.backpack)),
      new Array('Scoreboard', formatKeyCode(binds.scoreboard)),
      new Array('Map Ping', formatKeyCode(binds.ping)),
      new Array('Frag / Smoke / Flash', `${formatKeyCode(binds.frag)} / ${formatKeyCode(binds.smoke)} / ${formatKeyCode(binds.flash)}`),
      new Array('Thermal Goggles', formatKeyCode(binds.thermal)),
      new Array('5v5 Ability', formatKeyCode(binds.ability)),
      new Array('Inspect Weapon', formatKeyCode(binds.inspect))
    ).map(([lbl, keyStr]) => `<div class="pause-bind-line"><span>${lbl}</span><strong>${keyStr}</strong></div>`).join('');

    modal.style.display = 'flex';
  } else {
    modal.style.display = 'none';
  }
}
const hitmarkerEl = document.getElementById('hitmarker');
const damageLayerEl = document.getElementById('damage-layer');
let hitmarkerTimer = null;

function triggerHitmarker(isKill = false) {
  if (!hitmarkerEl) return;
  hitmarkerEl.style.left = `${lastClientX}px`;
  hitmarkerEl.style.top = `${lastClientY}px`;
  hitmarkerEl.classList.toggle('kill', isKill);
  hitmarkerEl.classList.add('active');

  clearTimeout(hitmarkerTimer);
  hitmarkerTimer = setTimeout(() => {
    hitmarkerEl.classList.remove('active', 'kill');
  }, isKill ? 220 : 120);
}

function spawnDamagePopup(worldPos, amount, isKill = false, isHeadshot = false) {
  if (!damageLayerEl) return;
  const projected = worldPos.clone().add(new THREE.Vector3(0, 1.85, 0)).project(camera);
  if (projected.z > 1) return;

  const sx = (projected.x * 0.5 + 0.5) * window.innerWidth + (Math.random() - 0.5) * 18;
  const sy = (-(projected.y * 0.5) + 0.5) * window.innerHeight;

  const div = document.createElement('div');
  div.className = `dmg-popup ${isKill ? 'kill' : isHeadshot ? 'crit' : ''}`;
  div.innerText = isKill ? `-${Math.round(amount)} KILL!` : isHeadshot ? `-${Math.round(amount)} CRIT!` : `-${Math.round(amount)}`;
  div.style.left = `${sx}px`;
  div.style.top = `${sy}px`;

  damageLayerEl.appendChild(div);
  setTimeout(() => { if (div.parentNode) div.remove(); }, 660);
}

function recordWeaponKill(weaponIdx) {
  if (!saveData.weaponKills) saveData.weaponKills = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const prevKills = saveData.weaponKills[weaponIdx] || 0;
  const newKills = prevKills + 1;
  saveData.weaponKills[weaponIdx] = newKills;

  const unlockedCamo = WEAPON_CAMOS.find(c => c.reqKills === newKills);
  if (unlockedCamo) {
    const wName = WEAPONS.at(weaponIdx)?.name || 'Weapon';
    addLootFeed(`MASTERY UNLOCKED: ${unlockedCamo.name} for ${wName}!`);
    playSound(880, 'sine', 0.25, 0.14);
  }
}

function advanceDailyBounty(type, amount = 1) {
  ensureDailyChallenges(saveData);
  let newlyCompleted = false;
  saveData.dailyBounties.forEach(b => {
    if (!b.claimed && b.type === type && b.progress < b.target) {
      b.progress = Math.min(b.target, b.progress + amount);
      if (b.progress >= b.target) {
        newlyCompleted = true;
        addLootFeed(`DAILY BOUNTY COMPLETE: ${b.title}! Claim in Quests tab.`);
      }
    }
  });
  if (newlyCompleted) playSound(740, 'sine', 0.2, 0.12);
}

function reportKill(killer, weaponName, victim, isFriendly = false) {
  addKillfeedBanner(killer, weaponName, victim, isFriendly);
  if (network.isConnected()) {
    network.broadcast({ type: 'killfeed', killer, weaponName, victim, isFriendly });
  }
}

const chatBoxEl = document.getElementById('chat-box');
const chatMessagesEl = document.getElementById('chat-messages');
const chatInputEl = document.getElementById('chat-input');

function appendChatMessage(sender, text, isSelf = false) {
  const line = document.createElement('div');
  line.className = 'chat-line';
  const tag = document.createElement('span');
  tag.className = `chat-tag ${isSelf ? 'self' : ''}`;
  tag.textContent = `[${sender}]:`;
  const msgNode = document.createTextNode(` ${text}`);
  line.appendChild(tag);
  line.appendChild(msgNode);

  chatMessagesEl.appendChild(line);
  while (chatMessagesEl.children.length > 14) {
    chatMessagesEl.firstChild.remove();
  }
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function toggleChatInput(open) {
  isChatOpen = open;
  if (open) {
    firing = false;
    Object.keys(keys).forEach(k => keys[k] = false);
    chatBoxEl.classList.add('typing');
    chatInputEl.value = '';
    chatInputEl.focus();
  } else {
    chatBoxEl.classList.remove('typing');
    chatInputEl.blur();
  }
}

chatInputEl.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.code === 'Enter') {
    const msg = chatInputEl.value.trim();
    if (msg) {
      const sender = currentGamertag || 'DuckOperator';
      appendChatMessage(sender, msg, true);
      if (network.isConnected()) {
        network.broadcast({ type: 'chat', sender, text: msg });
      }
      playSound(640, 'sine', 0.06, 0.06);
    }
    toggleChatInput(false);
  } else if (e.code === 'Escape') {
    toggleChatInput(false);
  }
});

function createNametagSprite(text, isFriendly = true) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(8, 16, 28, 0.78)';
  ctx.fillRect(16, 12, 224, 40);
  ctx.strokeStyle = isFriendly ? '#2ecc71' : '#ff5252';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 12, 224, 40);

  ctx.fillStyle = isFriendly ? '#a5f5c6' : '#ffcdd2';
  ctx.font = 'bold 24px Segoe UI, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 33);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.6, 0.65, 1);
  sprite.position.set(0, 2.35, 0);
  return sprite;
}

let lobbyDuckGroup = null;
let lobbyGunGroup = null;
let lobbyCharmPivot = null;
let lobbyInspectTimer = 0;
let lobbyStageObjects = new Array();
let lobbyTargetYaw = 0.25;
let lobbySpinBoost = 0;

function clearLobbyStage() {
  lobbyStageObjects.forEach(obj => scene.remove(obj));
  lobbyStageObjects = new Array();
  lobbyDuckGroup = null;
  lobbyGunGroup = null;
  lobbyCharmPivot = null;
  lobbyInspectTimer = 0;
  const badge = document.getElementById('lobby-inspect-badge');
  if (badge) badge.style.display = 'none';
}

function triggerWeaponInspect() {
  if (inRaid || !lobbyGunGroup) return;
  lobbyInspectTimer = 2.6;
  const wId = parseInt(document.getElementById('sel-weapon').value) || 0;
  const wName = WEAPONS.at(wId)?.name || 'Primary Weapon';
  const camoId = (saveData.equippedCamos && saveData.equippedCamos[wId]) || 0;
  const camoName = WEAPON_CAMOS.at(camoId)?.name || 'Factory Matte';

  const badge = document.getElementById('lobby-inspect-badge');
  const textEl = document.getElementById('lobby-inspect-text');
  if (badge && textEl) {
    textEl.innerText = `${wName} • ${camoName}`;
    badge.style.display = 'block';
  }
  playSound(680, 'triangle', 0.14, 0.1);
}

function enterLobbyScene() {
  clearLobbyStage();
  scene.background = new THREE.Color(0x0b1628);
  scene.fog = new THREE.FogExp2(0x0b1628, 0.028);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(28, 48),
    new THREE.MeshStandardMaterial({ color: 0x162a4a, roughness: 0.7, metalness: 0.2 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  lobbyStageObjects.push(floor);

  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.95, 0.24, 36),
    new THREE.MeshStandardMaterial({ color: 0x1f3b68, metalness: 0.6, roughness: 0.3 })
  );
  ped.position.y = 0.12;
  ped.receiveShadow = true;
  scene.add(ped);
  lobbyStageObjects.push(ped);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.8, 0.05, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.25;
  scene.add(ring);
  lobbyStageObjects.push(ring);

  const spot = new THREE.SpotLight(0x80deea, 1.4, 25, Math.PI / 4, 0.5);
  spot.position.set(0, 9, 5);
  scene.add(spot);
  lobbyStageObjects.push(spot);

  updateLobbyDuckPreview();
  camera.position.set(0, 2.45, 5.4);
  camera.lookAt(0, 1.15, 0);
}

function updateLobbyDuckPreview() {
  if (inRaid) return;
  if (lobbyDuckGroup) {
    scene.remove(lobbyDuckGroup);
    lobbyStageObjects = lobbyStageObjects.filter(o => o !== lobbyDuckGroup);
  }
  const skin = SKINS.find(s => s.id === saveData.equippedSkin) || SKINS.at(0);
  const wId = parseInt(document.getElementById('sel-weapon').value) || 0;
  const aTier = parseInt(document.getElementById('sel-armor').value) || 1;
  const camoId = (saveData.equippedCamos && saveData.equippedCamos[wId]) || 0;
  const charmId = saveData.equippedCharm || 0;
  const scopeId = saveData.equippedScope || 0;
  const gripId = saveData.equippedGrip || 0;
  const muzzleId = saveData.equippedMuzzle || 0;

  const model = createDuckModel(skin.hex, aTier, wId, null, 'scav', {
    suppressor: saveData.equipSuppressor,
    laser: saveData.equipLaser,
    camoId,
    charmId,
    scopeId,
    gripId,
    muzzleId
  });
  lobbyDuckGroup = model.group;
  lobbyGunGroup = model.gunGroup;
  lobbyCharmPivot = model.charmPivot;
  lobbyDuckGroup.position.set(0, 0.24, 0);
  lobbyDuckGroup.rotation.y = lobbyTargetYaw;
  scene.add(lobbyDuckGroup);
  lobbyStageObjects.push(lobbyDuckGroup);

  const skinLabel = document.getElementById('lobby-skin-label');
  if (skinLabel) skinLabel.innerText = skin.name;
  network.setLocalProfile(currentGamertag || 'DuckOperator_01', skin.hex);
}

function renderSkinLocker() {
  const grid = document.getElementById('skin-cards-grid');
  if (!grid) return;
  document.getElementById('skin-count').innerText = SKINS.length;
  grid.innerHTML = '';

  SKINS.forEach(skin => {
    const unlocked = saveData.unlockedSkins.includes(skin.id);
    const equipped = saveData.equippedSkin === skin.id;
    const hexStr = '#' + skin.hex.toString(16).padStart(6, '0');

    const card = document.createElement('div');
    card.className = `skin-card ${equipped ? 'equipped' : ''}`;
    card.innerHTML = `
      <div class="skin-swatch" style="background:${hexStr};">
        <div class="skin-beak"></div>
      </div>
      <div class="skin-name">${skin.name}</div>
      <div class="skin-status">${equipped ? 'EQUIPPED' : unlocked ? 'OWNED' : '$' + skin.price}</div>
    `;

    card.onclick = () => {
      if (!unlocked) {
        if (saveData.cash < skin.price) return alert(`Need $${skin.price} Roubles to unlock ${skin.name}!`);
        saveData.cash -= skin.price;
        saveData.unlockedSkins.push(skin.id);
      }
      saveData.equippedSkin = skin.id;
      writeSave(saveData);
playSound(640, 'sine', 0.12, 0.12);
renderSkinLocker();
updateLobbyDuckPreview();
refreshMenuUI(saveData, () => writeSave(saveData));
};
grid.appendChild(card);
});
}
function applyGamertagToUI(tag) {
currentGamertag = tag;
document.getElementById('lobby-gamertag').innerText = tag;
document.getElementById('mp-self-tag').innerText = tag;
const skin = SKINS.find(s => s.id === saveData.equippedSkin) || SKINS.at(0);
network.setLocalProfile(tag, skin.hex);
}
function initAuthUI() {
const authScreen = document.getElementById('auth-screen');
const tagInput = document.getElementById('auth-gamertag');
const passInput = document.getElementById('auth-password');
const errEl = document.getElementById('auth-error');
if (currentGamertag) {
authScreen.style.display = 'none';
saveData = loadSave();
applyGamertagToUI(currentGamertag);
} else {
authScreen.style.display = 'flex';
}
document.getElementById('btn-auth-login').addEventListener('click', () => {
const res = loginAccount(tagInput.value, passInput.value);
if (!res.ok) {
errEl.innerText = res.error;
playSound(160, 'sawtooth', 0.15, 0.1);
return;
}
errEl.innerText = '';
saveData = res.data;
applyGamertagToUI(res.gamertag);
authScreen.style.display = 'none';
playSound(680, 'sine', 0.15, 0.12);
renderSkinLocker();
renderSettingsUI();
applyGraphicsSettings();
refreshMenuUI(saveData, () => writeSave(saveData));
updateLobbyDuckPreview();
});
document.getElementById('btn-auth-register').addEventListener('click', () => {
const res = registerAccount(tagInput.value, passInput.value);
if (!res.ok) {
errEl.innerText = res.error;
playSound(160, 'sawtooth', 0.15, 0.1);
return;
}
errEl.innerText = '';
saveData = res.data;
applyGamertagToUI(res.gamertag);
authScreen.style.display = 'none';
playSound(760, 'sine', 0.18, 0.12);
renderSkinLocker();
renderSettingsUI();
applyGraphicsSettings();
refreshMenuUI(saveData, () => writeSave(saveData));
updateLobbyDuckPreview();
});
document.getElementById('btn-logout').addEventListener('click', () => {
network.disconnect();
logoutAccount();
currentGamertag = '';
tagInput.value = '';
passInput.value = '';
errEl.innerText = '';
authScreen.style.display = 'flex';
});
}
network.onStatusChange = (text) => {
document.getElementById('mp-status').innerText = text;
};
network.onPlayerListChange = (players) => {
document.getElementById('online-count').innerText = players.length;
const listEl = document.getElementById('online-players-list');
listEl.innerHTML = '';
players.forEach(p => {
const row = document.createElement('div');
row.className = 'online-player-row';
row.innerHTML = <span><span class="online-dot"></span>${p.name}</span><span style="font-size:10px; color:#80deea;">${p.isHost ? 'HOST' : 'ONLINE'}</span>;
listEl.appendChild(row);
});
};
network.onMessage = (peerId, msg) => {
if (msg.type === 'start_match') {
if (!inRaid) {
selectedMode = msg.mode;
populateMapDropdown(selectedMode);
document.getElementById('sel-map').value = msg.mapKey;
syncLobbyRegionCard();
startMatch(true);
}
} else if (msg.type === 'ping') {
spawn3DPing(new THREE.Vector3(msg.x, 0, msg.z), msg.sender || 'Squadmate', msg.isEnemy);
} else if (msg.type === 'chat') {
appendChatMessage(msg.sender || 'Online Duck', msg.text, false);
playSound(520, 'sine', 0.05, 0.05);
} else if (msg.type === 'killfeed') {
addKillfeedBanner(msg.killer, msg.weaponName, msg.victim, msg.isFriendly);
}
};
document.getElementById('btn-host-room').addEventListener('click', () => {
if (!currentGamertag) return;
network.hostRoom();
playSound(600, 'sine', 0.12, 0.1);
});
document.getElementById('btn-join-room').addEventListener('click', () => {
if (!currentGamertag) return;
const code = document.getElementById('inp-room-code').value;
network.joinRoom(code);
playSound(600, 'sine', 0.12, 0.1);
});
let isDraggingLobby = false;
let prevDragX = 0;
renderer.domElement.addEventListener('mousedown', (e) => {
if (!inRaid && e.button === 0) {
isDraggingLobby = true;
prevDragX = e.clientX;
}
});
window.addEventListener('mouseup', () => { isDraggingLobby = false; });
const MODES = new Array(
{ id: 'extraction', title: 'ESCAPE FROM DUCKOV', btn: 'GAME MODE: EXTRACTION', sub: 'SOLO / CO-OP • LOOT & EXTRACT' },
{ id: 'battleroyale', title: 'DUCKNITE ROYALE', btn: 'GAME MODE: BATTLE ROYALE', sub: '20 DUCKS • LAST DUCK STANDING' },
{ id: 'tactical5v5', title: 'DUCKORANT 5v5', btn: 'GAME MODE: 5v5 SPIKE', sub: 'FIRST TO 5 • BUY PHASE & ABILITIES' }
);
let modeIndex = 0;
function getActiveMapData(mapKey, mode = selectedMode) {
if (mode === 'tactical5v5') {
return MAPS_5V5[mapKey] || Object.values(MAPS_5V5).at(0);
}
return MAPS[mapKey] || MAPS.ground_zero;
}
function syncLobbyRegionCard() {
const mapKey = document.getElementById('sel-map').value;
const m = getActiveMapData(mapKey, selectedMode);
document.getElementById('lobby-region-name').innerText = m.label.toUpperCase();
document.getElementById('lobby-region-hazard').innerText = m.hazard;
}
document.getElementById('btn-cycle-mode').addEventListener('click', () => {
modeIndex = (modeIndex + 1) % MODES.length;
const current = MODES.at(modeIndex);
selectedMode = current.id;
document.getElementById('lobby-mode-title').innerText = current.title;
document.getElementById('lobby-mode-btn-text').innerText = current.btn;
document.getElementById('lobby-mode-sub').innerText = current.sub;
document.getElementById('agent-role-card').style.display = selectedMode === 'tactical5v5' ? 'block' : 'none';
populateMapDropdown(selectedMode);
syncLobbyRegionCard();
playSound(480, 'sine', 0.08, 0.1);
});
document.getElementById('sel-agent-role').addEventListener('change', (e) => {
selectedAgentRole = e.target.value;
const roleCfg = AGENT_ROLES[selectedAgentRole] || AGENT_ROLES.duelist;
document.getElementById('agent-role-desc').innerText = roleCfg.desc;
playSound(520, 'sine', 0.06, 0.08);
});
document.querySelectorAll('.fn-tab').forEach(tabBtn => {
tabBtn.addEventListener('click', () => {
document.querySelectorAll('.fn-tab').forEach(b => b.classList.remove('active'));
document.querySelectorAll('.fn-tab-view').forEach(v => v.classList.remove('active'));
tabBtn.classList.add('active');
document.getElementById(tab-${tabBtn.dataset.tab}).classList.add('active');
if (tabBtn.dataset.tab === 'settings') renderSettingsUI();
playSound(520, 'sine', 0.06, 0.08);
});
});
document.getElementById('btn-emote').addEventListener('click', () => {
lobbySpinBoost = Math.PI * 2;
playSound(620, 'triangle', 0.14, 0.15);
setTimeout(() => playSound(740, 'triangle', 0.16, 0.15), 110);
});
document.querySelectorAll('.fn-squad-plus').forEach(btn => {
btn.addEventListener('click', () => {
alert('Click "CREATE ONLINE ROOM" in the top-right panel and share the 5-letter Room Code with friends!');
});
});
populateMenus();
renderSkinLocker();
renderSettingsUI();
applyGraphicsSettings();
refreshMenuUI(saveData, () => writeSave(saveData));
syncLobbyRegionCard();
initAuthUI();
enterLobbyScene();
document.getElementById('sel-map').addEventListener('change', syncLobbyRegionCard);
document.getElementById('sel-weapon').addEventListener('change', (e) => {
const id = parseInt(e.target.value);
const w = WEAPONS.at(id);
if (!saveData.unlockedWeapons.includes(id)) {
if (saveData.cash >= w.price) {
saveData.cash -= w.price;
saveData.unlockedWeapons.push(id);
writeSave(saveData);
playSound(600, 'sine', 0.15, 0.1);
} else {
alert(Need $${w.price} Roubles to unlock ${w.name}!);
e.target.value = saveData.unlockedWeapons.at(0);
}
}
refreshMenuUI(saveData, () => writeSave(saveData));
updateLobbyDuckPreview();
});
document.getElementById('sel-weapon-camo').addEventListener('change', (e) => {
const wId = parseInt(document.getElementById('sel-weapon').value) || 0;
const camoId = parseInt(e.target.value) || 0;
if (!saveData.equippedCamos) saveData.equippedCamos = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
saveData.equippedCamos[wId] = camoId;
writeSave(saveData);
playSound(580, 'sine', 0.1, 0.1);
updateLobbyDuckPreview();
});
function setupGunsmithControl(selId, btnId, pool, unlockedKey, equippedKey) {
document.getElementById(selId).addEventListener('change', () => {
refreshMenuUI(saveData, () => writeSave(saveData));
});
document.getElementById(btnId).addEventListener('click', () => {
if (!saveData[unlockedKey]) saveData[unlockedKey] = new Array(1).fill(0);
const id = parseInt(document.getElementById(selId).value) || 0;
const cfg = pool.find(x => x.id === id) || pool.at(0);
if (!saveData[unlockedKey].includes(id)) {
if (saveData.cash < cfg.price) return alert(Need $${cfg.price} Roubles for ${cfg.name}!);
saveData.cash -= cfg.price;
saveData[unlockedKey].push(id);
}
saveData[equippedKey] = id;
if (equippedKey === 'equippedMuzzle') {
saveData.equipSuppressor = !!cfg.silent;
}
writeSave(saveData);
playSound(600, 'sine', 0.1, 0.1);
refreshMenuUI(saveData, () => writeSave(saveData));
updateLobbyDuckPreview();
});
}
setupGunsmithControl('sel-scope', 'btn-buy-scope', GUN_SCOPES, 'unlockedScopes', 'equippedScope');
setupGunsmithControl('sel-grip', 'btn-buy-grip', GUN_GRIPS, 'unlockedGrips', 'equippedGrip');
setupGunsmithControl('sel-muzzle', 'btn-buy-muzzle', GUN_MUZZLES, 'unlockedMuzzles', 'equippedMuzzle');
document.getElementById('sel-weapon-charm').addEventListener('change', () => {
refreshMenuUI(saveData, () => writeSave(saveData));
});
document.getElementById('btn-buy-charm').addEventListener('click', () => {
if (!saveData.unlockedCharms) saveData.unlockedCharms = new Array(1).fill(0);
const charmId = parseInt(document.getElementById('sel-weapon-charm').value) || 0;
const charmCfg = WEAPON_CHARMS.find(c => c.id === charmId) || WEAPON_CHARMS.at(0);
if (!saveData.unlockedCharms.includes(charmId)) {
if (saveData.cash < charmCfg.price) return alert(Need $${charmCfg.price} Roubles for ${charmCfg.name}!);
saveData.cash -= charmCfg.price;
saveData.unlockedCharms.push(charmId);
}
saveData.equippedCharm = charmId;
writeSave(saveData);
playSound(660, 'sine', 0.12, 0.1);
refreshMenuUI(saveData, () => writeSave(saveData));
updateLobbyDuckPreview();
});
document.getElementById('sel-armor').addEventListener('change', (e) => {
  const tier = parseInt(e.target.value);
  const a = ARMORS.find(x => x.tier === tier);
  if (!saveData.unlockedArmors.includes(tier)) {
    if (saveData.cash >= a.price) {
      saveData.cash -= a.price;
      saveData.unlockedArmors.push(tier);
      writeSave(saveData);
      playSound(600, 'sine', 0.15, 0.1);
    } else {
      alert(`Need $${a.price} Roubles to unlock ${a.name}!`);
      e.target.value = saveData.unlockedArmors.at(0);
    }
  }
  refreshMenuUI(saveData, () => writeSave(saveData));
  updateLobbyDuckPreview();
});

document.getElementById('btn-sell-all').addEventListener('click', () => {
  sellAllStash(saveData, () => {
    writeSave(saveData);
    refreshMenuUI(saveData, () => writeSave(saveData));
  });
});

document.getElementById('btn-buy-supply').addEventListener('click', () => {
  if (saveData.cash < 400) return alert('Not enough Roubles ($400 needed)!');
  saveData.cash -= 400;
  saveData.medkits++;
  saveData.plates++;
  writeSave(saveData);
  playSound(520, 'sine', 0.1, 0.1);
  refreshMenuUI(saveData, () => writeSave(saveData));
});

document.getElementById('btn-buy-rations').addEventListener('click', () => {
  if (saveData.cash < 250) return alert('Not enough Roubles ($250 needed)!');
  saveData.cash -= 250;
  saveData.food++;
  saveData.water++;
  writeSave(saveData);
  playSound(540, 'sine', 0.1, 0.1);
  refreshMenuUI(saveData, () => writeSave(saveData));
});

document.getElementById('btn-buy-stims').addEventListener('click', () => {
  if (saveData.cash < 550) return alert('Not enough Roubles ($550 needed)!');
  saveData.cash -= 550;
  saveData.pills++;
  saveData.stims++;
  writeSave(saveData);
  playSound(660, 'sine', 0.1, 0.1);
  refreshMenuUI(saveData, () => writeSave(saveData));
});

document.getElementById('btn-buy-thermal').addEventListener('click', () => {
  if (saveData.hasThermal) return alert('You already own T-7 Thermal Goggles! Press [T] in raid.');
  if (saveData.cash < 3500) return alert('Not enough Roubles ($3,500 needed)!');
  saveData.cash -= 3500;
  saveData.hasThermal = true;
  writeSave(saveData);
  playSound(780, 'sine', 0.18, 0.12);
  refreshMenuUI(saveData, () => writeSave(saveData));
});

document.getElementById('btn-buy-nades').addEventListener('click', () => {
  if (saveData.cash < 650) return alert('Not enough Roubles ($650 needed)!');
  saveData.cash -= 650;
  saveData.frags++;
  saveData.smokes++;
  saveData.flashes++;
  writeSave(saveData);
  playSound(500, 'triangle', 0.12, 0.1);
  refreshMenuUI(saveData, () => writeSave(saveData));
});

document.getElementById('btn-buy-fuel').addEventListener('click', () => {
  if (saveData.cash < 300) return alert('Not enough Roubles ($300 needed)!');
  saveData.cash -= 300;
  saveData.fuelCans++;
  writeSave(saveData);
  playSound(440, 'sine', 0.1, 0.1);
  refreshMenuUI(saveData, () => writeSave(saveData));
});

document.getElementById('btn-sell-gun').addEventListener('click', () => {
  const sellSel = document.getElementById('sel-sell-gun');
  const gunId = parseInt(sellSel.value);
  if (!gunId || gunId === 0) return;

  const idx = saveData.unlockedWeapons.indexOf(gunId);
  if (idx === -1) return;

  const gun = WEAPONS.at(gunId);
  const sellPrice = Math.floor(gun.price * 0.6);
  saveData.unlockedWeapons.splice(idx, 1);
  saveData.cash += sellPrice;

  const mainWeaponSel = document.getElementById('sel-weapon');
  if (parseInt(mainWeaponSel.value) === gunId) {
    mainWeaponSel.value = '0';
  }

  writeSave(saveData);
  playSound(720, 'sine', 0.16, 0.12);
  refreshMenuUI(saveData, () => writeSave(saveData));
  updateLobbyDuckPreview();
});

document.getElementById('btn-claim-daily').addEventListener('click', () => {
  const today = getTodayKey();
  if (saveData.lastDailyClaimDate === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (saveData.lastDailyClaimDate === yesterday) {
    saveData.dailyStreak = (saveData.dailyStreak || 1) + 1;
  } else {
    saveData.dailyStreak = 1;
  }

  const payout = 1000 + Math.min(6, saveData.dailyStreak - 1) * 250;
  saveData.cash += payout;
  saveData.lastDailyClaimDate = today;

  writeSave(saveData);
  playSound(820, 'sine', 0.25, 0.14);
  refreshMenuUI(saveData, () => writeSave(saveData));
});

function buyUpgrade(key, lvlKey, cost) {
  if (saveData.cash < cost) return alert(`Need $${cost} Roubles!`);
  saveData.cash -= cost;
  saveData[lvlKey]++;
  writeSave(saveData);
  playSound(650, 'sine', 0.15, 0.1);
  refreshMenuUI(saveData, () => writeSave(saveData));
}
document.getElementById('upg-gym').addEventListener('click', () => buyUpgrade('gym', 'gymLvl', 1500));
document.getElementById('upg-bench').addEventListener('click', () => buyUpgrade('bench', 'benchLvl', 2000));
document.getElementById('upg-medic').addEventListener('click', () => buyUpgrade('medic', 'medicLvl', 1500));

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Reset all Roubles, weapons, skins, and bunker upgrades for this Gamertag?')) {
    saveData = resetSave();
    renderSkinLocker();
    renderSettingsUI();
    applyGraphicsSettings();
    refreshMenuUI(saveData, () => writeSave(saveData));
    updateLobbyDuckPreview();
  }
});

function applyGfxPreset(preset) {
  const gfx = getGfx();
  gfx.preset = preset;
  if (preset === 'low') {
    gfx.resScale = 75;
    gfx.shadows = false;
    gfx.fx = false;
    gfx.fog = false;
    gfx.shake = false;
  } else if (preset === 'medium') {
    gfx.resScale = 100;
    gfx.shadows = true;
    gfx.fx = true;
    gfx.fog = false;
    gfx.shake = true;
  } else if (preset === 'high') {
    gfx.resScale = 100;
    gfx.shadows = true;
    gfx.fx = true;
    gfx.fog = true;
    gfx.shake = true;
  } else if (preset === 'ultra') {
    gfx.resScale = 125;
    gfx.shadows = true;
    gfx.fx = true;
    gfx.fog = true;
    gfx.shake = true;
  }
  writeSave(saveData);
  applyGraphicsSettings();
  renderSettingsUI();
}

document.getElementById('set-gfx-preset').addEventListener('change', (e) => applyGfxPreset(e.target.value));
document.getElementById('set-res-scale').addEventListener('input', (e) => {
  const gfx = getGfx();
  gfx.resScale = parseInt(e.target.value);
  document.getElementById('set-res-label').innerText = `${gfx.resScale}%`;
  writeSave(saveData);
  applyGraphicsSettings();
});
document.getElementById('set-shadows').addEventListener('change', (e) => { getGfx().shadows = e.target.checked; writeSave(saveData); applyGraphicsSettings(); });
document.getElementById('set-fx').addEventListener('change', (e) => { getGfx().fx = e.target.checked; writeSave(saveData); });
document.getElementById('set-fog').addEventListener('change', (e) => { getGfx().fog = e.target.checked; writeSave(saveData); });
document.getElementById('set-shake').addEventListener('change', (e) => { getGfx().shake = e.target.checked; writeSave(saveData); });
document.getElementById('set-fps').addEventListener('change', (e) => { getGfx().showFps = e.target.checked; writeSave(saveData); applyGraphicsSettings(); });

document.getElementById('btn-reset-binds').addEventListener('click', () => {
  saveData.keybinds = { ...DEFAULT_KEYBINDS };
  listeningAction = null;
  writeSave(saveData);
  renderSettingsUI();
  playSound(520, 'sine', 0.1, 0.1);
});

document.getElementById('btn-pause-resume').addEventListener('click', () => togglePauseMenu(false));
document.getElementById('pause-gfx-preset').addEventListener('change', (e) => {
  applyGfxPreset(e.target.value);
  togglePauseMenu(true);
});
document.getElementById('pause-set-fps').addEventListener('change', (e) => { getGfx().showFps = e.target.checked; writeSave(saveData); applyGraphicsSettings(); });
document.getElementById('pause-set-shadows').addEventListener('change', (e) => { getGfx().shadows = e.target.checked; writeSave(saveData); applyGraphicsSettings(); });
document.getElementById('pause-set-fx').addEventListener('change', (e) => { getGfx().fx = e.target.checked; writeSave(saveData); });
document.getElementById('pause-set-fog').addEventListener('change', (e) => { getGfx().fog = e.target.checked; writeSave(saveData); });

document.getElementById('btn-pause-leave').addEventListener('click', () => {
  togglePauseMenu(false);
  returnToLobby();
});

function renderScoreboard() {
  const rowsEl = document.getElementById('sb-rows');
  if (!rowsEl) return;

  const titleEl = document.getElementById('sb-title');
  const subEl = document.getElementById('sb-subtitle');
  if (modeState.mode === 'tactical5v5') {
    titleEl.innerText = `DUCKORANT 5v5 SCOREBOARD • ROUND ${modeState.round}`;
    subEl.innerText = `Blue ${modeState.blueScore} — ${modeState.redScore} Red`;
  } else if (modeState.mode === 'battleroyale') {
    const alive = aiDucks.filter(d => d.hp > 0).length + (player.hp > 0 ? 1 : 0);
    titleEl.innerText = `DUCKNITE ROYALE • ${alive} / 20 ALIVE`;
    subEl.innerText = `Eliminations: ${player.kills}`;
  } else if (modeState.mode === 'bunker') {
    titleEl.innerText = `BUNKER HIDEOUT • FIRING RANGE`;
    subEl.innerText = `Step onto the DEPLOY GATE to launch raid`;
  } else {
    titleEl.innerText = `EXTRACTION RAID • ${getActiveMapData(modeState.mapKey, 'extraction').label.toUpperCase()}`;
    subEl.innerText = `Eliminations: ${player.kills}`;
  }

  const entries = new Array({
    name: `${currentGamertag || 'You'} (You)`,
    team: 'blue',
    kills: player.kills,
    status: player.hp > 0 ? `${Math.ceil(player.hp)} HP` : 'ELIMINATED',
    alive: player.hp > 0
  });

  remotePlayerMeshes.forEach((rm, peerId) => {
    const rp = network.remotePlayers.get(peerId);
    if (rp && rp.inRaid) {
      entries.push({
        name: rp.name || 'Squadmate',
team: 'blue',
kills: 0,
status: rp.hp > 0 ? ${Math.ceil(rp.hp)} HP : 'ELIMINATED',
alive: rp.hp > 0
});
}
});
aiDucks.forEach(ai => {
entries.push({
name: ai.name || (ai.isBoss ? 'BOSS KILLA-DUCK' : ai.isGuard ? 'ARMORY GUARD' : ai.team === 'blue' ? 'Ally Duck' : 'Hostile Duck'),
team: ai.team,
kills: ai.kills || 0,
status: ai.hp > 0 ? ${Math.ceil(ai.hp)} HP : 'DEAD',
alive: ai.hp > 0
});
});
entries.sort((a, b) => {
if (a.team !== b.team) return a.team === 'blue' ? -1 : 1;
return b.kills - a.kills;
});
rowsEl.innerHTML = <div class="sb-row head"><span>OPERATOR</span><span>TEAM</span><span>KILLS</span><span>STATUS</span></div>;
entries.slice(0, 14).forEach(ent => {
const row = document.createElement('div');
row.className = sb-row ${ent.team} ${ent.alive ? '' : 'dead'};
row.innerHTML = <span>${ent.name}</span> <span>${ent.team.toUpperCase()}</span> <span>${ent.kills}</span> <span>${ent.status}</span>;
rowsEl.appendChild(row);
});
}
function spawn3DPing(pos, senderName = 'You', forceEnemy = null) {
let isEnemyPing = forceEnemy;
if (isEnemyPing === null) {
isEnemyPing = aiDucks.some(ai => ai.hp > 0 && ai.team === 'red' && ai.pos.distanceTo(pos) < 3.5);
}
const color = isEnemyPing ? 0xff1744 : 0x00e5ff;
const cssColor = isEnemyPing ? '#ff1744' : '#00e5ff';
const group = new THREE.Group();
group.position.set(pos.x, 0.08, pos.z);
const ring = new THREE.Mesh(
new THREE.RingGeometry(0.45, 0.72, 24),
new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI / 2;
group.add(ring);
const beam = new THREE.Mesh(
new THREE.CylinderGeometry(0.06, 0.06, 4.5, 8),
new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 })
);
beam.position.y = 2.25;
group.add(beam);
const label = createNametagSprite(${isEnemyPing ? 'ENEMY PING' : 'MOVE PING'} (${senderName}), !isEnemyPing);
label.position.set(0, 2.6, 0);
group.add(label);
scene.add(group);
activePings.push({
mesh: group,
ring,
pos: new THREE.Vector3(pos.x, 0, pos.z),
color: cssColor,
timer: 8.0
});
playSound(isEnemyPing ? 880 : 660, 'sine', 0.1, 0.1);
}
function throwGrenade(type) {
if (player.drivingVehicle) return addLootFeed("Exit vehicle before throwing grenades!");
if (type === 'frag') {
if (player.frags <= 0) return addLootFeed("No F-1 Frag Grenades left!");
player.frags--;
} else if (type === 'smoke') {
if (player.smokes <= 0) return addLootFeed("No M18 Smoke Grenades left!");
player.smokes--;
} else if (type === 'flash') {
if (player.flashes <= 0) return addLootFeed("No M84 Flashbangs left!");
player.flashes--;
}
const dir = lookVec.clone().normalize();
const color = type === 'frag' ? 0x558b2f : type === 'smoke' ? 0x90a4ae : 0xfff59d;
const mesh = new THREE.Mesh(
new THREE.SphereGeometry(0.22, 8, 8),
new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
);
mesh.position.set(player.pos.x + dir.x * 0.8, 1.1, player.pos.z + dir.z * 0.8);
scene.add(mesh);
grenades.push({
mesh,
type,
vel: new THREE.Vector3(dir.x * 16, 5.5, dir.z * 16),
fuse: type === 'flash' ? 1.5 : 2.1
});
playSound(320, 'sine', 0.08, 0.1);
}
function spawnSmokeScreen(pos, duration = 12) {
const cloud = new THREE.Mesh(
new THREE.SphereGeometry(3.6, 14, 12),
new THREE.MeshStandardMaterial({ color: 0xcfd8dc, transparent: true, opacity: 0.82, roughness: 1 })
);
cloud.position.set(pos.x, 1.6, pos.z);
scene.add(cloud);
smokeClouds.push({ mesh: cloud, pos: pos.clone(), timer: duration });
}
function clearWorld() {
mapObjects.forEach(o => scene.remove(o));
chests.forEach(c => scene.remove(c.mesh));
aiDucks.forEach(e => scene.remove(e.mesh.group));
bullets.forEach(b => scene.remove(b.mesh));
vehicles.forEach(v => scene.remove(v.mesh.group));
props.forEach(p => scene.remove(p.mesh.group));
grenades.forEach(g => scene.remove(g.mesh));
smokeClouds.forEach(s => scene.remove(s.mesh));
sentries.forEach(s => scene.remove(s.mesh));
activePings.forEach(p => scene.remove(p.mesh));
bunkerStations.forEach(st => scene.remove(st.mesh.group));
targetDummies.forEach(td => scene.remove(td.mesh.group));
if (bunkerWeaponRack) {
scene.remove(bunkerWeaponRack.mesh.group);
bunkerWeaponRack = null;
}
if (bunkerHoloTable) {
if (bunkerHoloTable.mesh) scene.remove(bunkerHoloTable.mesh.group);
if (bunkerHoloTable.sign) scene.remove(bunkerHoloTable.sign);
if (bunkerHoloTable.gateSign) scene.remove(bunkerHoloTable.gateSign);
bunkerHoloTable = null;
}
swayingFoliage = new Array();
remotePlayerMeshes.forEach(rm => scene.remove(rm.group));
remotePlayerMeshes.clear();
if (player.mesh) scene.remove(player.mesh.group);
if (corpseMesh) { scene.remove(corpseMesh); corpseMesh = null; }
if (stormWallMesh) { scene.remove(stormWallMesh); stormWallMesh = null; }
if (battleBusMesh) { scene.remove(battleBusMesh); battleBusMesh = null; }
if (modeState.bombMesh) { scene.remove(modeState.bombMesh); modeState.bombMesh = null; }
mapObjects = new Array();
obstacles = new Array();
chests = new Array();
aiDucks = new Array();
bullets = new Array();
vehicles = new Array();
props = new Array();
grenades = new Array();
smokeClouds = new Array();
sentries = new Array();
activePings = new Array();
bunkerStations = new Array();
targetDummies = new Array();
zones = new Array();
player.drivingVehicle = null;
player.spectatingTarget = null;
document.getElementById('spectate-banner').style.display = 'none';
}
function buildSkyDome(isNight = false) {
const skyTex = getProceduralTexture(isNight ? 'sky_night' : 'sky_day');
const dome = new THREE.Mesh(
new THREE.SphereGeometry(165, 32, 20),
new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, fog: false })
);
scene.add(dome);
mapObjects.push(dome);
}
function addBox(x, z, w, h, d, color) {
const isBrick = color === 0x5d4037 || color === 0x4e342e || color === 0x6d4c41 || color === 0x8d6e63;
const tex = getProceduralTexture(isBrick ? 'brick' : 'concrete').clone();
tex.repeat.set(Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(h / 3)));
tex.needsUpdate = true;
const mesh = new THREE.Mesh(
new THREE.BoxGeometry(w, h, d),
new THREE.MeshStandardMaterial({ color: isBrick ? 0xffffff : color, map: tex, roughness: 0.74, metalness: 0.1 })
);
mesh.position.set(x, h / 2, z);
mesh.castShadow = true;
mesh.receiveShadow = true;
scene.add(mesh);
mapObjects.push(mesh);
if (h >= 2.5) {
const roofTex = getProceduralTexture('roof').clone();
roofTex.repeat.set(Math
.max(1, Math.round(w / 3)), Math.max(1, Math.round(d / 3)));
roofTex.needsUpdate = true;
const cap = new THREE.Mesh(
new THREE.BoxGeometry(w + 0.24, 0.2, d + 0.24),
new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.65 })
);
cap.position.set(x, h + 0.1, z);
cap.castShadow = true;
scene.add(cap);
mapObjects.push(cap);
if (w >= 6 && d <= 4) {
const winMat = new THREE.MeshStandardMaterial({
color: 0x80deea,
emissive: 0x004d40,
emissiveIntensity: 0.35,
metalness: 0.85,
roughness: 0.15
});
new Array(-w * 0.25, w * 0.25).forEach(wx => {
const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, d + 0.08), winMat);
win.position.set(x + wx, h * 0.58, z);
scene.add(win);
mapObjects.push(win);
});
}
}
obstacles.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
}
function addEnterableBuilding(cx, cz, w, d, wallColor = 0x5d4037, doorSide = 'south') {
const wallH = 3.4;
const thick = 0.45;
const doorWidth = 2.8;
const halfW = w / 2;
const halfD = d / 2;
const floor = new THREE.Mesh(
new THREE.BoxGeometry(w, 0.12, d),
new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.9 })
);
floor.position.set(cx, 0.06, cz);
floor.receiveShadow = true;
scene.add(floor);
mapObjects.push(floor);
const roof = new THREE.Mesh(
new THREE.BoxGeometry(w + 0.4, 0.25, d + 0.4),
new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.8 })
);
roof.position.set(cx, wallH + 0.12, cz);
roof.castShadow = true;
scene.add(roof);
mapObjects.push(roof);
const sideLen = (w - doorWidth) / 2;
if (doorSide === 'north') {
addBox(cx - doorWidth / 2 - sideLen / 2, cz - halfD, sideLen, wallH, thick, wallColor);
addBox(cx + doorWidth / 2 + sideLen / 2, cz - halfD, sideLen, wallH, thick, wallColor);
} else {
addBox(cx, cz - halfD, w, wallH, thick, wallColor);
}
if (doorSide === 'south') {
addBox(cx - doorWidth / 2 - sideLen / 2, cz + halfD, sideLen, wallH, thick, wallColor);
addBox(cx + doorWidth / 2 + sideLen / 2, cz + halfD, sideLen, wallH, thick, wallColor);
} else {
addBox(cx, cz + halfD, w, wallH, thick, wallColor);
}
const fbSideLen = (d - doorWidth) / 2;
if (doorSide === 'west') {
addBox(cx - halfW, cz - doorWidth / 2 - fbSideLen / 2, thick, wallH, fbSideLen, wallColor);
addBox(cx - halfW, cz + doorWidth / 2 + fbSideLen / 2, thick, wallH, fbSideLen, wallColor);
} else {
addBox(cx - halfW, cz, thick, wallH, d, wallColor);
}
if (doorSide === 'east') {
addBox(cx + halfW, cz - doorWidth / 2 - fbSideLen / 2, thick, wallH, fbSideLen, wallColor);
addBox(cx + halfW, cz + doorWidth / 2 + fbSideLen / 2, thick, wallH, fbSideLen, wallColor);
} else {
addBox(cx + halfW, cz, thick, wallH, d, wallColor);
}
const frameMat = new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.6, roughness: 0.4 });
if (doorSide === 'south' || doorSide === 'north') {
const dz = doorSide === 'south' ? cz + halfD : cz - halfD;
const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.4, 0.65, thick + 0.16), frameMat);
lintel.position.set(cx, wallH - 0.32, dz);
scene.add(lintel);
mapObjects.push(lintel);
} else {
const dx = doorSide === 'east' ? cx + halfW : cx - halfW;
const lintel = new THREE.Mesh(new THREE.BoxGeometry(thick + 0.16, 0.65, doorWidth + 0.4), frameMat);
lintel.position.set(dx, wallH - 0.32, cz);
scene.add(lintel);
mapObjects.push(lintel);
}
}
function buildBRSpawnIsland() {
const islandX = 0;
const islandZ = 88;
const sandMesh = new THREE.Mesh(
new THREE.CylinderGeometry(16, 18, 0.4, 32),
new THREE.MeshStandardMaterial({ color: 0xe6c280, roughness: 0.9 })
);
sandMesh.position.set(islandX, 0.1, islandZ);
sandMesh.receiveShadow = true;
scene.add(sandMesh);
mapObjects.push(sandMesh);
new Array(
new Array(-9, 82),
new Array(9, 82),
new Array(-8, 94),
new Array(8, 94)
).forEach(([tx, tz]) => {
const tree = createSceneryProp('tree');
tree.group.position.set(tx, 0.15, tz);
scene.add(tree.group);
mapObjects.push(tree.group);
if (tree.foliageGroup) {
swayingFoliage.push({
target: tree.foliageGroup,
pos: new THREE.Vector3(tx, 0, tz),
phase: tx * 0.2 + tz * 0.2,
amp: 0.055,
isGrass: false
});
}
});
}
function addZoneRing(x, z, radius, colorHex, label) {
const ring = new THREE.Mesh(
new THREE.RingGeometry(radius - 0.35, radius, 36),
new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide })
);
ring.rotation.x = -Math.PI / 2;
ring.position.set(x, 0.06, z);
scene.add(ring);
mapObjects.push(ring);
zones.push({ x, z, radius, color: '#' + colorHex.toString(16).padStart(6, '0'), label, mesh: ring });
}
function spawnVehicle(x, z, type) {
const vModel = createVehicleModel(type);
vModel.group.position.set(x, 0, z);
scene.add(vModel.group);
vehicles.push({
mesh: vModel,
type,
pos: new THREE.Vector3(x, 0, z),
rotY: 0,
speed: 0,
maxSpeed: type === 'truck' ? 19 : 25,
hp: type === 'truck' ? 320 : 200,
fuel: 100,
lightsOn: true
});
}
function spawnProp(x, z, type) {
const pModel = createPropModel(type);
pModel.group.position.set(x, 0, z);
scene.add(pModel.group);
props.push({
mesh: pModel,
type,
pos: new THREE.Vector3(x, 0, z),
hp: type === 'barrel' ? 35 : 50
});
}
function spawnAIDuck(x, z, team, colorHex, hp, isBoss, enemyType = 'scav', customName = null) {
const isFriendly = team === 'blue';
const isGuard = enemyType === 'guard';
const teamBadgeColor = isFriendly ? 0x2ecc71 : 0xd32f2f;
const armorTier = isBoss || isGuard ? 3 : 1;
const weaponIdx = isBoss || isGuard ? 3 : 0;
const em = createDuckModel(colorHex, armorTier, weaponIdx, teamBadgeColor, enemyType);
if (isBoss) em.group.scale.set(1.3, 1.3, 1.3);
if (isGuard) em.group.scale.set(1.12, 1.12, 1.12);
if (isFriendly) {
em.group.add(createNametagSprite(customName || 'Ally Duck', true));
} else if (isGuard) {
em.group.add(createNametagSprite(customName || 'ARMORY GUARD', false));
}
em.group.position.set(x, 0, z);
scene.add(em.group);
aiDucks.push({
mesh: em,
pos: new THREE.Vector3(x, 0, z),
homePos: new THREE.Vector3(x, 0, z),
team,
hp,
lastShot: 0,
angle: Math.random() * Math.PI * 2,
isBoss,
isGuard,
enemyType,
name: customName || (isFriendly ? 'Ally Duck' : isGuard ? 'ARMORY GUARD' : 'Hostile Duck')
});
}
function setup5v5TeamsForSide() {
aiDucks.forEach(e => scene.remove(e.mesh.group));
aiDucks = new Array();
const isAttack = modeState.playerSide === 'attack';
const playerZ = isAttack ? 34 : -34;
player.pos.set(0, 0, playerZ);
if (player.mesh) player.mesh.group.position.copy(player.pos);
const blueNames = new Array('Mallard_Bot', 'Teal_Sniper', 'Pintail_Pro', 'WoodDuck_AI');
const redNames = new Array('Viper_Scav', 'Killa_Duck', 'Shadow_Beak', 'Drake_Ops', 'Red_Baron');
for (let i = 0; i < 4; i++) {
spawnAIDuck(-14 + i * 9, playerZ, 'blue', 0x2ecc71, 100, false, 'scav', blueNames.at(i));
}
const enemyZ = isAttack ? -34 : 34;
for (let i = 0; i < 5; i++) {
spawnAIDuck(-16 + i * 8, enemyZ, 'red', 0xd32f2f, 100, false, 'scav', redNames.at(i));
}
}
function renderBunkerHoloTable(mapKey) {
if (bunkerHoloTable) {
if (bunkerHoloTable.mesh) scene.remove(bunkerHoloTable.mesh.group);
if (bunkerHoloTable.sign) scene.remove(bunkerHoloTable.sign);
if (bunkerHoloTable.gateSign) scene.remove(bunkerHoloTable.gateSign);
}
const mData = MAPS[mapKey] || MAPS.ground_zero;
const holoModel = createHoloTableModel(mapKey);
holoModel.group.position.set(-3.2, 0, -12.5);
scene.add(holoModel.group);
const tableSign = createNametagSprite(MAP HOLO: ${mData.label.toUpperCase()}, true);
tableSign.position.set(-3.2, 2.45, -12.5);
scene.add(tableSign);
const gateSign = createNametagSprite(DEPLOY: ${mData.label.toUpperCase()}, true);
gateSign.position.set(0, 2.4, -14.5);
scene.add(gateSign);
bunkerHoloTable = {
mesh: holoModel,
sign: tableSign,
gateSign,
pos: new THREE.Vector3(-3.2, 0, -12.5)
};
}
function enterBunkerBase() {
clearLobbyStage();
clearWorld();
inRaid = true;
isPaused = false;
document.getElementById('pause-modal').style.display = 'none';
const mapKey = document.getElementById('sel-map').value;
modeState.mode = 'bunker';
modeState.mapKey = mapKey;
modeState.deployTimer = 0;
scene.background = new THREE.Color(0x0d1724);
scene.fog = new THREE.FogExp2(0x0d1724, 0.018);
const floorTex = getProceduralTexture('concrete').clone();
floorTex.repeat.set(10, 10);
floorTex.needsUpdate = true;
const floor = new THREE.Mesh(
new THREE.PlaneGeometry(42, 42),
new THREE.MeshStandardMaterial({ color: 0x37474f, map: floorTex, roughness: 0.75 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
mapObjects.push(floor);
addBox(0, -19, 40, 4.2, 1.5, 0x263238);
addBox(0, 19, 40, 4.2, 1.5, 0x263238);
addBox(-19.5, 0, 1.5, 4.2, 38, 0x263238);
addBox(19.5, 0, 1.5, 4.2, 38, 0x263238);
const stationDefs = new Array(
{ type: 'gym', x: -12, z: -8, label: GYM STATION (Lv.${saveData.gymLvl}) },
{ type: 'bench', x: 12, z: -8, label: WORKBENCH (Lv.${saveData.benchLvl}) },
{ type: 'medic', x: -12, z: 6, label: MEDIC BAY (Lv.${saveData.medicLvl}) }
);
stationDefs.forEach(st => {
const model = createBunkerStationModel(st.type);
model.group.position.set(st.x, 0, st.z);
scene.add(model.group);
const sign = createNametagSprite(st.label, true);
sign.position.set(st.x, 2.5, st.z);
scene.add(sign);
mapObjects.push(sign);
bunkerStations.push({ mesh: model, type: st.type, pos: new THREE.Vector3(st.x, 0, st.z), sign });
obstacles.push({ minX: st.x - 1.4, maxX: st.x + 1.4, minZ: st.z - 0.9, maxZ: st.z + 0.9 });
});
const rackModel = createWeaponRackModel();
rackModel.group.position.set(12, 0, 6);
scene.add(rackModel.group);
const rackSign = createNametagSprite('ARMORY RACK [Press E]', true);
rackSign.position.set(12, 2.75, 6);
scene.add(rackSign);
mapObjects.push(rackSign);
bunkerWeaponRack = { mesh: rackModel, pos: new THREE.Vector3(12, 0, 6) };
obstacles.push({ minX: 10.3, maxX: 13.7, minZ: 5.3, maxZ: 6.7 });
const dummyConfigs = new Array(
{ x: -4.5, z: -16.8, armored: false, label: 'UNARMORED DUMMY' },
{ x: 4.5, z: -16.8, armored: true, label: 'ARMORED DUMMY' }
);
dummyConfigs.forEach(dc => {
const dModel = createTargetDummyModel(dc.armored);
dModel.group.position.set(dc.x, 0, dc.z);
scene.add(dModel.group);
const dSign = createNametagSprite(dc.label, !dc.armored);
dSign.position.set(dc.x, 2.55, dc.z);
scene.add(dSign);
mapObjects.push(dSign);
targetDummies.push({
mesh: dModel,
pos: new THREE.Vector3(dc.x, 0, dc.z),
armored: dc.armored,
wobble: 0
});
obstacles.push({ minX: dc.x - 0.65, maxX: dc.x + 0.65, minZ: dc.z - 0.5, maxZ: dc.z + 0.5 });
});
addZoneRing(0, -13.5, 3.6, 0x00e5ff, 'DEPLOY GATE');
renderBunkerHoloTable(mapKey);
const wId = parseInt(document.getElementById('sel-weapon').value) || 0;
const aTier = parseInt(document.getElementById('sel-armor').value) || 1;
const wCfg = WEAPONS.at(wId);
const aCfg = ARMORS.find(x => x.tier === aTier) || ARMORS.at(0);
const skinCfg = SKINS.find(s => s.id === saveData.equippedSkin) || SKINS.at(0);
player.maxHp = 100 + (saveData.gymLvl - 1) * 20;
player.hp = player.maxHp;
player.armorTier = aTier;
player.maxArmor = aCfg.ap;
player.armor = aCfg.ap;
player.maxStamina = 100 + (saveData.medicLvl - 1) * 25;
player.stamina = player.maxStamina;
player.hunger = 100;
player.thirst = 100;
player.weaponIdx = wId;
player.ammo = wCfg.mag;
player.reloading = false;
player.pos.set(0, 0, 8);
const camoId = (saveData.equippedCamos && saveData.equippedCamos[wId]) || 0;
const charmId = saveData.equippedCharm || 0;
const scopeId = saveData.equippedScope || 0;
const gripId = saveData.equippedGrip || 0;
const muzzleId = saveData.equippedMuzzle || 0;
player.mesh = createDuckModel(skinCfg.hex, aTier, wId, null, 'scav', {
suppressor: saveData.equipSuppressor,
laser: saveData.equipLaser,
camoId,
charmId,
scopeId,
gripId,
muzzleId
});
player.mesh.group.position.copy(player.pos);
scene.add(player.mesh.group);
document.getElementById('lobby-ui').style.display = 'none';
document.getElementById('hud').style.display = 'block';
addLootFeed('Welcome to your 3D Bunker! Test guns on dummies, cycle regions at the Map Holo, or enter the Deploy Gate.');
}
function startMatch(fromNetwork = false) {
  clearLobbyStage();
  clearWorld();
  inRaid = true;
  isPaused = false;
  document.getElementById('pause-modal').style.display = 'none';

  const mapKey = document.getElementById('sel-map').value;
  const mData = getActiveMapData(mapKey, selectedMode);

  if (!fromNetwork && network.isConnected() && network.isHost()) {
    network.broadcast({ type: 'start_match', mode: selectedMode, mapKey });
  }

  modeState.mode = selectedMode;
  modeState.mapKey = mapKey;
  modeState.agentRole = selectedAgentRole;
  modeState.extractTimer = 0;
  modeState.stormRadius = 56;
  modeState.round = 1;
  modeState.blueScore = 0;
  modeState.redScore = 0;
  modeState.creds = 800;
  modeState.bombPlanted = false;

  scene.background = new THREE.Color(mData.bg);
  scene.fog = new THREE.FogExp2(mData.fog, mData.isNight ? 0.022 : 0.012);
  buildSkyDome(mData.isNight);

  const isOutdoorGreen = mapKey === 'ground_zero' || mapKey === 'farm' || selectedMode === 'battleroyale';
  const groundTex = getProceduralTexture(isOutdoorGreen ? 'grass' : 'asphalt').clone();
  groundTex.repeat.set(28, 28);
  groundTex.needsUpdate = true;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({
      color: isOutdoorGreen ? 0x8bc34a : mData.ground,
      map: groundTex,
      roughness: 0.9
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  mapObjects.push(ground);

  const scenerySpots = new Array(
    new Array(-42, -32, 'tree'), new Array(42, -32, 'oak'), new Array(-45, 28, 'oak'), new Array(44, 30, 'tree'),
    new Array(-48, -8, 'tree'), new Array(48, -8, 'tree'), new Array(-46, 8, 'oak'), new Array(46, 8, 'tree'),
    new Array(-16, -46, 'oak'), new Array(16, -46, 'tree'), new Array(-28, -42, 'rock'), new Array(28, -42, 'rock'),
    new Array(-30, 12, 'rock'), new Array(30, 12, 'rock'), new Array(-8, -14, 'sandbags'), new Array(8, -14, 'sandbags')
  );
  scenerySpots.forEach(([sx, sz, sType]) => {
    const prop = createSceneryProp(sType);
    prop.group.position.set(sx, 0, sz);
    scene.add(prop.group);
    mapObjects.push(prop.group);
    if (prop.foliageGroup) {
      swayingFoliage.push({
        target: prop.foliageGroup,
        pos: new THREE.Vector3(sx, 0, sz),
        phase: sx * 0.18 + sz * 0.14,
        amp: 0.045,
        isGrass: false
      });
    }
    if (sType === 'tree' || sType === 'oak' || sType === 'rock') {
      obstacles.push({ minX: sx - 0.75, maxX: sx + 0.75, minZ: sz - 0.75, maxZ: sz + 0.75 });
    }
  });

  if (isOutdoorGreen) {
    for (let i = 0; i < 45; i++) {
      const gx = (Math.random() - 0.5) * 105;
      const gz = (Math.random() - 0.5) * 105;
      const tuft = createSceneryProp('grass_tuft');
      tuft.group.position.set(gx, 0, gz);
      scene.add(tuft.group);
      mapObjects.push(tuft.group);
      if (tuft.foliageGroup) {
        swayingFoliage.push({
          target: tuft.foliageGroup,
          pos: new THREE.Vector3(gx, 0, gz),
          phase: gx * 0.25 + gz * 0.25,
          amp: 0.14,
          isGrass: true
        });
      }
    }
  }

  mData.structures.forEach(([x, z, w, h, d, col]) => addBox(x, z, w, h, d, col));

  const wId = parseInt(document.getElementById('sel-weapon').value) || 0;
  const aTier = parseInt(document.getElementById('sel-armor').value) || 1;
  const aCfg = ARMORS.find(x => x.tier === aTier) || ARMORS.at(0);
  const skinCfg = SKINS.find(s => s.id === saveData.equippedSkin) || SKINS.at(0);

  player.maxHp = 100 + (saveData.gymLvl - 1) * 20;
  player.hp = player.maxHp;
  player.armorTier = selectedMode === 'tactical5v5' ? 1 : aTier;
  player.maxArmor = selectedMode === 'tactical5v5' ? 50 : aCfg.ap;
  player.armor = player.maxArmor;
  player.maxStamina = 100 + (saveData.medicLvl - 1) * 25;
  player.stamina = player.maxStamina;
  player.hunger = 100;
  player.thirst = 100;
  player.painkillerTimer = 0;
  player.stimTimer = 0;
  player.rapidFireTimer = 0;
  player.abilityCooldown = 0;
  player.weaponIdx = selectedMode === 'tactical5v5' ? 1 : wId;
  player.ammo = WEAPONS.at(player.weaponIdx).mag;
  player.reloading = false;
  player.backpack = new Array();
  player.kills = 0;
  player.deaths = 0;
  player.shotsFired = 0;
  player.shotsHit = 0;
  player.killCash = 0;

  player.medkits = selectedMode === 'tactical5v5' ? 0 : saveData.medkits;
  player.plates = selectedMode === 'tactical5v5' ? 0 : saveData.plates;
  player.food = selectedMode === 'tactical5v5' ? 0 : saveData.food;
  player.water = selectedMode === 'tactical5v5' ? 0 : saveData.water;
  player.pills = selectedMode === 'tactical5v5' ? 0 : saveData.pills;
  player.stims = selectedMode === 'tactical5v5' ? 0 : saveData.stims;
  player.frags = selectedMode === 'tactical5v5' ? 0 : saveData.frags;
  player.smokes = selectedMode === 'tactical5v5' ? 1 : saveData.smokes;
  player.flashes = selectedMode === 'tactical5v5' ? 1 : saveData.flashes;
  player.fuelCans = selectedMode === 'tactical5v5' ? 0 : saveData.fuelCans;
  player.hasThermal = saveData.hasThermal;
  player.thermalActive = false;
  player.equipSuppressor = saveData.equipSuppressor;
  player.equipLaser = saveData.equipLaser;

  const camoId = (saveData.equippedCamos && saveData.equippedCamos[player.weaponIdx]) || 0;
  const charmId = saveData.equippedCharm || 0;
  const scopeId = saveData.equippedScope || 0;
  const gripId = saveData.equippedGrip || 0;
  const muzzleId = saveData.equippedMuzzle || 0;

  player.mesh = createDuckModel(
    skinCfg.hex,
    player.armorTier,
    player.weaponIdx,
    selectedMode === 'tactical5v5' ? 0x2ecc71 : null,
    'scav',
    {
      suppressor: player.equipSuppressor,
      laser: player.equipLaser,
      camoId,
      charmId,
      scopeId,
      gripId,
      muzzleId
    }
  );
  player.pos.set(0, 0, 34);
  player.mesh.group.position.copy(player.pos);
  scene.add(player.mesh.group);

  if (mData.isNight) {
    const flash = new THREE.SpotLight(0xfff9c4, 2.5, 32, Math.PI / 4, 0.5, 1);
    flash.position.set(0, 1.4, 0.4);
    flash.target.position.set(0, 0.5, 10);
    player.mesh.group.add(flash);
    player.mesh.group.add(flash.target);
    player.flashlight = flash;
  }

  if (selectedMode === 'extraction') {
    const buildingDefs = new Array(
      { cx: -28, cz: -26, w: 9, d: 8, col: 0x5d4037, door: 'south' },
      { cx: 28, cz: -26, w: 9, d: 8, col: 0x455a64, door: 'south' },
      { cx: -28, cz: 22, w: 8, d: 8, col: 0x6d4c41, door: 'east' },
      { cx: 28, cz: 22, w: 8, d: 8, col: 0x4e342e, door: 'west' }
    );
    buildingDefs.forEach(b => {
      addEnterableBuilding(b.cx, b.cz, b.w, b.d, b.col, b.door);
      const cMesh = createChestMesh(true);
      cMesh.position.set(b.cx, 0.42, b.cz);
      scene.add(cMesh);
      chests.push({ mesh: cMesh, pos: new THREE.Vector3(b.cx, 0, b.cz), opened: false, isRare: true });

      const wCrate = createWeaponCrateMesh();
      const wx = b.cx + (b.cx < 0 ? 2.4 : -2.4);
      const wz = b.cz - 2.0;
      wCrate.position.set(wx, 0, wz);
      scene.add(wCrate);
      chests.push({
        mesh: wCrate,
        pos: new THREE.Vector3(wx, 0, wz),
        opened: false,
        isWeaponCrate: true,
        guaranteedGun: b.cx === 28 && b.cz === -26
      });
    });

    mData.chests.forEach(([cx, cz, isRare]) => {
      const cMesh = createChestMesh(isRare);
      cMesh.position.set(cx, 0.42, cz);
      scene.add(cMesh);
      chests.push({ mesh: cMesh, pos: new THREE.Vector3(cx, 0, cz), opened: false, isRare });
    });
    mData.enemies.forEach(([ex, ez, isBoss, eType]) => {
      spawnAIDuck(ex, ez, 'red', isBoss ? 0xd32f2f : 0xc62828, isBoss ? 220 : 85, isBoss, eType);
    });

    spawnAIDuck(25.5, -24.5, 'red', 0x37474f, 145, false, 'guard', 'ARMORY GUARD');
    spawnAIDuck(30.5, -27.5, 'red', 0x37474f, 145, false, 'guard', 'ARMORY GUARD');

    spawnVehicle(-10, 26, 'buggy');
    spawnVehicle(14, -4, 'truck');

    new Array(
      new Array(-6, 12), new Array(6, 12), new Array(-12, -10),
      new Array(12, -10), new Array(-20, -4), new Array(20, -4)
    ).forEach(([bx, bz], idx) => {
      spawnProp(bx, bz, idx % 2 === 0 ? 'barrel' : 'crate');
    });

    addZoneRing(0, -42, 4.5, 0x2ecc71, 'EXTRACT');
    addZoneRing(-38, 0, 4.5, 0x2ecc71, 'EXTRACT');
    if (saveData.corpse && saveData.corpse.mapKey === mapKey) {
      corpseMesh = createCorpseMesh();
      corpseMesh.position.set(saveData.corpse.x, 0, saveData.corpse.z);
      scene.add(corpseMesh);
    }
  } else if (selectedMode === 'battleroyale') {
    const brBuildings = new Array(
      { cx: -28, cz: -28, w: 9, d: 8, col: 0x5d4037, door: 'south' },
      { cx: 28, cz: -28, w: 9, d: 8, col: 0x455a64, door: 'south' },
      { cx: -28, cz: 22, w: 8, d: 8, col: 0x6d4c41, door: 'east' },
      { cx: 28, cz: 22, w: 8, d: 8, col: 0x4e342e, door: 'west' }
    );
    brBuildings.forEach(b => {
      addEnterableBuilding(b.cx, b.cz, b.w, b.d, b.col, b.door);
      const cMesh = createChestMesh(true);
      cMesh.position.set(b.cx, 0.42, b.cz);
      scene.add(cMesh);
      chests.push({ mesh: cMesh, pos: new THREE.Vector3(b.cx, 0, b.cz), opened: false, isRare: true });

      const wCrate = createWeaponCrateMesh();
      const wx = b.cx + (b.cx < 0 ? 2.4 : -2.4);
      const wz = b.cz - 2.0;
      wCrate.position.set(wx, 0, wz);
      scene.add(wCrate);
      chests.push({ mesh: wCrate, pos: new THREE.Vector3(wx, 0, wz), opened: false, isWeaponCrate: true });
    });

    for (let i = 0; i < 16; i++) {
      const cx = (Math.random() - 0.5) * 84;
      const cz = (Math.random() - 0.5) * 84;
      const cMesh = createChestMesh(i % 3 === 0);
      cMesh.position.set(cx, 0.42, cz);
      scene.add(cMesh);
      chests.push({ mesh: cMesh, pos: new THREE.Vector3(cx, 0, cz), opened: false, isRare: i % 3 === 0 });
    }
    const palette = new Array(0x00e5ff, 0xff5252, 0x76ff03, 0xffb300, 0xe040fb, 0xff6e40);
    for (let i = 0; i < 19; i++) {
const ang = (i / 19) * Math.PI * 2;
const rad = 26 + Math.random() * 18;
spawnAIDuck(Math.cos(ang) * rad, Math.sin(ang) * rad, 'red', palette.at(i % palette.length), 95, false, 'scav');
}
spawnVehicle(-22, 24, 'buggy');
spawnVehicle(22, -22, 'truck');
new Array(
new Array(-8, 8), new Array(8, 8), new Array(-15, -15),
new Array(15, -15), new Array(0, -18), new Array(0, 18)
).forEach(([bx, bz], idx) => {
spawnProp(bx, bz, idx % 2 === 0 ? 'barrel' : 'crate');
});
stormWallMesh = new THREE.Mesh(
new THREE.CylinderGeometry(modeState.stormRadius, modeState.stormRadius, 8, 48, 1, true),
new THREE.MeshBasicMaterial({ color: 0x9c27b0, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
);
stormWallMesh.position.y = 4;
scene.add(stormWallMesh);
buildBRSpawnIsland();
modeState.busProgress = 0;
modeState.busDropped = false;
battleBusMesh = createBattleBusModel().group;
battleBusMesh.position.set(-48, 16, 48);
scene.add(battleBusMesh);
player.pos.set(0, 0.35, 88);
player.mesh.group.position.copy(player.pos);
addLootFeed('Spawn Island & Battle Bus Active! Board the Bus or press [Space] to drop anywhere!');
} else if (selectedMode === 'tactical5v5') {
modeState.playerSide = 'attack';
modeState.halftimeSwitched = false;
const siteA = mData.siteA || new Array(-24, -24);
const siteB = mData.siteB || new Array(24, -24);
addZoneRing(siteA.at(0), siteA.at(1), 4.5, 0xff5252, 'SITE A');
addZoneRing(siteB.at(0), siteB.at(1), 4.5, 0xff5252, 'SITE B');
setup5v5TeamsForSide();
openBuyMenu();
}
document.getElementById('lobby-ui').style.display = 'none';
document.getElementById('hud').style.display = 'block';
}
function openBuyMenu() {
buyMenuOpen = true;
modeState.buyPhaseTimer = 12;
document.getElementById('buy-round-num').innerText = modeState.round;
document.getElementById('buy-score-blue').innerText = modeState.blueScore;
document.getElementById('buy-score-red').innerText = modeState.redScore;
document.getElementById('buy-creds').innerText = modeState.creds;
document.getElementById('buy-modal').style.display = 'flex';
}
function closeBuyMenu() {
buyMenuOpen = false;
document.getElementById('buy-modal').style.display = 'none';
}
document.getElementById('btn-ready-round').addEventListener('click', closeBuyMenu);
document.querySelectorAll('.buy-item-btn').forEach(btn => {
btn.addEventListener('click', () => {
const cost = parseInt(btn.dataset.cost);
if (modeState.creds < cost) return addLootFeed('Not enough Creds!');
modeState.creds -= cost;
document.getElementById('buy-creds').innerText = modeState.creds;
playSound(600, 'sine', 0.1, 0.1);
const type = btn.dataset.buy;
if (type === 'weapon') {
const id = parseInt(btn.dataset.id);
player.weaponIdx = id;
player.ammo = WEAPONS.at(id).mag;
addLootFeed(Bought ${WEAPONS.at(id).name});
} else if (type === 'shield') {
const tier = parseInt(btn.dataset.tier);
const a = ARMORS.find(x => x.tier === tier);
player.armorTier = tier;
player.maxArmor = a.ap;
player.armor = a.ap;
addLootFeed(Bought ${a.name});
} else if (type === 'ability') {
player.abilityCooldown = 0;
addLootFeed('Recharged [Q] Signature Ability!');
} else if (type === 'grenades') {
player.smokes++;
player.flashes++;
addLootFeed('Bought Smoke [V] + Flash [C]');
}
});
});
function useAgentAbility() {
if (modeState.mode !== 'tactical5v5') return;
if (player.abilityCooldown > 0) {
return addLootFeed(Ability on cooldown (${Math.ceil(player.abilityCooldown)}s)!);
}
const role = modeState.agentRole;
const roleCfg = AGENT_ROLES[role] || AGENT_ROLES.duelist;
player.abilityCooldown = roleCfg.cooldown;
const dir = lookVec.clone().normalize();
if (role === 'duelist') {
player.rollTimer = 0.28;
player.rollDir.copy(dir);
player.ammo = WEAPONS.at(player.weaponIdx).mag;
player.rapidFireTimer = 2.5;
playSound(780, 'triangle', 0.18, 0.15);
addLootFeed('TAILWIND DASH: Instant Reload + Rapid Fire!');
} else if (role === 'initiator') {
let revealedCount = 0;
aiDucks.forEach(en => {
if (en.hp > 0 && en.team === 'red' && en.pos.distanceTo(player.pos) <= 45) {
en.revealed = true;
en.revealTimer = 6.0;
revealedCount++;
}
});
vision.addSoundRipple(player.pos, 18.0, 'rgba(0, 229, 255, 0.9)');
playSound(860, 'sine', 0.25, 0.14);
addLootFeed(RECON SCAN: Revealed ${revealedCount} enemies for 6s!);
} else if (role === 'controller') {
const center = player.pos.clone().addScaledVector(dir, 9);
const perp = new THREE.Vector3(-dir.z, 0, dir.x);
spawnSmokeScreen(center, 14);
spawnSmokeScreen(center.clone().addScaledVector(perp, 4.2), 14);
spawnSmokeScreen(center.clone().addScaledVector(perp, -4.2), 14);
playSound(340, 'sine', 0.22, 0.12);
addLootFeed('VIPER WALL: Deployed 3-Cloud Smoke Screen!');
} else if (role === 'sentinel') {
const turretPos = player.pos.clone().addScaledVector(dir, 2.2);
const tGroup = new THREE.Group();
const base = new THREE.Mesh(
new THREE.CylinderGeometry(0.4, 0.5, 0.5, 10),
new THREE.MeshStandardMaterial({ color: 0xffb300, metalness: 0.6 })
);
base.position.y = 0.25;
const head = new THREE.Mesh(
new THREE.BoxGeometry(0.45, 0.3, 0.7),
new THREE.MeshStandardMaterial({ color: 0x263238 })
);
head.position.y = 0.65;
tGroup.add(base, head);
tGroup.position.set(turretPos.x, 0, turretPos.z);
scene.add(tGroup);
sentries.push({ mesh: tGroup, head, pos: turretPos, timer: 20.0, lastShot: 0 });
playSound(600, 'square', 0.15, 0.12);
addLootFeed('KILLJOY TURRET: Automated Sentry Deployed (20s)!');
}
}
document.getElementById('btn-deploy').addEventListener('click', () => {
if (!currentGamertag) return;
if (selectedMode === 'extraction') {
enterBunkerBase();
} else {
startMatch(false);
}
});
document.getElementById('btn-sum-continue').addEventListener('click', returnToLobby);
function returnToLobby() {
inRaid = false;
isPaused = false;
backpackOpen = false;
buyMenuOpen = false;
scoreboardOpen = false;
clearWorld();
document.getElementById('pause-modal').style.display = 'none';
document.getElementById('match-summary-modal').style.display = 'none';
document.getElementById('hud').style.display = 'none';
document.getElementById('backpack-modal').style.display = 'none';
document.getElementById('buy-modal').style.display = 'none';
document.getElementById('scoreboard-modal').style.display = 'none';
document.getElementById('lobby-ui').style.display = 'flex';
refreshMenuUI(saveData, () => writeSave(saveData));
enterLobbyScene();
}
const keys = {};
const mouseNDC = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8);
const aimPoint = new THREE.Vector3();
const lookVec = new THREE.Vector3(0, 0, 1);
let firing = false;
let lastShotTime = 0;
const crosshairEl = document.getElementById('dynamic-crosshair');
const reticleRingEl = document.getElementById('reticle-ring');
const retTopEl = document.getElementById('ret-top');
const retBotEl = document.getElementById('ret-bot');
const retLeftEl = document.getElementById('ret-left');
const retRightEl = document.getElementById('ret-right');
let lastClientX = window.innerWidth / 2;
let lastClientY = window.innerHeight / 2;
let bloomSpread = 0;
function updateDynamicCrosshair() {
if (!inRaid || !crosshairEl) return;
crosshairEl.style.left = ${lastClientX}px;
crosshairEl.style.top = ${lastClientY}px;
const w = WEAPONS.at(player.weaponIdx) || WEAPONS.at(0);
const scopeCfg = GUN_SCOPES.find(s => s.id === (saveData.equippedScope || 0)) || GUN_SCOPES.at(0);
const muzzleCfg = GUN_MUZZLES.find(m => m.id === (saveData.equippedMuzzle || 0)) || GUN_MUZZLES.at(0);
let effectiveSpread = w.spread * scopeCfg.spreadMult * muzzleCfg.spreadMult;
if (player.equipLaser) effectiveSpread *= 0.55;
if (player.isAiming) effectiveSpread *= 0.42;
const baseGap = 8 + effectiveSpread * 165;
const gap = Math.min(48, Math.max(5, baseGap + bloomSpread));
if (retTopEl) retTopEl.style.top = ${-gap - 7}px;
if (retBotEl) retBotEl.style.top = ${gap}px;
if (retLeftEl) retLeftEl.style.left = ${-gap - 7}px;
if (retRightEl) retRightEl.style.left = ${gap}px;
if (reticleRingEl) {
const ringSize = Math.max(16, gap * 2.1);
reticleRingEl.style.width = ${ringSize}px;
reticleRingEl.style.height = ${ringSize}px;
}
}
window.addEventListener('mousemove', (e) => {
lastClientX = e.clientX;
lastClientY = e.clientY;
updateDynamicCrosshair();
if (!inRaid && isDraggingLobby) {
const deltaX = e.clientX - prevDragX;
prevDragX = e.clientX;
lobbyTargetYaw += deltaX * 0.012;
return;
}
mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
});
window.addEventListener('mousedown', (e) => {
if (!inRaid || backpackOpen || buyMenuOpen || isPaused || isChatOpen) return;
if (player.hp <= 0 && modeState.mode === 'tactical5v5') {
const aliveAllies = aiDucks.filter(d => d.hp > 0 && d.team === 'blue');
if (aliveAllies.length > 0) {
const curIdx = aliveAllies.indexOf(player.spectatingTarget);
player.spectatingTarget = aliveAllies.at((curIdx + 1) % aliveAllies.length);
document.getElementById('spectate-target-name').innerText = player.spectatingTarget.name || 'Ally Duck';
playSound(520, 'sine', 0.08, 0.08);
}
return;
}
if (e.button === 0) firing = true;
if (e.button === 2) player.isAiming = true;
});
window.addEventListener('mouseup', (e) => {
if (e.button === 0) firing = false;
if (e.button === 2) player.isAiming = false;
});
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
if (listeningAction) {
e.preventDefault();
getBinds()[listeningAction] = e.code;
listeningAction = null;
writeSave(saveData);
renderSettingsUI();
playSound(640, 'sine', 0.1, 0.1);
return;
}
if (isChatOpen) return;
if (e.code === 'Enter') {
const authVisible = document.getElementById('auth-screen').style.display !== 'none';
if (!authVisible) {
e.preventDefault();
toggleChatInput(true);
}
return;
}
if (e.code === 'Escape') {
if (inRaid) {
e.preventDefault();
if (backpackOpen) {
backpackOpen = false;
document.getElementById('backpack-modal').style.display = 'none';
} else if (buyMenuOpen) {
closeBuyMenu();
} else {
togglePauseMenu();
}
}
return;
}
const binds = getBinds();
if (!inRaid && e.code === binds.inspect) {
triggerWeaponInspect();
return;
}
keys[e.code] = true;
if (!inRaid || isPaused) return;
if (e.code === binds.scoreboard) {
e.preventDefault();
scoreboardOpen = true;
renderScoreboard();
document.getElementById('scoreboard-modal').style.display = 'flex';
}
if (e.code === binds.backpack && modeState.mode !== 'tactical5v5') {
e.preventDefault();
backpackOpen = !backpackOpen;
const modal = document.getElementById('backpack-modal');
modal.style.display = backpackOpen ? 'flex' : 'none';
if (backpackOpen) renderBackpackUI(player, saveData, () => updateHUD(player, modeState, saveData));
}
if (e.code === 'KeyB' && modeState.mode === 'tactical5v5' && modeState.buyPhaseTimer > 0) {
buyMenuOpen ? closeBuyMenu() : openBuyMenu();
}
if (e.code === binds.ability && modeState.mode === 'tactical5v5') {
useAgentAbility();
}
if (e.code === binds.ping) {
raycaster.setFromCamera(mouseNDC, camera);
const targetPt = new THREE.Vector3();
if (raycaster.ray.intersectPlane(aimPlane, targetPt)) {
spawn3DPing(targetPt, currentGamertag || 'You');
if (network.isConnected()) {
const isEnemyPing = aiDucks.some(ai => ai.hp > 0 && ai.team === 'red' && ai.pos.distanceTo(targetPt) < 3.5);
network.broadcast({
type: 'ping',
x: targetPt.x,
z: targetPt.z,
sender: currentGamertag || 'Squadmate',
isEnemy: isEnemyPing
});
}
}
}
if (e.code === binds.frag) throwGrenade('frag');
if (e.code === binds.smoke) throwGrenade('smoke');
if (e.code === binds.flash) throwGrenade('flash');
if (e.code === binds.thermal && (player.hasThermal || saveData.hasThermal)) {
player.thermalActive = !player.thermalActive;
playSound(player.thermalActive ? 820 : 420, 'sine', 0.14, 0.12);
addLootFeed(T-7 Thermal Goggles: ${player.thermalActive ? 'ACTIVATED' : 'OFF'});
}
if (e.code === binds.horn && player.drivingVehicle) {
playSound(190, 'sawtooth', 0.25, 0.16);
vision.addSoundRipple(player.pos, 9.0, 'rgba(255, 235, 59, 0.9)');
}
if (e.code === binds.headlights && player.drivingVehicle) {
const v = player.drivingVehicle;
v.lightsOn = !v.lightsOn;
v.mesh.spotLight.intensity = v.lightsOn ? 2.2 : 0;
playSound(520, 'sine', 0.08, 0.08);
}
if (e.code === binds.reload) {
if (player.drivingVehicle) {
if (player.fuelCans > 0 && player.drivingVehicle.fuel < 100) {
player.fuelCans--;
player.drivingVehicle.fuel = Math.min(100, player.drivingVehicle.fuel + 65);
playSound(420, 'sine', 0.2, 0.12);
addLootFeed('Refueled Vehicle (+65% Fuel)!');
} else {
addLootFeed(player.fuelCans <= 0 ? 'No Fuel Jerrycans!' : 'Tank already full!');
}
} else if (!player.reloading) {
const w = WEAPONS.at(player.weaponIdx);
if (player.ammo < w.mag) {
player.reloading = true;
playSound(240, 'triangle', 0.2, 0.1);
setTimeout(() => { player.ammo = w.mag; player.reloading = false; }, 1100);
}
}
}
if (e.code === binds.roll) {
if (modeState.mode === 'battleroyale' && !modeState.busDropped && battleBusMesh) {
modeState.busDropped = true;
player.pos.set(battleBusMesh.position.x, 0, battleBusMesh.position.z);
player.mesh.group.position.copy(player.pos);
playSound(560, 'triangle', 0.22, 0.15);
addLootFeed('Dropped from Battle Bus! Loot chests & stay inside the Purple Storm!');
} else if (!player.drivingVehicle && player.rollTimer <= 0 && player.stamina >= 25 && player.hunger > 10) {
player.stamina -= 25;
player.rollTimer = 0.28;
player.rollDir.copy(lookVec).normalize();
playSound(300, 'sine', 0.12, 0.1);
}
}
if (e.code === 'Digit1' && player.medkits > 0 && player.hp < player.maxHp) {
player.medkits--; player.hp = Math.min(player.maxHp, player.hp + 45);
playSound(520, 'sine', 0.2, 0.12); addLootFeed('Used Field Medkit (+45 HP)');
}
if (e.code === 'Digit2' && player.plates > 0 && player.armor < player.maxArmor) {
player.plates--; player.armor = Math.min(player.maxArmor, player.armor + 45);
playSound(400, 'triangle', 0.15, 0.12); addLootFeed('Applied Armor Plate (+45 AP)');
}
if (e.code === 'Digit3' && player.food > 0 && player.hunger < 100) {
player.food--; player.hunger = Math.min(100, player.hunger + 40);
player.hp = Math.min(player.maxHp, player.hp + 10);
playSound(480, 'sine', 0.15, 0.1); addLootFeed('Ate Canned Duck Peas (+40 Energy)');
}
if (e.code === 'Digit4' && player.water > 0 && player.thirst < 100) {
player.water--; player.thirst = Math.min(100, player.thirst + 45);
player.stamina = Math.min(player.maxStamina, player.stamina + 30);
playSound(560, 'sine', 0.15, 0.1); addLootFeed('Drank Purified Water (+45 Hydration)');
}
if (e.code === 'Digit5' && player.pills > 0) {
player.pills--; player.painkillerTimer = 35.0;
player.hp = Math.min(player.maxHp, player.hp + 15);
playSound(600, 'triangle', 0.18, 0.12); addLootFeed('Took Painkillers (35s Regen + Sprint)');
}
if (e.code === 'Digit6' && player.stims > 0) {
player.stims--; player.stimTimer = 25.0;
player.stamina = player.maxStamina;
playSound(740, 'sine', 0.2, 0.12); addLootFeed('Injected SJ6 Stim (25s Speed Boost)');
}
if (e.code === binds.interact) handleInteract();
});
window.addEventListener('keyup', (e) => {
keys[e.code] = false;
if (e.code === getBinds().scoreboard && scoreboardOpen) {
scoreboardOpen = false;
document.getElementById('scoreboard-modal').style.display = 'none';
}
});
document.getElementById('btn-close-bp').addEventListener('click', () => {
backpackOpen = false;
document.getElementById('backpack-modal').style.display = 'none';
});
function startMatch(fromNetwork = false) {
  clearLobbyStage();
  clearWorld();
  inRaid = true;
  isPaused = false;
  document.getElementById('pause-modal').style.display = 'none';

  const mapKey = document.getElementById('sel-map').value;
  const mData = getActiveMapData(mapKey, selectedMode);

  if (!fromNetwork && network.isConnected() && network.isHost()) {
    network.broadcast({ type: 'start_match', mode: selectedMode, mapKey });
  }

  modeState.mode = selectedMode;
  modeState.mapKey = mapKey;
  modeState.agentRole = selectedAgentRole;
  modeState.extractTimer = 0;
  modeState.stormRadius = 56;
  modeState.round = 1;
  modeState.blueScore = 0;
  modeState.redScore = 0;
  modeState.creds = 800;
  modeState.bombPlanted = false;

  scene.background = new THREE.Color(mData.bg);
  scene.fog = new THREE.FogExp2(mData.fog, mData.isNight ? 0.022 : 0.012);
  buildSkyDome(mData.isNight);

  const isOutdoorGreen = mapKey === 'ground_zero' || mapKey === 'farm' || selectedMode === 'battleroyale';
  const groundTex = getProceduralTexture(isOutdoorGreen ? 'grass' : 'asphalt').clone();
  groundTex.repeat.set(28, 28);
  groundTex.needsUpdate = true;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({
      color: isOutdoorGreen ? 0x8bc34a : mData.ground,
      map: groundTex,
      roughness: 0.9
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  mapObjects.push(ground);

  const scenerySpots = new Array(
    new Array(-42, -32, 'tree'), new Array(42, -32, 'oak'), new Array(-45, 28, 'oak'), new Array(44, 30, 'tree'),
    new Array(-48, -8, 'tree'), new Array(48, -8, 'tree'), new Array(-46, 8, 'oak'), new Array(46, 8, 'tree'),
    new Array(-16, -46, 'oak'), new Array(16, -46, 'tree'), new Array(-28, -42, 'rock'), new Array(28, -42, 'rock'),
    new Array(-30, 12, 'rock'), new Array(30, 12, 'rock'), new Array(-8, -14, 'sandbags'), new Array(8, -14, 'sandbags')
  );
  scenerySpots.forEach(([sx, sz, sType]) => {
    const prop = createSceneryProp(sType);
    prop.group.position.set(sx, 0, sz);
    scene.add(prop.group);
    mapObjects.push(prop.group);
    if (prop.foliageGroup) {
      swayingFoliage.push({
        target: prop.foliageGroup,
        pos: new THREE.Vector3(sx, 0, sz),
        phase: sx * 0.18 + sz * 0.14,
        amp: 0.045,
        isGrass: false
      });
    }
    if (sType === 'tree' || sType === 'oak' || sType === 'rock') {
      obstacles.push({ minX: sx - 0.75, maxX: sx + 0.75, minZ: sz - 0.75, maxZ: sz + 0.75 });
    }
  });

  if (isOutdoorGreen) {
    for (let i = 0; i < 45; i++) {
      const gx = (Math.random() - 0.5) * 105;
      const gz = (Math.random() - 0.5) * 105;
      const tuft = createSceneryProp('grass_tuft');
      tuft.group.position.set(gx, 0, gz);
      scene.add(tuft.group);
      mapObjects.push(tuft.group);
      if (tuft.foliageGroup) {
        swayingFoliage.push({
          target: tuft.foliageGroup,
          pos: new THREE.Vector3(gx, 0, gz),
          phase: gx * 0.25 + gz * 0.25,
          amp: 0.14,
          isGrass: true
        });
      }
    }
  }

  mData.structures.forEach(([x, z, w, h, d, col]) => addBox(x, z, w, h, d, col));

  const wId = parseInt(document.getElementById('sel-weapon').value) || 0;
  const aTier = parseInt(document.getElementById('sel-armor').value) || 1;
  const aCfg = ARMORS.find(x => x.tier === aTier) || ARMORS.at(0);
  const skinCfg = SKINS.find(s => s.id === saveData.equippedSkin) || SKINS.at(0);

  player.maxHp = 100 + (saveData.gymLvl - 1) * 20;
  player.hp = player.maxHp;
  player.armorTier = selectedMode === 'tactical5v5' ? 1 : aTier;
  player.maxArmor = selectedMode === 'tactical5v5' ? 50 : aCfg.ap;
  player.armor = player.maxArmor;
  player.maxStamina = 100 + (saveData.medicLvl - 1) * 25;
  player.stamina = player.maxStamina;
  player.hunger = 100;
  player.thirst = 100;
  player.painkillerTimer = 0;
  player.stimTimer = 0;
  player.rapidFireTimer = 0;
  player.abilityCooldown = 0;
  player.weaponIdx = selectedMode === 'tactical5v5' ? 1 : wId;
  player.ammo = WEAPONS.at(player.weaponIdx).mag;
  player.reloading = false;
  player.backpack = new Array();
  player.kills = 0;
  player.deaths = 0;
  player.shotsFired = 0;
  player.shotsHit = 0;
  player.killCash = 0;

  player.medkits = selectedMode === 'tactical5v5' ? 0 : saveData.medkits;
  player.plates = selectedMode === 'tactical5v5' ? 0 : saveData.plates;
  player.food = selectedMode === 'tactical5v5' ? 0 : saveData.food;
  player.water = selectedMode === 'tactical5v5' ? 0 : saveData.water;
  player.pills = selectedMode === 'tactical5v5' ? 0 : saveData.pills;
  player.stims = selectedMode === 'tactical5v5' ? 0 : saveData.stims;
  player.frags = selectedMode === 'tactical5v5' ? 0 : saveData.frags;
  player.smokes = selectedMode === 'tactical5v5' ? 1 : saveData.smokes;
  player.flashes = selectedMode === 'tactical5v5' ? 1 : saveData.flashes;
  player.fuelCans = selectedMode === 'tactical5v5' ? 0 : saveData.fuelCans;
  player.hasThermal = saveData.hasThermal;
  player.thermalActive = false;
  player.equipSuppressor = saveData.equipSuppressor;
  player.equipLaser = saveData.equipLaser;

  const camoId = (saveData.equippedCamos && saveData.equippedCamos[player.weaponIdx]) || 0;
  const charmId = saveData.equippedCharm || 0;
  const scopeId = saveData.equippedScope || 0;
  const gripId = saveData.equippedGrip || 0;
  const muzzleId = saveData.equippedMuzzle || 0;

  player.mesh = createDuckModel(
    skinCfg.hex,
    player.armorTier,
    player.weaponIdx,
    selectedMode === 'tactical5v5' ? 0x2ecc71 : null,
    'scav',
    {
      suppressor: player.equipSuppressor,
      laser: player.equipLaser,
      camoId,
      charmId,
      scopeId,
      gripId,
      muzzleId
    }
  );
  player.pos.set(0, 0, 34);
  player.mesh.group.position.copy(player.pos);
  scene.add(player.mesh.group);

  if (mData.isNight) {
    const flash = new THREE.SpotLight(0xfff9c4, 2.5, 32, Math.PI / 4, 0.5, 1);
    flash.position.set(0, 1.4, 0.4);
    flash.target.position.set(0, 0.5, 10);
    player.mesh.group.add(flash);
    player.mesh.group.add(flash.target);
    player.flashlight = flash;
  }

  if (selectedMode === 'extraction') {
    const buildingDefs = new Array(
      { cx: -28, cz: -26, w: 9, d: 8, col: 0x5d4037, door: 'south' },
      { cx: 28, cz: -26, w: 9, d: 8, col: 0x455a64, door: 'south' },
      { cx: -28, cz: 22, w: 8, d: 8, col: 0x6d4c41, door: 'east' },
      { cx: 28, cz: 22, w: 8, d: 8, col: 0x4e342e, door: 'west' }
    );
    buildingDefs.forEach(b => {
      addEnterableBuilding(b.cx, b.cz, b.w, b.d, b.col, b.door);
      const cMesh = createChestMesh(true);
      cMesh.position.set(b.cx, 0.42, b.cz);
      scene.add(cMesh);
      chests.push({ mesh: cMesh, pos: new THREE.Vector3(b.cx, 0, b.cz), opened: false, isRare: true });

      const wCrate = createWeaponCrateMesh();
      const wx = b.cx + (b.cx < 0 ? 2.4 : -2.4);
      const wz = b.cz - 2.0;
      wCrate.position.set(wx, 0, wz);
      scene.add(wCrate);
      chests.push({
        mesh: wCrate,
        pos: new THREE.Vector3(wx, 0, wz),
        opened: false,
        isWeaponCrate: true,
        guaranteedGun: b.cx === 28 && b.cz === -26
      });
    });

    mData.chests.forEach(([cx, cz, isRare]) => {
      const cMesh = createChestMesh(isRare);
      cMesh.position.set(cx, 0.42, cz);
      scene.add(cMesh);
      chests.push({ mesh: cMesh, pos: new THREE.Vector3(cx, 0, cz), opened: false, isRare });
    });
    mData.enemies.forEach(([ex, ez, isBoss, eType]) => {
      spawnAIDuck(ex, ez, 'red', isBoss ? 0xd32f2f : 0xc62828, isBoss ? 220 : 85, isBoss, eType);
    });

    spawnAIDuck(25.5, -24.5, 'red', 0x37474f, 145, false, 'guard', 'ARMORY GUARD');
    spawnAIDuck(30.5, -27.5, 'red', 0x37474f, 145, false, 'guard', 'ARMORY GUARD');

    spawnVehicle(-10, 26, 'buggy');
    spawnVehicle(14, -4, 'truck');

    new Array(
      new Array(-6, 12), new Array(6, 12), new Array(-12, -10),
      new Array(12, -10), new Array(-20, -4), new Array(20, -4)
    ).forEach(([bx, bz], idx) => {
      spawnProp(bx, bz, idx % 2 === 0 ? 'barrel' : 'crate');
    });

    addZoneRing(0, -42, 4.5, 0x2ecc71, 'EXTRACT');
    addZoneRing(-38, 0, 4.5, 0x2ecc71, 'EXTRACT');
    if (saveData.corpse && saveData.corpse.mapKey === mapKey) {
      corpseMesh = createCorpseMesh();
      corpseMesh.position.set(saveData.corpse.x, 0, saveData.corpse.z);
      scene.add(corpseMesh);
    }
  } else if (selectedMode === 'battleroyale') {
    const brBuildings = new Array(
      { cx: -28, cz: -28, w: 9, d: 8, col: 0x5d4037, door: 'south' },
      { cx: 28, cz: -28, w: 9, d: 8, col: 0x455a64, door: 'south' },
      { cx: -28, cz: 22, w: 8, d: 8, col: 0x6d4c41, door: 'east' },
      { cx: 28, cz: 22, w: 8, d: 8, col: 0x4e342e, door: 'west' }
    );
    brBuildings.forEach(b => {
      addEnterableBuilding(b.cx, b.cz, b.w, b.d, b.col, b.door);
      const cMesh = createChestMesh(true);
      cMesh.position.set(b.cx, 0.42, b.cz);
      scene.add(cMesh);
      chests.push({ mesh: cMesh, pos: new THREE.Vector3(b.cx, 0, b.cz), opened: false, isRare: true });

      const wCrate = createWeaponCrateMesh();
      const wx = b.cx + (b.cx < 0 ? 2.4 : -2.4);
      const wz = b.cz - 2.0;
      wCrate.position.set(wx, 0, wz);
      scene.add(wCrate);
      chests.push({ mesh: wCrate, pos: new THREE.Vector3(wx, 0, wz), opened: false, isWeaponCrate: true });
    });

    for (let i = 0; i < 16; i++) {
      const cx = (Math.random() - 0.5) * 84;
      const cz = (Math.random() - 0.5) * 84;
      const cMesh = createChestMesh(i % 3 === 0);
      cMesh.position.set(cx, 0.42, cz);
      scene.add(cMesh);
      chests.push({ mesh: cMesh, pos: new THREE.Vector3(cx, 0, cz), opened: false, isRare: i % 3 === 0 });
    }
    const palette = new Array(0x00e5ff, 0xff5252, 0x76ff03, 0xffb300, 0xe040fb, 0xff6e40);
    for (let i = 0; i < 19; i++) {
const ang = (i / 19) * Math.PI * 2;
const rad = 26 + Math.random() * 18;
spawnAIDuck(Math.cos(ang) * rad, Math.sin(ang) * rad, 'red', palette.at(i % palette.length), 95, false, 'scav');
}
spawnVehicle(-22, 24, 'buggy');
spawnVehicle(22, -22, 'truck');
new Array(
new Array(-8, 8), new Array(8, 8), new Array(-15, -15),
new Array(15, -15), new Array(0, -18), new Array(0, 18)
).forEach(([bx, bz], idx) => {
spawnProp(bx, bz, idx % 2 === 0 ? 'barrel' : 'crate');
});
stormWallMesh = new THREE.Mesh(
new THREE.CylinderGeometry(modeState.stormRadius, modeState.stormRadius, 8, 48, 1, true),
new THREE.MeshBasicMaterial({ color: 0x9c27b0, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
);
stormWallMesh.position.y = 4;
scene.add(stormWallMesh);
buildBRSpawnIsland();
modeState.busProgress = 0;
modeState.busDropped = false;
battleBusMesh = createBattleBusModel().group;
battleBusMesh.position.set(-48, 16, 48);
scene.add(battleBusMesh);
player.pos.set(0, 0.35, 88);
player.mesh.group.position.copy(player.pos);
addLootFeed('Spawn Island & Battle Bus Active! Board the Bus or press [Space] to drop anywhere!');
} else if (selectedMode === 'tactical5v5') {
modeState.playerSide = 'attack';
modeState.halftimeSwitched = false;
const siteA = mData.siteA || new Array(-24, -24);
const siteB = mData.siteB || new Array(24, -24);
addZoneRing(siteA.at(0), siteA.at(1), 4.5, 0xff5252, 'SITE A');
addZoneRing(siteB.at(0), siteB.at(1), 4.5, 0xff5252, 'SITE B');
setup5v5TeamsForSide();
openBuyMenu();
}
document.getElementById('lobby-ui').style.display = 'none';
document.getElementById('hud').style.display = 'block';
}
function openBuyMenu() {
buyMenuOpen = true;
modeState.buyPhaseTimer = 12;
document.getElementById('buy-round-num').innerText = modeState.round;
document.getElementById('buy-score-blue').innerText = modeState.blueScore;
document.getElementById('buy-score-red').innerText = modeState.redScore;
document.getElementById('buy-creds').innerText = modeState.creds;
document.getElementById('buy-modal').style.display = 'flex';
}
function closeBuyMenu() {
buyMenuOpen = false;
document.getElementById('buy-modal').style.display = 'none';
}
document.getElementById('btn-ready-round').addEventListener('click', closeBuyMenu);
document.querySelectorAll('.buy-item-btn').forEach(btn => {
btn.addEventListener('click', () => {
const cost = parseInt(btn.dataset.cost);
if (modeState.creds < cost) return addLootFeed('Not enough Creds!');
modeState.creds -= cost;
document.getElementById('buy-creds').innerText = modeState.creds;
playSound(600, 'sine', 0.1, 0.1);
const type = btn.dataset.buy;
if (type === 'weapon') {
const id = parseInt(btn.dataset.id);
player.weaponIdx = id;
player.ammo = WEAPONS.at(id).mag;
addLootFeed(Bought ${WEAPONS.at(id).name});
} else if (type === 'shield') {
const tier = parseInt(btn.dataset.tier);
const a = ARMORS.find(x => x.tier === tier);
player.armorTier = tier;
player.maxArmor = a.ap;
player.armor = a.ap;
addLootFeed(Bought ${a.name});
} else if (type === 'ability') {
player.abilityCooldown = 0;
addLootFeed('Recharged [Q] Signature Ability!');
} else if (type === 'grenades') {
player.smokes++;
player.flashes++;
addLootFeed('Bought Smoke [V] + Flash [C]');
}
});
});
function useAgentAbility() {
if (modeState.mode !== 'tactical5v5') return;
if (player.abilityCooldown > 0) {
return addLootFeed(Ability on cooldown (${Math.ceil(player.abilityCooldown)}s)!);
}
const role = modeState.agentRole;
const roleCfg = AGENT_ROLES[role] || AGENT_ROLES.duelist;
player.abilityCooldown = roleCfg.cooldown;
const dir = lookVec.clone().normalize();
if (role === 'duelist') {
player.rollTimer = 0.28;
player.rollDir.copy(dir);
player.ammo = WEAPONS.at(player.weaponIdx).mag;
player.rapidFireTimer = 2.5;
playSound(780, 'triangle', 0.18, 0.15);
addLootFeed('TAILWIND DASH: Instant Reload + Rapid Fire!');
} else if (role === 'initiator') {
let revealedCount = 0;
aiDucks.forEach(en => {
if (en.hp > 0 && en.team === 'red' && en.pos.distanceTo(player.pos) <= 45) {
en.revealed = true;
en.revealTimer = 6.0;
revealedCount++;
}
});
vision.addSoundRipple(player.pos, 18.0, 'rgba(0, 229, 255, 0.9)');
playSound(860, 'sine', 0.25, 0.14);
addLootFeed(RECON SCAN: Revealed ${revealedCount} enemies for 6s!);
} else if (role === 'controller') {
const center = player.pos.clone().addScaledVector(dir, 9);
const perp = new THREE.Vector3(-dir.z, 0, dir.x);
spawnSmokeScreen(center, 14);
spawnSmokeScreen(center.clone().addScaledVector(perp, 4.2), 14);
spawnSmokeScreen(center.clone().addScaledVector(perp, -4.2), 14);
playSound(340, 'sine', 0.22, 0.12);
addLootFeed('VIPER WALL: Deployed 3-Cloud Smoke Screen!');
} else if (role === 'sentinel') {
const turretPos = player.pos.clone().addScaledVector(dir, 2.2);
const tGroup = new THREE.Group();
const base = new THREE.Mesh(
new THREE.CylinderGeometry(0.4, 0.5, 0.5, 10),
new THREE.MeshStandardMaterial({ color: 0xffb300, metalness: 0.6 })
);
base.position.y = 0.25;
const head = new THREE.Mesh(
new THREE.BoxGeometry(0.45, 0.3, 0.7),
new THREE.MeshStandardMaterial({ color: 0x263238 })
);
head.position.y = 0.65;
tGroup.add(base, head);
tGroup.position.set(turretPos.x, 0, turretPos.z);
scene.add(tGroup);
sentries.push({ mesh: tGroup, head, pos: turretPos, timer: 20.0, lastShot: 0 });
playSound(600, 'square', 0.15, 0.12);
addLootFeed('KILLJOY TURRET: Automated Sentry Deployed (20s)!');
}
}
document.getElementById('btn-deploy').addEventListener('click', () => {
if (!currentGamertag) return;
if (selectedMode === 'extraction') {
enterBunkerBase();
} else {
startMatch(false);
}
});
document.getElementById('btn-sum-continue').addEventListener('click', returnToLobby);
function returnToLobby() {
inRaid = false;
isPaused = false;
backpackOpen = false;
buyMenuOpen = false;
scoreboardOpen = false;
clearWorld();
document.getElementById('pause-modal').style.display = 'none';
document.getElementById('match-summary-modal').style.display = 'none';
document.getElementById('hud').style.display = 'none';
document.getElementById('backpack-modal').style.display = 'none';
document.getElementById('buy-modal').style.display = 'none';
document.getElementById('scoreboard-modal').style.display = 'none';
document.getElementById('lobby-ui').style.display = 'flex';
refreshMenuUI(saveData, () => writeSave(saveData));
enterLobbyScene();
}
const keys = {};
const mouseNDC = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8);
const aimPoint = new THREE.Vector3();
const lookVec = new THREE.Vector3(0, 0, 1);
let firing = false;
let lastShotTime = 0;
const crosshairEl = document.getElementById('dynamic-crosshair');
const reticleRingEl = document.getElementById('reticle-ring');
const retTopEl = document.getElementById('ret-top');
const retBotEl = document.getElementById('ret-bot');
const retLeftEl = document.getElementById('ret-left');
const retRightEl = document.getElementById('ret-right');
let lastClientX = window.innerWidth / 2;
let lastClientY = window.innerHeight / 2;
let bloomSpread = 0;
function updateDynamicCrosshair() {
if (!inRaid || !crosshairEl) return;
crosshairEl.style.left = ${lastClientX}px;
crosshairEl.style.top = ${lastClientY}px;
const w = WEAPONS.at(player.weaponIdx) || WEAPONS.at(0);
const scopeCfg = GUN_SCOPES.find(s => s.id === (saveData.equippedScope || 0)) || GUN_SCOPES.at(0);
const muzzleCfg = GUN_MUZZLES.find(m => m.id === (saveData.equippedMuzzle || 0)) || GUN_MUZZLES.at(0);
let effectiveSpread = w.spread * scopeCfg.spreadMult * muzzleCfg.spreadMult;
if (player.equipLaser) effectiveSpread *= 0.55;
if (player.isAiming) effectiveSpread *= 0.42;
const baseGap = 8 + effectiveSpread * 165;
const gap = Math.min(48, Math.max(5, baseGap + bloomSpread));
if (retTopEl) retTopEl.style.top = ${-gap - 7}px;
if (retBotEl) retBotEl.style.top = ${gap}px;
if (retLeftEl) retLeftEl.style.left = ${-gap - 7}px;
if (retRightEl) retRightEl.style.left = ${gap}px;
if (reticleRingEl) {
const ringSize = Math.max(16, gap * 2.1);
reticleRingEl.style.width = ${ringSize}px;
reticleRingEl.style.height = ${ringSize}px;
}
}
window.addEventListener('mousemove', (e) => {
lastClientX = e.clientX;
lastClientY = e.clientY;
updateDynamicCrosshair();
if (!inRaid && isDraggingLobby) {
const deltaX = e.clientX - prevDragX;
prevDragX = e.clientX;
lobbyTargetYaw += deltaX * 0.012;
return;
}
mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
});
window.addEventListener('mousedown', (e) => {
if (!inRaid || backpackOpen || buyMenuOpen || isPaused || isChatOpen) return;
if (player.hp <= 0 && modeState.mode === 'tactical5v5') {
const aliveAllies = aiDucks.filter(d => d.hp > 0 && d.team === 'blue');
if (aliveAllies.length > 0) {
const curIdx = aliveAllies.indexOf(player.spectatingTarget);
player.spectatingTarget = aliveAllies.at((curIdx + 1) % aliveAllies.length);
document.getElementById('spectate-target-name').innerText = player.spectatingTarget.name || 'Ally Duck';
playSound(520, 'sine', 0.08, 0.08);
}
return;
}
if (e.button === 0) firing = true;
if (e.button === 2) player.isAiming = true;
});
window.addEventListener('mouseup', (e) => {
if (e.button === 0) firing = false;
if (e.button === 2) player.isAiming = false;
});
window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('keydown', (e) => {
if (listeningAction) {
e.preventDefault();
getBinds()[listeningAction] = e.code;
listeningAction = null;
writeSave(saveData);
renderSettingsUI();
playSound(640, 'sine', 0.1, 0.1);
return;
}
if (isChatOpen) return;
if (e.code === 'Enter') {
const authVisible = document.getElementById('auth-screen').style.display !== 'none';
if (!authVisible) {
e.preventDefault();
toggleChatInput(true);
}
return;
}
if (e.code === 'Escape') {
if (inRaid) {
e.preventDefault();
if (backpackOpen) {
backpackOpen = false;
document.getElementById('backpack-modal').style.display = 'none';
} else if (buyMenuOpen) {
closeBuyMenu();
} else {
togglePauseMenu();
}
}
return;
}
const binds = getBinds();
if (!inRaid && e.code === binds.inspect) {
triggerWeaponInspect();
return;
}
keys[e.code] = true;
if (!inRaid || isPaused) return;
if (e.code === binds.scoreboard) {
e.preventDefault();
scoreboardOpen = true;
renderScoreboard();
document.getElementById('scoreboard-modal').style.display = 'flex';
}
if (e.code === binds.backpack && modeState.mode !== 'tactical5v5') {
e.preventDefault();
backpackOpen = !backpackOpen;
const modal = document.getElementById('backpack-modal');
modal.style.display = backpackOpen ? 'flex' : 'none';
if (backpackOpen) renderBackpackUI(player, saveData, () => updateHUD(player, modeState, saveData));
}
if (e.code === 'KeyB' && modeState.mode === 'tactical5v5' && modeState.buyPhaseTimer > 0) {
buyMenuOpen ? closeBuyMenu() : openBuyMenu();
}
if (e.code === binds.ability && modeState.mode === 'tactical5v5') {
useAgentAbility();
}
if (e.code === binds.ping) {
raycaster.setFromCamera(mouseNDC, camera);
const targetPt = new THREE.Vector3();
if (raycaster.ray.intersectPlane(aimPlane, targetPt)) {
spawn3DPing(targetPt, currentGamertag || 'You');
if (network.isConnected()) {
const isEnemyPing = aiDucks.some(ai => ai.hp > 0 && ai.team === 'red' && ai.pos.distanceTo(targetPt) < 3.5);
network.broadcast({
type: 'ping',
x: targetPt.x,
z: targetPt.z,
sender: currentGamertag || 'Squadmate',
isEnemy: isEnemyPing
});
}
}
}
if (e.code === binds.frag) throwGrenade('frag');
if (e.code === binds.smoke) throwGrenade('smoke');
if (e.code === binds.flash) throwGrenade('flash');
if (e.code === binds.thermal && (player.hasThermal || saveData.hasThermal)) {
player.thermalActive = !player.thermalActive;
playSound(player.thermalActive ? 820 : 420, 'sine', 0.14, 0.12);
addLootFeed(T-7 Thermal Goggles: ${player.thermalActive ? 'ACTIVATED' : 'OFF'});
}
if (e.code === binds.horn && player.drivingVehicle) {
playSound(190, 'sawtooth', 0.25, 0.16);
vision.addSoundRipple(player.pos, 9.0, 'rgba(255, 235, 59, 0.9)');
}
if (e.code === binds.headlights && player.drivingVehicle) {
const v = player.drivingVehicle;
v.lightsOn = !v.lightsOn;
v.mesh.spotLight.intensity = v.lightsOn ? 2.2 : 0;
playSound(520, 'sine', 0.08, 0.08);
}
if (e.code === binds.reload) {
if (player.drivingVehicle) {
if (player.fuelCans > 0 && player.drivingVehicle.fuel < 100) {
player.fuelCans--;
player.drivingVehicle.fuel = Math.min(100, player.drivingVehicle.fuel + 65);
playSound(420, 'sine', 0.2, 0.12);
addLootFeed('Refueled Vehicle (+65% Fuel)!');
} else {
addLootFeed(player.fuelCans <= 0 ? 'No Fuel Jerrycans!' : 'Tank already full!');
}
} else if (!player.reloading) {
const w = WEAPONS.at(player.weaponIdx);
if (player.ammo < w.mag) {
player.reloading = true;
playSound(240, 'triangle', 0.2, 0.1);
setTimeout(() => { player.ammo = w.mag; player.reloading = false; }, 1100);
}
}
}
if (e.code === binds.roll) {
if (modeState.mode === 'battleroyale' && !modeState.busDropped && battleBusMesh) {
modeState.busDropped = true;
player.pos.set(battleBusMesh.position.x, 0, battleBusMesh.position.z);
player.mesh.group.position.copy(player.pos);
playSound(560, 'triangle', 0.22, 0.15);
addLootFeed('Dropped from Battle Bus! Loot chests & stay inside the Purple Storm!');
} else if (!player.drivingVehicle && player.rollTimer <= 0 && player.stamina >= 25 && player.hunger > 10) {
player.stamina -= 25;
player.rollTimer = 0.28;
player.rollDir.copy(lookVec).normalize();
playSound(300, 'sine', 0.12, 0.1);
}
}
if (e.code === 'Digit1' && player.medkits > 0 && player.hp < player.maxHp) {
player.medkits--; player.hp = Math.min(player.maxHp, player.hp + 45);
playSound(520, 'sine', 0.2, 0.12); addLootFeed('Used Field Medkit (+45 HP)');
}
if (e.code === 'Digit2' && player.plates > 0 && player.armor < player.maxArmor) {
player.plates--; player.armor = Math.min(player.maxArmor, player.armor + 45);
playSound(400, 'triangle', 0.15, 0.12); addLootFeed('Applied Armor Plate (+45 AP)');
}
if (e.code === 'Digit3' && player.food > 0 && player.hunger < 100) {
player.food--; player.hunger = Math.min(100, player.hunger + 40);
player.hp = Math.min(player.maxHp, player.hp + 10);
playSound(480, 'sine', 0.15, 0.1); addLootFeed('Ate Canned Duck Peas (+40 Energy)');
}
if (e.code === 'Digit4' && player.water > 0 && player.thirst < 100) {
player.water--; player.thirst = Math.min(100, player.thirst + 45);
player.stamina = Math.min(player.maxStamina, player.stamina + 30);
playSound(560, 'sine', 0.15, 0.1); addLootFeed('Drank Purified Water (+45 Hydration)');
}
if (e.code === 'Digit5' && player.pills > 0) {
player.pills--; player.painkillerTimer = 35.0;
player.hp = Math.min(player.maxHp, player.hp + 15);
playSound(600, 'triangle', 0.18, 0.12); addLootFeed('Took Painkillers (35s Regen + Sprint)');
}
if (e.code === 'Digit6' && player.stims > 0) {
player.stims--; player.stimTimer = 25.0;
player.stamina = player.maxStamina;
playSound(740, 'sine', 0.2, 0.12); addLootFeed('Injected SJ6 Stim (25s Speed Boost)');
}
if (e.code === binds.interact) handleInteract();
});
window.addEventListener('keyup', (e) => {
keys[e.code] = false;
if (e.code === getBinds().scoreboard && scoreboardOpen) {
scoreboardOpen = false;
document.getElementById('scoreboard-modal').style.display = 'none';
}
});
document.getElementById('btn-close-bp').addEventListener('click', () => {
backpackOpen = false;
document.getElementById('backpack-modal').style.display = 'none';
});
function handleInteract() {
if (modeState.mode === 'bunker') {
if (bunkerHoloTable && player.pos.distanceTo(bunkerHoloTable.pos) < 3.4) {
const mapKeys = Object.keys(MAPS);
const nextIdx = (mapKeys.indexOf(modeState.mapKey) + 1) % mapKeys.length;
const nextKey = mapKeys.at(nextIdx);
modeState.mapKey = nextKey;
const mapSel = document.getElementById('sel-map');
if (mapSel) mapSel.value = nextKey;
syncLobbyRegionCard();
renderBunkerHoloTable(nextKey);
const mLabel = MAPS[nextKey]?.label || 'Ground Zero';
playSound(680, 'sine', 0.14, 0.12);
addLootFeed(Hologram Target Set: ${mLabel} (${MAPS[nextKey]?.hazard}));
return;
}
if (bunkerWeaponRack && player.pos.distanceTo(bunkerWeaponRack.pos) < 3.5) {
const unlocked = saveData.unlockedWeapons || new Array(1).fill(0);
const curIdx = unlocked.indexOf(player.weaponIdx);
const nextId = unlocked.at((curIdx + 1) % unlocked.length);
player.weaponIdx = nextId;
const wCfg = WEAPONS.at(nextId);
player.ammo = wCfg.mag;
player.reloading = false;
const selW = document.getElementById('sel-weapon');
if (selW) selW.value = String(nextId);
scene.remove(player.mesh.group);
const skinCfg = SKINS.find(s => s.id === saveData.equippedSkin) || SKINS.at(0);
const camoId = (saveData.equippedCamos && saveData.equippedCamos[nextId]) || 0;
const charmId = saveData.equippedCharm || 0;
const scopeId = saveData.equippedScope || 0;
const gripId = saveData.equippedGrip || 0;
const muzzleId = saveData.equippedMuzzle || 0;
player.mesh = createDuckModel(skinCfg.hex, player.armorTier, nextId, null, 'scav', {
suppressor: saveData.equipSuppressor,
laser: saveData.equipLaser,
camoId,
charmId,
scopeId,
gripId,
muzzleId
});
player.mesh.group.position.copy(player.pos);
scene.add(player.mesh.group);
playSound(580, 'triangle', 0.14, 0.12);
addLootFeed(Swapped Primary Weapon: ${wCfg.name});
return;
}
for (const st of bunkerStations) {
if (player.pos.distanceTo(st.pos) < 3.4) {
if (st.type === 'gym') {
if (saveData.cash < 1500) return addLootFeed('Need $1,500 Roubles to upgrade Gym Station!');
saveData.cash -= 1500;
saveData.gymLvl++;
player.maxHp = 100 + (saveData.gymLvl - 1) * 20;
player.hp = player.maxHp;
st.sign.material.map.dispose();
scene.remove(st.sign);
st.sign = createNametagSprite(GYM STATION (Lv.${saveData.gymLvl}), true);
st.sign.position.set(st.pos.x, 2.5, st.pos.z);
scene.add(st.sign);
mapObjects.push(st.sign);
writeSave(saveData);
playSound(720, 'sine', 0.18, 0.12);
addLootFeed(Upgraded Gym Station to Lv.${saveData.gymLvl}! (+20 Max HP));
} else if (st.type === 'bench') {
if (saveData.cash < 2000) return addLootFeed('Need $2,000 Roubles to upgrade Workbench!');
saveData.cash -= 2000;
saveData.benchLvl++;
st.sign.material.map.dispose();
scene.remove(st.sign);
st.sign = createNametagSprite(WORKBENCH (Lv.${saveData.benchLvl}), true);
st.sign.position.set(st.pos.x, 2.5, st.pos.z);
scene.add(st.sign);
mapObjects.push(st.sign);
writeSave(saveData);
playSound(720, 'sine', 0.18, 0.12);
addLootFeed(Upgraded Weapon Workbench to Lv.${saveData.benchLvl}! (+15% DMG));
} else if (st.type === 'medic') {
if (saveData.cash < 1500) return addLootFeed('Need $1,500 Roubles to upgrade Medic Bay!');
saveData.cash -= 1500;
saveData.medicLvl++;
player.maxStamina = 100 + (saveData.medicLvl - 1) * 25;
player.stamina = player.maxStamina;
st.sign.material.map.dispose();
scene.remove(st.sign);
st.sign = createNametagSprite(MEDIC BAY (Lv.${saveData.medicLvl}), true);
st.sign.position.set(st.pos.x, 2.5, st.pos.z);
scene.add(st.sign);
mapObjects.push(st.sign);
writeSave(saveData);
playSound(720, 'sine', 0.18, 0.12);
addLootFeed(Upgraded Medic Bay to Lv.${saveData.medicLvl}! (+25 Stamina));
}
return;
}
}
return;
}
if (player.drivingVehicle) {
const v = player.drivingVehicle;
player.drivingVehicle = null;
player.pos.set(v.pos.x + 2.2, 0, v.pos.z);
player.mesh.group.visible = true;
player.mesh.group.position.copy(player.pos);
playSound(260, 'sine', 0.12, 0.1);
addLootFeed('Exited Vehicle');
return;
}
for (const v of vehicles) {
if (v.hp > 0 && player.pos.distanceTo(v.pos) < 3.6) {
player.drivingVehicle = v;
player.mesh.group.visible = false;
playSound(380, 'sawtooth', 0.18, 0.12);
addLootFeed(Driving ${v.type.toUpperCase()}! [WASD] Drive | [H] Horn | [L] Lights | [R] Refuel | [E] Exit);
return;
}
}
if (corpseMesh && player.pos.distanceTo(corpseMesh.position) < 3.0 && saveData.corpse) {
saveData.corpse.items.forEach(it => {
if (player.backpack.length < 10) player.backpack.push(it);
});
saveData.corpse = null;
writeSave(saveData);
scene.remove(corpseMesh);
corpseMesh = null;
playSound(700, 'sine', 0.25, 0.15);
addLootFeed('Reclaimed gear from your previous corpse!');
return;
}
for (const c of chests) {
if (!c.opened && player.pos.distanceTo(c.pos) < 2.6) {
c.opened = true;
advanceDailyBounty('loots', 1);
if (c.isWeaponCrate) {
c.mesh.rotation.x = -0.35;
playSound(520, 'triangle', 0.2, 0.14);
const gunPool = LOOT_ITEMS.filter(x => x.type === 'weapon');
const attPool = LOOT_ITEMS.filter(x => x.type === 'suppressor' || x.type === 'laser' || x.type === 'thermal');
const wonGun = gunPool.at(Math.floor(Math.random() * gunPool.length));
if (wonGun) {
if (player.backpack.length < 10) {
player.backpack.push({ ...wonGun });
addLootFeed(WEAPON CRATE: Found ${wonGun.name}!);
} else {
saveData.cash += wonGun.val;
addLootFeed(WEAPON CRATE: Sold ${wonGun.name} (+$${wonGun.val}));
}
}
if ((c.guaranteedGun || Math.random() > 0.35) && attPool.length > 0 && player.backpack.length < 10) {
const bonusAtt = attPool.at(Math.floor(Math.random() * attPool.length));
player.backpack.push({ ...bonusAtt });
addLootFeed(BONUS ATTACHMENT: ${bonusAtt.name}!);
}
return;
}
c.mesh.scale.y = 0.45;
playSound(450, 'triangle', 0.16, 0.12);
const count = c.isRare ? 2 : 1;
for (let i = 0; i < count; i++) {
const pool = c.isRare ? LOOT_ITEMS : LOOT_ITEMS.slice(3);
const item = pool.at(Math.floor(Math.random() * pool.length));
if (modeState.mode === 'battleroyale') {
if (item.type === 'weapon') {
player.weaponIdx = item.weaponId;
player.ammo = WEAPONS.at(item.weaponId).mag;
addLootFeed(Equipped ${WEAPONS.at(item.weaponId).name}!);
} else if (item.type === 'medkit') {
player.medkits++;
addLootFeed('Found Field Medkit [Press 1]');
} else if (item.type === 'plate') {
player.plates++;
addLootFeed('Found Armor Plate [Press 2]');
} else if (item.type === 'food') {
player.food++;
addLootFeed('Found Canned Duck Peas [Press 3]');
} else if (item.type === 'water') {
player.water++;
addLootFeed('Found Purified Water [Press 4]');
} else if (item.type === 'pills') {
player.pills++;
addLootFeed('Found Painkillers [Press 5]');
} else if (item.type === 'stim') {
player.stims++;
addLootFeed('Found SJ6 Injector [Press 6]');
} else if (item.type === 'frag') {
player.frags++;
addLootFeed('Found F-1 Frag [Press G]');
} else if (item.type === 'smoke') {
player.smokes++;
addLootFeed('Found M18 Smoke [Press V]');
} else if (item.type === 'flash') {
player.flashes++;
addLootFeed('Found M84 Flashbang [Press C]');
} else if (item.type === 'fuel') {
player.fuelCans++;
addLootFeed('Found Fuel Jerrycan [Press R in Car]');
} else if (item.type === 'thermal') {
player.hasThermal = true;
addLootFeed('Found T-7 Thermal Goggles [Press T]');
} else if (item.type === 'suppressor') {
player.equipSuppressor = true;
addLootFeed('Attached Tactical Suppressor!');
} else if (item.type === 'laser') {
player.equipLaser = true;
addLootFeed('Attached PEQ-15 Laser Sight!');
} else {
player.armor = Math.min(player.maxArmor, player.armor + 35);
addLootFeed('Shield Recharged (+35 AP)');
}
} else {
if (player.backpack.length < 10) {
player.backpack.push({ ...item });
addLootFeed(Looted: ${item.name} ($${item.val}));
} else {
saveData.cash += item.val;
addLootFeed(Bag full! Auto-sold ${item.name} (+$${item.val}));
}
}
}
return;
}
}
}
function shootBullet(origin, dir, speed, dmg, isPlayerTeam, isHeadshot = false) {
const showFx = getGfx().fx !== false;
const color = isHeadshot ? 0xff1744 : isPlayerTeam ? 0x00e5ff : 0xff5252;
const mesh = new THREE.Mesh(
new THREE.SphereGeometry(isHeadshot ? 0.16 : 0.12, 6, 6),
new THREE.MeshBasicMaterial({ color })
);
mesh.position.copy(origin);
mesh.position.y = 1.05;
scene.add(mesh);
let trail = null;
if (showFx) {
trail = new THREE.Mesh(
new THREE.CylinderGeometry(0.035, 0.01, 1.35, 6),
new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 })
);
trail.rotation.x = Math.PI / 2;
trail.position.z = -0.65;
mesh.add(trail);
}
  }

  bullets.push({
    mesh,
    vel: dir.clone().normalize().multiplyScalar(speed),
    dmg,
    isPlayerTeam,
    isHeadshot,
    life: 1.5
  });
}

function spawnMuzzleFlashAndCasing(origin, dir, isPlayer = false) {
  if (getGfx().fx === false) return;
  const flash = new THREE.PointLight(0xffb300, isPlayer ? 3.2 : 2.0, 7);
  flash.position.set(origin.x + dir.x * 0.9, 1.15, origin.z + dir.z * 0.9);
  scene.add(flash);
  setTimeout(() => scene.remove(flash), 45);

  const casing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.09, 6),
    new THREE.MeshStandardMaterial({ color: 0xffd54f, metalness: 0.9, roughness: 0.2 })
  );
  casing.position.set(origin.x, 1.1, origin.z);
  scene.add(casing);

  const right = new THREE.Vector3(-dir.z, 0, dir.x);
  const cVel = new THREE.Vector3(right.x * 2.4 + (Math.random() - 0.5), 3.2, right.z * 2.4 + (Math.random() - 0.5));
  let life = 0.45;
  const stepCasing = () => {
    life -= 0.016;
    if (life <= 0) {
      scene.remove(casing);
      return;
    }
    cVel.y -= 14 * 0.016;
    casing.position.addScaledVector(cVel, 0.016);
    casing.rotation.x += 0.35;
    casing.rotation.z += 0.25;
    if (casing.position.y < 0.05) {
      casing.position.y = 0.05;
      cVel.y *= -0.35;
    }
    requestAnimationFrame(stepCasing);
  };
  requestAnimationFrame(stepCasing);
}

function triggerExplosion(pos, radius, maxDmg, isSmoke = false, isFlash = false) {
  if (isSmoke) {
    spawnSmokeScreen(pos, 14);
    playSound(220, 'sine', 0.3, 0.14);
    return;
  }

  if (isFlash) {
    playSound(980, 'sine', 0.35, 0.18);
    if (player.pos.distanceTo(pos) < radius + 3) {
      const flashEl = document.getElementById('flash-overlay');
      flashEl.style.opacity = '0.95';
      setTimeout(() => { flashEl.style.opacity = '0'; }, 1400);
    }
    aiDucks.forEach(en => {
      if (en.hp > 0 && en.pos.distanceTo(pos) < radius + 2) {
        en.blindTimer = 4.0;
      }
    });
    return;
  }

  playSound(95, 'sawtooth', 0.45, 0.24);
  if (getGfx().shake !== false) {
    camShake = Math.min(0.65, camShake + 0.45);
  }
  vision.addSoundRipple(pos, radius * 1.4, 'rgba(255, 87, 34, 0.95)');

  const boom = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.65, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff6d00, transparent: true, opacity: 0.85 })
  );
  boom.position.copy(pos);
  scene.add(boom);
  setTimeout(() => scene.remove(boom), 220);

  if (player.hp > 0 && player.pos.distanceTo(pos) < radius) {
    const falloff = 1 - player.pos.distanceTo(pos) / radius;
    applyDamageToPlayer(maxDmg * falloff);
  }

  aiDucks.forEach(en => {
    if (en.hp > 0 && en.pos.distanceTo(pos) < radius) {
      const falloff = 1 - en.pos.distanceTo(pos) / radius;
      const dmgDealt = maxDmg * falloff;
      en.hp -= dmgDealt;
      const killed = en.hp <= 0;
      triggerHitmarker(killed);
      spawnDamagePopup(en.pos, dmgDealt, killed, false);

      if (killed) {
        scene.remove(en.mesh.group);
        player.kills++;
        player.killCash += en.isBoss ? 1500 : 250;
        saveData.totalKills++;
        saveData.questKills++;
        advanceDailyBounty('kills', 1);
        reportKill(currentGamertag || 'You', 'Explosion', en.name || (en.isBoss ? 'BOSS KILLA-DUCK' : 'Hostile Duck'), true);
      }
    }
  });

  vehicles.forEach(v => {
    if (v.hp > 0 && v.pos.distanceTo(pos) < radius) {
      v.hp -= maxDmg * 0.85;
      if (v.hp <= 0) {
        if (player.drivingVehicle === v) {
          player.drivingVehicle = null;
          player.mesh.group.visible = true;
        }
        scene.remove(v.mesh.group);
      }
    }
  });
}

function applyDamageToPlayer(rawDmg) {
  if (player.rollTimer > 0) return;
  const aCfg = ARMORS.find(x => x.tier === player.armorTier) || ARMORS.at(0);
  if (player.armor > 0) {
    const absorbed = rawDmg * aCfg.absorb;
    player.armor = Math.max(0, player.armor - absorbed);
    player.hp -= (rawDmg - absorbed);
  } else {
    player.hp -= rawDmg;
  }
  playSound(140, 'sawtooth', 0.1, 0.1);
}

function showMatchSummary(opts) {
  inRaid = false;
  firing = false;
  isPaused = false;
  document.getElementById('pause-modal').style.display = 'none';
  document.getElementById('hud').style.display = 'none';
  document.getElementById('backpack-modal').style.display = 'none';
  document.getElementById('buy-modal').style.display = 'none';
  document.getElementById('scoreboard-modal').style.display = 'none';

  const badge = document.getElementById('sum-outcome-badge');
  badge.innerText = opts.badgeText || (opts.win ? 'VICTORY' : 'DEFEAT');
  badge.className = `sum-badge ${opts.win ? 'win' : 'loss'}`;

  document.getElementById('sum-title').innerText = opts.title || 'MATCH COMPLETE';
  document.getElementById('sum-subtitle').innerText = opts.subtitle || '';

  const kd = (player.kills / Math.max(1, player.deaths)).toFixed(2);
  const acc = player.shotsFired > 0
    ? Math.min(100, Math.round((player.shotsHit / player.shotsFired) * 100))
    : 0;

  document.getElementById('sum-kills').innerText = player.kills;
  document.getElementById('sum-kd').innerText = kd;
  document.getElementById('sum-acc').innerText = `${acc}%`;
  document.getElementById('sum-cash').innerText = `+$${(opts.cashEarned || 0).toLocaleString()}`;
  document.getElementById('sum-extra-note').innerText = opts.note || '';

  const candidates = new Array({
    name: currentGamertag || 'DuckOperator_01',
    kills: player.kills,
    score: player.kills * 120 + (opts.win ? 150 : 0) + acc
  });
  aiDucks.forEach(ai => {
    candidates.push({
      name: ai.name || (ai.isBoss ? 'BOSS KILLA-DUCK' : ai.isGuard ? 'ARMORY GUARD' : ai.team === 'blue' ? 'Mallard_Bot' : 'Viper_Scav'),
      kills: ai.kills || 0,
      score: (ai.kills || 0) * 120 + (ai.hp > 0 ? 50 : 0)
    });
  });
  candidates.sort((a, b) => b.score - a.score);
  const mvp = candidates.at(0);

  document.getElementById('sum-mvp-name').innerText = mvp.name;
  document.getElementById('sum-mvp-stats').innerText = `${mvp.kills} Eliminations • Combat Score ${mvp.score}`;

  document.getElementById('match-summary-modal').style.display = 'flex';
}

function endMatch(win, reasonText) {
  const mData = getActiveMapData(modeState.mapKey, modeState.mode);
  const modeLabel = modeState.mode === 'tactical5v5'
    ? 'Duckorant 5v5'
    : modeState.mode === 'battleroyale'
      ? 'Ducknite Royale'
      : 'Extraction Mode';

  if (win) {
    saveData.extracts++;
    advanceDailyBounty('wins', 1);
    let payout = player.killCash;
    let extraNote = '';

    if (modeState.mode === 'extraction') {
      const lootVal = player.backpack.reduce((acc, it) => acc + it.val, 0);
      payout += lootVal;
      player.backpack.forEach(it => {
        if (saveData.stash.length < 12) saveData.stash.push(it);
        else saveData.cash += it.val;
      });
      if (lootVal > 0) extraNote = `Extracted ${player.backpack.length} items worth $${lootVal.toLocaleString()} to Bunker Stash!`;
    } else if (modeState.mode === 'battleroyale') {
      payout += 2500;
      extraNote = 'Victory Royale Bonus: +$2,500 Roubles!';
    } else if (modeState.mode === 'tactical5v5') {
      payout += 2000;
      extraNote = `Match Victory (${modeState.blueScore} - ${modeState.redScore}) Bonus: +$2,000 Roubles!`;
    }

    const q = QUESTS.at(Math.min(saveData.questIdx, QUESTS.length - 1));
    if (saveData.questKills >= q.target) {
      payout += q.reward;
      saveData.questKills = 0;
      saveData.questIdx++;
      extraNote += ` • Mission "${q.title}" Complete (+$${q.reward.toLocaleString()})!`;
    }

    saveData.cash += payout;
    saveData.medkits = player.medkits;
    saveData.plates = player.plates;
    saveData.food = player.food;
    saveData.water = player.water;
    saveData.pills = player.pills;
    saveData.stims = player.stims;
    saveData.frags = player.frags;
    saveData.smokes = player.smokes;
    saveData.flashes = player.flashes;
    saveData.fuelCans = player.fuelCans;
    writeSave(saveData);
    playSound(720, 'sine', 0.35, 0.15);

    showMatchSummary({
      win: true,
      badgeText: modeState.mode === 'extraction' ? 'EXTRACTED SAFELY' : 'VICTORY',
      title: reasonText.toUpperCase(),
      subtitle: `${mData.label} • ${modeLabel}`,
      cashEarned: payout,
      note: extraNote
    });
  } else {
    player.deaths++;
    let lossNote = '';
    if (modeState.mode === 'extraction' && player.backpack.length > 0) {
      saveData.corpse = { mapKey: modeState.mapKey, x: player.pos.x, z: player.pos.z, items: new Array(...player.backpack) };
      lossNote = `Your gear dropped at your corpse on ${mData.label}. Deploy there to recover it!`;
    }
    saveData.medkits = Math.max(1, player.medkits);
    saveData.plates = Math.max(1, player.plates);
    saveData.food = Math.max(1, player.food);
    saveData.water = Math.max(1, player.water);
    saveData.pills = Math.max(1, player.pills);
    saveData.stims = Math.max(1, player.stims);
    saveData.frags = Math.max(1, player.frags);
    saveData.smokes = Math.max(1, player.smokes);
    saveData.flashes = Math.max(1, player.flashes);
    saveData.fuelCans = Math.max(1, player.fuelCans);
    writeSave(saveData);
    playSound(110, 'sawtooth', 0.4, 0.15);

    showMatchSummary({
      win: false,
      badgeText: 'KIA • ELIMINATED',
      title: reasonText.toUpperCase(),
      subtitle: `${mData.label} • ${modeLabel}`,
      cashEarned: 0,
      note: lossNote
    });
  }
}

function collidesWithObstacle(pos, radius = 0.55) {
  if (Math.abs(pos.x) > 57 || Math.abs(pos.z) > 57) return true;
  for (const b of obstacles) {
    if (pos.x + radius > b.minX && pos.x - radius < b.maxX &&
        pos.z + radius > b.minZ && pos.z - radius < b.maxZ) return true;
  }
  return false;
}
let prevTime = performance.now();
let lastNetSync = 0;

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - prevTime) / 1000);
  prevTime = now;

  fpsFrames++;
  if (now - fpsLastTime >= 500) {
    const fps = Math.round((fpsFrames * 1000) / (now - fpsLastTime));
    if (fpsEl && getGfx().showFps) {
      fpsEl.innerText = `${fps} FPS`;
      fpsEl.style.color = fps >= 50 ? '#2ecc71' : fps >= 30 ? '#f7ff19' : '#ff5252';
    }
    fpsFrames = 0;
    fpsLastTime = now;
  }

  if (!inRaid) {
    if (lobbyDuckGroup) {
      if (lobbySpinBoost > 0) {
        const step = Math.min(lobbySpinBoost, dt * 11);
        lobbyTargetYaw += step;
        lobbySpinBoost -= step;
      } else if (!isDraggingLobby) {
        lobbyTargetYaw += dt * 0.25;
      }
      lobbyDuckGroup.rotation.y = lobbyTargetYaw;
      lobbyDuckGroup.position.y = 0.24 + Math.sin(now * 0.003) * 0.03;

      if (lobbyCharmPivot) {
        lobbyCharmPivot.rotation.z = Math.sin(now * 0.005) * 0.22;
        lobbyCharmPivot.rotation.x = Math.cos(now * 0.004) * 0.12;
      }

      if (lobbyGunGroup) {
        if (lobbyInspectTimer > 0) {
          lobbyInspectTimer = Math.max(0, lobbyInspectTimer - dt);
          const tiltWave = Math.sin(((2.6 - lobbyInspectTimer) / 2.6) * Math.PI);
          lobbyGunGroup.position.set(0.58 - tiltWave * 0.24, 0.82 + tiltWave * 0.34, 0.55 + tiltWave * 0.16);
          lobbyGunGroup.rotation.set(tiltWave * 0.38, -tiltWave * 0.85, tiltWave * 0.55);
          if (lobbyInspectTimer <= 0) {
            const badge = document.getElementById('lobby-inspect-badge');
            if (badge) badge.style.display = 'none';
          }
        } else {
          lobbyGunGroup.position.set(0.58, 0.82, 0.55);
          lobbyGunGroup.rotation.set(0, 0, 0);
        }
      }
    }
    renderer.render(scene, camera);
    return;
  }

  if (isPaused) {
    renderer.render(scene, camera);
    return;
  }

  if (swayingFoliage.length > 0 && getGfx().preset !== 'low') {
    const windTime = now * 0.0022;
    for (let i = 0; i < swayingFoliage.length; i++) {
      const f = swayingFoliage.at(i);
      let gust = 1.0;
      if (f.isGrass && player && f.pos.distanceToSquared(player.pos) < 3.2) {
        gust = 2.6;
      }
      f.target.rotation.z = Math.sin(windTime + f.phase) * f.amp * gust;
      f.target.rotation.x = Math.cos(windTime * 0.8 + f.phase) * (f.amp * 0.65) * gust;
    }
  }

  bloomSpread = Math.max(0, bloomSpread - dt * 52);

  if (modeState.mode === 'bunker' && bunkerHoloTable && bunkerHoloTable.holoGroup) {
    bunkerHoloTable.holoGroup.rotation.y += dt * 0.85;
    bunkerHoloTable.holoGroup.position.y = 1.25 + Math.sin(now * 0.004) * 0.05;
  }

  if (modeState.mode === 'battleroyale' && battleBusMesh && !modeState.busDropped) {
    modeState.busProgress += dt * 0.065;
    if (modeState.busProgress >= 1) {
      modeState.busDropped = true;
      player.pos.set(battleBusMesh.position.x, 0, battleBusMesh.position.z);
      player.mesh.group.position.copy(player.pos);
      addLootFeed('End of Battle Bus route! Auto-dropped onto the island.');
    } else {
      const bx = -48 + modeState.busProgress * 96;
      const bz = 48 - modeState.busProgress * 96;
      battleBusMesh.position.set(bx, 16, bz);
      battleBusMesh.rotation.y = Math.atan2(96, -96);
      player.pos.set(bx, 16, bz);
      player.mesh.group.position.copy(player.pos);
    }
  }

  if (player.hp <= 0 && modeState.mode === 'tactical5v5') {
    const aliveAllies = aiDucks.filter(d => d.hp > 0 && d.team === 'blue');
    if (aliveAllies.length > 0) {
      if (!player.spectatingTarget || player.spectatingTarget.hp <= 0) {
        player.spectatingTarget = aliveAllies.at(0);
      }
      document.getElementById('spectate-banner').style.display = 'block';
      document.getElementById('spectate-target-name').innerText = player.spectatingTarget.name || 'Ally Duck';

      const targetPos = player.spectatingTarget.pos;
      camera.position.lerp(new THREE.Vector3(targetPos.x, 18, targetPos.z + 15), 0.14);
      camera.lookAt(targetPos.x, 0.8, targetPos.z);
      vision.renderFog(player.spectatingTarget, player.spectatingTarget.angle || 0, obstacles, camera, false, aiDucks, dt);
    }
  } else {
    document.getElementById('spectate-banner').style.display = 'none';
  }

  if (player.abilityCooldown > 0) player.abilityCooldown = Math.max(0, player.abilityCooldown - dt);
  if (player.rapidFireTimer > 0) player.rapidFireTimer = Math.max(0, player.rapidFireTimer - dt);

  for (let i = activePings.length - 1; i >= 0; i--) {
    const p = activePings.at(i);
    p.timer -= dt;
    p.ring.scale.setScalar(1 + Math.sin(now * 0.01) * 0.15);
    if (p.timer <= 0) {
      scene.remove(p.mesh);
      activePings.splice(i, 1);
    }
  }

  for (let i = sentries.length - 1; i >= 0; i--) {
    const st = sentries.at(i);
    st.timer -= dt;
    if (st.timer <= 0) {
      scene.remove(st.mesh);
      sentries.splice(i, 1);
      continue;
    }
    let nearest = null;
    let bestD = 20;
    aiDucks.forEach(en => {
      if (en.hp > 0 && en.team === 'red') {
        const d = st.pos.distanceTo(en.pos);
        if (d < bestD) { bestD = d; nearest = en; }
      }
    });
    if (nearest) {
      const sDir = new THREE.Vector3().subVectors(nearest.pos, st.pos).normalize();
      st.head.rotation.y = Math.atan2(sDir.x, sDir.z);
      if (now - st.lastShot > 450) {
        st.lastShot = now;
        shootBullet(st.pos, sDir, 44, 14, true, false);
        playSound(520, 'square', 0.04, 0.05);
      }
    }
  }

  if (modeState.mode !== 'tactical5v5' && modeState.mode !== 'bunker') {
    player.hunger = Math.max(0, player.hunger - dt * 0.45);
    player.thirst = Math.max(0, player.thirst - dt * 0.65);
    if (player.hunger <= 0 || player.thirst <= 0) {
      player.hp -= dt * 2.2;
      if (player.hp <= 0) return endMatch(false, 'STARVED / DEHYDRATED');
    }
  }

  if (player.painkillerTimer > 0) {
    player.painkillerTimer = Math.max(0, player.painkillerTimer - dt);
    player.hp = Math.min(player.maxHp, player.hp + dt * 2.8);
  }
  if (player.stimTimer > 0) {
    player.stimTimer = Math.max(0, player.stimTimer - dt);
    player.stamina = Math.min(player.maxStamina, player.stamina + dt * 35);
  }

  const mData = getActiveMapData(modeState.mapKey, modeState.mode);
  if (mData.hasStormHazard && player.armorTier !== 4) {
    player.hp -= dt * 3.5;
    if (player.hp <= 0) return endMatch(false, 'TOXIC STORM RADIATION');
  }

  if (modeState.mode === 'tactical5v5' && buyMenuOpen) {
    modeState.buyPhaseTimer -= dt;
    document.getElementById('buy-timer').innerText = Math.max(0, Math.ceil(modeState.buyPhaseTimer));
    if (modeState.buyPhaseTimer <= 0) closeBuyMenu();
  }

  const wCfg = WEAPONS.at(player.weaponIdx);
  const scopeCfg = GUN_SCOPES.find(s => s.id === (saveData.equippedScope || 0)) || GUN_SCOPES.at(0);
  const effectiveAimFov = Math.max(20, wCfg.fov - scopeCfg.fovBonus);
  const targetFov = player.isAiming ? effectiveAimFov : 50;
  camera.fov += (targetFov - camera.fov) * 0.15;
  camera.updateProjectionMatrix();

  const binds = getBinds();
  let moveX = 0;
  let moveZ = 0;
  if (!backpackOpen && !buyMenuOpen && !isChatOpen) {
    if (keys[binds.moveUp]) moveZ -= 1;
    if (keys[binds.moveDown]) moveZ += 1;
    if (keys[binds.moveLeft]) moveX -= 1;
    if (keys[binds.moveRight]) moveX += 1;
  }

  if (player.drivingVehicle) {
    const v = player.drivingVehicle;
    if (v.fuel > 0) {
      if (moveZ < 0) v.speed = Math.min(v.maxSpeed, v.speed + 24 * dt);
      else if (moveZ > 0) v.speed = Math.max(-v.maxSpeed * 0.5, v.speed - 28 * dt);
      else v.speed *= 0.94;
    } else {
      v.speed *= 0.92;
    }

    if (Math.abs(v.speed) > 0.4) {
      const turnDir = v.speed >= 0 ? 1 : -1;
      v.rotY -= moveX * 2.4 * dt * turnDir;
      v.fuel = Math.max(0, v.fuel - dt * 1.4);
      if (Math.random() < 0.25) {
        vision.addSoundRipple(v.pos, 6.5, 'rgba(255, 152, 0, 0.75)');
      }
    }

    const nextVPos = v.pos.clone();
    nextVPos.x += Math.sin(v.rotY) * v.speed * dt;
    nextVPos.z += Math.cos(v.rotY) * v.speed * dt;

    if (!collidesWithObstacle(nextVPos, 1.35)) {
      v.pos.copy(nextVPos);
    } else {
      v.speed *= -0.35;
    }

    v.mesh.group.position.copy(v.pos);
    v.mesh.group.rotation.y = v.rotY;
    v.mesh.wheels.forEach(w => { w.rotation.x += v.speed * dt * 1.8; });

    player.pos.copy(v.pos);
    lookVec.set(Math.sin(v.rotY), 0, Math.cos(v.rotY));
  } else if (player.hp > 0 && (modeState.mode !== 'battleroyale' || modeState.busDropped)) {
    const moveVec = new THREE.Vector3(moveX, 0, moveZ);
    const hydrationMult = player.thirst < 25 ? 0.72 : 1.0;
    const stimMult = player.stimTimer > 0 ? 1.28 : 1.0;
    const speed = (player.isAiming ? 5.2 : 9.2) * wCfg.moveMult * hydrationMult * stimMult;

    if (player.rollTimer > 0) {
      player.rollTimer -= dt;
      const nextPos = player.pos.clone().addScaledVector(player.rollDir, 19 * dt);
      if (!collidesWithObstacle(nextPos)) player.pos.copy(nextPos);
    } else if (moveVec.lengthSq() > 0) {
      moveVec.normalize();
      const nextPos = player.pos.clone().addScaledVector(moveVec, speed * dt);
      if (!collidesWithObstacle(nextPos)) player.pos.copy(nextPos);
      if (Math.random() < 0.16) {
        vision.addSoundRipple(player.pos, 2.2, 'rgba(0, 229, 255, 0.55)');
      }
    }

    if (player.hunger > 15 && player.thirst > 15) {
      player.stamina = Math.min(player.maxStamina, player.stamina + 18 * dt);
    }
    player.mesh.group.position.copy(player.pos);
  }

  let aimAngle = 0;
  if (!player.drivingVehicle && player.hp > 0) {
    raycaster.setFromCamera(mouseNDC, camera);
    if (raycaster.ray.intersectPlane(aimPlane, aimPoint)) {
      lookVec.subVectors(aimPoint, player.pos);
      lookVec.y = 0;
      if (lookVec.lengthSq() > 0.01) {
        aimAngle = Math.atan2(lookVec.x, lookVec.z);
let prevTime = performance.now();
let lastNetSync = 0;

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - prevTime) / 1000);
  prevTime = now;

  fpsFrames++;
  if (now - fpsLastTime >= 500) {
    const fps = Math.round((fpsFrames * 1000) / (now - fpsLastTime));
    if (fpsEl && getGfx().showFps) {
      fpsEl.innerText = `${fps} FPS`;
      fpsEl.style.color = fps >= 50 ? '#2ecc71' : fps >= 30 ? '#f7ff19' : '#ff5252';
    }
    fpsFrames = 0;
    fpsLastTime = now;
  }

  if (!inRaid) {
    if (lobbyDuckGroup) {
      if (lobbySpinBoost > 0) {
        const step = Math.min(lobbySpinBoost, dt * 11);
        lobbyTargetYaw += step;
        lobbySpinBoost -= step;
      } else if (!isDraggingLobby) {
        lobbyTargetYaw += dt * 0.25;
      }
      lobbyDuckGroup.rotation.y = lobbyTargetYaw;
      lobbyDuckGroup.position.y = 0.24 + Math.sin(now * 0.003) * 0.03;

      if (lobbyCharmPivot) {
        lobbyCharmPivot.rotation.z = Math.sin(now * 0.005) * 0.22;
        lobbyCharmPivot.rotation.x = Math.cos(now * 0.004) * 0.12;
      }

      if (lobbyGunGroup) {
        if (lobbyInspectTimer > 0) {
          lobbyInspectTimer = Math.max(0, lobbyInspectTimer - dt);
          const tiltWave = Math.sin(((2.6 - lobbyInspectTimer) / 2.6) * Math.PI);
          lobbyGunGroup.position.set(0.58 - tiltWave * 0.24, 0.82 + tiltWave * 0.34, 0.55 + tiltWave * 0.16);
          lobbyGunGroup.rotation.set(tiltWave * 0.38, -tiltWave * 0.85, tiltWave * 0.55);
          if (lobbyInspectTimer <= 0) {
            const badge = document.getElementById('lobby-inspect-badge');
            if (badge) badge.style.display = 'none';
          }
        } else {
          lobbyGunGroup.position.set(0.58, 0.82, 0.55);
          lobbyGunGroup.rotation.set(0, 0, 0);
        }
      }
    }
    renderer.render(scene, camera);
    return;
  }

  if (isPaused) {
    renderer.render(scene, camera);
    return;
  }

  if (swayingFoliage.length > 0 && getGfx().preset !== 'low') {
    const windTime = now * 0.0022;
    for (let i = 0; i < swayingFoliage.length; i++) {
      const f = swayingFoliage.at(i);
      let gust = 1.0;
      if (f.isGrass && player && f.pos.distanceToSquared(player.pos) < 3.2) {
        gust = 2.6;
      }
      f.target.rotation.z = Math.sin(windTime + f.phase) * f.amp * gust;
      f.target.rotation.x = Math.cos(windTime * 0.8 + f.phase) * (f.amp * 0.65) * gust;
    }
  }

  bloomSpread = Math.max(0, bloomSpread - dt * 52);

  if (modeState.mode === 'bunker' && bunkerHoloTable && bunkerHoloTable.holoGroup) {
    bunkerHoloTable.holoGroup.rotation.y += dt * 0.85;
    bunkerHoloTable.holoGroup.position.y = 1.25 + Math.sin(now * 0.004) * 0.05;
  }

  if (modeState.mode === 'battleroyale' && battleBusMesh && !modeState.busDropped) {
    modeState.busProgress += dt * 0.065;
    if (modeState.busProgress >= 1) {
      modeState.busDropped = true;
      player.pos.set(battleBusMesh.position.x, 0, battleBusMesh.position.z);
      player.mesh.group.position.copy(player.pos);
      addLootFeed('End of Battle Bus route! Auto-dropped onto the island.');
    } else {
      const bx = -48 + modeState.busProgress * 96;
      const bz = 48 - modeState.busProgress * 96;
      battleBusMesh.position.set(bx, 16, bz);
      battleBusMesh.rotation.y = Math.atan2(96, -96);
      player.pos.set(bx, 16, bz);
      player.mesh.group.position.copy(player.pos);
    }
  }

  if (player.hp <= 0 && modeState.mode === 'tactical5v5') {
    const aliveAllies = aiDucks.filter(d => d.hp > 0 && d.team === 'blue');
    if (aliveAllies.length > 0) {
      if (!player.spectatingTarget || player.spectatingTarget.hp <= 0) {
        player.spectatingTarget = aliveAllies.at(0);
      }
      document.getElementById('spectate-banner').style.display = 'block';
      document.getElementById('spectate-target-name').innerText = player.spectatingTarget.name || 'Ally Duck';

      const targetPos = player.spectatingTarget.pos;
      camera.position.lerp(new THREE.Vector3(targetPos.x, 18, targetPos.z + 15), 0.14);
      camera.lookAt(targetPos.x, 0.8, targetPos.z);
      vision.renderFog(player.spectatingTarget, player.spectatingTarget.angle || 0, obstacles, camera, false, aiDucks, dt);
    }
  } else {
    document.getElementById('spectate-banner').style.display = 'none';
  }

  if (player.abilityCooldown > 0) player.abilityCooldown = Math.max(0, player.abilityCooldown - dt);
  if (player.rapidFireTimer > 0) player.rapidFireTimer = Math.max(0, player.rapidFireTimer - dt);

  for (let i = activePings.length - 1; i >= 0; i--) {
    const p = activePings.at(i);
    p.timer -= dt;
    p.ring.scale.setScalar(1 + Math.sin(now * 0.01) * 0.15);
    if (p.timer <= 0) {
      scene.remove(p.mesh);
      activePings.splice(i, 1);
    }
  }

  for (let i = sentries.length - 1; i >= 0; i--) {
    const st = sentries.at(i);
    st.timer -= dt;
    if (st.timer <= 0) {
      scene.remove(st.mesh);
      sentries.splice(i, 1);
      continue;
    }
    let nearest = null;
    let bestD = 20;
    aiDucks.forEach(en => {
      if (en.hp > 0 && en.team === 'red') {
        const d = st.pos.distanceTo(en.pos);
        if (d < bestD) { bestD = d; nearest = en; }
      }
    });
    if (nearest) {
      const sDir = new THREE.Vector3().subVectors(nearest.pos, st.pos).normalize();
      st.head.rotation.y = Math.atan2(sDir.x, sDir.z);
      if (now - st.lastShot > 450) {
        st.lastShot = now;
        shootBullet(st.pos, sDir, 44, 14, true, false);
        playSound(520, 'square', 0.04, 0.05);
      }
    }
  }

  if (modeState.mode !== 'tactical5v5' && modeState.mode !== 'bunker') {
    player.hunger = Math.max(0, player.hunger - dt * 0.45);
    player.thirst = Math.max(0, player.thirst - dt * 0.65);
    if (player.hunger <= 0 || player.thirst <= 0) {
      player.hp -= dt * 2.2;
      if (player.hp <= 0) return endMatch(false, 'STARVED / DEHYDRATED');
    }
  }

  if (player.painkillerTimer > 0) {
    player.painkillerTimer = Math.max(0, player.painkillerTimer - dt);
    player.hp = Math.min(player.maxHp, player.hp + dt * 2.8);
  }
  if (player.stimTimer > 0) {
    player.stimTimer = Math.max(0, player.stimTimer - dt);
    player.stamina = Math.min(player.maxStamina, player.stamina + dt * 35);
  }

  const mData = getActiveMapData(modeState.mapKey, modeState.mode);
  if (mData.hasStormHazard && player.armorTier !== 4) {
    player.hp -= dt * 3.5;
    if (player.hp <= 0) return endMatch(false, 'TOXIC STORM RADIATION');
  }

  if (modeState.mode === 'tactical5v5' && buyMenuOpen) {
    modeState.buyPhaseTimer -= dt;
    document.getElementById('buy-timer').innerText = Math.max(0, Math.ceil(modeState.buyPhaseTimer));
    if (modeState.buyPhaseTimer <= 0) closeBuyMenu();
  }

  const wCfg = WEAPONS.at(player.weaponIdx);
  const scopeCfg = GUN_SCOPES.find(s => s.id === (saveData.equippedScope || 0)) || GUN_SCOPES.at(0);
  const effectiveAimFov = Math.max(20, wCfg.fov - scopeCfg.fovBonus);
  const targetFov = player.isAiming ? effectiveAimFov : 50;
  camera.fov += (targetFov - camera.fov) * 0.15;
  camera.updateProjectionMatrix();

  const binds = getBinds();
  let moveX = 0;
  let moveZ = 0;
  if (!backpackOpen && !buyMenuOpen && !isChatOpen) {
    if (keys[binds.moveUp]) moveZ -= 1;
    if (keys[binds.moveDown]) moveZ += 1;
    if (keys[binds.moveLeft]) moveX -= 1;
    if (keys[binds.moveRight]) moveX += 1;
  }

  if (player.drivingVehicle) {
    const v = player.drivingVehicle;
    if (v.fuel > 0) {
      if (moveZ < 0) v.speed = Math.min(v.maxSpeed, v.speed + 24 * dt);
      else if (moveZ > 0) v.speed = Math.max(-v.maxSpeed * 0.5, v.speed - 28 * dt);
      else v.speed *= 0.94;
    } else {
      v.speed *= 0.92;
    }

    if (Math.abs(v.speed) > 0.4) {
      const turnDir = v.speed >= 0 ? 1 : -1;
      v.rotY -= moveX * 2.4 * dt * turnDir;
      v.fuel = Math.max(0, v.fuel - dt * 1.4);
      if (Math.random() < 0.25) {
        vision.addSoundRipple(v.pos, 6.5, 'rgba(255, 152, 0, 0.75)');
      }
    }

    const nextVPos = v.pos.clone();
    nextVPos.x += Math.sin(v.rotY) * v.speed * dt;
    nextVPos.z += Math.cos(v.rotY) * v.speed * dt;

    if (!collidesWithObstacle(nextVPos, 1.35)) {
      v.pos.copy(nextVPos);
    } else {
      v.speed *= -0.35;
    }

    v.mesh.group.position.copy(v.pos);
    v.mesh.group.rotation.y = v.rotY;
    v.mesh.wheels.forEach(w => { w.rotation.x += v.speed * dt * 1.8; });

    player.pos.copy(v.pos);
    lookVec.set(Math.sin(v.rotY), 0, Math.cos(v.rotY));
  } else if (player.hp > 0 && (modeState.mode !== 'battleroyale' || modeState.busDropped)) {
    const moveVec = new THREE.Vector3(moveX, 0, moveZ);
    const hydrationMult = player.thirst < 25 ? 0.72 : 1.0;
    const stimMult = player.stimTimer > 0 ? 1.28 : 1.0;
    const speed = (player.isAiming ? 5.2 : 9.2) * wCfg.moveMult * hydrationMult * stimMult;

    if (player.rollTimer > 0) {
      player.rollTimer -= dt;
      const nextPos = player.pos.clone().addScaledVector(player.rollDir, 19 * dt);
      if (!collidesWithObstacle(nextPos)) player.pos.copy(nextPos);
    } else if (moveVec.lengthSq() > 0) {
      moveVec.normalize();
      const nextPos = player.pos.clone().addScaledVector(moveVec, speed * dt);
      if (!collidesWithObstacle(nextPos)) player.pos.copy(nextPos);
      if (Math.random() < 0.16) {
        vision.addSoundRipple(player.pos, 2.2, 'rgba(0, 229, 255, 0.55)');
      }
    }

    if (player.hunger > 15 && player.thirst > 15) {
      player.stamina = Math.min(player.maxStamina, player.stamina + 18 * dt);
    }
    player.mesh.group.position.copy(player.pos);
  }

  let aimAngle = 0;
  if (!player.drivingVehicle && player.hp > 0) {
    raycaster.setFromCamera(mouseNDC, camera);
    if (raycaster.ray.intersectPlane(aimPlane, aimPoint)) {
      lookVec.subVectors(aimPoint, player.pos);
      lookVec.y = 0;
      if (lookVec.lengthSq() > 0.01) {
        aimAngle = Math.atan2(lookVec.x, lookVec.z);
