document.getElementById('game-title').textContent = '🟦 2048';
const container = document.getElementById('game-container');
container.innerHTML = `
  <div style="text-align:center; width:100%">
    <div style="font-family:'Orbitron',monospace; font-size:1rem; letter-spacing:2px; margin:.5rem 0; color:#7070a0; min-height:1.8rem;" id="msg">Use Arrow keys or swipe to slide tiles!</div>

    <div style="display:flex; justify-content:center; gap:1rem; align-items:center; margin-bottom:.8rem; flex-wrap:wrap;">
      <div style="background:#16161f; border:1px solid #2a2a3a; border-radius:10px; padding:.5rem 1.2rem; text-align:center;">
        <div style="color:#7070a0; font-size:.7rem; font-family:'Orbitron',monospace; letter-spacing:1px;">SCORE</div>
        <div id="cur-score" style="color:#00ff87; font-family:'Orbitron',monospace; font-size:1.3rem; font-weight:700;">0</div>
      </div>
      <div style="background:#16161f; border:1px solid #2a2a3a; border-radius:10px; padding:.5rem 1.2rem; text-align:center;">
        <div style="color:#7070a0; font-size:.7rem; font-family:'Orbitron',monospace; letter-spacing:1px;">BEST</div>
        <div id="best-score" style="color:#ffd700; font-family:'Orbitron',monospace; font-size:1.3rem; font-weight:700;">0</div>
      </div>
      <div style="background:#16161f; border:1px solid #2a2a3a; border-radius:10px; padding:.5rem 1.2rem; text-align:center;">
        <div style="color:#7070a0; font-size:.7rem; font-family:'Orbitron',monospace; letter-spacing:1px;">MOVES</div>
        <div id="move-count" style="color:#a29bfe; font-family:'Orbitron',monospace; font-size:1.3rem; font-weight:700;">0</div>
      </div>
    </div>

    <div id="board" style="
      display:grid;
      grid-template-columns:repeat(4,90px);
      gap:10px;
      background:#111118;
      border-radius:12px;
      padding:12px;
      margin:0 auto;
      width:fit-content;
      border:1px solid #2a2a3a;
    "></div>

    <div style="margin-top:1rem; display:flex; gap:.7rem; justify-content:center; flex-wrap:wrap;">
      <button onclick="startGame()" style="padding:.5rem 1.5rem; border:1px solid #00ff87; background:#00ff87; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">NEW GAME</button>
      <button onclick="undoMove()" style="padding:.5rem 1.5rem; border:1px solid #a29bfe; background:#0a0a0f; color:#a29bfe; border-radius:8px; font-size:.95rem; cursor:pointer;">↩ UNDO</button>
    </div>
    <div style="color:#7070a0; font-size:.8rem; margin-top:.5rem;" class="hide-mobile">Arrow keys / WASD / Swipe to move</div>
    <div class="dpad-controls">
      <div class="dpad-btn-wrapper pos-up"><button class="mobile-btn btn-up" id="btn-up">▲</button></div>
      <div class="dpad-btn-wrapper pos-left"><button class="mobile-btn btn-left" id="btn-left">◀</button></div>
      <div class="dpad-center"></div>
      <div class="dpad-btn-wrapper pos-right"><button class="mobile-btn btn-right" id="btn-right">▶</button></div>
      <div class="dpad-btn-wrapper pos-down"><button class="mobile-btn btn-down" id="btn-down">▼</button></div>
    </div>
  </div>`;

let grid = [], score = 0, bestScore = 0, moves = 0;
let prevGrid = [], prevScore = 0;

const COLORS = {
  0:    { bg: '#1a1a2e', color: 'transparent' },
  2:    { bg: '#eee4da', color: '#776e65' },
  4:    { bg: '#ede0c8', color: '#776e65' },
  8:    { bg: '#f2b179', color: '#f9f6f2' },
  16:   { bg: '#f59563', color: '#f9f6f2' },
  32:   { bg: '#f67c5f', color: '#f9f6f2' },
  64:   { bg: '#f65e3b', color: '#f9f6f2' },
  128:  { bg: '#edcf72', color: '#f9f6f2' },
  256:  { bg: '#edcc61', color: '#f9f6f2' },
  512:  { bg: '#edc850', color: '#f9f6f2' },
  1024: { bg: '#edc53f', color: '#f9f6f2' },
  2048: { bg: '#edc22e', color: '#f9f6f2' },
};

function startGame() {
  grid = Array(4).fill(null).map(() => Array(4).fill(0));
  score = 0; moves = 0;
  prevGrid = []; prevScore = 0;
  document.getElementById('score-val').textContent = 0;
  document.getElementById('cur-score').textContent = '0';
  document.getElementById('move-count').textContent = '0';
  addTile(); addTile();
  render();
  setMsg('Combine tiles to reach 2048!');
}

