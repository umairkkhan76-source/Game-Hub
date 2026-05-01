document.getElementById('game-title').textContent = '♟️ CHESS';
const container = document.getElementById('game-container');
container.innerHTML = `
  <div style="text-align:center;width:100%;font-family:'Orbitron',sans-serif;">
    <div id="msg" style="
      font-size:15px;padding:10px 20px;margin-bottom:12px;border-radius:8px;
      background:#1a2a1a;color:#00ff87;border:1px solid #00ff87;
      display:inline-block;letter-spacing:1px;">
      White's turn — click a piece to move
    </div>
    <div style="display:flex;justify-content:center;gap:40px;margin-bottom:10px;">
      <div>
        <div style="color:#aaa;font-size:11px;margin-bottom:4px;">BLACK CAPTURED</div>
        <div id="cap-black" style="font-size:20px;min-height:24px;color:#fff;"></div>
      </div>
      <div>
        <div style="color:#aaa;font-size:11px;margin-bottom:4px;">WHITE CAPTURED</div>
        <div id="cap-white" style="font-size:20px;min-height:24px;color:#fff;"></div>
      </div>
    </div>
    <div id="board" style="
      display:inline-grid;grid-template-columns:repeat(8,56px);
      border:3px solid #00ff87;border-radius:4px;overflow:hidden;
      box-shadow:0 0 30px rgba(0,255,135,0.3);">
    </div>
    <div style="margin-top:14px;display:flex;justify-content:center;align-items:center;gap:16px;">
      <button onclick="resetGame()" style="
        background:#00ff87;color:#000;border:none;padding:10px 28px;
        border-radius:6px;font-family:'Orbitron',sans-serif;font-size:13px;
        font-weight:700;cursor:pointer;letter-spacing:1px;">NEW GAME</button>
      <span style="color:#888;font-size:12px;">2-player mode</span>
    </div>
    <div id="promo-modal" style="
      display:none;position:fixed;top:0;left:0;width:100%;height:100%;
      background:rgba(0,0,0,0.85);z-index:999;
      justify-content:center;align-items:center;">
      <div style="
        background:#0d1117;border:2px solid #00ff87;border-radius:12px;
        padding:30px;text-align:center;box-shadow:0 0 40px rgba(0,255,135,0.4);">
        <div style="color:#00ff87;font-size:16px;font-weight:700;margin-bottom:20px;letter-spacing:2px;">
          PAWN PROMOTION
        </div>
        <div style="color:#aaa;font-size:13px;margin-bottom:20px;">Choose a piece to promote your pawn:</div>
        <div id="promo-choices" style="display:flex;gap:16px;justify-content:center;"></div>
      </div>
    </div>
  </div>`;

// ── Piece definitions ──────────────────────────────────────────────
const WP='♙',WR='♖',WN='♘',WB='♗',WQ='♕',WK='♔';
const BP='♟',BR='♜',BN='♞',BB='♝',BQ='♛',BK='♚';
const WHITE_SET = new Set([WP,WR,WN,WB,WQ,WK]);
const BLACK_SET = new Set([BP,BR,BN,BB,BQ,BK]);

const isW = p => p && WHITE_SET.has(p);
const isB = p => p && BLACK_SET.has(p);
const sideOf = p => isW(p)?'white':isB(p)?'black':null;
const opp = s => s==='white'?'black':'white';
const inBounds = (r,c) => r>=0&&r<8&&c>=0&&c<8;
const cloneBoard = b => b.map(r=>[...r]);

// ── Initial board ──────────────────────────────────────────────────
const INIT = [
  [BR,BN,BB,BQ,BK,BB,BN,BR],
  [BP,BP,BP,BP,BP,BP,BP,BP],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  ['','','','','','','',''],
  [WP,WP,WP,WP,WP,WP,WP,WP],
  [WR,WN,WB,WQ,WK,WB,WN,WR],
];

// ── State ──────────────────────────────────────────────────────────
let board, selected, turn, moveCount, legalMoves;
let capturedByWhite, capturedByBlack, gameOver, promoPending;

