import {
  ARMORS,
  WEAPONS,
  WEAPON_CAMOS,
  WEAPON_CHARMS,
  GUN_SCOPES,
  GUN_GRIPS,
  GUN_MUZZLES
} from './config.js';

let cachedDuckTemplate = null;

export function preloadDuckGLTF(url = './assets/duck.glb') {
  return new Promise((resolve) => {
    if (!THREE.GLTFLoader) return resolve(false);
    const loader = new THREE.GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        cachedDuckTemplate = gltf.scene;
        resolve(true);
      },
      undefined,
      () => resolve(false)
    );
  });
}

function buildSpiderBot(group) {
  const hullMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.3 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.4, 12), hullMat);
  core.position.y = 0.45;
  core.castShadow = true;
  group.add(core);

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), eyeMat);
  eye.position.set(0, 0.5, 0.52);
  group.add(eye);

  const legAngles = [0.5, 1.3, 2.1, -0.5, -1.3, -2.1];
  legAngles.forEach(ang => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), hullMat);
    leg.position.set(Math.sin(ang) * 0.75, 0.25, Math.cos(ang) * 0.75);
    leg.rotation.z = Math.sin(ang) * 0.4;
    leg.castShadow = true;
    group.add(leg);
  });
}

function buildProceduralDuck(group, featherHex, armorCfg, weaponCfg, teamColor, attachments = {}) {
  const featherMat = new THREE.MeshStandardMaterial({ color: featherHex, roughness: 0.62 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xff9800, roughness: 0.4 });
  const armorMat = new THREE.MeshStandardMaterial({
    color: teamColor !== null ? teamColor : armorCfg.color,
    metalness: 0.5,
    roughness: 0.38
  });

  // Webbed Orange Feet
  [-0.28, 0.28].forEach(fx => {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.42), beakMat);
    foot.position.set(fx, 0.05, 0.12);
    foot.castShadow = true;
    group.add(foot);
  });

  // Torso & Tail Feathers
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.86, 1.16), featherMat);
  body.position.y = 0.65;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 0.35), featherMat);
  tail.position.set(0, 0.85, -0.68);
  tail.rotation.x = 0.4;
  group.add(tail);

  // Folded Left & Right Wings
  [-0.54, 0.54].forEach(wx => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.82), featherMat);
    wing.position.set(wx, 0.68, -0.05);
    wing.castShadow = true;
    group.add(wing);
  });

  // Tactical Plate Carrier Vest & Pouches
  const vest = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.6, 0.94), armorMat);
  vest.position.y = 0.72;
  vest.castShadow = true;
  group.add(vest);

  if (attachments.isGuard) {
    [-0.62, 0.62].forEach(sx => {
      const pauldron = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.34, 0.56),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7, roughness: 0.3 })
      );
      pauldron.position.set(sx, 0.92, 0);
      pauldron.castShadow = true;
      group.add(pauldron);
    });
  }

  [-0.26, 0, 0.26].forEach(px => {
    const pouch = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.26, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x1c252b, roughness: 0.7 })
    );
    pouch.position.set(px, 0.66, 0.52);
    group.add(pouch);
  });

  // Tactical Backpack
  const bag = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.68, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 })
  );
  bag.position.set(0, 0.76, -0.68);
  bag.castShadow = true;
  group.add(bag);

  // Head, Helmet & Glowing Tactical Visor
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.68, 0.68), featherMat);
  head.position.set(0, 1.38, 0.15);
  head.castShadow = true;
  group.add(head);

  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.34, 0.78), armorMat);
  helmet.position.set(0, 1.65, 0.15);
  helmet.castShadow = true;
  group.add(helmet);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.16, 0.12),
    new THREE.MeshBasicMaterial({ color: teamColor === 0xd32f2f || attachments.isGuard ? 0xff1744 : 0x00e5ff })
  );
  visor.position.set(0, 1.48, 0.48);
  group.add(visor);

  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.48), beakMat);
  beak.position.set(0, 1.3, 0.66);
  group.add(beak);

  // Detailed Weapon Assembly (Mastery Camo, Stock, Mag, Scope, Grip, Muzzle & Charms)
  const camoCfg = WEAPON_CAMOS.at(attachments.camoId || 0) || WEAPON_CAMOS.at(0);
  const gunMat = new THREE.MeshStandardMaterial({
    color: camoCfg.color,
    metalness: camoCfg.metalness,
    roughness: camoCfg.roughness,
    emissive: camoCfg.emissive
  });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x141414, metalness: 0.85, roughness: 0.3 });

  const gunGroup = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, weaponCfg.barrelLen), gunMat);
  receiver.castShadow = true;
  gunGroup.add(receiver);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.38), darkMetal);
  stock.position.set(0, -0.03, -weaponCfg.barrelLen / 2 - 0.15);
  gunGroup.add(stock);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 0.16), darkMetal);
  mag.position.set(0, -0.22, 0.08);
  mag.rotation.x = 0.22;
  gunGroup.add(mag);

  const scopeCfg = GUN_SCOPES.find(s => s.id === (attachments.scopeId || 0)) || GUN_SCOPES.at(0);
  const scope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055 * Math.min(1.3, scopeCfg.scale), 0.055 * Math.min(1.3, scopeCfg.scale), 0.34 * scopeCfg.scale, 10),
    gunMat
  );
  scope.rotation.x = Math.PI / 2;
  scope.position.set(0, 0.16, -0.04);
  gunGroup.add(scope);

  const gripCfg = GUN_GRIPS.find(g => g.id === (attachments.gripId || 0)) || GUN_GRIPS.at(0);
  if (gripCfg.style !== 'none') {
    const gripMesh = new THREE.Mesh(
      gripCfg.style === 'angled'
        ? new THREE.BoxGeometry(0.08, 0.14, 0.24)
        : new THREE.CylinderGeometry(0.045, 0.055, gripCfg.style === 'heavy' ? 0.28 : 0.22, 8),
      darkMetal
    );
    if (gripCfg.style === 'angled') gripMesh.rotation.x = 0.45;
    gripMesh.position.set(0, -0.16, weaponCfg.barrelLen * 0.25);
    gunGroup.add(gripMesh);
  }

  const muzzleCfg = GUN_MUZZLES.find(m => m.id === (attachments.muzzleId || 0)) || GUN_MUZZLES.at(0);
  if (muzzleCfg.style !== 'none' || attachments.suppressor) {
    const isSup = muzzleCfg.style === 'suppressor' || attachments.suppressor;
    const muzzleMesh = new THREE.Mesh(
      isSup
        ? new THREE.CylinderGeometry(0.065, 0.065, 0.45, 12)
        : new THREE.BoxGeometry(0.11, 0.11, 0.22),
      darkMetal
    );
    if (isSup) muzzleMesh.rotation.x = Math.PI / 2;
    muzzleMesh.position.set(0, 0, weaponCfg.barrelLen / 2 + (isSup ? 0.2 : 0.08));
    gunGroup.add(muzzleMesh);
  }

  if (attachments.laser) {
    const peqBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.5 })
    );
    peqBox.position.set(0.09, 0.05, 0.2);
    gunGroup.add(peqBox);

    const laserLens = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff1744 })
    );
    laserLens.position.set(0.09, 0.05, 0.32);
    gunGroup.add(laserLens);
  }

  let charmPivot = null;
  const charmCfg = WEAPON_CHARMS.find(c => c.id === (attachments.charmId || 0));
  if (charmCfg && charmCfg.shape !== 'none') {
    charmPivot = new THREE.Group();
    charmPivot.position.set(0.1, -0.05, -0.15);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.035, 0.008, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0xcfd8dc, metalness: 0.9, roughness: 0.2 })
    );
    ring.position.y = -0.03;
    charmPivot.add(ring);

    const charmMat = new THREE.MeshStandardMaterial({
      color: charmCfg.color,
      metalness: charmCfg.shape === 'duck' || charmCfg.shape === 'crown' ? 0.9 : 0.45,
      roughness: 0.25,
      emissive: charmCfg.shape === 'cube' ? 0x006064 : 0x000000
    });

    if (charmCfg.shape === 'duck') {
      const miniBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.11), charmMat);
      miniBody.position.y = -0.11;
      const miniHead = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.065), charmMat);
      miniHead.position.set(0, -0.06, 0.02);
      const miniBeak = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.02, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xff9800 })
      );
      miniBeak.position.set(0, -0.065, 0.06);
      charmPivot.add(miniBody, miniHead, miniBeak);
    } else if (charmCfg.shape === 'frag') {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), charmMat);
      body.scale.set(0.9, 1.25, 0.9);
      body.position.y = -0.11;
      charmPivot.add(body);
    } else if (charmCfg.shape === 'cube') {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.085, 0.085), charmMat);
      cube.rotation.set(0.6, 0.6, 0);
      cube.position.y = -0.11;
      charmPivot.add(cube);
    } else if (charmCfg.shape === 'crown') {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.045, 0.07, 6), charmMat);
      crown.position.y = -0.11;
      charmPivot.add(crown);
    }

    gunGroup.add(charmPivot);
  }

  gunGroup.position.set(0.58, 0.82, 0.55);
  group.add(gunGroup);
  return { gunGroup, charmPivot };
}
export function createDuckModel(
  featherHex = 0xffd54f,
  armorTier = 1,
  weaponIdx = 0,
  teamColor = null,
  enemyType = "scav",
  attachments = {}
) {
  const group = new THREE.Group();
  let gunGroup = null;
  let charmPivot = null;

  if (enemyType === "spider") {
    buildSpiderBot(group);
    return { group, gunGroup: null, charmPivot: null };
  }

  const armorCfg = ARMORS.find(a => a.tier === armorTier) || ARMORS.at(0);
  const weaponCfg = WEAPONS.at(weaponIdx) || WEAPONS.at(0);
  const mergedAttachments = { ...attachments, isGuard: enemyType === 'guard' };

  if (cachedDuckTemplate) {
    const clone = cachedDuckTemplate.clone();
    clone.scale.set(1.1, 1.1, 1.1);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          child.material = child.material.clone();
          child.material.color.setHex(featherHex);
        }
      }
    });
    group.add(clone);
  } else {
    const built = buildProceduralDuck(group, featherHex, armorCfg, weaponCfg, teamColor, mergedAttachments);
    gunGroup = built.gunGroup;
    charmPivot = built.charmPivot;
  }

  return { group, gunGroup, charmPivot };
}

