document.getElementById('game-title').textContent = '⭕ TIC TAC TOE';
const container = document.getElementById('game-container');
container.innerHTML = `
  <div class="game-area">
    <div class="game-msg info" id="msg">Player X's turn</div>
    <div id="board" style="
      display: grid;
      grid-template-columns: repeat(3, 110px);
      gap: 8px;
      margin: 1rem auto;
      width: fit-content;
    "></div>
    <div style="margin-top:1rem; display:flex; gap:.7rem; justify-content:center;">
      <button onclick="resetGame()" style="
        padding:.5rem 1.5rem;
        border:1px solid #00ff87;
        background:#00ff87;
        color:#0a0a0f;
        border-radius:8px;
        font-size:.95rem;
        cursor:pointer;
        font-weight:700;
      ">NEW GAME</button>
      <button id="modeBtn" onclick="toggleMode()" style="
        padding:.5rem 1.5rem;
        border:1px solid #2a2a3a;
        background:#0a0a0f;
        color:#e8e8f0;
        border-radius:8px;
        font-size:.95rem;
        cursor:pointer;
      ">vs AI</button>
    </div>
  </div>`;

let board = Array(9).fill('');
let current = 'X', gameOver = false, vsAI = false, wins = {X:0, O:0, T:0};

const WINS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function render() {
  const b = document.getElementById('board');
  b.innerHTML = board.map((v, i) => `
    <div onclick="move(${i})" style="
      width:110px; height:110px;
      background:#0a0a0f;
      border:2px solid ${v === 'X' ? '#ff6b6b' : v === 'O' ? '#00ff87' : '#2a2a3a'};
      border-radius:10px;
      font-size:3rem;
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:${v ? 'default' : 'pointer'};
      color:${v === 'X' ? '#ff6b6b' : '#00ff87'};
      transition: border-color .15s;
    ">${v}</div>`).join('');
}

function move(i) {
  if (board[i] || gameOver) return;
  board[i] = current;

  const w = checkWin();
  if (w) {
    wins[current]++;
    updateScore(10);
    if (typeof submitScore === 'function') submitScore(10);
    setMsg(`Player ${current} wins! 🎉`, 'win');
    gameOver = true;
    render();
    return;
  }

  if (board.every(Boolean)) {
    setMsg("It's a draw! 🤝", 'info');
    gameOver = true;
    render();
    return;
  }

  current = current === 'X' ? 'O' : 'X';
  setMsg(`Player ${current}'s turn`);
  render();

  if (vsAI && current === 'O' && !gameOver) {
    setTimeout(aiMove, 400);
  }
}

function aiMove() {
  let best = null;

  // Try to win
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      if (checkWin()) { board[i] = ''; best = i; break; }
      board[i] = '';
    }
  }

  // Try to block
  if (best === null) {
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        if (checkWin()) { board[i] = ''; best = i; break; }
        board[i] = '';
      }
    }
  }

  // Pick center or best available
  if (best === null) {
    best = !board[4] ? 4 : [0,2,6,8,1,3,5,7].find(i => !board[i]);
  }

  move(best);
}

function checkWin() {
  return WINS.find(([a,b,c]) =>
    board[a] && board[a] === board[b] && board[b] === board[c]
  );
}

function resetGame() {
  board = Array(9).fill('');
  current = 'X';
  gameOver = false;
  wins = {X:0, O:0, T:0};
  setMsg("Player X's turn");
  render();
}

function toggleMode() {
  vsAI = !vsAI;
  document.getElementById('modeBtn').textContent = vsAI ? 'vs Human' : 'vs AI';
  resetGame();
}

function setMsg(t, cls = 'info') {
  const m = document.getElementById('msg');
  m.textContent = t;
  m.className = 'game-msg ' + cls;
}

render();