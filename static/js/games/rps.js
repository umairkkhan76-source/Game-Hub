document.getElementById('game-title').textContent = '✂️ ROCK PAPER SCISSORS';
const container = document.getElementById('game-container');
container.innerHTML = `
  <div style="text-align:center; width:100%">

    <div style="font-family:'Orbitron',monospace; font-size:1rem; letter-spacing:2px; margin:.5rem 0; min-height:1.8rem; color:#7070a0;" id="msg">Choose your weapon!</div>

    <!-- Score panel -->
    <div style="display:flex; justify-content:center; gap:1rem; margin-bottom:1rem; flex-wrap:wrap;">
      <div style="background:#16161f; border:1px solid #00ff87; border-radius:10px; padding:.5rem 1.5rem; text-align:center; min-width:80px;">
        <div style="color:#7070a0; font-size:.7rem; font-family:'Orbitron',monospace;">YOU</div>
        <div id="pscore" style="color:#00ff87; font-family:'Orbitron',monospace; font-size:1.8rem; font-weight:700;">0</div>
      </div>
      <div style="background:#16161f; border:1px solid #2a2a3a; border-radius:10px; padding:.5rem 1.5rem; text-align:center; min-width:80px;">
        <div style="color:#7070a0; font-size:.7rem; font-family:'Orbitron',monospace;">DRAWS</div>
        <div id="dscore" style="color:#7070a0; font-family:'Orbitron',monospace; font-size:1.8rem; font-weight:700;">0</div>
      </div>
      <div style="background:#16161f; border:1px solid #ff6b6b; border-radius:10px; padding:.5rem 1.5rem; text-align:center; min-width:80px;">
        <div style="color:#7070a0; font-size:.7rem; font-family:'Orbitron',monospace;">CPU</div>
        <div id="cscore" style="color:#ff6b6b; font-family:'Orbitron',monospace; font-size:1.8rem; font-weight:700;">0</div>
      </div>
    </div>

    <!-- Battle display -->
    <div style="
      display:flex;
      align-items:center;
      justify-content:center;
      gap:1.5rem;
      margin:1rem 0;
      background:#16161f;
      border:1px solid #2a2a3a;
      border-radius:14px;
      padding:1.2rem;
    ">
      <div style="text-align:center;">
        <div style="color:#7070a0; font-size:.75rem; font-family:'Orbitron',monospace; margin-bottom:.3rem;">YOU</div>
        <div id="player-pick" style="font-size:4rem; min-width:80px;">🤔</div>
      </div>
      <div style="text-align:center;">
        <div id="vs-text" style="font-family:'Orbitron',monospace; font-size:1.2rem; color:#2a2a3a;">VS</div>
      </div>
      <div style="text-align:center;">
        <div style="color:#7070a0; font-size:.75rem; font-family:'Orbitron',monospace; margin-bottom:.3rem;">CPU</div>
        <div id="cpu-pick" style="font-size:4rem; min-width:80px;">🤔</div>
      </div>
    </div>

    <!-- Round info -->
    <div id="round-info" style="color:#7070a0; font-size:.9rem; margin-bottom:1rem; font-family:'Orbitron',monospace; letter-spacing:1px;">
      Round 1 of 5
    </div>

    <!-- Choice buttons -->
    <div style="display:flex; gap:1.2rem; justify-content:center; margin:1rem 0;" id="choices">
      <button onclick="play('rock')" style="
        width:100px; height:100px;
        border-radius:50%;
        border:2px solid #2a2a3a;
        background:#16161f;
        font-size:3rem;
        cursor:pointer;
        transition:all .2s;
      " onmouseover="this.style.borderColor='#00ff87';this.style.transform='scale(1.1)';this.style.boxShadow='0 0 20px rgba(0,255,135,.3)'"
         onmouseout="this.style.borderColor='#2a2a3a';this.style.transform='scale(1)';this.style.boxShadow='none'">🪨</button>

      <button onclick="play('paper')" style="
        width:100px; height:100px;
        border-radius:50%;
        border:2px solid #2a2a3a;
        background:#16161f;
        font-size:3rem;
        cursor:pointer;
        transition:all .2s;
      " onmouseover="this.style.borderColor='#00ff87';this.style.transform='scale(1.1)';this.style.boxShadow='0 0 20px rgba(0,255,135,.3)'"
         onmouseout="this.style.borderColor='#2a2a3a';this.style.transform='scale(1)';this.style.boxShadow='none'">📄</button>

      <button onclick="play('scissors')" style="
        width:100px; height:100px;
        border-radius:50%;
        border:2px solid #2a2a3a;
        background:#16161f;
        font-size:3rem;
        cursor:pointer;
        transition:all .2s;
      " onmouseover="this.style.borderColor='#00ff87';this.style.transform='scale(1.1)';this.style.boxShadow='0 0 20px rgba(0,255,135,.3)'"
         onmouseout="this.style.borderColor='#2a2a3a';this.style.transform='scale(1)';this.style.boxShadow='none'">✂️</button>
    </div>

    <div style="margin-top:.5rem; display:flex; gap:.7rem; justify-content:center;">
      <button onclick="resetGame()" style="padding:.5rem 1.5rem; border:1px solid #2a2a3a; background:#0a0a0f; color:#e8e8f0; border-radius:8px; font-size:.95rem; cursor:pointer;">🔄 RESET</button>
      <button onclick="setBestOf(5)" id="bo5" style="padding:.5rem 1.5rem; border:1px solid #00ff87; background:#0a0a0f; color:#00ff87; border-radius:8px; font-size:.95rem; cursor:pointer;">Best of 5</button>
      <button onclick="setBestOf(10)" id="bo10" style="padding:.5rem 1.5rem; border:1px solid #2a2a3a; background:#0a0a0f; color:#7070a0; border-radius:8px; font-size:.95rem; cursor:pointer;">Best of 10</button>
    </div>
  </div>`;