export function createChestMesh(isRare = false) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.85, 0.9),
    new THREE.MeshStandardMaterial({
      color: isRare ? 0xd4af37 : 0x6d4c41,
      metalness: isRare ? 0.6 : 0.1,
      roughness: 0.4
    })
  );
  mesh.castShadow = true;
  return mesh;
}

export function createWeaponCrateMesh() {
  const group = new THREE.Group();

  const caseBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 0.72, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x33691e, metalness: 0.45, roughness: 0.45 })
  );
  caseBody.position.y = 0.36;
  caseBody.castShadow = true;
  caseBody.receiveShadow = true;
  group.add(caseBody);

  const lidTrim = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.14, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x1b3b10, metalness: 0.6, roughness: 0.35 })
  );
  lidTrim.position.y = 0.68;
  group.add(lidTrim);

  const latch = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.18, 0.98),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff })
  );
  latch.position.y = 0.64;
  group.add(latch);

  return group;
}

export function createCorpseMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.45, 1.3),
    new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.8 })
  );
  body.position.y = 0.25;
  group.add(body);
  return group;
}

export function createVehicleModel(type = "buggy") {
  const group = new THREE.Group();
  const isTruck = type === "truck";

  const bodyColor = isTruck ? 0x33691e : 0xd84315;
  const w = isTruck ? 2.4 : 2.1;
  const h = isTruck ? 0.95 : 0.65;
  const d = isTruck ? 4.4 : 3.6;

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: bodyColor, metalness: 0.4, roughness: 0.45 })
  );
  chassis.position.y = 0.65;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.86, isTruck ? 0.85 : 0.65, isTruck ? 1.8 : 1.5),
    new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.5, roughness: 0.3 })
  );
  cabin.position.set(0, isTruck ? 1.45 : 1.2, isTruck ? 0.4 : -0.15);
  cabin.castShadow = true;
  group.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.36, 14);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 });
  const wheelOffsets = [
    [-w / 2 - 0.12, 0.45, d * 0.32],
    [w / 2 + 0.12, 0.45, d * 0.32],
    [-w / 2 - 0.12, 0.45, -d * 0.32],
    [w / 2 + 0.12, 0.45, -d * 0.32]
  ];
  const wheels = wheelOffsets.map(([wx, wy, wz]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    group.add(wheel);
    return wheel;
  });

  const headlights = [];
  [-w * 0.32, w * 0.32].forEach(lx => {
    const bulb = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.18, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xfff59d })
    );
    bulb.position.set(lx, 0.68, d / 2 + 0.02);
    group.add(bulb);
    headlights.push(bulb);
  });

  const spotLight = new THREE.SpotLight(0xfff9c4, 2.2, 34, Math.PI / 5, 0.45, 1);
  spotLight.position.set(0, 1.1, d / 2);
  spotLight.target.position.set(0, 0.2, d / 2 + 12);
  group.add(spotLight);
  group.add(spotLight.target);

  return { group, wheels, headlights, spotLight, w, d };
}

