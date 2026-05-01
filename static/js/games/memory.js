document.getElementById('game-title').textContent = '🃏 MEMORY CARDS';
const container = document.getElementById('game-container');
container.innerHTML = `
  <div style="text-align:center; width:100%; max-width:450px; margin:0 auto;">
    
    <div style="display:flex; justify-content:space-between; background:var(--card); padding:1rem; border-radius:12px; margin-bottom:1.5rem; border:1px solid var(--border); box-shadow:0 4px 15px rgba(0,0,0,0.2);">
      <div style="text-align:center; width:33%;">
        <div style="color:#00ff87; font-size:0.75rem; font-family:'Orbitron',monospace; letter-spacing:1px; margin-bottom:0.3rem;">TIME</div>
        <div id="m-time" style="color:#e8e8f0; font-family:'Orbitron',monospace; font-size:1.1rem; font-weight:700;">⏱ 00:00</div>
      </div>
      <div style="width:1px; background:var(--border);"></div>
      <div style="text-align:center; width:33%;">
        <div style="color:#7070a0; font-size:0.75rem; font-family:'Orbitron',monospace; letter-spacing:1px; margin-bottom:0.3rem;">MOVES</div>
        <div id="m-moves" style="color:#e8e8f0; font-family:'Orbitron',monospace; font-size:1.1rem; font-weight:700;">0</div>
      </div>
      <div style="width:1px; background:var(--border);"></div>
      <div style="text-align:center; width:33%;">
        <div style="color:#e879f9; font-size:0.75rem; font-family:'Orbitron',monospace; letter-spacing:1px; margin-bottom:0.3rem;">PAIRS</div>
        <div id="m-pairs" style="color:#e879f9; font-family:'Orbitron',monospace; font-size:1.1rem; font-weight:700;">0/8</div>
      </div>
    </div>

    <div id="grid" style="display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:0 auto 1.5rem auto; width:100%; aspect-ratio:1/1;"></div>
    
    <div style="font-family:'Orbitron',monospace; font-size:1rem; letter-spacing:1px; margin-bottom:1rem; color:#7070a0" id="msg">Use D-Pad to select, Center to flip!</div>

    <div class="dpad-controls" style="display:block;">
      <div class="dpad-btn-wrapper pos-up"><button class="mobile-btn btn-up" id="btn-up">▲</button></div>
      <div class="dpad-btn-wrapper pos-left"><button class="mobile-btn btn-left" id="btn-left">◀</button></div>
      <div class="dpad-center" id="btn-center" style="cursor:pointer; transition:background 0.2s;"></div>
      <div class="dpad-btn-wrapper pos-right"><button class="mobile-btn btn-right" id="btn-right">▶</button></div>
      <div class="dpad-btn-wrapper pos-down"><button class="mobile-btn btn-down" id="btn-down">▼</button></div>
    </div>
    
    <div style="display:flex; justify-content:space-between; margin-top:2.5rem; padding:0 1rem; width:100%;">
      <div style="text-align:center; cursor:pointer;" id="btn-pause">
        <div style="width:50px; height:50px; border-radius:50%; background:var(--card); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:1.2rem; margin:0 auto 0.4rem; box-shadow:0 4px 10px rgba(0,0,0,0.2);">⏸</div>
        <div style="color:#7070a0; font-size:0.85rem; font-weight:600;">Pause</div>
      </div>
      <div style="text-align:center; cursor:pointer; position:relative;" id="btn-hint">
        <div style="position:absolute; top:-6px; right:4px; background:#00ff87; color:#0a0a0f; font-weight:bold; font-size:0.75rem; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:2; box-shadow:0 2px 5px rgba(0,255,135,0.4);" id="hint-count">3</div>
        <div style="width:50px; height:50px; border-radius:50%; background:var(--card); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:1.2rem; margin:0 auto 0.4rem; position:relative; box-shadow:0 4px 10px rgba(0,0,0,0.2);">💡</div>
        <div style="color:#7070a0; font-size:0.85rem; font-weight:600;">Hint</div>
      </div>
    </div>
    
  </div>`;

const EMOJIS = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐙','🦋'];

let cards = [], flipped = [], matched = 0, moves = 0, locked = false;
let cursorIdx = 0, cols = 4;
let hints = 3, paused = false;
let timeSec = 0, timerInt = null;

function startGame() {
  const pairs = EMOJIS.slice(0, cols * cols / 2);
  cards = [...pairs, ...pairs].sort(() => Math.random() - .5);
  flipped = []; matched = 0; moves = 0; locked = false;
  cursorIdx = 0; hints = 3; paused = false; timeSec = 0;
  
  clearInterval(timerInt);
  timerInt = setInterval(() => {
    if(!paused && matched < cards.length/2) {
      timeSec++;
      const m = String(Math.floor(timeSec/60)).padStart(2,'0');
      const s = String(timeSec%60).padStart(2,'0');
      document.getElementById('m-time').textContent = `⏱ ${m}:${s}`;
    }
  }, 1000);

  document.getElementById('score-val').textContent = 0;
  document.getElementById('m-moves').textContent = '0';
  document.getElementById('m-pairs').textContent = `0/${cards.length/2}`;
  document.getElementById('hint-count').textContent = hints;
  document.getElementById('m-time').textContent = `⏱ 00:00`;

  const grid = document.getElementById('grid');
  grid.innerHTML = cards.map((_, i) => `
    <div id="c${i}" onclick="flip(${i})" style="
      width:100%; height:100%;
      border-radius:12px;
      cursor:pointer;
      position:relative;
      transform-style:preserve-3d;
      transition:transform 0.4s, box-shadow 0.2s, border 0.2s;
      border: 3px solid transparent;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    ">
      <div style="
        position:absolute; inset:0;
        border-radius:9px;
        display:flex; align-items:center; justify-content:center;
        background:#1a1a2e;
        border:1px solid #2a2a3a;
        font-family:'Orbitron',monospace;
        font-size:2rem; color:rgba(255,255,255,0.05);
        backface-visibility:hidden;
      ">✦</div>
      <div style="
        position:absolute; inset:0;
        border-radius:9px;
        display:flex; align-items:center; justify-content:center;
        background:#e8e8f0;
        border:1px solid #d0d0d0;
        font-size:2.5rem;
        backface-visibility:hidden;
        transform:rotateY(180deg);
      ">${cards[i]}</div>
    </div>`).join('');

  setMsg('Use D-Pad to select, Center to flip!');
  updateCursor();
}

