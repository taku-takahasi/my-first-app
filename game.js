const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const distanceEl = document.getElementById("distance");
const energyEl = document.getElementById("energy");
const startScreen = document.getElementById("startScreen");
const resultScreen = document.getElementById("resultScreen");
const resultTag = document.getElementById("resultTag");
const resultTitle = document.getElementById("resultTitle");
const resultScore = document.getElementById("resultScore");

const keys = {};
const worldWidth = 6600;
let width = 960, height = 420, scale = 1, camera = 0, lastTime = 0;
let state = "ready", score = 0, energy = 100, distance = 0, animationId;
let player, platforms, cores, enemies, shots, particles, stars;

function resize() {
  const rect = canvas.getBoundingClientRect();
  scale = window.devicePixelRatio || 1;
  width = rect.width;
  height = rect.height;
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function resetGame() {
  score = 0; energy = 100; distance = 0; camera = 0;
  player = { x: 100, y: 285, w: 27, h: 39, vx: 0, vy: 0, grounded: false, cooldown: 0, invincible: 0, facing: 1 };
  platforms = [
    { x: 0, y: 350, w: 940, h: 70 }, { x: 1010, y: 318, w: 280, h: 102 },
    { x: 1370, y: 355, w: 390, h: 65 }, { x: 1840, y: 290, w: 230, h: 130 },
    { x: 2150, y: 350, w: 460, h: 70 }, { x: 2710, y: 315, w: 260, h: 105 },
    { x: 3070, y: 350, w: 590, h: 70 }, { x: 3790, y: 285, w: 270, h: 135 },
    { x: 4140, y: 350, w: 530, h: 70 }, { x: 4780, y: 305, w: 260, h: 115 },
    { x: 5130, y: 350, w: 1470, h: 70 }
  ];
  cores = [260, 400, 565, 735, 1110, 1210, 1510, 1650, 1910, 2310, 2480, 2800, 3190, 3400, 3890, 4330, 4490, 4870, 5280, 5500, 5800, 6100]
    .map((x, i) => ({ x, y: [295, 275, 295, 265, 265, 265, 300, 300][i % 8], r: 7, collected: false, bob: i }));
  enemies = [660, 1150, 1550, 2380, 2890, 3300, 3970, 4430, 5350, 5740]
    .map((x, i) => ({ x, y: 311, w: 25, h: 27, left: x - 55, right: x + 55, dir: i % 2 ? -1 : 1, alive: true }));
  shots = []; particles = [];
  stars = Array.from({ length: 90 }, (_, i) => ({ x: (i * 113) % worldWidth, y: 25 + ((i * 71) % 210), size: (i % 3) + 1, alpha: .25 + (i % 5) / 10 }));
  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(score).padStart(6, "0");
  distanceEl.textContent = String(Math.floor(distance)).padStart(3, "0");
  energyEl.style.width = `${Math.max(0, energy)}%`;
}

function startGame() {
  resetGame(); state = "playing";
  startScreen.classList.add("hidden"); resultScreen.classList.add("hidden");
  lastTime = performance.now();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
}

function finish(won) {
  state = won ? "won" : "lost";
  resultTag.textContent = won ? "MISSION COMPLETE" : "SIGNAL LOST";
  resultTitle.textContent = won ? "CLEAR!" : "TRY AGAIN";
  resultTitle.querySelector?.("em");
  resultScore.textContent = String(score).padStart(6, "0");
  resultScreen.classList.remove("hidden");
}

function jump() {
  if (state === "playing" && player.grounded) { player.vy = -660; player.grounded = false; burst(player.x + 13, player.y + 38, "#a87dff", 7); }
}
function shoot() {
  if (state === "playing" && player.cooldown <= 0) {
    const shotX = player.facing === 1 ? player.x + player.w : player.x - 20;
    shots.push({ x: shotX, y: player.y + 17, vx: 720 * player.facing, life: 1 });
    player.cooldown = .28;
  }
}

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, .033); lastTime = now;
  update(dt); draw();
  if (state === "playing") animationId = requestAnimationFrame(loop);
}