function addTile() {
  const empty = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      if (!grid[r][c]) empty.push([r, c]);
  if (!empty.length) return;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function render() {
  const b = document.getElementById('board');
  b.innerHTML = grid.flat().map(v => {
    const col  = COLORS[v] || { bg: '#3c3a32', color: '#f9f6f2' };
    const bg   = col.bg;
    const color = col.color;
    const size = v >= 1024 ? '.9rem' : v >= 128 ? '1.1rem' : v >= 16 ? '1.3rem' : '1.5rem';
    return `
      <div style="
        width:90px; height:90px;
        border-radius:8px;
        background:${bg};
        display:flex; align-items:center; justify-content:center;
        font-family:'Orbitron',monospace;
        font-size:${size};
        font-weight:900;
        color:${color};
        transition:all .1s;
        box-shadow:${v ? '0 2px 8px rgba(0,0,0,.3)' : 'none'};
      ">${v || ''}</div>`;
  }).join('');
}

function slideRow(row) {
  let r = row.filter(v => v);
  for (let i = 0; i < r.length - 1; i++) {
    if (r[i] === r[i+1]) {
      r[i] *= 2;
      score += r[i];
      r.splice(i+1, 1);
    }
  }
  while (r.length < 4) r.push(0);
  return r;
}

function transpose(g) {
  return g[0].map((_, i) => g.map(row => row[i]));
}

function move(dir) {
  // Save state for undo
  prevGrid  = grid.map(r => [...r]);
  prevScore = score;

  const old = JSON.stringify(grid);

  if (dir === 'left')  grid = grid.map(row => slideRow(row));
  if (dir === 'right') grid = grid.map(row => slideRow([...row].reverse()).reverse());
  if (dir === 'up')    { let t = transpose(grid); t = t.map(r => slideRow(r)); grid = transpose(t); }
  if (dir === 'down')  { let t = transpose(grid); t = t.map(r => slideRow([...r].reverse()).reverse()); grid = transpose(t); }

  if (JSON.stringify(grid) !== old) {
    moves++;
    addTile();
    document.getElementById('cur-score').textContent = score.toLocaleString();
    document.getElementById('move-count').textContent = moves;

    if (score > bestScore) {
      bestScore = score;
      document.getElementById('best-score').textContent = bestScore.toLocaleString();
    }

    render();

    if (grid.flat().includes(2048)) {
      updateScore(score);
      setMsg('🎉 You reached 2048! Amazing!', '#ffd700');
      return;
    }
    if (isGameOver()) {
      updateScore(score);
      setMsg(`💀 Game Over! Score: ${score}`, '#ff6b6b');
    }
  }
}

function undoMove() {
  if (!prevGrid.length) return;
  grid  = prevGrid.map(r => [...r]);
  score = prevScore;
  moves = Math.max(0, moves - 1);
  document.getElementById('cur-score').textContent = score.toLocaleString();
  document.getElementById('move-count').textContent = moves;
  render();
  setMsg('↩ Move undone!', '#a29bfe');
}

function isGameOver() {
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) return false;
      if (c < 3 && grid[r][c] === grid[r][c+1]) return false;
      if (r < 3 && grid[r][c] === grid[r+1][c]) return false;
    }
  return true;
}

// Keyboard controls
document.addEventListener('keydown', e => {
  const map = {
    ArrowLeft:'left', ArrowRight:'right',
    ArrowUp:'up',     ArrowDown:'down',
    a:'left', d:'right', w:'up', s:'down'
  };
  if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
});

const bindBtn = (id, dir) => {
  const btn = document.getElementById(id);
  if (!btn) return;
  const trigger = (e) => { e.preventDefault(); move(dir); };
  btn.addEventListener('touchstart', trigger, {passive: false});
  btn.addEventListener('mousedown', trigger);
};
bindBtn('btn-up', 'up');
bindBtn('btn-down', 'down');
bindBtn('btn-left', 'left');
bindBtn('btn-right', 'right');

// Swipe controls
let tx = 0, ty = 0;
document.getElementById('board').addEventListener('touchstart', e => {
  tx = e.touches[0].clientX;
  ty = e.touches[0].clientY;
}, { passive: true });
document.getElementById('board').addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - tx;
  const dy = e.changedTouches[0].clientY - ty;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left');
  else move(dy > 0 ? 'down' : 'up');
}, { passive: true });

function setMsg(t, color = '#7070a0') {
  const m = document.getElementById('msg');
  m.textContent = t;
  m.style.color = color;
}

startGame();