export function createPropModel(type = "barrel") {
  const group = new THREE.Group();
  if (type === "barrel") {
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 1.25, 14),
      new THREE.MeshStandardMaterial({ color: 0xc62828, metalness: 0.45, roughness: 0.4 })
    );
    cyl.position.y = 0.625;
    cyl.castShadow = true;
    cyl.receiveShadow = true;
    group.add(cyl);

    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.48, 0.22, 14),
      new THREE.MeshBasicMaterial({ color: 0xf7ff19 })
    );
    stripe.position.y = 0.65;
    group.add(stripe);
  } else {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 1.15, 1.15),
      new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.85 })
    );
    box.position.y = 0.575;
    box.castShadow = true;
    box.receiveShadow = true;
    group.add(box);
  }
  return { group };
}
export function createBunkerStationModel(type = "gym") {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 0.3, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.6, roughness: 0.4 })
  );
  base.position.y = 0.15;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  if (type === "gym") {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, metalness: 0.8, roughness: 0.25 });
    [-0.9, 0.9].forEach(px => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.9, 0.14), postMat);
      post.position.set(px, 1.05, -0.35);
      group.add(post);
    });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.5, 10), postMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.75, -0.35);
    group.add(bar);

    [-1.1, 1.1].forEach(wx => {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.12, 16),
        new THREE.MeshStandardMaterial({ color: 0xff5252, roughness: 0.4 })
      );
      plate.rotation.z = Math.PI / 2;
      plate.position.set(wx, 1.75, -0.35);
      group.add(plate);
    });
  } else if (type === "bench") {
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.85, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7 })
    );
    table.position.y = 0.65;
    group.add(table);

    const lamp = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.15, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xf7ff19 })
    );
    lamp.position.set(0, 1.85, -0.2);
    group.add(lamp);
  } else if (type === "medic") {
    const cabinet = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.7, 1.0),
      new THREE.MeshStandardMaterial({ color: 0xeceff1, roughness: 0.3 })
    );
    cabinet.position.y = 1.05;
    group.add(cabinet);

    const crossMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.2, 0.08), crossMat);
    crossH.position.set(0, 1.25, 0.52);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.65, 0.08), crossMat);
    crossV.position.set(0, 1.25, 0.52);
    group.add(crossH, crossV);
  }
  return { group };
}

