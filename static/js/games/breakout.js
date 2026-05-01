document.getElementById('game-title').textContent = '🧱 BREAKOUT';
const container = document.getElementById('game-container');
container.innerHTML = `
  <div style="text-align:center; width:100%">
    <div style="font-family:'Orbitron',monospace; font-size:1rem; letter-spacing:2px; margin:1rem 0; color:#7070a0; min-height:1.8rem;" id="msg">Press START to play</div>
    <canvas id="c" width="480" height="420" style="border-radius:8px; display:block; margin:0 auto; max-width: 100%; height: auto;"></canvas>
    <div style="margin-top:1rem; display:flex; gap:.7rem; justify-content:center; align-items:center; flex-wrap:wrap;">
      <button onclick="startGame(1)" style="padding:.5rem 1.5rem; border:1px solid #00ff87; background:#00ff87; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">EASY</button>
      <button onclick="startGame(2)" style="padding:.5rem 1.5rem; border:1px solid #ff9f43; background:#ff9f43; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">MEDIUM</button>
      <button onclick="startGame(3)" style="padding:.5rem 1.5rem; border:1px solid #ff6b6b; background:#ff6b6b; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">HARD</button>
      <span style="color:#7070a0; font-size:.85rem;" class="hide-mobile">Mouse or ← → keys</span>
    </div>
    <div class="mobile-controls" style="margin-top:2rem;">
      <button class="mobile-btn btn-left" id="btn-left">◀</button>
      <button class="mobile-btn btn-right" id="btn-right">▶</button>
    </div>
  </div>`;

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const W = 480, H = 420;
const PH = 10;
const BR = 9;
const BW = 56, BH = 16;
const COLS = 7, ROWS = 5;
const BGAP = 5;
const BCOLS = ['#ff6b6b','#ff9f43','#ffd700','#00ff87','#4ecdc4'];

let px, py, PW, bx, by, vx, vy;
let bricks, score, lives, running, raf, level;
let mouseX = W / 2;
let ballSpeed = 4;

function startGame(lvl = 1) {
  level = lvl;

  // Harder levels = smaller paddle + faster ball
  PW      = lvl === 1 ? 90 : lvl === 2 ? 70 : 50;
  ballSpeed = lvl === 1 ? 4 : lvl === 2 ? 5.5 : 7;

  px = (W - PW) / 2;
  py = H - 35;

  // Random starting angle so it never feels the same
  const angle = (30 + Math.random() * 30) * (Math.PI / 180);
  const dir   = Math.random() > 0.5 ? 1 : -1;
  bx = W / 2;
  by = H - 60;
  vx = ballSpeed * Math.cos(angle) * dir;
  vy = -ballSpeed * Math.sin(angle) - 2;

  score = 0;
  lives = lvl === 1 ? 3 : lvl === 2 ? 2 : 1;
  running = true;
  bricks = [];

  // Build bricks — hard mode has 6 rows
  const rows = lvl === 3 ? 6 : ROWS;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      bricks.push({
        x: c * (BW + BGAP) + BGAP,
        y: r * (BH + BGAP) + 35,
        alive: true,
        // Hard mode bricks need 2 hits
        hits: lvl === 3 ? 2 : 1,
        color: BCOLS[r % BCOLS.length]
      });
    }
  }

  document.getElementById('score-val').textContent = 0;
  setMsg('');
  cancelAnimationFrame(raf);
  loop();
}

function loop() {
  if (!running) return;
  update();
  draw();
  raf = requestAnimationFrame(loop);
}

// Mouse control
canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.clientX - rect.left) * (canvas.width / rect.width) - PW / 2;
});

// Touch control on canvas
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  mouseX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width) - PW / 2;
}, {passive: false});

// Keyboard control
const keys = {};
document.addEventListener('keydown', e => { keys[e.key] = true; if(e.key===' '){e.preventDefault();} });
document.addEventListener('keyup',   e => { keys[e.key] = false; });

// Mobile Button Controls
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const bindBtn = (btn, key) => {
  btn.addEventListener('touchstart', e => { e.preventDefault(); keys[key] = true; mouseX = null; });
  btn.addEventListener('touchend', e => { e.preventDefault(); keys[key] = false; });
  btn.addEventListener('mousedown', e => { keys[key] = true; mouseX = null; });
  btn.addEventListener('mouseup', e => { keys[key] = false; });
  btn.addEventListener('mouseleave', e => { keys[key] = false; });
};
if (btnLeft) bindBtn(btnLeft, 'ArrowLeft');
if (btnRight) bindBtn(btnRight, 'ArrowRight');

