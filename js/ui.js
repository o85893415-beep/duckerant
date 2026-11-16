import {
  WEAPONS,
  ARMORS,
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
import { renderStashUI } from './inventory.js';
import { getTodayKey, ensureDailyChallenges, playSound } from './storage.js';

export function populateMapDropdown(mode = 'extraction') {
  const mSel = document.getElementById('sel-map');
  if (!mSel) return;

  const pool = mode === 'tactical5v5' ? MAPS_5V5 : MAPS;
  mSel.innerHTML = '';

  Object.entries(pool).forEach(([key, m]) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = mode === 'tactical5v5'
      ? `5v5 Map: ${m.label}`
      : `Region: ${m.label}`;
    mSel.appendChild(opt);
  });
}

export function populateMenus() {
  const wSel = document.getElementById('sel-weapon');
  const aSel = document.getElementById('sel-armor');

  wSel.innerHTML = '';
  aSel.innerHTML = '';

  WEAPONS.forEach(w => {
    const opt = document.createElement('option');
    opt.value = w.id;
    opt.textContent = w.price === 0 ? w.name : `${w.name} ($${w.price})`;
    wSel.appendChild(opt);
  });

  ARMORS.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.tier;
    opt.textContent = a.price === 0 ? a.name : `${a.name} ($${a.price})`;
    aSel.appendChild(opt);
  });

  const fillOptList = (selId, list) => {
    const el = document.getElementById(selId);
    if (!el) return;
    el.innerHTML = '';
    list.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.price === 0 ? item.name : `${item.name} ($${item.price})`;
      el.appendChild(opt);
    });
  };

  fillOptList('sel-scope', GUN_SCOPES);
  fillOptList('sel-grip', GUN_GRIPS);
  fillOptList('sel-muzzle', GUN_MUZZLES);
  populateMapDropdown('extraction');
}

