document.getElementById('game-title').textContent = '🔢 SUDOKU';
const container = document.getElementById('game-container');
container.innerHTML = `
  <div style="text-align:center; width:100%">
    <div style="font-family:'Orbitron',monospace; font-size:1rem; letter-spacing:2px; margin:.5rem 0; color:#7070a0; min-height:1.8rem;" id="msg">Fill the grid — no repeats in row, column or 3×3 box</div>

    <div style="overflow-x:auto; margin:0 auto;">
      <table id="board" style="
        border-collapse:collapse;
        margin:0 auto;
      "></table>
    </div>

    <div style="margin-top:1rem; display:flex; gap:.7rem; justify-content:center; flex-wrap:wrap;">
      <button onclick="newGame('easy')" style="padding:.5rem 1.5rem; border:1px solid #00ff87; background:#00ff87; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">EASY</button>
      <button onclick="newGame('hard')" style="padding:.5rem 1.5rem; border:1px solid #ff6b6b; background:#ff6b6b; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">HARD</button>
      <button onclick="checkBoard()" style="padding:.5rem 1.5rem; border:1px solid #4ecdc4; background:#4ecdc4; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">✅ CHECK</button>
      <button onclick="solveBoard()" style="padding:.5rem 1.5rem; border:1px solid #a29bfe; background:#a29bfe; color:#0a0a0f; border-radius:8px; font-size:.95rem; cursor:pointer; font-weight:700;">💡 SOLVE</button>
    </div>

    <!-- Number pad -->
    <div style="margin-top:1rem; display:flex; gap:.5rem; justify-content:center; flex-wrap:wrap;">
      ${[1,2,3,4,5,6,7,8,9].map(n => `
        <button onclick="padInput(${n})" style="
          width:40px; height:40px;
          border:1px solid #2a2a3a;
          background:#16161f;
          color:#00ff87;
          border-radius:8px;
          font-family:'Orbitron',monospace;
          font-size:1rem;
          cursor:pointer;
        ">${n}</button>
      `).join('')}
      <button onclick="padInput(0)" style="
        width:40px; height:40px;
        border:1px solid #2a2a3a;
        background:#16161f;
        color:#ff6b6b;
        border-radius:8px;
        font-family:'Orbitron',monospace;
        font-size:.8rem;
        cursor:pointer;
      ">✕</button>
    </div>
  </div>`;

const PUZZLES = {
  easy: {
    p: [
      5,3,0, 0,7,0, 0,0,0,
      6,0,0, 1,9,5, 0,0,0,
      0,9,8, 0,0,0, 0,6,0,
      8,0,0, 0,6,0, 0,0,3,
      4,0,0, 8,0,3, 0,0,1,
      7,0,0, 0,2,0, 0,0,6,
      0,6,0, 0,0,0, 2,8,0,
      0,0,0, 4,1,9, 0,0,5,
      0,0,0, 0,8,0, 0,7,9
    ],
    s: [
      5,3,4, 6,7,8, 9,1,2,
      6,7,2, 1,9,5, 3,4,8,
      1,9,8, 3,4,2, 5,6,7,
      8,5,9, 7,6,1, 4,2,3,
      4,2,6, 8,5,3, 7,9,1,
      7,1,3, 9,2,4, 8,5,6,
      9,6,1, 5,3,7, 2,8,4,
      2,8,7, 4,1,9, 6,3,5,
      3,4,5, 2,8,6, 1,7,9
    ]
  },
  hard: {
    p: [
      0,0,0, 2,6,0, 7,0,1,
      6,8,0, 0,7,0, 0,9,0,
      1,9,0, 0,0,4, 5,0,0,
      8,2,0, 1,0,0, 0,4,0,
      0,0,4, 6,0,2, 9,0,0,
      0,5,0, 0,0,3, 0,2,8,
      0,0,9, 3,0,0, 0,7,4,
      0,4,0, 0,5,0, 0,3,6,
      7,0,3, 0,1,8, 0,0,0
    ],
    s: [
      4,3,5, 2,6,9, 7,8,1,
      6,8,2, 5,7,1, 4,9,3,
      1,9,7, 8,3,4, 5,6,2,
      8,2,6, 1,9,5, 3,4,7,
      3,7,4, 6,8,2, 9,1,5,
      9,5,1, 7,4,3, 6,2,8,
      5,1,9, 3,2,6, 8,7,4,
      2,4,8, 9,5,7, 1,3,6,
      7,6,3, 4,1,8, 2,5,9
    ]
  }
};

let puzzle = [], solution = [], given = [];
let selectedCell = null;

function newGame(diff = 'easy') {
  const d = PUZZLES[diff];
  puzzle   = [...d.p];
  solution = [...d.s];
  given    = puzzle.map(v => v !== 0);
  selectedCell = null;
  document.getElementById('score-val').textContent = 0;
  render();
  setMsg(`${diff.toUpperCase()} mode — fill in the missing numbers!`);
}

