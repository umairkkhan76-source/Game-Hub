document.getElementById('game-title').textContent = '🧠 QUIZ TRIVIA';
const container = document.getElementById('game-container');
container.innerHTML = `
  <div style="text-align:center; width:100%">
    <div style="max-width:560px; margin:0 auto; text-align:left;" id="quiz-wrap">
      <p style="color:#7070a0; font-size:.9rem; margin-bottom:.5rem;" id="progress">Question 1 of 10</p>
      <p style="font-size:1.15rem; margin-bottom:1.2rem; line-height:1.5; color:#e8e8f0;" id="question">Loading...</p>
      <div id="options" style="display:grid; gap:.6rem;"></div>
      <div style="font-family:'Orbitron',monospace; font-size:1rem; letter-spacing:2px; margin:1rem 0; min-height:1.8rem;" id="msg"></div>
    </div>
  </div>`;

const QUESTIONS = [
  {q:"What is the capital of France?",
   a:"Paris",
   opts:["London","Berlin","Paris","Madrid"]},
  {q:"Which planet is known as the Red Planet?",
   a:"Mars",
   opts:["Venus","Mars","Jupiter","Saturn"]},
  {q:"What is 15 × 15?",
   a:"225",
   opts:["200","215","225","250"]},
  {q:"Who painted the Mona Lisa?",
   a:"Leonardo da Vinci",
   opts:["Michelangelo","Raphael","Leonardo da Vinci","Picasso"]},
  {q:"How many sides does a hexagon have?",
   a:"6",
   opts:["5","6","7","8"]},
  {q:"What is the chemical symbol for water?",
   a:"H2O",
   opts:["O2","H2O","CO2","NaCl"]},
  {q:"Which country is the largest by area?",
   a:"Russia",
   opts:["China","USA","Russia","Canada"]},
  {q:"What year did World War II end?",
   a:"1945",
   opts:["1943","1944","1945","1946"]},
  {q:"Which language is known as the language of the web?",
   a:"JavaScript",
   opts:["Python","Java","C++","JavaScript"]},
  {q:"What is the speed of light (approx)?",
   a:"300,000 km/s",
   opts:["150,000 km/s","300,000 km/s","450,000 km/s","600,000 km/s"]},
  {q:"What is the largest ocean on Earth?",
   a:"Pacific",
   opts:["Atlantic","Indian","Pacific","Arctic"]},
  {q:"In which year was Python created?",
   a:"1991",
   opts:["1985","1991","1995","2000"]},
  {q:"What does HTML stand for?",
   a:"HyperText Markup Language",
   opts:["HyperText Markup Language","High Transfer Method Language","HyperTool Markup Language","None of these"]},
  {q:"How many bytes are in a kilobyte?",
   a:"1024",
   opts:["512","1000","1024","2048"]},
  {q:"What does CPU stand for?",
   a:"Central Processing Unit",
   opts:["Central Processing Unit","Core Power Unit","Computer Process Utility","Central Program Unit"]},
];

let shuffled = [], current = 0, score = 0, answered = false;

function start() {
  shuffled = [...QUESTIONS].sort(() => Math.random() - .5).slice(0, 10);
  current = 0; score = 0; answered = false;
  document.getElementById('score-val').textContent = 0;
  showQ();
}

function showQ() {
  if (current >= shuffled.length) { endGame(); return; }
  const q = shuffled[current];
  answered = false;

  document.getElementById('progress').textContent = `Question ${current + 1} of ${shuffled.length}`;
  document.getElementById('question').textContent = q.q;
  document.getElementById('msg').textContent = '';

  const opts = [...q.opts].sort(() => Math.random() - .5);
  document.getElementById('options').innerHTML = opts.map(o => `
    <button onclick="answer(this,'${o.replace(/'/g,"\\'")}','${q.a.replace(/'/g,"\\'")}')" style="
      padding:.8rem 1.2rem;
      background:#0a0a0f;
      border:1px solid #2a2a3a;
      border-radius:8px;
      cursor:pointer;
      text-align:left;
      font-size:1rem;
      color:#e8e8f0;
      transition:all .2s;
      width:100%;
    " onmouseover="this.style.borderColor='#00ff87'"
      onmouseout="this.style.borderColor='#2a2a3a'">
      ${o}
    </button>`).join('');
}

function answer(btn, chosen, correct) {
  if (answered) return;
  answered = true;
  document.querySelectorAll('#options button').forEach(b => b.disabled = true);
  const msg = document.getElementById('msg');

  if (chosen === correct) {
    btn.style.borderColor = '#00ff87';
    btn.style.background = 'rgba(0,255,135,.08)';
    btn.style.color = '#00ff87';
    score += 10;
    msg.textContent = '✅ Correct!';
    msg.style.color = '#00ff87';
  } else {
    btn.style.borderColor = '#ff6b6b';
    btn.style.background = 'rgba(255,107,107,.08)';
    btn.style.color = '#ff6b6b';
    document.querySelectorAll('#options button').forEach(b => {
      if (b.textContent.trim() === correct) {
        b.style.borderColor = '#00ff87';
        b.style.color = '#00ff87';
      }
    });
    msg.textContent = `❌ Wrong! Answer: ${correct}`;
    msg.style.color = '#ff6b6b';
  }
  setTimeout(() => { current++; showQ(); }, 1500);
}

function endGame() {
  updateScore(score);
  if (typeof submitScore === 'function') submitScore(score);
  document.getElementById('quiz-wrap').innerHTML = `
    <div style="text-align:center; padding:2rem">
      <h2 style="font-family:'Orbitron',monospace; font-size:2.5rem; color:#00ff87">${score}/100</h2>
      <p style="color:#7070a0; margin:1rem 0; font-size:1.1rem">
        ${score >= 80 ? '🏆 Excellent!' : score >= 50 ? '👍 Good job!' : '📚 Keep practicing!'}
      </p>
      <button onclick="location.reload()" style="
        padding:.7rem 2rem;
        background:#00ff87;
        color:#0a0a0f;
        border:none;
        border-radius:8px;
        font-family:'Orbitron',monospace;
        font-size:.9rem;
        font-weight:700;
        cursor:pointer;
      ">PLAY AGAIN</button>
    </div>`;
}

start();