export function createTargetDummyModel(isArmored = false) {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.65, 0.16, 16),
    new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.7, roughness: 0.4 })
  );
  base.position.y = 0.08;
  base.castShadow = true;
  group.add(base);

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.85, 8),
    new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 })
  );
  post.position.y = 0.5;
  group.add(post);

  const torsoMat = new THREE.MeshStandardMaterial({
    color: isArmored ? 0x1565c0 : 0xffb300,
    roughness: 0.5,
    metalness: isArmored ? 0.5 : 0.1
  });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.32), torsoMat);
  torso.position.y = 1.1;
  torso.castShadow = true;
  group.add(torso);

  const bullseye = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.35, 16),
    new THREE.MeshBasicMaterial({ color: 0xff1744 })
  );
  bullseye.rotation.x = Math.PI / 2;
  bullseye.position.set(0, 1.12, 0);
  group.add(bullseye);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.32), torsoMat);
  head.position.set(0, 1.82, 0);
  head.castShadow = true;
  group.add(head);

  const beak = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.16, 0.36),
    new THREE.MeshStandardMaterial({ color: 0xff6f00 })
  );
  beak.position.set(0, 1.76, 0.22);
  group.add(beak);

  return { group };
}

export function createWeaponRackModel() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.25, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x1c252b, metalness: 0.7, roughness: 0.4 })
  );
  base.position.y = 0.125;
  base.castShadow = true;
  group.add(base);

  const backBoard = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 2.2, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x263238, metalness: 0.5, roughness: 0.5 })
  );
  backBoard.position.set(0, 1.2, -0.35);
  group.add(backBoard);

  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(3.05, 0.08, 0.2),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff })
  );
  trim.position.set(0, 2.32, -0.35);
  group.add(trim);

  const gunMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.85, roughness: 0.25 });
  const stockMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.7 });

  [-0.95, 0, 0.95].forEach((gx, idx) => {
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.35 + idx * 0.12, 0.16), gunMat);
    barrel.position.set(gx, 1.25, -0.2);
    group.add(barrel);

    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.22), stockMat);
    stock.position.set(gx, 0.55, -0.18);
    group.add(stock);
  });

  return { group };
}

