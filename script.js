// script.js
const timerEl = document.getElementById('timer');
const statusEl = document.getElementById('status');
const inspectionEl = document.getElementById('inspection');
const scrambleEl = document.getElementById('scramble');
const historyEl = document.getElementById('history');
const bestTimeEl = document.getElementById('bestTime');
const avgTimeEl = document.getElementById('avgTime');
const ao5El = document.getElementById('ao5');
const ao12El = document.getElementById('ao12');
const countBadgeEl = document.getElementById('countBadge');
const themeToggle = document.getElementById('themeToggle');
const newScrambleBtn = document.getElementById('newScramble');
const clearAllBtn = document.getElementById('clearAll');
const inspectionToggleBtn = document.getElementById('inspectionToggle');
const timerCard = document.querySelector('.timer-card');

let isRunning = false;
let isPreparing = false;
let startTime = 0;
let timerInterval = null;
let holdReady = false;
let inspectionEnabled = true;
let inspectionActive = false;
let inspectionSeconds = 15;
let inspectionInterval = null;
let currentScramble = '';
let solves = JSON.parse(localStorage.getItem('cubeTimerSolves') || '[]');
let currentTheme = localStorage.getItem('cubeTimerTheme') || 'dark';

function applyTheme() {
  document.body.classList.toggle('light', currentTheme === 'light');
  themeToggle.textContent = currentTheme === 'light' ? '🌙 Tema escuro' : '☀️ Tema claro';
  localStorage.setItem('cubeTimerTheme', currentTheme);
}

function generateScramble(length = 20) {
  const moves = ['R', 'L', 'U', 'D', 'F', 'B'];
  const modifiers = ['', "'", '2'];
  const axisMap = {
    R: 'x', L: 'x',
    U: 'y', D: 'y',
    F: 'z', B: 'z'
  };

  const scramble = [];
  let lastMove = null;
  let lastAxis = null;

  while (scramble.length < length) {
    const move = moves[Math.floor(Math.random() * moves.length)];
    const axis = axisMap[move];

    if (move === lastMove) continue;
    if (axis === lastAxis) continue;

    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    scramble.push(move + mod);
    lastMove = move;
    lastAxis = axis;
  }

  return scramble.join(' ');
}

function setNewScramble() {
  currentScramble = generateScramble();
  scrambleEl.textContent = currentScramble;
}

function formatTime(ms) {
  if (ms == null || Number.isNaN(ms)) return '--';

  const totalMs = Math.floor(ms % 1000).toString().padStart(3, '0');
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');

  return `${minutes.toString().padStart(2, '0')}:${seconds}.${totalMs}`;
}

function updateTimerDisplay(ms) {
  timerEl.textContent = formatTime(ms);
}

function startInspection() {
  inspectionActive = true;
  inspectionSeconds = 15;
  inspectionEl.textContent = inspectionSeconds;
  inspectionEl.classList.remove('hidden');
  statusEl.textContent = 'Inspeção';
  timerEl.textContent = '00:00.000';
  timerEl.classList.remove('ready');

  clearInterval(inspectionInterval);
  inspectionInterval = setInterval(() => {
    inspectionSeconds--;
    inspectionEl.textContent = inspectionSeconds;

    if (inspectionSeconds <= 0) {
      clearInterval(inspectionInterval);
      inspectionEl.classList.add('hidden');
      inspectionActive = false;
      startTimer();
    }
  }, 1000);
}

function startTimer() {
  clearInterval(inspectionInterval);
  inspectionEl.classList.add('hidden');
  inspectionActive = false;
  isRunning = true;
  startTime = performance.now();
  statusEl.textContent = 'Cronômetro rodando';
  timerEl.classList.remove('ready');
  timerEl.classList.add('running');

  timerInterval = setInterval(() => {
    const elapsed = performance.now() - startTime;
    updateTimerDisplay(elapsed);
  }, 10);
}