function update(dt) {
  const left = keys.ArrowLeft || keys.a, right = keys.ArrowRight || keys.d;
  const direction = left ? -1 : right ? 1 : 0;
  const maxSpeed = 280;
  if (direction) {
    player.vx += direction * (player.grounded ? 1250 : 700) * dt;
    player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
    player.facing = direction;
  } else {
    // Keep air momentum after the player releases the movement key.
    player.vx *= Math.pow(player.grounded ? .002 : .45, dt);
  }
  player.vy += 1450 * dt; player.x += player.vx * dt; player.y += player.vy * dt;
  player.cooldown -= dt; player.invincible -= dt; player.grounded = false;
  for (const p of platforms) {
    if (player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h >= p.y && player.y + player.h <= p.y + 24 && player.vy >= 0) {
      player.y = p.y - player.h; player.vy = 0; player.grounded = true;
    }
  }
  if (player.y > height + 100) return finish(false);
  for (const c of cores) {
    c.y += Math.sin(performance.now() / 280 + c.bob) * .12;
    if (!c.collected && Math.abs(player.x + 13 - c.x) < 25 && Math.abs(player.y + 18 - c.y) < 30) {
      c.collected = true; score += 150; energy = Math.min(100, energy + 3); burst(c.x, c.y, "#5df6eb", 10);
    }
  }
  for (const e of enemies) {
    if (!e.alive) continue;
    e.x += e.dir * 38 * dt; if (e.x < e.left || e.x > e.right) e.dir *= -1;
    if (player.invincible <= 0 && player.x + player.w > e.x && player.x < e.x + e.w && player.y + player.h > e.y && player.y < e.y + e.h) {
      energy -= 25; player.invincible = 1.2; player.vy = -300; player.vx = player.x < e.x ? -240 : 240; burst(player.x, player.y + 18, "#ff668d", 12);
      if (energy <= 0) finish(false);
    }
  }
  for (const s of shots) {
    s.x += s.vx * dt; s.life -= dt;
    for (const e of enemies) if (e.alive && Math.abs(s.x - e.x) < 25 && Math.abs(s.y - e.y) < 30) { e.alive = false; s.life = 0; score += 300; burst(e.x, e.y, "#ff668d", 14); }
  }
  shots = shots.filter(s => s.life > 0 && s.x > -20 && s.x < worldWidth);
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt; }
  particles = particles.filter(p => p.life > 0);
  camera += ((player.x - width * .35) - camera) * Math.min(1, dt * 5); camera = Math.max(0, Math.min(worldWidth - width, camera));
  distance = Math.min(999, player.x / 6.2);
  if (player.x > 6240) { score += Math.max(0, Math.floor(energy)) * 5; finish(true); }
  updateHud();
}

function burst(x, y, color, count) { for (let i = 0; i < count; i++) particles.push({ x, y, color, vx: (Math.random() - .5) * 220, vy: (Math.random() - .7) * 240, life: .35 + Math.random() * .45 }); }
function rect(x, y, w, h, color) { ctx.fillStyle = color; ctx.fillRect(x - camera, y, w, h); }

function draw() {
  ctx.clearRect(0, 0, width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, "#090d2d"); sky.addColorStop(.52, "#17184b"); sky.addColorStop(1, "#10152e"); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width * .7, 70, 5, width * .7, 70, 240);
  glow.addColorStop(0, "rgba(103, 94, 255, .28)"); glow.addColorStop(1, "rgba(103, 94, 255, 0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
  for (const s of stars) { ctx.globalAlpha = s.alpha; ctx.fillStyle = "#b9c8ff"; ctx.fillRect(s.x - camera * .15, s.y, s.size, s.size); } ctx.globalAlpha = 1;
  drawMoon();
  drawCity();
  for (let layer = 0; layer < 2; layer++) {
    ctx.fillStyle = layer ? "#111735" : "#1b2250";
    for (let x = -((camera * (layer ? .22 : .12)) % 240) - 240; x < width + 240; x += 240) {
      ctx.beginPath(); ctx.moveTo(x, 350); ctx.lineTo(x + 80, 220 + layer * 38); ctx.lineTo(x + 205, 350); ctx.fill();
    }
  }
  for (const p of platforms) { drawPlatform(p); }
  for (const c of cores) if (!c.collected) { drawCore(c); }
  for (const e of enemies) if (e.alive) { drawEnemy(e); }
  for (const s of shots) { ctx.shadowBlur = 12; ctx.shadowColor = "#a87dff"; rect(s.x, s.y, 20, 3, "#e0d4ff"); ctx.shadowBlur = 0; }
  for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x - camera, p.y, 4, 4); } ctx.globalAlpha = 1;
  drawPlayer();
  ctx.fillStyle = "#5df6eb"; ctx.font = "10px Space Mono"; ctx.fillText("GATE // 6.2KM", 6240 - camera, 335);
}