// ── Move generation ────────────────────────────────────────────────
function rawMoves(b, r, c) {
  const p = b[r][c];
  if (!p) return [];
  const side = sideOf(p);
  // FIX: ally/enemy must check p is non-empty first (isW/isB already handle this)
  const ally  = side==='white' ? isW : isB;
  const enemy = side==='white' ? isB : isW;
  const moves = [];

  const slide = (dr, dc) => {
    let nr=r+dr, nc=c+dc;
    while (inBounds(nr,nc)) {
      if (ally(b[nr][nc])) break;        // blocked by own piece
      moves.push([nr,nc]);
      if (enemy(b[nr][nc])) break;       // can capture but not pass through
      nr+=dr; nc+=dc;
    }
  };
  const step = (dr, dc) => {
    const nr=r+dr, nc=c+dc;
    if (inBounds(nr,nc) && !ally(b[nr][nc])) moves.push([nr,nc]);
  };

  switch(p) {
    case WP:
      if (inBounds(r-1,c) && !b[r-1][c]) {
        moves.push([r-1,c]);
        if (r===6 && !b[r-2][c]) moves.push([r-2,c]);
      }
      if (inBounds(r-1,c-1) && isB(b[r-1][c-1])) moves.push([r-1,c-1]);
      if (inBounds(r-1,c+1) && isB(b[r-1][c+1])) moves.push([r-1,c+1]);
      break;
    case BP:
      if (inBounds(r+1,c) && !b[r+1][c]) {
        moves.push([r+1,c]);
        if (r===1 && !b[r+2][c]) moves.push([r+2,c]);
      }
      if (inBounds(r+1,c-1) && isW(b[r+1][c-1])) moves.push([r+1,c-1]);
      if (inBounds(r+1,c+1) && isW(b[r+1][c+1])) moves.push([r+1,c+1]);
      break;
    case WR: case BR:
      [[-1,0],[1,0],[0,-1],[0,1]].forEach(d=>slide(...d)); break;
    case WB: case BB:
      [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(d=>slide(...d)); break;
    case WQ: case BQ:
      [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(d=>slide(...d)); break;
    case WK: case BK:
      [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(d=>step(...d)); break;
    case WN: case BN:
      [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(d=>step(...d)); break;
  }
  return moves;
}

function findKing(b, side) {
  const king = side==='white' ? WK : BK;
  for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(b[r][c]===king) return [r,c];
  return null;
}

function isAttacked(b, r, c, bySide) {
  for(let rr=0;rr<8;rr++) for(let cc=0;cc<8;cc++)
    if(sideOf(b[rr][cc])===bySide && rawMoves(b,rr,cc).some(([mr,mc])=>mr===r&&mc===c))
      return true;
  return false;
}

function inCheck(b, side) {
  const kp = findKing(b, side);
  return kp ? isAttacked(b, kp[0], kp[1], opp(side)) : false;
}

function legalMovesFor(b, r, c) {
  const side = sideOf(b[r][c]);
  if (!side) return [];
  return rawMoves(b,r,c).filter(([nr,nc]) => {
    const nb = cloneBoard(b);
    nb[nr][nc] = nb[r][c]; nb[r][c] = '';
    return !inCheck(nb, side);
  });
}

function allLegalMoves(b, side) {
  const all = [];
  for(let r=0;r<8;r++) for(let c=0;c<8;c++)
    if(sideOf(b[r][c])===side)
      legalMovesFor(b,r,c).forEach(m=>all.push(m));
  return all;
}

// ── Reset ──────────────────────────────────────────────────────────
function resetGame() {
  board = INIT.map(r=>[...r]);
  selected=null; turn='white'; moveCount=0;
  legalMoves=[]; capturedByWhite=[]; capturedByBlack=[];
  gameOver=false; promoPending=null;
  hidePromoModal();
  setMsg("White's turn — click a piece to move", '#00ff87');
  render();
}

// ── Render ─────────────────────────────────────────────────────────
function render() {
  const el = document.getElementById('board');
  el.innerHTML = '';
  const wCheck = inCheck(board,'white');
  const bCheck = inCheck(board,'black');
  const wKing  = findKing(board,'white');
  const bKing  = findKing(board,'black');
  const targets = new Set(legalMoves.map(([r,c])=>`${r},${c}`));

  for(let r=0;r<8;r++) for(let c=0;c<8;c++) {
    const sq = document.createElement('div');
    let bg = (r+c)%2===0 ? '#1a3a5c' : '#0d2137';

    if (selected && selected[0]===r && selected[1]===c) bg = '#2a6a3a';

    const isWK = wKing && wKing[0]===r && wKing[1]===c;
    const isBK = bKing && bKing[0]===r && bKing[1]===c;
    if ((isWK&&wCheck)||(isBK&&bCheck)) bg = '#8b1a1a';

    const isTarget = targets.has(`${r},${c}`);

    sq.style.cssText = `
      width:56px;height:56px;display:flex;align-items:center;justify-content:center;
      font-size:34px;cursor:pointer;position:relative;background:${bg};box-sizing:border-box;
      ${isTarget ? 'box-shadow:inset 0 0 0 3px rgba(0,255,135,0.8);' : ''}
    `;

    // Green dot on empty legal squares
    if (isTarget && !board[r][c]) {
      const dot = document.createElement('div');
      dot.style.cssText = 'position:absolute;width:18px;height:18px;border-radius:50%;background:rgba(0,255,135,0.55);pointer-events:none;';
      sq.appendChild(dot);
    }

    if (board[r][c]) {
      const sp = document.createElement('span');
      sp.textContent = board[r][c];
      sp.style.cssText = 'position:relative;z-index:1;user-select:none;';
      sq.appendChild(sp);
    }

    // Coordinate labels
    if (c===0) { const l=document.createElement('span'); l.textContent=8-r; l.style.cssText='position:absolute;top:2px;left:3px;font-size:9px;color:rgba(255,255,255,0.35);font-family:monospace;'; sq.appendChild(l); }
    if (r===7) { const l=document.createElement('span'); l.textContent='abcdefgh'[c]; l.style.cssText='position:absolute;bottom:2px;right:3px;font-size:9px;color:rgba(255,255,255,0.35);font-family:monospace;'; sq.appendChild(l); }

    sq.onclick = () => clickSq(r,c);
    el.appendChild(sq);
  }

  document.getElementById('cap-white').textContent = capturedByWhite.join(' ');
  document.getElementById('cap-black').textContent = capturedByBlack.join(' ');
}

// ── Click handler ──────────────────────────────────────────────────
function clickSq(r, c) {
  if (gameOver || promoPending) return;
  const piece = board[r][c];

  if (selected === null) {
    if (piece && sideOf(piece)===turn) {
      selected=[r,c];
      legalMoves = legalMovesFor(board,r,c);
      render();
    }
    return;
  }

  const [sr,sc] = selected;
  // Deselect
  if (sr===r && sc===c) { selected=null; legalMoves=[]; render(); return; }
  // Switch selection to another own piece
  if (piece && sideOf(piece)===turn) { selected=[r,c]; legalMoves=legalMovesFor(board,r,c); render(); return; }
  // Try move
  if (!legalMoves.some(([mr,mc])=>mr===r&&mc===c)) { selected=null; legalMoves=[]; render(); return; }

  // Execute move
  const moving = board[sr][sc];
  const captured = board[r][c];
  board[r][c] = moving; board[sr][sc] = '';
  if (captured) { (turn==='white' ? capturedByWhite : capturedByBlack).push(captured); }
  moveCount++; selected=null; legalMoves=[];

  // Pawn promotion check
  if ((moving===WP && r===0) || (moving===BP && r===7)) {
    promoPending = {r, c, color:turn};
    render(); showPromoModal(turn); return;
  }

  finishTurn();
}

// ── After each move ────────────────────────────────────────────────
function finishTurn() {
  turn = opp(turn);
  const hasMovesLeft = allLegalMoves(board,turn).length > 0;
  const check = inCheck(board,turn);

  if (!hasMovesLeft) {
    if (check) {
      const winner = opp(turn);
      setMsg(`♟️ CHECKMATE! ${winner.toUpperCase()} WINS! 🎉`, '#ffd700');
      if (typeof submitScore === 'function') submitScore(100);
      gameOver=true;
    } else {
      setMsg('🤝 STALEMATE — Draw!', '#aaaaaa');
      gameOver=true;
    }
  } else if (check) {
    setMsg(`⚠️ CHECK! ${turn.charAt(0).toUpperCase()+turn.slice(1)}'s king is in check!`, '#ff6b6b');
  } else {
    setMsg(`${turn.charAt(0).toUpperCase()+turn.slice(1)}'s turn`, '#00ff87');
  }
  render();
}

// ── Pawn Promotion ─────────────────────────────────────────────────
function showPromoModal(color) {
  const modal=document.getElementById('promo-modal');
  const choices=document.getElementById('promo-choices');
  modal.style.display='flex'; choices.innerHTML='';
  const opts = color==='white'
    ? [{p:WQ,n:'Queen'},{p:WR,n:'Rook'},{p:WB,n:'Bishop'},{p:WN,n:'Knight'}]
    : [{p:BQ,n:'Queen'},{p:BR,n:'Rook'},{p:BB,n:'Bishop'},{p:BN,n:'Knight'}];
  opts.forEach(({p,n}) => {
    const btn=document.createElement('div');
    btn.style.cssText='width:70px;height:80px;background:#0d1117;border:2px solid #333;border-radius:10px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;transition:all 0.2s;';
    btn.innerHTML=`<span style="font-size:36px;">${p}</span><span style="font-size:10px;color:#aaa;font-family:Orbitron,sans-serif;">${n}</span>`;
    btn.onmouseover=()=>{btn.style.border='2px solid #00ff87';btn.style.background='#1a2a1a';};
    btn.onmouseout=()=>{btn.style.border='2px solid #333';btn.style.background='#0d1117';};
    btn.onclick=()=>promotePawn(p);
    choices.appendChild(btn);
  });
}

function hidePromoModal() { document.getElementById('promo-modal').style.display='none'; }

function promotePawn(piece) {
  if (!promoPending) return;
  board[promoPending.r][promoPending.c] = piece;
  promoPending=null; hidePromoModal(); finishTurn();
}

// ── Message ────────────────────────────────────────────────────────
function setMsg(text, color='#00ff87') {
  const m=document.getElementById('msg');
  m.textContent=text; m.style.color=color; m.style.borderColor=color;
  m.style.background = color==='#ffd700'?'#2a2000':color==='#ff6b6b'?'#2a0000':color==='#aaaaaa'?'#1a1a1a':'#1a2a1a';
}

resetGame();