function stopTimer() {
  if (!isRunning) return;

  clearInterval(timerInterval);
  isRunning = false;
  timerEl.classList.remove('running');
  const elapsed = performance.now() - startTime;
  updateTimerDisplay(elapsed);
  statusEl.textContent = 'Tempo salvo';

  solves.unshift({
    time: Math.round(elapsed),
    scramble: currentScramble,
    createdAt: new Date().toISOString()
  });

  localStorage.setItem('cubeTimerSolves', JSON.stringify(solves));
  setNewScramble();
  renderAll();
}

function averageOf(values, count) {
  if (values.length < count) return null;
  const slice = values.slice(0, count).map(item => item.time);
  return Math.round(slice.reduce((sum, value) => sum + value, 0) / slice.length);
}

function renderStats() {
  countBadgeEl.textContent = `${solves.length} solve${solves.length === 1 ? '' : 's'}`;

  if (!solves.length) {
    bestTimeEl.textContent = '--';
    avgTimeEl.textContent = '--';
    ao5El.textContent = '--';
    ao12El.textContent = '--';
    return;
  }

  const best = Math.min(...solves.map(s => s.time));
  const avg = Math.round(solves.reduce((sum, s) => sum + s.time, 0) / solves.length);

  bestTimeEl.textContent = formatTime(best);
  avgTimeEl.textContent = formatTime(avg);
  ao5El.textContent = formatTime(averageOf(solves, 5));
  ao12El.textContent = formatTime(averageOf(solves, 12));
}

function renderHistory() {
  if (!solves.length) {
    historyEl.className = 'history-list empty-state';
    historyEl.textContent = 'Nenhum tempo registrado ainda.';
    return;
  }

  historyEl.className = 'history-list';
  historyEl.innerHTML = solves.map((solve, index) => `
    <article class="solve-item">
      <div class="solve-head">
        <span class="solve-index">#${solves.length - index}</span>
        <strong class="solve-time">${formatTime(solve.time)}</strong>
      </div>
      <div class="solve-scramble">${solve.scramble}</div>
    </article>
  `).join('');
}

function renderAll() {
  renderStats();
  renderHistory();
}

function armTimer() {
  if (isRunning || inspectionActive) return;
  holdReady = true;
  isPreparing = true;
  timerEl.classList.add('ready');
  statusEl.textContent = 'Solte para começar';
}

function releaseTimer() {
  if (!holdReady || isRunning || inspectionActive) return;

  holdReady = false;
  isPreparing = false;

  if (inspectionEnabled) {
    startInspection();
  } else {
    startTimer();
  }
}

function cancelArm() {
  if (isRunning || inspectionActive) return;
  holdReady = false;
  isPreparing = false;
  timerEl.classList.remove('ready');
  statusEl.textContent = 'Pronto';
}

inspectionToggleBtn.addEventListener('click', () => {
  inspectionEnabled = !inspectionEnabled;
  inspectionToggleBtn.textContent = `Inspeção: ${inspectionEnabled ? 'ON' : 'OFF'}`;
  inspectionToggleBtn.classList.toggle('active', inspectionEnabled);
});

themeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme();
});

newScrambleBtn.addEventListener('click', setNewScramble);

clearAllBtn.addEventListener('click', () => {
  const ok = confirm('Deseja realmente apagar todos os tempos?');
  if (!ok) return;
  solves = [];
  localStorage.removeItem('cubeTimerSolves');
  renderAll();
  statusEl.textContent = 'Tempos apagados';
  updateTimerDisplay(0);
});

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault();

  if (isRunning) {
    stopTimer();
    return;
  }

  if (!e.repeat) armTimer();
});

document.addEventListener('keyup', (e) => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  releaseTimer();
});

window.addEventListener('blur', cancelArm);

timerCard.addEventListener('pointerdown', (e) => {
  e.preventDefault();

  if (isRunning) {
    stopTimer();
    return;
  }

  armTimer();
});

timerCard.addEventListener('pointerup', (e) => {
  e.preventDefault();
  releaseTimer();
});

timerCard.addEventListener('pointerleave', () => {
  if (!isRunning && !inspectionActive && isPreparing) cancelArm();
});

applyTheme();
setNewScramble();
updateTimerDisplay(0);
renderAll();