function drawMoon() {
  const x = width * .78 - camera * .04, y = 72;
  ctx.globalAlpha = .7; ctx.shadowBlur = 35; ctx.shadowColor = "#8c9cff";
  ctx.fillStyle = "#b6c7ff"; ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = "#6d72c5"; ctx.globalAlpha = .26;
  for (const crater of [[-9, -8, 5], [8, 7, 7], [4, -10, 3]]) { ctx.beginPath(); ctx.arc(x + crater[0], y + crater[1], crater[2], 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}

function drawCity() {
  for (let i = 0; i < 17; i++) {
    const x = i * 92 - ((camera * .18) % 92) - 60, h = 38 + (i * 31) % 88;
    ctx.fillStyle = i % 3 === 0 ? "#171b48" : "#111638"; ctx.fillRect(x, 350 - h, 63, h);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
      ctx.globalAlpha = ((i + row + col) % 4 === 0) ? .7 : .15;
      ctx.fillStyle = (i + col) % 3 === 0 ? "#5df6eb" : "#a87dff";
      ctx.fillRect(x + 10 + col * 17, 350 - h + 13 + row * 18, 5, 3);
    }
  }
  ctx.globalAlpha = 1;
}

function drawPlatform(p) {
  const x = p.x - camera;
  const body = ctx.createLinearGradient(x, p.y, x, p.y + p.h);
  body.addColorStop(0, "#27356d"); body.addColorStop(1, "#111735");
  ctx.fillStyle = body; ctx.fillRect(x, p.y, p.w, p.h);
  ctx.fillStyle = "#5df6eb"; ctx.shadowBlur = 10; ctx.shadowColor = "#5df6eb"; ctx.fillRect(x, p.y, p.w, 3); ctx.shadowBlur = 0;
  ctx.fillStyle = "#a87dff"; ctx.globalAlpha = .5; ctx.fillRect(x + 12, p.y + 14, Math.max(20, p.w - 24), 1); ctx.globalAlpha = 1;
  ctx.fillStyle = "#5df6eb"; ctx.globalAlpha = .25;
  for (let stripe = 0; stripe < p.w; stripe += 42) ctx.fillRect(x + stripe, p.y + 24, 14, 2);
  ctx.globalAlpha = 1;
}

function drawCore(c) {
  const x = c.x - camera, pulse = 1 + Math.sin(performance.now() / 180 + c.bob) * .16;
  ctx.save(); ctx.translate(x, c.y); ctx.rotate(Math.PI / 4); ctx.scale(pulse, pulse);
  ctx.shadowBlur = 20; ctx.shadowColor = "#5df6eb"; ctx.fillStyle = "#5df6eb"; ctx.fillRect(-7, -7, 14, 14);
  ctx.fillStyle = "#efffff"; ctx.fillRect(-3, -3, 6, 6); ctx.restore();
}

function drawEnemy(e) {
  const x = e.x - camera;
  ctx.save(); ctx.translate(x + e.w / 2, e.y + e.h / 2);
  ctx.shadowBlur = 14; ctx.shadowColor = "#ff557f"; ctx.fillStyle = "#ff557f";
  ctx.beginPath(); ctx.moveTo(-14, 10); ctx.lineTo(-11, -9); ctx.lineTo(0, -14); ctx.lineTo(12, -9); ctx.lineTo(14, 10); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = "#28143d"; ctx.fillRect(-8, -5, 16, 7); ctx.fillStyle = "#ffe56e"; ctx.fillRect(-5, -4, 4, 3); ctx.fillRect(3, -4, 4, 3);
  ctx.fillStyle = "#a87dff"; ctx.fillRect(-11, 11, 7, 4); ctx.fillRect(4, 11, 7, 4); ctx.restore();
}

function drawPlayer() {
  if (player.invincible > 0 && Math.floor(player.invincible * 12) % 2 === 0) return;
  const x = player.x - camera, y = player.y;
  ctx.shadowBlur = 18; ctx.shadowColor = "#a87dff"; ctx.fillStyle = "#a87dff";
  ctx.beginPath(); ctx.moveTo(x + 6, y + 4); ctx.lineTo(x + 23, y + 4); ctx.lineTo(x + 26, y + 28); ctx.lineTo(x + 2, y + 28); ctx.closePath(); ctx.fill();
  ctx.shadowColor = "#5df6eb"; ctx.fillStyle = "#5df6eb"; ctx.beginPath(); ctx.moveTo(x, y + 13); ctx.lineTo(x + 27, y + 8); ctx.lineTo(x + 27, y + 29); ctx.lineTo(x, y + 29); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#101633"; ctx.fillRect(x + 7, y + 7, 14, 9); ctx.fillStyle = "#ecf2ff"; ctx.fillRect(x + 10, y + 9, 8, 3);
  ctx.fillStyle = "#a87dff"; ctx.fillRect(x + 3, y + 29, 8, 10); ctx.fillRect(x + 18, y + 29, 8, 10);
  ctx.fillStyle = "#5df6eb"; ctx.globalAlpha = .8; ctx.fillRect(x - 5, y + 18, 5, 3); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
}

document.addEventListener("keydown", e => {
  if (["ArrowLeft", "ArrowRight", " ", "x", "X"].includes(e.key)) e.preventDefault();
  keys[e.key] = true;
  if (e.key === " " || e.key === "ArrowUp" || e.key === "w") jump();
  if (e.key === "x" || e.key === "X") shoot();
});
document.addEventListener("keyup", e => { keys[e.key] = false; });
document.getElementById("startButton").addEventListener("click", startGame);
document.getElementById("restartButton").addEventListener("click", startGame);
window.addEventListener("resize", resize);
resize(); resetGame(); draw();
