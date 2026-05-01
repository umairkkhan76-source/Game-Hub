document.getElementById('game-title').textContent = '🏓 PONG';
const container = document.getElementById('game-container');
container.innerHTML = `
  <div style="text-align:center; width:100%">
    <div style="font-family:'Orbitron',monospace; font-size:1rem; letter-spacing:2px; margin:1rem 0; color:#7070a0; min-height:1.8rem;" id="msg">Press START — W/S = Left paddle | ↑/↓ = Right paddle</div>
    <canvas id="c" width="600" height="380" style="border-radius:8px; display:block; margin:0 auto; cursor:none;"></canvas>
    <div style="margin-top:1rem; display:flex; gap:.7rem; justify-content:center; align-items:center; flex-wrap:wrap;">
      <button onclick="startGame(1)" style="padding:.5rem 1.5rem; border:1px solid #00ff87; background:#00ff87; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">EASY</button>
      <button onclick="startGame(2)" style="padding:.5rem 1.5rem; border:1px solid #ff9f43; background:#ff9f43; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">MEDIUM</button>
      <button onclick="startGame(3)" style="padding:.5rem 1.5rem; border:1px solid #ff6b6b; background:#ff6b6b; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">HARD</button>
      <button onclick="toggleAI()" id="aiBtn" style="padding:.5rem 1.5rem; border:1px solid #2a2a3a; background:#0a0a0f; color:#e8e8f0; border-radius:8px; font-size:.95rem; cursor:pointer;">vs AI: ON</button>
    </div>
    <div class="mobile-controls" style="flex-direction:row; justify-content:center; gap:2rem;">
      <button class="mobile-btn btn-up" id="btn-up">▲</button>
      <button class="mobile-btn btn-down" id="btn-down">▼</button>
    </div>
  </div>`;

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const W = 600, H = 380;
const PW = 12, PH = 70;
const BR = 8;

let lp, rp, ball, running, raf, vsAI = true;
let scoreL = 0, scoreR = 0, level = 1;
let particles = [];

function startGame(lvl = 1) {
  level = lvl;

  lp = { x: 15,       y: H/2 - PH/2, dy: 0 };
  rp = { x: W-15-PW,  y: H/2 - PH/2, dy: 0 };

  scoreL = 0; scoreR = 0;
  running = true;
  particles = [];
  document.getElementById('score-val').textContent = 0;
  setMsg('');
  cancelAnimationFrame(raf);
  resetBall(1);
  loop();
}

function toggleAI() {
  vsAI = !vsAI;
  const btn = document.getElementById('aiBtn');
  btn.textContent = `vs AI: ${vsAI ? 'ON' : 'OFF'}`;
  btn.style.borderColor = vsAI ? '#00ff87' : '#2a2a3a';
  btn.style.color = vsAI ? '#00ff87' : '#e8e8f0';
}

function getBallSpeed() {
  return level === 1 ? 4 : level === 2 ? 5.5 : 7;
}

function getAISpeed() {
  return level === 1 ? 3 : level === 2 ? 4.5 : 6.5;
}

function resetBall(dir) {
  const spd = getBallSpeed();
  const angle = (20 + Math.random() * 30) * Math.PI / 180;
  const vdir  = Math.random() > 0.5 ? 1 : -1;
  ball = {
    x: W/2, y: H/2,
    vx: spd * Math.cos(angle) * dir,
    vy: spd * Math.sin(angle) * vdir,
    trail: []
  };
}

// Track keys
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (['ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault();
});
document.addEventListener('keyup', e => keys[e.key] = false);

const bindBtn = (id, key) => {
  const btn = document.getElementById(id);
  if (!btn) return;
  const tOn = (e) => { e.preventDefault(); keys[key] = true; };
  const tOff = (e) => { e.preventDefault(); keys[key] = false; };
  btn.addEventListener('touchstart', tOn, {passive: false});
  btn.addEventListener('touchend', tOff);
  btn.addEventListener('mousedown', tOn);
  btn.addEventListener('mouseup', tOff);
  btn.addEventListener('mouseleave', tOff);
};
bindBtn('btn-up', 'w');
bindBtn('btn-down', 's');

function addParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      life: 1,
      color
    });
  }
}