function updateCursor() {
  for(let i=0; i<cards.length; i++) {
    const el = document.getElementById('c'+i);
    if(i === cursorIdx) {
      el.style.borderColor = '#00ff87';
      el.style.boxShadow = '0 0 15px rgba(0,255,135,0.4)';
    } else {
      el.style.borderColor = 'transparent';
      el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
    }
  }
}

function moveCursor(dx, dy) {
  if (paused) return;
  const r = Math.floor(cursorIdx / cols);
  const c = cursorIdx % cols;
  let nr = r + dy;
  let nc = c + dx;
  if (nr < 0) nr = cols - 1;
  if (nr >= cols) nr = 0;
  if (nc < 0) nc = cols - 1;
  if (nc >= cols) nc = 0;
  cursorIdx = nr * cols + nc;
  updateCursor();
}

function flip(i) {
  if (paused || locked) return;
  const card = document.getElementById('c' + i);
  if (flipped.includes(i) || card.dataset.matched) return;

  cursorIdx = i;
  updateCursor();
  
  card.style.transform = 'rotateY(180deg)';
  flipped.push(i);

  if (flipped.length === 2) {
    moves++;
    document.getElementById('m-moves').textContent = moves;
    locked = true;
    setTimeout(check, 700);
  }
}

function check() {
  const [a, b] = flipped;
  const cardA = document.getElementById('c' + a);
  const cardB = document.getElementById('c' + b);

  if (cards[a] === cards[b]) {
    cardA.dataset.matched = true;
    cardB.dataset.matched = true;
    cardA.style.opacity = '0.5';
    cardB.style.opacity = '0.5';
    matched++;
    document.getElementById('m-pairs').textContent = `${matched}/${cards.length/2}`;

    if (matched === cards.length / 2) {
      clearInterval(timerInt);
      const s = Math.max(1000 - moves * 20 - timeSec * 5, 100);
      updateScore(s);
      setMsg(`🎉 Won in ${moves} moves & ${timeSec}s!`, 'win');
    }
  } else {
    cardA.style.transform = 'rotateY(0deg)';
    cardB.style.transform = 'rotateY(0deg)';
  }

  flipped = [];
  locked = false;
}

function setMsg(t, cls = '') {
  const m = document.getElementById('msg');
  m.textContent = t;
  m.style.color = cls === 'win' ? '#00ff87' : cls === 'lose' ? '#ff6b6b' : '#7070a0';
}

// Bind D-pad controls
const bindBtn = (id, fn) => {
  const btn = document.getElementById(id);
  if (!btn) return;
  const trigger = (e) => { e.preventDefault(); fn(); };
  btn.addEventListener('touchstart', trigger, {passive: false});
  btn.addEventListener('mousedown', trigger);
};

bindBtn('btn-up', () => moveCursor(0, -1));
bindBtn('btn-down', () => moveCursor(0, 1));
bindBtn('btn-left', () => moveCursor(-1, 0));
bindBtn('btn-right', () => moveCursor(1, 0));
bindBtn('btn-center', () => flip(cursorIdx));

// Bind Actions
bindBtn('btn-pause', () => {
  if (matched === cards.length/2) return;
  paused = !paused;
  document.getElementById('grid').style.opacity = paused ? '0.2' : '1';
  setMsg(paused ? 'PAUSED' : 'Use D-Pad to select, Center to flip!');
});

bindBtn('btn-hint', () => {
  if(paused || hints <= 0 || locked) return;
  hints--;
  document.getElementById('hint-count').textContent = hints;
  
  locked = true;
  let toHide = [];
  for(let i=0; i<cards.length; i++) {
    const el = document.getElementById('c'+i);
    if(!el.dataset.matched && !flipped.includes(i)) {
      el.style.transform = 'rotateY(180deg)';
      toHide.push(el);
    }
  }
  
  setTimeout(() => {
    toHide.forEach(el => el.style.transform = 'rotateY(0deg)');
    locked = false;
  }, 1000);
});

// Keyboard mapping
document.addEventListener('keydown', e => {
  if (['ArrowUp','w'].includes(e.key)) moveCursor(0, -1);
  if (['ArrowDown','s'].includes(e.key)) moveCursor(0, 1);
  if (['ArrowLeft','a'].includes(e.key)) moveCursor(-1, 0);
  if (['ArrowRight','d'].includes(e.key)) moveCursor(1, 0);
  if (['Enter',' '].includes(e.key)) { e.preventDefault(); flip(cursorIdx); }
});

startGame();