function renderDailyBountiesUI(saveData, onSave) {
  ensureDailyChallenges(saveData);
  const today = getTodayKey();

  const streakBadge = document.getElementById('daily-streak-badge');
  const claimDailyBtn = document.getElementById('btn-claim-daily');
  if (streakBadge && claimDailyBtn) {
    const streak = saveData.dailyStreak || 1;
    const payout = 1000 + Math.min(6, streak - 1) * 250;
    streakBadge.innerText = `DAY ${streak} STREAK`;

    if (saveData.lastDailyClaimDate === today) {
      claimDailyBtn.innerText = `CLAIMED TODAY! COME BACK TOMORROW`;
      claimDailyBtn.style.background = '#2e7d32';
      claimDailyBtn.style.color = '#fff';
      claimDailyBtn.disabled = true;
    } else {
      claimDailyBtn.innerText = `CLAIM DAILY REWARD (+$${payout.toLocaleString()})`;
      claimDailyBtn.style.background = '#f7ff19';
      claimDailyBtn.style.color = '#0b1320';
      claimDailyBtn.disabled = false;
    }
  }

  const listEl = document.getElementById('daily-bounties-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  saveData.dailyBounties.forEach((b) => {
    const isComplete = b.progress >= b.target;
    const pct = Math.min(100, (b.progress / b.target) * 100);
    const card = document.createElement('div');
    card.className = `bounty-card ${b.claimed ? 'done' : ''}`;

    let actionHTML = `<span>$${b.reward.toLocaleString()}</span>`;
    if (b.claimed) {
      actionHTML = `<strong style="color:#2ecc71;">CLAIMED</strong>`;
    } else if (isComplete) {
      actionHTML = `<button class="btn-claim-bounty">CLAIM +$${b.reward.toLocaleString()}</button>`;
    }

    card.innerHTML = `
      <div class="bounty-top">
        <span>${b.title}</span>
        <span>${Math.min(b.progress, b.target)} / ${b.target}</span>
      </div>
      <div style="font-size:11.5px; color:#b0c4de; margin-top:2px;">${b.desc}</div>
      <div class="bounty-bar-bg"><div class="bounty-bar-fill" style="width:${pct}%"></div></div>
      <div class="bounty-foot">
        <span>Daily Bounty</span>
        ${actionHTML}
      </div>
    `;

    const claimBtn = card.querySelector('.btn-claim-bounty');
    if (claimBtn) {
      claimBtn.onclick = () => {
        b.claimed = true;
        saveData.cash += b.reward;
        playSound(760, 'sine', 0.22, 0.14);
        if (onSave) onSave();
      };
    }

    listEl.appendChild(card);
  });
}
export function refreshMenuUI(saveData, onSave) {
  document.getElementById('menu-cash').innerText = saveData.cash.toLocaleString();
  document.getElementById('menu-extracts').innerText = saveData.extracts;
  document.getElementById('menu-kills').innerText = saveData.totalKills;
  document.getElementById('lvl-gym').innerText = saveData.gymLvl;
  document.getElementById('lvl-bench').innerText = saveData.benchLvl;
  document.getElementById('lvl-medic').innerText = saveData.medicLvl;

  const lobbyLvlEl = document.getElementById('lobby-lvl');
  if (lobbyLvlEl) {
    lobbyLvlEl.innerText = Math.max(1, saveData.gymLvl + saveData.benchLvl + saveData.medicLvl - 2);
  }

  const wId = parseInt(document.getElementById('sel-weapon').value) || 0;
  const w = WEAPONS.at(wId) || WEAPONS.at(0);
  const wUnlocked = saveData.unlockedWeapons.includes(wId);
  document.getElementById('weapon-stats').innerText =
    `DMG: ${w.dmg} | Mag: ${w.mag} | Scope: ${w.scope} | ${wUnlocked ? 'OWNED' : 'Cost: $' + w.price}`;

  if (!saveData.weaponKills) saveData.weaponKills = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  if (!saveData.equippedCamos) saveData.equippedCamos = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

  const wKills = saveData.weaponKills[wId] || 0;
  const killsLabel = document.getElementById('mastery-kills-label');
  if (killsLabel) killsLabel.innerText = `${wKills} Kills`;

  const camoSel = document.getElementById('sel-weapon-camo');
  const nextHint = document.getElementById('mastery-next-hint');
  if (camoSel) {
    const equippedCamoId = saveData.equippedCamos[wId] || 0;
    camoSel.innerHTML = '';
    WEAPON_CAMOS.forEach(c => {
      const unlocked = wKills >= c.reqKills;
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.disabled = !unlocked;
      opt.textContent = unlocked
        ? `${c.name} (Unlocked)`
        : `${c.name} — Locked (${c.reqKills} Kills)`;
      if (c.id === equippedCamoId && unlocked) opt.selected = true;
      camoSel.appendChild(opt);
    });

    const nextLocked = WEAPON_CAMOS.find(c => wKills < c.reqKills);
    if (nextHint) {
      nextHint.innerText = nextLocked
        ? `Next Camo: ${nextLocked.name} (${nextLocked.reqKills - wKills} more kills with ${w.name})`
        : `MAX MASTERY UNLOCKED FOR ${w.name.toUpperCase()}!`;
    }
  }

  if (!saveData.unlockedScopes) saveData.unlockedScopes = new Array(1).fill(0);
  if (!saveData.unlockedGrips) saveData.unlockedGrips = new Array(1).fill(0);
  if (!saveData.unlockedMuzzles) saveData.unlockedMuzzles = new Array(1).fill(0);

  const updateAttBtn = (selId, btnId, pool, unlockedArr, equippedId) => {
    const sel = document.getElementById(selId);
    const btn = document.getElementById(btnId);
    if (!sel || !btn) return;
    const id = parseInt(sel.value) || 0;
    const cfg = pool.find(x => x.id === id) || pool.at(0);
    if (equippedId === id) {
      btn.innerText = 'Equipped';
    } else if (unlockedArr.includes(id)) {
      btn.innerText = 'Equip';
    } else {
      btn.innerText = `Buy ($${cfg.price})`;
    }
  };

  updateAttBtn('sel-scope', 'btn-buy-scope', GUN_SCOPES, saveData.unlockedScopes, saveData.equippedScope || 0);
  updateAttBtn('sel-grip', 'btn-buy-grip', GUN_GRIPS, saveData.unlockedGrips, saveData.equippedGrip || 0);
  updateAttBtn('sel-muzzle', 'btn-buy-muzzle', GUN_MUZZLES, saveData.unlockedMuzzles, saveData.equippedMuzzle || 0);

  const eqScope = GUN_SCOPES.find(s => s.id === (saveData.equippedScope || 0)) || GUN_SCOPES.at(0);
  const eqGrip = GUN_GRIPS.find(g => g.id === (saveData.equippedGrip || 0)) || GUN_GRIPS.at(0);
  const eqMuzzle = GUN_MUZZLES.find(m => m.id === (saveData.equippedMuzzle || 0)) || GUN_MUZZLES.at(0);

  const totalRecoilReduction = Math.round((1 - eqGrip.recoilMult * eqMuzzle.recoilMult) * 100);
  const statsEl = document.getElementById('gunsmith-stats');
  if (statsEl) {
    statsEl.innerText = `Recoil Control: +${totalRecoilReduction}% • Scope Zoom: +${eqScope.fovBonus}°`;
  }

  const charmSel = document.getElementById('sel-weapon-charm');
  const charmBtn = document.getElementById('btn-buy-charm');
  if (charmSel && charmBtn) {
    if (!saveData.unlockedCharms) saveData.unlockedCharms = new Array(1).fill(0);
    const currentVal = parseInt(charmSel.value) || saveData.equippedCharm || 0;
    charmSel.innerHTML = '';
    WEAPON_CHARMS.forEach(ch => {
      const owned = saveData.unlockedCharms.includes(ch.id);
      const opt = document.createElement('option');
      opt.value = ch.id;
      opt.textContent = ch.price === 0
        ? ch.name
        : `${ch.name} (${owned ? 'Owned' : '$' + ch.price})`;
      if (ch.id === currentVal) opt.selected = true;
      charmSel.appendChild(opt);
    });

    const selectedCharm = WEAPON_CHARMS.find(c => c.id === currentVal) || WEAPON_CHARMS.at(0);
    const isOwned = saveData.unlockedCharms.includes(selectedCharm.id);
    if (saveData.equippedCharm === selectedCharm.id) {
      charmBtn.innerText = `Equipped: ${selectedCharm.name}`;
    } else if (isOwned) {
      charmBtn.innerText = `Equip ${selectedCharm.name}`;
    } else {
      charmBtn.innerText = `Buy & Equip ${selectedCharm.name} ($${selectedCharm.price})`;
    }
  }

  const aTier = parseInt(document.getElementById('sel-armor').value) || 1;
  const a = ARMORS.find(x => x.tier === aTier) || ARMORS.at(0);
  const aUnlocked = saveData.unlockedArmors.includes(aTier);
  document.getElementById('armor-stats').innerText =
    `AP: ${a.ap} | Absorb: ${Math.round(a.absorb * 100)}% | ${aUnlocked ? 'OWNED' : 'Cost: $' + a.price}`;

  const sellGunSel = document.getElementById('sel-sell-gun');
  const sellGunBtn = document.getElementById('btn-sell-gun');
  if (sellGunSel && sellGunBtn) {
    const prevVal = parseInt(sellGunSel.value);
    sellGunSel.innerHTML = '';
    const sellableIds = saveData.unlockedWeapons.filter(id => id !== 0);

    if (sellableIds.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No Extra Guns to Sell';
      sellGunSel.appendChild(opt);
      sellGunBtn.disabled = true;
      sellGunBtn.style.opacity = '0.5';
    } else {
      sellableIds.forEach(id => {
        const gun = WEAPONS.at(id);
        if (!gun) return;
        const sellPrice = Math.floor(gun.price * 0.6);
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = `${gun.name} (+$${sellPrice.toLocaleString()})`;
        if (id === prevVal) opt.selected = true;
        sellGunSel.appendChild(opt);
      });
      sellGunBtn.disabled = false;
      sellGunBtn.style.opacity = '1';
    }
  }

  const q = QUESTS.at(Math.min(saveData.questIdx, QUESTS.length - 1));
  document.getElementById('quest-title').innerText = q.title;
  document.getElementById('quest-desc').innerText = q.desc;
  document.getElementById('quest-prog').innerText = `${Math.min(saveData.questKills, q.target)} / ${q.target}`;
  document.getElementById('quest-reward').innerText = `$${q.reward.toLocaleString()}`;

  const cAlert = document.getElementById('corpse-alert');
  if (saveData.corpse) {
    cAlert.style.display = 'block';
    const cMap = MAPS[saveData.corpse.mapKey];
    document.getElementById('corpse-map-name').innerText = cMap ? cMap.label : 'Ground Zero';
  } else {
    cAlert.style.display = 'none';
  }

  renderStashUI(saveData, onSave);
  renderDailyBountiesUI(saveData, onSave);
}
export function updateHUD(player, modeState, saveData) {
  const w = WEAPONS.at(player.weaponIdx) || WEAPONS.at(0);
  const a = ARMORS.find(x => x.tier === player.armorTier) || ARMORS.at(0);

  document.getElementById('hud-hp').innerText = Math.max(0, Math.ceil(player.hp));
  document.getElementById('hp-fill').style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;

  document.getElementById('hud-tier').innerText = a.tier;
  document.getElementById('hud-armor').innerText = Math.max(0, Math.ceil(player.armor));
  document.getElementById('armor-fill').style.width = `${Math.max(0, (player.armor / player.maxArmor) * 100)}%`;

  document.getElementById('stamina-fill').style.width = `${(player.stamina / player.maxStamina) * 100}%`;
  document.getElementById('hud-weapon-name').innerText = w.name;
  document.getElementById('hud-ammo').innerText = player.reloading ? 'RELOADING...' : `${player.ammo} / ${w.mag}`;

  document.getElementById('hud-hunger').innerText = Math.max(0, Math.ceil(player.hunger));
  document.getElementById('hunger-fill').style.width = `${Math.max(0, player.hunger)}%`;
  document.getElementById('hud-thirst').innerText = Math.max(0, Math.ceil(player.thirst));
  document.getElementById('thirst-fill').style.width = `${Math.max(0, player.thirst)}%`;

  document.getElementById('hud-medkits').innerText = player.medkits;
  document.getElementById('hud-plates').innerText = player.plates;
  document.getElementById('hud-food').innerText = player.food;
  document.getElementById('hud-water').innerText = player.water;
  document.getElementById('hud-pills').innerText = player.pills;
  document.getElementById('hud-stims').innerText = player.stims;

  document.getElementById('hud-frags').innerText = player.frags;
  document.getElementById('hud-smokes').innerText = player.smokes;
  document.getElementById('hud-flashes').innerText = player.flashes;
  document.getElementById('hud-fuel').innerText = player.fuelCans;

  const buffsEl = document.getElementById('hud-buffs');
  let buffHTML = '';
  if (player.painkillerTimer > 0) buffHTML += `<span class="buff-tag">PAINKILLER ${Math.ceil(player.painkillerTimer)}s</span>`;
  if (player.stimTimer > 0) buffHTML += `<span class="buff-tag stim">SJ6 STIM ${Math.ceil(player.stimTimer)}s</span>`;
  if (player.equipSuppressor) buffHTML += `<span class="buff-tag">SUPPRESSED</span>`;
  if (player.equipLaser) buffHTML += `<span class="buff-tag">LASER</span>`;
  buffsEl.innerHTML = buffHTML;

  const thermEl = document.getElementById('hud-thermal-status');
  if (player.hasThermal || saveData.hasThermal) {
    thermEl.style.display = 'block';
    thermEl.innerText = player.thermalActive ? 'T-7 THERMAL: ACTIVE [Press T]' : 'T-7 THERMAL: OFF [Press T]';
    thermEl.className = player.thermalActive ? 'thermal-indicator active' : 'thermal-indicator';
  } else {
    thermEl.style.display = 'none';
  }

  const abBox = document.getElementById('hud-ability-box');
  if (modeState.mode === 'tactical5v5') {
    const roleCfg = AGENT_ROLES[modeState.agentRole] || AGENT_ROLES.duelist;
    abBox.style.display = 'block';
    document.getElementById('hud-ability-name').innerText = roleCfg.name;
    const cdEl = document.getElementById('hud-ability-cd');
    if (player.abilityCooldown <= 0) {
      cdEl.innerText = 'READY';
      abBox.className = 'ability-indicator';
    } else {
      cdEl.innerText = `${Math.ceil(player.abilityCooldown)}s`;
      abBox.className = 'ability-indicator cooldown';
    }
  } else {
    abBox.style.display = 'none';
  }

  const modeNames = {
    bunker: 'BUNKER BASE',
    extraction: 'EXTRACTION',
    battleroyale: 'DUCKNITE BR',
    tactical5v5: '5v5 SPIKE'
  };
  document.getElementById('hud-mode-label').innerText = modeNames[modeState.mode] || 'RAID';

  const lootVal = player.backpack.reduce((acc, it) => acc + it.val, 0);
  document.getElementById('hud-extra-stat').innerText =
    modeState.mode === 'tactical5v5' ? `${modeState.creds} Creds` : `$${(lootVal + player.killCash).toLocaleString()}`;
}