function update() {
  // ── Left paddle (W/S) ─────────────────────────────
  if (keys['w'] && lp.y > 0)       lp.y -= 6;
  if (keys['s'] && lp.y < H - PH)  lp.y += 6;

  // ── Right paddle (arrows or AI) ───────────────────
  if (!vsAI) {
    if (keys['ArrowUp']   && rp.y > 0)      rp.y -= 6;
    if (keys['ArrowDown'] && rp.y < H - PH) rp.y += 6;
  } else {
    // Smooth AI tracking
    const aiSpd = getAISpeed();
    const center = rp.y + PH / 2;
    const diff   = ball.y - center;
    if (Math.abs(diff) > 5) {
      rp.y += Math.sign(diff) * Math.min(aiSpd, Math.abs(diff));
    }
    rp.y = Math.max(0, Math.min(H - PH, rp.y));
  }

  // ── Ball trail ────────────────────────────────────
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 8) ball.trail.shift();

  // ── Ball movement ─────────────────────────────────
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Top / bottom walls
  if (ball.y - BR < 0)  { ball.y = BR;     ball.vy = Math.abs(ball.vy); }
  if (ball.y + BR > H)  { ball.y = H - BR; ball.vy = -Math.abs(ball.vy); }

  // ── Left paddle collision ─────────────────────────
  if (ball.x - BR < lp.x + PW &&
      ball.x + BR > lp.x &&
      ball.y > lp.y - 5 &&
      ball.y < lp.y + PH + 5 &&
      ball.vx < 0) {
    ball.vx = Math.abs(ball.vx) * 1.05;
    ball.vy = (ball.y - (lp.y + PH/2)) / (PH/2) * getBallSpeed();
    ball.x = lp.x + PW + BR;
    addParticles(ball.x, ball.y, '#00ff87');
  }

  // ── Right paddle collision ────────────────────────
  if (ball.x + BR > rp.x &&
      ball.x - BR < rp.x + PW &&
      ball.y > rp.y - 5 &&
      ball.y < rp.y + PH + 5 &&
      ball.vx > 0) {
    ball.vx = -Math.abs(ball.vx) * 1.05;
    ball.vy = (ball.y - (rp.y + PH/2)) / (PH/2) * getBallSpeed();
    ball.x = rp.x - BR;
    addParticles(ball.x, ball.y, '#ff6b6b');
  }

  // ── Scoring ───────────────────────────────────────
  if (ball.x < -BR) {
    scoreR++;
    addParticles(0, ball.y, '#ff6b6b');
    if (scoreR >= 7) { endGame('Right'); return; }
    setTimeout(() => resetBall(-1), 600);
    ball.x = -999;
  }
  if (ball.x > W + BR) {
    scoreL++;
    addParticles(W, ball.y, '#00ff87');
    if (scoreL >= 7) { endGame('Left'); return; }
    setTimeout(() => resetBall(1), 600);
    ball.x = 9999;
  }

  // ── Particles ─────────────────────────────────────
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    p.life -= 0.06;
    p.vy += 0.1;
  });
  particles = particles.filter(p => p.life > 0);

}

function endGame(winner) {
  running = false;
  updateScore(Math.max(scoreL, scoreR) * 10);
  setMsg(`${winner} player wins! 🏆 Press a difficulty to play again`, '#00ff87');
}

function draw() {
  // Background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, W, H);

  // Center dashed line
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = '#1a1a3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W/2, 0);
  ctx.lineTo(W/2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  // Particles
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Ball trail
  ball.trail.forEach((t, i) => {
    const alpha = (i / ball.trail.length) * 0.3;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(t.x, t.y, BR * (i / ball.trail.length), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Left paddle — green gradient
  const lg = ctx.createLinearGradient(lp.x, lp.y, lp.x, lp.y + PH);
  lg.addColorStop(0, '#00ff87');
  lg.addColorStop(1, '#00cc66');
  ctx.fillStyle = lg;
  ctx.shadowColor = '#00ff87';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(lp.x, lp.y, PW, PH, 4);
  ctx.fill();

  // Right paddle — red gradient
  const rg = ctx.createLinearGradient(rp.x, rp.y, rp.x, rp.y + PH);
  rg.addColorStop(0, '#ff6b6b');
  rg.addColorStop(1, '#cc4444');
  ctx.fillStyle = rg;
  ctx.shadowColor = '#ff6b6b';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(rp.x, rp.y, PW, PH, 4);
  ctx.fill();

  // Ball with glow
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Scores
  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.font = 'bold 64px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(scoreL, W/4,     H/2 + 20);
  ctx.fillText(scoreR, 3*W/4,   H/2 + 20);

  // Player labels
  ctx.fillStyle = '#2a2a4a';
  ctx.font = '11px Rajdhani, sans-serif';
  ctx.fillText('W / S', W/4,   H - 8);
  ctx.fillText(vsAI ? 'AI' : '↑ / ↓', 3*W/4, H - 8);

  // Level badge
  ctx.fillStyle = '#1a1a3a';
  ctx.beginPath();
  ctx.roundRect(W/2 - 35, 8, 70, 22, 5);
  ctx.fill();
  ctx.fillStyle = '#7070a0';
  ctx.font = '11px Orbitron, monospace';
  ctx.fillText(level===1?'EASY':level===2?'MEDIUM':'HARD', W/2, 23);
}

function loop() {
  if (running) update();
  draw();
  raf = requestAnimationFrame(loop);
}

function setMsg(t, color = '#7070a0') {
  const m = document.getElementById('msg');
  m.textContent = t;
  m.style.color = color;
}

// Draw initial screen
resetBall(1);
draw();