const CHOICES = ['rock', 'paper', 'scissors'];
const EMOJI   = { rock:'🪨', paper:'📄', scissors:'✂️' };
const BEATS   = { rock:'scissors', paper:'rock', scissors:'paper' };

let playerScore = 0, cpuScore = 0, draws = 0;
let round = 1, maxRounds = 5, gameOver = false;
let streak = 0, bestStreak = 0;

function setBestOf(n) {
  maxRounds = n;
  document.getElementById('bo5').style.borderColor  = n===5  ? '#00ff87' : '#2a2a3a';
  document.getElementById('bo5').style.color         = n===5  ? '#00ff87' : '#7070a0';
  document.getElementById('bo10').style.borderColor = n===10 ? '#00ff87' : '#2a2a3a';
  document.getElementById('bo10').style.color        = n===10 ? '#00ff87' : '#7070a0';
  resetGame();
}

function play(choice) {
  if (gameOver || round > maxRounds) return;

  // CPU thinking animation
  document.getElementById('cpu-pick').textContent = '🤔';
  document.getElementById('player-pick').textContent = EMOJI[choice];

  setTimeout(() => {
    const cpu = CHOICES[Math.floor(Math.random() * 3)];
    document.getElementById('cpu-pick').textContent = EMOJI[cpu];

    const m = document.getElementById('msg');
    const vs = document.getElementById('vs-text');

    if (choice === cpu) {
      // Draw
      draws++;
      m.textContent = "It's a draw! 🤝";
      m.style.color = '#7070a0';
      vs.textContent = '=';
      vs.style.color = '#7070a0';
      streak = 0;

    } else if (BEATS[choice] === cpu) {
      // Player wins
      playerScore++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
      const streakMsg = streak >= 3 ? ` 🔥 ${streak} streak!` : '';
      m.textContent = `You win! ${EMOJI[choice]} beats ${EMOJI[cpu]}!${streakMsg}`;
      m.style.color = '#00ff87';
      vs.textContent = '>';
      vs.style.color = '#00ff87';

    } else {
      // CPU wins
      cpuScore++;
      streak = 0;
      m.textContent = `CPU wins! ${EMOJI[cpu]} beats ${EMOJI[choice]}!`;
      m.style.color = '#ff6b6b';
      vs.textContent = '<';
      vs.style.color = '#ff6b6b';
    }

    // Update scores
    document.getElementById('pscore').textContent = playerScore;
    document.getElementById('cscore').textContent = cpuScore;
    document.getElementById('dscore').textContent = draws;

    round++;

    // Check if match over
    const halfRounds = Math.ceil(maxRounds / 2);
    if (playerScore >= halfRounds || cpuScore >= halfRounds || round > maxRounds) {
      gameOver = true;
      setTimeout(showResult, 600);
    } else {
      document.getElementById('round-info').textContent = `Round ${round} of ${maxRounds}`;
    }
  }, 400);
}

function showResult() {
  updateScore(playerScore * 20);
  const roundInfo = document.getElementById('round-info');
  const m = document.getElementById('msg');

  if (playerScore > cpuScore) {
    roundInfo.textContent = `🏆 YOU WIN THE MATCH! ${playerScore}-${cpuScore}`;
    roundInfo.style.color = '#00ff87';
    m.textContent = bestStreak >= 3 ? `Amazing! Best streak: ${bestStreak} 🔥` : 'Congratulations! 🎉';
    m.style.color = '#00ff87';
  } else if (cpuScore > playerScore) {
    roundInfo.textContent = `💀 CPU WINS THE MATCH! ${cpuScore}-${playerScore}`;
    roundInfo.style.color = '#ff6b6b';
    m.textContent = 'Better luck next time! 💪';
    m.style.color = '#ff6b6b';
  } else {
    roundInfo.textContent = `🤝 MATCH DRAW! ${playerScore}-${cpuScore}`;
    roundInfo.style.color = '#7070a0';
    m.textContent = 'So close! Try again!';
    m.style.color = '#7070a0';
  }
}

function resetGame() {
  playerScore = 0; cpuScore = 0; draws = 0;
  round = 1; gameOver = false; streak = 0; bestStreak = 0;

  document.getElementById('pscore').textContent = '0';
  document.getElementById('cscore').textContent = '0';
  document.getElementById('dscore').textContent = '0';
  document.getElementById('player-pick').textContent = '🤔';
  document.getElementById('cpu-pick').textContent    = '🤔';
  document.getElementById('vs-text').textContent     = 'VS';
  document.getElementById('vs-text').style.color     = '#2a2a3a';
  document.getElementById('round-info').textContent  = `Round 1 of ${maxRounds}`;
  document.getElementById('round-info').style.color  = '#7070a0';

  const m = document.getElementById('msg');
  m.textContent = 'Choose your weapon!';
  m.style.color = '#7070a0';

}