export function createHoloTableModel(mapKey = 'ground_zero') {
  const group = new THREE.Group();
  const holoColors = {
    ground_zero: 0x00e5ff,
    warehouse: 0xff9800,
    farm: 0x76ff03,
    jaylab: 0x40c4ff,
    storm_area: 0xff1744
  };
  const holoHex = holoColors[mapKey] || 0x00e5ff;

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.65, 0.95, 24),
    new THREE.MeshStandardMaterial({ color: 0x1c252b, metalness: 0.7, roughness: 0.35 })
  );
  pedestal.position.y = 0.475;
  group.add(pedestal);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.08, 8, 28),
    new THREE.MeshBasicMaterial({ color: holoHex })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.96;
  group.add(rim);

  const holoDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(1.32, 1.32, 0.06, 24),
    new THREE.MeshBasicMaterial({ color: holoHex, transparent: true, opacity: 0.45 })
  );
  holoDisc.position.y = 0.98;
  group.add(holoDisc);

  const holoGroup = new THREE.Group();
  holoGroup.position.y = 1.25;

  const wireMat = new THREE.MeshBasicMaterial({ color: holoHex, wireframe: true, transparent: true, opacity: 0.85 });
  const solidMat = new THREE.MeshBasicMaterial({ color: holoHex, transparent: true, opacity: 0.35 });

  const layouts = {
    ground_zero: [[-0.4, -0.3, 0.4, 0.35, 0.4], [0.45, 0.2, 0.35, 0.5, 0.35], [0, -0.55, 0.6, 0.25, 0.25]],
    warehouse: [[-0.45, 0, 0.28, 0.45, 0.85], [0.45, 0, 0.28, 0.45, 0.85], [0, -0.45, 0.5, 0.3, 0.25]],
    farm: [[-0.5, -0.2, 0.5, 0.4, 0.35], [0.5, 0.25, 0.45, 0.35, 0.35], [0, 0.4, 0.25, 0.2, 0.25]],
    jaylab: [[-0.4, -0.4, 0.35, 0.55, 0.35], [0.4, -0.4, 0.35, 0.55, 0.35], [-0.4, 0.4, 0.35, 0.55, 0.35], [0.4, 0.4, 0.35, 0.55, 0.35]],
    storm_area: [[0, 0, 0.45, 0.75, 0.45], [-0.55, 0.3, 0.3, 0.4, 0.3], [0.55, -0.3, 0.3, 0.4, 0.3]]
  };

  (layouts[mapKey] || layouts.ground_zero).forEach(([bx, bz, bw, bh, bd]) => {
    const miniSolid = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), solidMat);
    miniSolid.position.set(bx, bh / 2, bz);
    const miniWire = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.02, bh + 0.02, bd + 0.02), wireMat);
    miniWire.position.set(bx, bh / 2, bz);
    holoGroup.add(miniSolid, miniWire);
  });

  group.add(holoGroup);
  return { group, holoGroup };
}

export function createBattleBusModel() {
  const group = new THREE.Group();

  const busBody = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 1.8, 6.2),
    new THREE.MeshStandardMaterial({ color: 0x1565c0, metalness: 0.5, roughness: 0.35 })
  );
  busBody.position.y = 1.1;
  busBody.castShadow = true;
  group.add(busBody);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.68, 0.25, 6.26),
    new THREE.MeshBasicMaterial({ color: 0xf7ff19 })
  );
  stripe.position.y = 1.05;
  group.add(stripe);

  const windows = new THREE.Mesh(
    new THREE.BoxGeometry(2.65, 0.55, 5.2),
    new THREE.MeshBasicMaterial({ color: 0x80deea })
  );
  windows.position.y = 1.55;
  group.add(windows);

  const balloon = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 18, 16),
    new THREE.MeshStandardMaterial({ color: 0xffb300, roughness: 0.45 })
  );
  balloon.scale.set(1.0, 1.25, 1.0);
  balloon.position.y = 6.2;
  group.add(balloon);

  [[-0.9, 1.5], [0.9, 1.5], [-0.9, -1.5], [0.9, -1.5]].forEach(([sx, sz]) => {
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x263238 })
    );
    strut.position.set(sx, 3.4, sz);
    group.add(strut);
  });

  const thruster = new THREE.Mesh(
    new THREE.ConeGeometry(0.65, 1.8, 10),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.85 })
  );
  thruster.rotation.x = -Math.PI / 2;
  thruster.position.set(0, 1.0, -3.9);
  group.add(thruster);

  return { group };
}

