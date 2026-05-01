document.getElementById('game-title').textContent = '🐦 FLAPPY BIRD';
const container = document.getElementById('game-container');
container.innerHTML = `
  <div style="text-align:center; width:100%">
    <div style="font-family:'Orbitron',monospace; font-size:1rem; letter-spacing:2px; margin:1rem 0; color:#7070a0; min-height:1.8rem;" id="msg">Press SPACE or tap to start!</div>
    <canvas id="c" width="400" height="450" style="border-radius:8px; display:block; margin:0 auto; cursor:pointer;"></canvas>
    <div style="margin-top:.8rem; color:#7070a0; font-size:.85rem;">Space / Click / Tap to flap</div>
  </div>`;

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const W = 400, H = 450;
const GAP = 140;
const PIPE_W = 52;
const GRAVITY = 0.4;
const FLAP_FORCE = -7.5;

let bird, pipes, score, raf, state = 'idle';
let frameCount = 0;
let bestScore = 0;

function init() {
  bird = { x: 90, y: H / 2, v: 0, r: 15, rotation: 0 };
  pipes = [{ x: W + 50, top: randomTop(), scored: false }];
  score = 0;
  frameCount = 0;
  document.getElementById('score-val').textContent = 0
}

function randomTop() {
  return 70 + Math.random() * (H - GAP - 150);
}

function flap() {
  if (state === 'idle') {
    state = 'running';
    init();
    bird.v = FLAP_FORCE;
    return;
  }
  if (state === 'over') {
    state = 'running';
    init();
    bird.v = FLAP_FORCE;
    return;
  }
  bird.v = FLAP_FORCE;
}

// Controls
canvas.addEventListener('click', flap);
document.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); flap(); }
});
canvas.addEventListener('touchstart', e => {
  e.preventDefault(); flap();
}, { passive: false });

function update() {
  frameCount++;

  // Bird physics
  bird.v += GRAVITY;
  bird.y += bird.v;
  bird.rotation = Math.min(Math.max(bird.v * 3, -25), 70);

  // Hit ceiling or floor
  if (bird.y - bird.r < 0 || bird.y + bird.r > H - 25) {
    die(); return;
  }

  // Pipes get faster as score increases
  const pipeSpeed = 2.5 + Math.floor(score / 5) * 0.3;

  for (let p of pipes) {
    p.x -= pipeSpeed;

    // Collision check
    if (bird.x + bird.r - 5 > p.x &&
        bird.x - bird.r + 5 < p.x + PIPE_W &&
        (bird.y - bird.r + 5 < p.top ||
         bird.y + bird.r - 5 > p.top + GAP)) {
      die(); return;
    }

    // Score
    if (!p.scored && p.x + PIPE_W < bird.x) {
      p.scored = true;
      score++;
      document.getElementById('score-val').textContent = score; // update display only
    }
  }

  // Add new pipe
  if (pipes[pipes.length - 1].x < W - 190) {
    pipes.push({ x: W, top: randomTop(), scored: false });
  }

  // Remove old pipes
  pipes = pipes.filter(p => p.x > -PIPE_W - 10);
}

function die() {
  state = 'over';
  cancelAnimationFrame(raf);
  if (score > bestScore) bestScore = score;
  updateScore(score); // save final score only once
  if (typeof submitScore === 'function') submitScore(score);
  const m = document.getElementById('msg');
  m.textContent = `💀 Score: ${score}  |  Best: ${bestScore}  —  Click to retry`;
  m.style.color = '#ff6b6b';
  draw();
}

function drawPipe(x, topH, bottomY) {
  const pipeGrad = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
  pipeGrad.addColorStop(0, '#007733');
  pipeGrad.addColorStop(0.4, '#00aa44');
  pipeGrad.addColorStop(1, '#005522');

  ctx.fillStyle = pipeGrad;
  // Top pipe
  ctx.fillRect(x, 0, PIPE_W, topH);
  // Bottom pipe
  ctx.fillRect(x, bottomY, PIPE_W, H - bottomY);

  // Pipe caps
  ctx.fillStyle = '#00cc55';
  ctx.beginPath();
  ctx.roundRect(x - 4, topH - 22, PIPE_W + 8, 22, [0, 0, 4, 4]);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x - 4, bottomY, PIPE_W + 8, 22, [4, 4, 0, 0]);
  ctx.fill();

  // Shine
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fillRect(x + 4, 0, 8, topH);
  ctx.fillRect(x + 4, bottomY + 22, 8, H - bottomY);
}

function draw() {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#0d1b3e');
  sky.addColorStop(0.7, '#1a2a5e');
  sky.addColorStop(1, '#0a1628');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars (static)
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  [[30,40],[80,80],[150,30],[200,60],[280,20],[340,50],[370,90],
   [50,120],[120,100],[250,110],[320,130]].forEach(([x,y]) => {
    ctx.fillRect(x, y, 1.5, 1.5);
  });

  // Pipes
  for (const p of pipes) {
    drawPipe(p.x, p.top, p.top + GAP);
  }

  // Ground
  const groundGrad = ctx.createLinearGradient(0, H - 25, 0, H);
  groundGrad.addColorStop(0, '#1a3a1a');
  groundGrad.addColorStop(1, '#0a1a0a');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, H - 25, W, 25);

  // Ground line
  ctx.strokeStyle = '#2a5a2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H - 25);
  ctx.lineTo(W, H - 25);
  ctx.stroke();

  // Bird
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation * Math.PI / 180);
  ctx.font = '28px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.scale(-1, 1);
  ctx.fillText('🐦', 0, 0);
  ctx.restore();

  // Score on canvas
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.roundRect(W/2 - 40, 15, 80, 36, 8);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Orbitron, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(score, W / 2, 38);

  // Idle screen
  if (state === 'idle') {
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#00ff87';
    ctx.font = 'bold 22px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TAP TO START', W / 2, H / 2);
    ctx.fillStyle = '#7070a0';
    ctx.font = '14px Rajdhani, sans-serif';
    ctx.fillText('Space / Click / Tap to flap', W / 2, H / 2 + 35);
  }
}

function loop() {
  if (state === 'running') update();
  draw();
  raf = requestAnimationFrame(loop);
}

init();
loop();