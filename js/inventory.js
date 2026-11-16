import { WEAPONS } from './config.js';
import { playSound } from './storage.js';
import { addLootFeed } from './ui.js';

export function addItemToBackpack(player, item) {
  if (player.backpack.length >= 10) {
    addLootFeed("Backpack Full (10/10)! Press [Tab] to drop or use items.");
    playSound(160, 'sawtooth', 0.12, 0.08);
    return false;
  }
  player.backpack.push({ ...item });
  addLootFeed(`Looted: ${item.name} ($${item.val})`);
  return true;
}

export function renderBackpackUI(player, saveData, onUpdate) {
  const grid = document.getElementById('backpack-grid');
  document.getElementById('bp-slots').innerText = player.backpack.length;
  const totalVal = player.backpack.reduce((acc, it) => acc + it.val, 0);
  document.getElementById('bp-value').innerText = totalVal.toLocaleString();

  grid.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const slot = document.createElement('div');
    const item = player.backpack[i];
    if (item) {
      slot.className = `grid-slot ${item.type === 'rare' ? 'rare' : item.type === 'weapon' ? 'weapon' : ''}`;
      slot.innerHTML = `<strong>${item.name}</strong><span>$${item.val}</span>`;
      slot.onclick = () => {
        useBackpackItem(player, i, saveData);
        renderBackpackUI(player, saveData, onUpdate);
        if (onUpdate) onUpdate();
      };
      slot.oncontextmenu = (e) => {
        e.preventDefault();
        addLootFeed(`Dropped ${item.name}`);
        player.backpack.splice(i, 1);
        renderBackpackUI(player, saveData, onUpdate);
        if (onUpdate) onUpdate();
      };
    } else {
      slot.className = 'grid-slot';
      slot.innerHTML = `<span style="opacity:0.35">Empty</span>`;
    }
    grid.appendChild(slot);
  }
}
export function useBackpackItem(player, index, saveData) {
  const item = player.backpack[index];
  if (!item) return;

  if (item.type === 'medkit') {
    if (player.hp >= player.maxHp) return addLootFeed("Health already full!");
    player.hp = Math.min(player.maxHp, player.hp + 45);
    player.backpack.splice(index, 1);
    playSound(520, 'sine', 0.2, 0.12);
    addLootFeed("Used Field Medkit (+45 HP)");
  } else if (item.type === 'plate') {
    if (player.armor >= player.maxArmor) return addLootFeed("Armor already full!");
    player.armor = Math.min(player.maxArmor, player.armor + 45);
    player.backpack.splice(index, 1);
    playSound(400, 'triangle', 0.15, 0.12);
    addLootFeed("Applied Armor Plate (+45 AP)");
  } else if (item.type === 'food') {
    player.hunger = Math.min(100, player.hunger + 40);
    player.hp = Math.min(player.maxHp, player.hp + 10);
    player.backpack.splice(index, 1);
    playSound(480, 'sine', 0.15, 0.1);
    addLootFeed("Ate Canned Duck Peas (+40 Energy)");
  } else if (item.type === 'water') {
    player.thirst = Math.min(100, player.thirst + 45);
    player.stamina = Math.min(player.maxStamina, player.stamina + 30);
    player.backpack.splice(index, 1);
    playSound(560, 'sine', 0.15, 0.1);
    addLootFeed("Drank Purified Water (+45 Hydration)");
  } else if (item.type === 'pills') {
    player.painkillerTimer = 35.0;
    player.hp = Math.min(player.maxHp, player.hp + 15);
    player.backpack.splice(index, 1);
    playSound(600, 'triangle', 0.18, 0.12);
    addLootFeed("Took Analgin Painkillers (35s Regen + Sprint)");
  } else if (item.type === 'stim') {
    player.stimTimer = 25.0;
    player.stamina = player.maxStamina;
    player.backpack.splice(index, 1);
    playSound(740, 'sine', 0.2, 0.12);
    addLootFeed("Injected SJ6 Stim (25s Speed & Stamina Boost!)");
  } else if (item.type === 'frag') {
    player.frags++;
    player.backpack.splice(index, 1);
    playSound(420, 'triangle', 0.12, 0.1);
    addLootFeed("Packed F-1 Frag Grenade [Press G]");
  } else if (item.type === 'smoke') {
    player.smokes++;
    player.backpack.splice(index, 1);
    playSound(420, 'triangle', 0.12, 0.1);
    addLootFeed("Packed M18 Smoke Grenade [Press V]");
  } else if (item.type === 'flash') {
    player.flashes++;
    player.backpack.splice(index, 1);
    playSound(420, 'triangle', 0.12, 0.1);
    addLootFeed("Packed M84 Flashbang [Press C]");
  } else if (item.type === 'fuel') {
    player.fuelCans++;
    player.backpack.splice(index, 1);
    playSound(360, 'sine', 0.15, 0.1);
    addLootFeed("Packed Fuel Jerrycan [Press R inside Vehicle]");
  } else if (item.type === 'thermal') {
    player.hasThermal = true;
    saveData.hasThermal = true;
    player.backpack.splice(index, 1);
    playSound(780, 'sine', 0.2, 0.12);
    addLootFeed("Equipped T-7 Thermal Goggles! Press [T] to toggle.");
  } else if (item.type === 'suppressor') {
    player.equipSuppressor = true;
    saveData.hasSuppressor = true;
    saveData.equipSuppressor = true;
    player.backpack.splice(index, 1);
    playSound(640, 'sine', 0.15, 0.12);
    addLootFeed("Attached Tactical Suppressor to Primary Weapon!");
  } else if (item.type === 'laser') {
    player.equipLaser = true;
    saveData.hasLaser = true;
    saveData.equipLaser = true;
    player.backpack.splice(index, 1);
    playSound(680, 'sine', 0.15, 0.12);
    addLootFeed("Attached PEQ-15 Laser Sight (-45% Hipfire Spread)!");
  } else if (item.type === 'weapon') {
    const w = WEAPONS[item.weaponId];
    player.weaponIdx = item.weaponId;
    player.ammo = w.mag;
    if (!saveData.unlockedWeapons.includes(item.weaponId)) {
      saveData.unlockedWeapons.push(item.weaponId);
    }
    player.backpack.splice(index, 1);
    playSound(300, 'square', 0.15, 0.1);
    addLootFeed(`Equipped ${w.name} (Unlocked in Armory!)`);
  } else {
    addLootFeed(`${item.name}: Extract to sell for $${item.val}!`);
  }
}
export function renderStashUI(saveData, onSave) {
  const grid = document.getElementById('stash-grid');
  document.getElementById('stash-count').innerText = saveData.stash.length;
  grid.innerHTML = '';

  for (let i = 0; i < 12; i++) {
    const slot = document.createElement('div');
    const item = saveData.stash[i];
    if (item) {
      slot.className = `grid-slot ${item.type === 'rare' ? 'rare' : item.type === 'weapon' ? 'weapon' : ''}`;
      slot.innerHTML = `<strong>${item.name}</strong><span>Sell: $${item.val}</span>`;
      slot.onclick = () => {
        saveData.cash += item.val;
        saveData.stash.splice(i, 1);
        playSound(620, 'sine', 0.1, 0.1);
        onSave();
      };
    } else {
      slot.className = 'grid-slot';
      slot.innerHTML = `<span style="opacity:0.3">Empty</span>`;
    }
    grid.appendChild(slot);
  }
}

export function sellAllStash(saveData, onSave) {
  if (saveData.stash.length === 0) return;
  const sum = saveData.stash.reduce((acc, it) => acc + it.val, 0);
  saveData.cash += sum;
  saveData.stash = [];
  playSound(750, 'sine', 0.2, 0.12);
  onSave();
}
