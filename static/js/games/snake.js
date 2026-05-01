document.getElementById('game-title').textContent = '🐍 SNAKE';
const container = document.getElementById('game-container');
container.innerHTML = `
  <div style="text-align:center; width:100%">
    <div style="font-family:'Orbitron',monospace; font-size:1rem; letter-spacing:2px; margin:1rem 0; color:#7070a0; min-height:1.8rem;" id="msg">Press START to play</div>
    <canvas id="c" width="420" height="420" style="border-radius:8px; display:block; margin:0 auto;"></canvas>
    <div style="margin-top:1rem; display:flex; gap:.7rem; justify-content:center; align-items:center; flex-wrap:wrap;">
      <button onclick="startGame()" style="
        padding:.5rem 1.5rem;
        border:1px solid #00ff87;
        background:#00ff87;
        color:#0a0a0f;
        border-radius:8px;
        font-size:.95rem;
        cursor:pointer;
        font-weight:700;
      ">START</button>
      <span style="color:#7070a0; font-size:.85rem;" class="hide-mobile">Arrow keys / WASD to move</span>
    </div>
    <div class="dpad-controls">
      <div class="dpad-btn-wrapper pos-up"><button class="mobile-btn btn-up" id="btn-up">▲</button></div>
      <div class="dpad-btn-wrapper pos-left"><button class="mobile-btn btn-left" id="btn-left">◀</button></div>
      <div class="dpad-center"></div>
      <div class="dpad-btn-wrapper pos-right"><button class="mobile-btn btn-right" id="btn-right">▶</button></div>
      <div class="dpad-btn-wrapper pos-down"><button class="mobile-btn btn-down" id="btn-down">▼</button></div>
    </div>
  </div>`;

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const CELL = 20, COLS = 21, ROWS = 21;
let snake, dir, food, score, running, loop;

function startGame() {
  snake = [{x:10,y:10},{x:9,y:10},{x:8,y:10}];
  dir = {x:1, y:0};
  score = 0;
  running = true;
  placeFood();
  document.getElementById('score-val').textContent = 0
  document.getElementById('msg').textContent = '';
  clearInterval(loop);
  loop = setInterval(tick, 120);
}

function placeFood() {
  do {
    food = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS)
    };
  } while (snake.some(s => s.x === food.x && s.y === food.y));
}

function tick() {
  const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS ||
      snake.some(s => s.x === head.x && s.y === head.y)) {
    running = false;
    clearInterval(loop);
    updateScore(score);
    if (typeof submitScore === 'function') submitScore(score);
    const m = document.getElementById('msg');
    m.textContent = `GAME OVER — Score: ${score}`;
    m.style.color = '#ff6b6b';
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    document.getElementById('score-val').textContent = score;
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

function draw() {
  // Background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, 420, 420);

  // Grid dots
  ctx.fillStyle = '#1a1a2e';
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      ctx.fillRect(x * CELL + 9, y * CELL + 9, 2, 2);
    }
  }

  // Food
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.arc(
    food.x * CELL + CELL / 2,
    food.y * CELL + CELL / 2,
    CELL / 2 - 2, 0, Math.PI * 2
  );
  ctx.fill();

  // Snake
  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#00ff87' : `hsl(150, ${100 - i * 2}%, ${50 - i}%)`;
    ctx.beginPath();
    ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 4);
    ctx.fill();
  });
}

document.addEventListener('keydown', e => {
  if (!running) return;
  const map = {
    ArrowUp:    {x:0,  y:-1},
    ArrowDown:  {x:0,  y:1},
    ArrowLeft:  {x:-1, y:0},
    ArrowRight: {x:1,  y:0},
    w: {x:0,  y:-1},
    s: {x:0,  y:1},
    a: {x:-1, y:0},
    d: {x:1,  y:0}
  };
  const nd = map[e.key];
  if (nd && !(nd.x === -dir.x && nd.y === -dir.y)) {
    dir = nd;
    e.preventDefault();
  }
});

const bindBtn = (id, nd) => {
  const btn = document.getElementById(id);
  if (!btn) return;
  const trigger = (e) => {
    e.preventDefault();
    if (!running) return;
    if (!(nd.x === -dir.x && nd.y === -dir.y)) dir = nd;
  };
  btn.addEventListener('touchstart', trigger, {passive: false});
  btn.addEventListener('mousedown', trigger);
};

bindBtn('btn-up', {x:0, y:-1});
bindBtn('btn-down', {x:0, y:1});
bindBtn('btn-left', {x:-1, y:0});
bindBtn('btn-right', {x:1, y:0});

draw();