function render() {
  const table = document.getElementById('board');
  table.innerHTML = '';

  for (let r = 0; r < 9; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < 9; c++) {
      const td = document.createElement('td');
      const i = r * 9 + c;

      // Thick borders for 3x3 boxes
      const borderTop    = r % 3 === 0 ? '3px solid #e8e8f0' : '1px solid #2a2a3a';
      const borderLeft   = c % 3 === 0 ? '3px solid #e8e8f0' : '1px solid #2a2a3a';
      const borderBottom = r === 8     ? '3px solid #e8e8f0' : '1px solid #2a2a3a';
      const borderRight  = c === 8     ? '3px solid #e8e8f0' : '1px solid #2a2a3a';

      const isSelected = selectedCell === i;
      const isRelated  = selectedCell !== null && (
        Math.floor(selectedCell/9) === r ||
        selectedCell % 9 === c ||
        (Math.floor(Math.floor(selectedCell/9)/3) === Math.floor(r/3) &&
         Math.floor((selectedCell%9)/3) === Math.floor(c/3))
      );

      td.style.cssText = `
        width:48px; height:48px;
        text-align:center;
        font-family:'Orbitron',monospace;
        font-size:1.1rem;
        cursor:${given[i] ? 'default' : 'pointer'};
        border-top:${borderTop};
        border-left:${borderLeft};
        border-bottom:${borderBottom};
        border-right:${borderRight};
        background:${isSelected ? 'rgba(0,255,135,.2)' : isRelated ? 'rgba(0,255,135,.05)' : '#0a0a0f'};
        color:${given[i] ? '#e8e8f0' : puzzle[i] ? '#00ff87' : '#7070a0'};
        transition:background .1s;
      `;

      td.textContent = puzzle[i] || '';
      td.id = 'cell' + i;

      if (!given[i]) {
        td.onclick = () => selectCell(i);
      }

      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}

function selectCell(i) {
  selectedCell = i;
  render();
}

function padInput(n) {
  if (selectedCell === null) return;
  if (given[selectedCell]) return;

  const cell = document.getElementById('cell' + selectedCell);
  if (n === 0) {
    puzzle[selectedCell] = 0;
    cell.textContent = '';
    cell.style.color = '#7070a0';
  } else {
    puzzle[selectedCell] = n;
    cell.textContent = n;
    cell.style.color = '#00ff87';
    cell.style.background = 'rgba(0,255,135,.1)';
  }
}

// Keyboard input
document.addEventListener('keydown', e => {
  if (selectedCell === null) return;
  if (given[selectedCell]) return;

  const n = parseInt(e.key);
  if (n >= 1 && n <= 9) padInput(n);
  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') padInput(0);

  // Arrow navigation
  const moves = {
    ArrowUp: -9, ArrowDown: 9,
    ArrowLeft: -1, ArrowRight: 1
  };
  if (moves[e.key] !== undefined) {
    e.preventDefault();
    const next = selectedCell + moves[e.key];
    if (next >= 0 && next < 81) selectCell(next);
  }
});

function checkBoard() {
  let correct = 0, errors = 0, empty = 0;

  for (let i = 0; i < 81; i++) {
    if (given[i]) continue;
    const cell = document.getElementById('cell' + i);

    if (!puzzle[i]) {
      empty++;
    } else if (puzzle[i] === solution[i]) {
      correct++;
      cell.style.color = '#00ff87';
      cell.style.background = 'rgba(0,255,135,.05)';
    } else {
      errors++;
      cell.style.color = '#ff6b6b';
      cell.style.background = 'rgba(255,107,107,.1)';
    }
  }

  if (errors === 0 && empty === 0) {
    setMsg('🎉 Perfect! Puzzle solved!', '#00ff87');
    updateScore(1000);
  } else if (errors === 0) {
    setMsg(`✅ No errors! ${empty} cells remaining`, '#4ecdc4');
  } else {
    setMsg(`✅ ${correct} correct   ❌ ${errors} errors   ⬜ ${empty} empty`, '#ff9f43');
  }
}

function solveBoard() {
  solution.forEach((v, i) => {
    puzzle[i] = v;
    const cell = document.getElementById('cell' + i);
    cell.textContent = v;
    if (!given[i]) {
      cell.style.color = '#a29bfe';
      cell.style.background = 'rgba(162,155,254,.08)';
    }
  });
  setMsg('💡 Puzzle solved!', '#a29bfe');
}

function setMsg(t, color = '#7070a0') {
  const m = document.getElementById('msg');
  m.textContent = t;
  m.style.color = color;
}

newGame('easy');