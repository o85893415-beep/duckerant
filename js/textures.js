const textureCache = new Map();

export function getProceduralTexture(type) {
  if (textureCache.has(type)) return textureCache.get(type);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  if (type === 'asphalt') {
    ctx.fillStyle = '#263238';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8500; i++) {
      const v = 32 + Math.floor(Math.random() * 28);
      ctx.fillStyle = `rgb(${v},${v + 5},${v + 10})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    ctx.strokeStyle = 'rgba(12, 18, 24, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.stroke();
  } else if (type === 'grass') {
    ctx.fillStyle = '#2e4d23';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(34, 64, 24, 0.45)' : 'rgba(68, 108, 42, 0.35)';
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, 14 + Math.random() * 26, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 6500; i++) {
      const gx = Math.random() * 512;
      const gy = Math.random() * 512;
      const shade = Math.random();
      ctx.strokeStyle = shade > 0.65 ? '#558b2f' : shade > 0.3 ? '#33691e' : '#1b3b12';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + (Math.random() - 0.5) * 5, gy - 5 - Math.random() * 6);
      ctx.stroke();
    }

    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#fff59d' : '#ffffff';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2.5, 2.5);
    }
  } else if (type === 'concrete') {
    ctx.fillStyle = '#4c626d';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4500; i++) {
      const c = 65 + Math.floor(Math.random() * 32);
      ctx.fillStyle = `rgba(${c},${c + 8},${c + 14},0.45)`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    ctx.strokeStyle = 'rgba(18, 26, 34, 0.65)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 508, 508);
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(512, 256);
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.stroke();
  } else if (type === 'brick') {
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(0, 0, 512, 512);
    const rows = 16;
    const cols = 8;
    const bh = 512 / rows;
    const bw = 512 / cols;

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (bw / 2);
      for (let c = -1; c <= cols; c++) {
        const tone = 95 + Math.floor(Math.random() * 35);
        ctx.fillStyle = `rgb(${tone + 25}, ${Math.floor(tone * 0.62)}, ${Math.floor(tone * 0.52)})`;
        ctx.fillRect(c * bw + offset + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
  } else if (type === 'roof') {
    ctx.fillStyle = '#263238';
    ctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 16) {
      ctx.fillStyle = x % 32 === 0 ? '#37474f' : '#1c252b';
      ctx.fillRect(x, 0, 12, 512);
    }
  } else if (type === 'sky_day' || type === 'sky_night') {
    const isNight = type === 'sky_night';
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    if (isNight) {
      grad.addColorStop(0, '#040914');
      grad.addColorStop(0.55, '#0d1f3a');
      grad.addColorStop(1, '#1b3558');
    } else {
      grad.addColorStop(0, '#1565c0');
      grad.addColorStop(0.5, '#4fc3f7');
      grad.addColorStop(0.85, '#b3e5fc');
      grad.addColorStop(1, '#fff9c4');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    if (isNight) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 180; i++) {
        const sz = Math.random() > 0.8 ? 2.5 : 1.3;
        ctx.fillRect(Math.random() * 512, Math.random() * 320, sz, sz);
      }
    } else {
      for (let i = 0; i < 28; i++) {
        const cx = Math.random() * 512;
        const cy = 90 + Math.random() * 210;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.beginPath();
        ctx.arc(cx, cy, 24 + Math.random() * 34, 0, Math.PI * 2);
        ctx.arc(cx + 25, cy + 5, 20 + Math.random() * 26, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textureCache.set(type, tex);
  return tex;
}