function update() {
  // Smooth keyboard movement
  if (keys['ArrowLeft'])  px = Math.max(0, px - 8);
  if (keys['ArrowRight']) px = Math.min(W - PW, px + 8);

  // Mouse movement
  if (mouseX !== null && !keys['ArrowLeft'] && !keys['ArrowRight']) {
    px = Math.max(0, Math.min(W - PW, mouseX));
  }

  // Move ball
  bx += vx;
  by += vy;

  // Wall bounces
  if (bx - BR < 0)  { bx = BR;     vx = Math.abs(vx); }
  if (bx + BR > W)  { bx = W - BR; vx = -Math.abs(vx); }
  if (by - BR < 0)  { by = BR;     vy = Math.abs(vy); }

  // Ball lost
  if (by > H + BR) {
    lives--;
    if (lives <= 0) {
      updateScore(score);
      setMsg('GAME OVER 💀 — Press a difficulty button to retry', '#ff6b6b');
      running = false;
      draw(); return;
    }
    // Reset ball with new random angle
    const angle = (30 + Math.random() * 30) * (Math.PI / 180);
    const dir   = Math.random() > 0.5 ? 1 : -1;
    bx = W / 2; by = H - 80;
    vx = ballSpeed * Math.cos(angle) * dir;
    vy = -ballSpeed;
  }

  // Paddle collision
  if (by + BR > py && by - BR < py + PH &&
      bx > px && bx < px + PW && vy > 0) {
    // Angle depends on where ball hits paddle
    const hitPos = (bx - (px + PW / 2)) / (PW / 2); // -1 to +1
    const bounceAngle = hitPos * 65 * (Math.PI / 180);
    const speed = Math.sqrt(vx * vx + vy * vy);
    vx = speed * Math.sin(bounceAngle);
    vy = -speed * Math.cos(bounceAngle);

    // Gradually speed up ball
    const maxSpeed = ballSpeed * 1.8;
    const curSpeed = Math.sqrt(vx * vx + vy * vy);
    if (curSpeed < maxSpeed) {
      vx *= 1.02;
      vy *= 1.02;
    }

    by = py - BR - 1;
  }

  // Brick collisions
  for (const b of bricks) {
    if (!b.alive) continue;
    if (bx + BR > b.x && bx - BR < b.x + BW &&
        by + BR > b.y && by - BR < b.y + BH) {

      b.hits--;
      if (b.hits <= 0) {
        b.alive = false;
        score += level * 10;
        document.getElementById('score-val').textContent = score;
      } else {
        // Brick flashes — needs another hit
        b.color = '#888';
      }

      // Bounce direction based on which side was hit
      const overlapLeft  = (bx + BR) - b.x;
      const overlapRight = (b.x + BW) - (bx - BR);
      const overlapTop   = (by + BR) - b.y;
      const overlapBot   = (b.y + BH) - (by - BR);
      const minH = Math.min(overlapLeft, overlapRight);
      const minV = Math.min(overlapTop, overlapBot);
      if (minH < minV) vx *= -1;
      else             vy *= -1;
      break;
    }
  }

  // Win!
  if (bricks.every(b => !b.alive)) {
    updateScore(score);
    setMsg('🎉 YOU WIN! Amazing!', '#00ff87');
    running = false;
  }
}

function draw() {
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, W, H);

  // Bricks
  bricks.forEach(b => {
    if (!b.alive) return;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, BW, BH, 3);
    ctx.fill();
    // Shine effect
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.fillRect(b.x + 2, b.y + 2, BW - 4, 4);
  });

  // Paddle
  const grad = ctx.createLinearGradient(px, py, px + PW, py);
  grad.addColorStop(0, '#00cc66');
  grad.addColorStop(1, '#00ff87');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(px, py, PW, PH, 5);
  ctx.fill();

  // Ball with glow
  ctx.shadowColor = '#00ff87';
  ctx.shadowBlur  = 12;
  ctx.fillStyle   = '#ffffff';
  ctx.beginPath();
  ctx.arc(bx, by, BR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // HUD
  ctx.fillStyle = '#7070a0';
  ctx.font = '13px Rajdhani, sans-serif';
  ctx.fillText(`Lives: ${'❤️'.repeat(lives)}   Level: ${level === 1 ? 'EASY' : level === 2 ? 'MEDIUM' : 'HARD'}`, 10, 20);
}

function setMsg(t, color = '#7070a0') {
  const m = document.getElementById('msg');
  m.textContent = t;
  m.style.color = color;
}

draw();