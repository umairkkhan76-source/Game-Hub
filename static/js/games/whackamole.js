document.getElementById('game-title').textContent = '🔨 WHACK-A-MOLE';
const container = document.getElementById('game-container');
container.innerHTML = `
  <div style="text-align:center; width:100%">
    <div style="font-family:'Orbitron',monospace; font-size:1rem; letter-spacing:2px; margin:1rem 0; color:#7070a0; min-height:1.8rem;" id="msg">Choose difficulty and press START!</div>

    <div style="display:flex; gap:.7rem; justify-content:center; margin-bottom:1rem; flex-wrap:wrap;">
      <button onclick="startGame(1)" style="padding:.5rem 1.5rem; border:1px solid #00ff87; background:#00ff87; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">EASY</button>
      <button onclick="startGame(2)" style="padding:.5rem 1.5rem; border:1px solid #ff9f43; background:#ff9f43; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">MEDIUM</button>
      <button onclick="startGame(3)" style="padding:.5rem 1.5rem; border:1px solid #ff6b6b; background:#ff6b6b; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">HARD</button>
      <span id="timer" style="color:#00ff87; font-family:'Orbitron',monospace; font-size:1.2rem; line-height:2;">⏱ 30</span>
    </div>

    <div id="grid" style="
      display:grid;
      grid-template-columns:repeat(3, 120px);
      gap:14px;
      margin:0 auto;
      width:fit-content;
    "></div>

    <div style="margin-top:1rem; color:#7070a0; font-size:.9rem;" id="combo"></div>
  </div>`;

let score = 0, timeLeft = 30, running = false;
let moleTimeouts = [], timerInterval, popTimeout;
let level = 1, combo = 0, missedClicks = 0;
const HOLES = 9;

// Build 9 holes
const grid = document.getElementById('grid');
for (let i = 0; i < HOLES; i++) {
  const h = document.createElement('div');
  h.id = 'h' + i;
  h.onclick = () => whack(i);
  h.style.cssText = `
    width:120px; height:120px;
    background:#0a0a0f;
    border:2px solid #2a2a3a;
    border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    font-size:3rem;
    cursor:pointer;
    transition:all .1s;
    user-select:none;
  `;
  h.textContent = '🕳️';
  grid.appendChild(h);
}

function startGame(lvl = 1) {
  level = lvl;
  score = 0; timeLeft = 30;
  combo = 0; missedClicks = 0;
  running = true;
  document.getElementById('score-val').textContent = 0

  // Clear timers
  clearInterval(timerInterval);
  clearTimeout(popTimeout);
  moleTimeouts.forEach(clearTimeout);
  moleTimeouts = [];

  // Reset holes
  for (let i = 0; i < HOLES; i++) {
    const h = document.getElementById('h' + i);
    h.textContent = '🕳️';
    h.classList.remove('active');
    h.style.borderColor = '#2a2a3a';
    h.style.background = '#0a0a0f';
    delete h.dataset.active;
  }

  document.getElementById('msg').textContent = '';
  document.getElementById('msg').style.color = '#7070a0';
  document.getElementById('combo').textContent = '';
  document.getElementById('timer').textContent = '⏱ 30';

  // Countdown timer
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('timer').textContent = '⏱ ' + timeLeft;
    if (timeLeft <= 0) endGame();
  }, 1000);

  popMole();
}

function getMoleTime() {
  if (level === 1) return 1300 + Math.random() * 500;
  if (level === 2) return 950 + Math.random() * 300;
  return 650 + Math.random() * 200;
}

function getPopDelay() {
  if (level === 1) return 900 + Math.random() * 400;
  if (level === 2) return 650 + Math.random() * 250;
  return 400 + Math.random() * 150;
}

function popMole() {
  if (!running) return;

  // Hard mode: pop 2 moles at once sometimes
  const count = (level === 3 && Math.random() > 0.5) ? 2 : 1;

  for (let c = 0; c < count; c++) {
    const i = Math.floor(Math.random() * HOLES);
    const h = document.getElementById('h' + i);

    if (!h.dataset.active) {
      h.dataset.active = 'true';
      h.textContent = Math.random() > 0.15 ? '🐭' : '💣'; // rare bomb!
      h.style.borderColor = h.textContent === '💣' ? '#ff6b6b' : '#00ff87';
      h.style.background = h.textContent === '💣'
        ? 'rgba(255,107,107,.1)'
        : 'rgba(0,255,135,.08)';

      const t = setTimeout(() => {
        if (h.dataset.active) {
          h.textContent = '🕳️';
          h.style.borderColor = '#2a2a3a';
          h.style.background = '#0a0a0f';
          delete h.dataset.active;
          // Missed a mole
          if (running) {
            combo = 0;
            document.getElementById('combo').textContent = '';
          }
        }
      }, getMoleTime());
      moleTimeouts.push(t);
    }
  }

  popTimeout = setTimeout(popMole, getPopDelay());
}

function whack(i) {
  if (!running) return;
  const h = document.getElementById('h' + i);

  if (h.dataset.active) {
    const isBomb = h.textContent === '💣';

    h.textContent = isBomb ? '💥' : '💥';
    h.style.borderColor = '#2a2a3a';
    h.style.background = '#0a0a0f';
    delete h.dataset.active;

    setTimeout(() => { h.textContent = '🕳️'; }, 250);

    if (isBomb) {
      // Hit bomb — lose points!
      score = Math.max(0, score - 20);
      combo = 0;
      document.getElementById('score-val').textContent = score;
      document.getElementById('combo').textContent = '💣 Bomb! -20 points!';
      document.getElementById('combo').style.color = '#ff6b6b';
    } else {
      // Hit mole — combo system
      combo++;
      const points = combo >= 3 ? 20 : 10; // Combo bonus!
      score += points;
      document.getElementById('score-val').textContent = score;

      if (combo >= 3) {
        document.getElementById('combo').textContent = `🔥 ${combo}x COMBO! +${points}`;
        document.getElementById('combo').style.color = '#ffd700';
      } else {
        document.getElementById('combo').textContent = `+${points}`;
        document.getElementById('combo').style.color = '#00ff87';
      }
    }
  }
}

function endGame() {
  running = false;
  clearInterval(timerInterval);
  clearTimeout(popTimeout);
  updateScore(score);
  if (typeof submitScore === 'function') submitScore(score);

  // Hide all moles
  for (let i = 0; i < HOLES; i++) {
    const h = document.getElementById('h' + i);
    h.textContent = '🕳️';
    h.style.borderColor = '#2a2a3a';
    h.style.background = '#0a0a0f';
    delete h.dataset.active;
  }

  const rank = score >= 200 ? '🏆 Amazing!' : score >= 100 ? '👍 Good!' : '💪 Keep trying!';
  const m = document.getElementById('msg');
  m.textContent = `⏰ Time's up! Score: ${score} — ${rank}`;
  m.style.color = '#00ff87';
  document.getElementById('combo').textContent = '';
}