export function createSceneryProp(type = 'tree') {
  const group = new THREE.Group();
  let foliageGroup = null;

  if (type === 'tree') {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.48, 2.5, 9),
      new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.92 })
    );
    trunk.position.y = 1.25;
    trunk.castShadow = true;
    group.add(trunk);

    foliageGroup = new THREE.Group();
    foliageGroup.position.y = 2.0;

    const tiers = [
      { y: 0.5, r: 2.05, h: 2.1, col: 0x1b5e20 },
      { y: 1.6, r: 1.65, h: 1.9, col: 0x2e7d32 },
      { y: 2.6, r: 1.2, h: 1.7, col: 0x388e3c },
      { y: 3.5, r: 0.72, h: 1.4, col: 0x558b2f }
    ];
    tiers.forEach(t => {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(t.r, t.h, 9),
        new THREE.MeshStandardMaterial({ color: t.col, roughness: 0.78 })
      );
      cone.position.y = t.y;
      cone.rotation.y = Math.random() * Math.PI;
      cone.castShadow = true;
      foliageGroup.add(cone);
    });
    group.add(foliageGroup);
} else if (type === 'oak') {
const trunk = new THREE.Mesh(
new THREE.CylinderGeometry(0.3, 0.52, 2.6, 8),
new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 })
);
trunk.position.y = 1.3;
trunk.castShadow = true;
group.add(trunk);
foliageGroup = new THREE.Group();
foliageGroup.position.y = 2.2;
const leafMat = new THREE.MeshStandardMaterial({ color: 0x33691e, roughness: 0.75 });
const lightLeafMat = new THREE.MeshStandardMaterial({ color: 0x689f38, roughness: 0.75 });
[
[0, 1.2, 0, 1.85, leafMat],
[-0.95, 0.7, 0.65, 1.3, leafMat],
[0.95, 0.8, -0.55, 1.35, lightLeafMat],
[0, 1.9, 0.2, 1.25, lightLeafMat]
].forEach(([lx, ly, lz, rad, mat]) => {
const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(rad, 1), mat);
puff.position.set(lx, ly, lz);
puff.castShadow = true;
foliageGroup.add(puff);
});
group.add(foliageGroup);
} else if (type === 'grass_tuft') {
foliageGroup = group;
const bladeMat = new THREE.MeshStandardMaterial({
color: Math.random() > 0.4 ? 0x558b2f : 0x7cb342,
roughness: 0.8,
side: THREE.DoubleSide
});
for (let i = 0; i < 4; i++) {
const blade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.55 + Math.random() * 0.25, 4), bladeMat);
blade.position.set((Math.random() - 0.5) * 0.45, 0.28, (Math.random() - 0.5) * 0.45);
blade.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.4);
group.add(blade);
}
} else if (type === 'rock') {
const rock = new THREE.Mesh(
new THREE.DodecahedronGeometry(1.15, 1),
new THREE.MeshStandardMaterial({ color: 0x607d8b, roughness: 0.92 })
);
rock.scale.set(1.25, 0.85, 1.05);
rock.position.y = 0.65;
rock.rotation.set(0.4, Math.random() * 3, 0.2);
rock.castShadow = true;
group.add(rock);
} else if (type === 'sandbags') {
const bagMat = new THREE.MeshStandardMaterial({ color: 0xa1887f, roughness: 0.9 });
for (let row = 0; row < 2; row++) {
for (let col = -1; col <= 1; col++) {
const bag = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.38, 0.55), bagMat);
bag.position.set(col * 0.98 + (row % 2) * 0.2, 0.2 + row * 0.38, 0);
bag.castShadow = true;
group.add(bag);
}
}
}
return { group, foliageGroup };
}