export function addLootFeed(text) {
  const feed = document.getElementById('loot-feed');
  const div = document.createElement('div');
  div.innerText = `+ ${text}`;
  feed.prepend(div);
  if (feed.children.length > 5) feed.lastChild.remove();
  setTimeout(() => { if (div.parentNode) div.remove(); }, 4500);
}

export function addKillfeedBanner(killer, weaponName, victim, isFriendly = false) {
  const kf = document.getElementById('killfeed');
  if (!kf) return;

  const div = document.createElement('div');
  div.className = `kf-banner ${isFriendly ? 'friendly' : ''}`;
  div.innerHTML = `<span class="kf-killer">${killer}</span><span class="kf-weapon">[${weaponName}]</span><span class="kf-victim">${victim}</span>`;

  kf.prepend(div);
  while (kf.children.length > 5) {
    kf.lastChild.remove();
  }

  setTimeout(() => {
    div.style.opacity = '0';
    setTimeout(() => { if (div.parentNode) div.remove(); }, 350);
  }, 4500);
}

export function drawRadar(player, aimAngle, aiDucks, chests, zones, vehicles = new Array(), activePings = new Array(), remoteDucks = new Array(), bunkerStations = new Array()) {
  const canvas = document.getElementById('radar');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 170, 170);

  const cx = 85;
  const cy = 85;
  const scale = 1.65;

  ctx.strokeStyle = 'rgba(0, 229, 255, 0.16)';
  ctx.lineWidth = 1;
  new Array(28, 56, 82).forEach(r => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  bunkerStations.forEach(st => {
    const rx = cx + (st.pos.x - player.pos.x) * scale;
    const rz = cy + (st.pos.z - player.pos.z) * scale;
    if (Math.hypot(rx - cx, rz - cy) < 80) {
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(rx - 3.5, rz - 3.5, 7, 7);
    }
  });

  zones.forEach(z => {
    const rx = cx + (z.x - player.pos.x) * scale;
    const rz = cy + (z.z - player.pos.z) * scale;
    if (Math.hypot(rx - cx, rz - cy) < 82) {
      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.arc(rx, rz, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  chests.forEach(c => {
    if (c.opened) return;
    const rx = cx + (c.pos.x - player.pos.x) * scale;
    const rz = cy + (c.pos.z - player.pos.z) * scale;
    if (Math.hypot(rx - cx, rz - cy) < 80) {
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(rx - 2.5, rz - 2.5, 5, 5);
    }
  });

  vehicles.forEach(v => {
    if (v.hp <= 0) return;
    const rx = cx + (v.pos.x - player.pos.x) * scale;
    const rz = cy + (v.pos.z - player.pos.z) * scale;
    if (Math.hypot(rx - cx, rz - cy) < 80) {
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(rx - 3.5, rz - 2.5, 7, 5);
    }
  });

  aiDucks.forEach(en => {
    if (en.hp <= 0) return;
    const isFriendly = en.team === 'blue';
    if (!isFriendly && !en.revealed && en.pos.distanceTo(player.pos) > 38) return;

    const rx = cx + (en.pos.x - player.pos.x) * scale;
    const rz = cy + (en.pos.z - player.pos.z) * scale;
    if (Math.hypot(rx - cx, rz - cy) < 80) {
      ctx.fillStyle = isFriendly ? '#2ecc71' : en.revealed ? '#00e5ff' : en.isBoss ? '#ff1744' : '#ff5252';
      ctx.beginPath();
      ctx.arc(rx, rz, en.isBoss || en.revealed ? 4.5 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  remoteDucks.forEach(rd => {
    if (rd.hp <= 0) return;
    const rx = cx + (rd.pos.x - player.pos.x) * scale;
    const rz = cy + (rd.pos.z - player.pos.z) * scale;
    if (Math.hypot(rx - cx, rz - cy) < 80) {
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(rx, rz, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  activePings.forEach(p => {
    const rx = cx + (p.pos.x - player.pos.x) * scale;
    const rz = cy + (p.pos.z - player.pos.z) * scale;
    const dist = Math.hypot(rx - cx, rz - cy);
    const clampedR = Math.min(78, dist);
    const ang = Math.atan2(rz - cy, rx - cx);
    const px = cx + Math.cos(ang) * clampedR;
    const py = cy + Math.sin(ang) * clampedR;

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(px, py - 5);
    ctx.lineTo(px + 5, py);
    ctx.lineTo(px, py + 5);
    ctx.lineTo(px - 5, py);
    ctx.closePath();
    ctx.fill();
  });

  ctx.fillStyle = '#00e5ff';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.sin(aimAngle) * 14, cy + Math.cos(aimAngle) * 14);
  ctx.stroke();
}
