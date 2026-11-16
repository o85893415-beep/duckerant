export class VisionSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.ripples = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  addSoundRipple(worldPos, radius = 2.6, color = 'rgba(0, 229, 255, 0.85)') {
    this.ripples.push({
      pos: worldPos.clone(),
      age: 0,
      maxAge: 0.75,
      maxRadius: radius,
      color
    });
  }

  worldToScreen(vec3, camera) {
    const projected = vec3.clone().project(camera);
    return {
      x: (projected.x * 0.5 + 0.5) * this.canvas.width,
      y: (-(projected.y * 0.5) + 0.5) * this.canvas.height
    };
  }
  castRayToObstacles(origin, dirX, dirZ, maxDist, obstacles) {
    let closestDist = maxDist;

    for (let i = 0; i < obstacles.length; i++) {
      const box = obstacles[i];
      let tmin = 0;
      let tmax = closestDist;

      if (Math.abs(dirX) < 1e-6) {
        if (origin.x < box.minX || origin.x > box.maxX) continue;
      } else {
        const invX = 1 / dirX;
        let t1 = (box.minX - origin.x) * invX;
        let t2 = (box.maxX - origin.x) * invX;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }

      if (Math.abs(dirZ) < 1e-6) {
        if (origin.z < box.minZ || origin.z > box.maxZ) continue;
      } else {
        const invZ = 1 / dirZ;
        let t1 = (box.minZ - origin.z) * invZ;
        let t2 = (box.maxZ - origin.z) * invZ;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }

      if (tmin >= 0 && tmin < closestDist) {
        closestDist = tmin;
      }
    }

    return new THREE.Vector3(origin.x + dirX * closestDist, 0.5, origin.z + dirZ * closestDist);
  }
  renderFog(player, aimAngle, obstacles, camera, isNight = false, enemies = [], dt = 0.016) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (player.thermalActive) {
      ctx.fillStyle = 'rgba(8, 16, 28, 0.48)';
      ctx.fillRect(0, 0, w, h);

      enemies.forEach(en => {
        if (en.hp <= 0) return;
        const sc = this.worldToScreen(en.pos, camera);
        const grad = ctx.createRadialGradient(sc.x, sc.y, 4, sc.x, sc.y, 34);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.35, 'rgba(255, 110, 0, 0.78)');
        grad.addColorStop(1, 'rgba(255, 23, 68, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sc.x, sc.y, 34, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      ctx.fillStyle = isNight ? 'rgba(3, 6, 12, 0.86)' : 'rgba(6, 11, 16, 0.62)';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';

      const pScreen = this.worldToScreen(player.pos, camera);
      const nearGrad = ctx.createRadialGradient(pScreen.x, pScreen.y, 18, pScreen.x, pScreen.y, 115);
      nearGrad.addColorStop(0, 'rgba(0,0,0,1)');
      nearGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = nearGrad;
      ctx.beginPath();
      ctx.arc(pScreen.x, pScreen.y, 115, 0, Math.PI * 2);
      ctx.fill();

      const fovHalf = (player.isAiming ? 34 : 52) * (Math.PI / 180);
      const maxDist = player.isAiming ? 36 : 26;
      const rayCount = 48;

      ctx.beginPath();
      ctx.moveTo(pScreen.x, pScreen.y);

      for (let i = 0; i <= rayCount; i++) {
        const angle = aimAngle - fovHalf + (i / rayCount) * (fovHalf * 2);
        const dirX = Math.sin(angle);
        const dirZ = Math.cos(angle);
        const hitWorld = this.castRayToObstacles(player.pos, dirX, dirZ, maxDist, obstacles);
        const hitScreen = this.worldToScreen(hitWorld, camera);
        ctx.lineTo(hitScreen.x, hitScreen.y);
      }

      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fill();
      ctx.restore();
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.age += dt;
      if (r.age >= r.maxAge) {
        this.ripples.splice(i, 1);
        continue;
      }
      const progress = r.age / r.maxAge;
      const sc = this.worldToScreen(r.pos, camera);
      const pxRadius = 10 + progress * r.maxRadius * 24;

      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, pxRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
