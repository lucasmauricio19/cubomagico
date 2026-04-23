const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("status");
const inspectionEl = document.getElementById("inspection");
const scrambleEl = document.getElementById("scramble");
const bestTimeEl = document.getElementById("bestTime");
const avgTimeEl = document.getElementById("avgTime");
const ao5El = document.getElementById("ao5");
const ao12El = document.getElementById("ao12");
const solveCountEl = document.getElementById("solveCount");
const lastTimeEl = document.getElementById("lastTime");
const inspectionStateEl = document.getElementById("inspectionState");
const historyTableEl = document.getElementById("historyTable");
const chartCanvas = document.getElementById("chartCanvas");
const timerZone = document.getElementById("timerZone");

const newScrambleBtn = document.getElementById("newScramble");
const inspectionToggleBtn = document.getElementById("inspectionToggle");
const clearAllBtn = document.getElementById("clearAll");
const copyScrambleBtn = document.getElementById("copyScramble");

let solves = JSON.parse(localStorage.getItem("cubeTimerSolves") || "[]");
let currentScramble = "";
let timerRunning = false;
let preparing = false;
let holdArmed = false;
let inspectionEnabled = true;
let inspectionActive = false;
let inspectionTime = 15;
let startTime = 0;
let timerInterval = null;
let inspectionInterval = null;

function formatTime(ms) {
  if (ms == null || Number.isNaN(ms)) return "--";

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function generateScramble(length = 20) {
  const moves = ["R", "L", "U", "D", "F", "B"];
  const modifiers = ["", "'", "2"];
  const axisMap = {
    R: "x", L: "x",
    U: "y", D: "y",
    F: "z", B: "z"
  };

  let scramble = [];
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

  return scramble.join(" ");
}

function setNewScramble() {
  currentScramble = generateScramble();
  scrambleEl.textContent = currentScramble;
}

function averageOf(count) {
  if (solves.length < count) return null;
  const list = solves.slice(0, count).map(s => s.time);
  const avg = list.reduce((sum, value) => sum + value, 0) / list.length;
  return Math.round(avg);
}

function updateHeaderStats() {
  if (!solves.length) {
    bestTimeEl.textContent = "--";
    avgTimeEl.textContent = "--";
    ao5El.textContent = "--";
    ao12El.textContent = "--";
    solveCountEl.textContent = "0";
    lastTimeEl.textContent = "--";
    return;
  }

  const best = Math.min(...solves.map(s => s.time));
  const avg = Math.round(solves.reduce((sum, s) => sum + s.time, 0) / solves.length);

  bestTimeEl.textContent = formatTime(best);
  avgTimeEl.textContent = formatTime(avg);
  ao5El.textContent = formatTime(averageOf(5));
  ao12El.textContent = formatTime(averageOf(12));
  solveCountEl.textContent = String(solves.length);
  lastTimeEl.textContent = formatTime(solves[0].time);
}

function renderTable() {
  if (!solves.length) {
    historyTableEl.innerHTML = `
      <tr>
        <td colspan="3" style="color:#8e9bb7;">No solves yet.</td>
      </tr>
    `;
    return;
  }

  historyTableEl.innerHTML = solves.slice(0, 30).map((solve, index) => `
    <tr>
      <td>${solves.length - index}</td>
      <td class="solve-time">${formatTime(solve.time)}</td>
      <td class="solve-scramble">${solve.scramble}</td>
    </tr>
  `).join("");
}

function drawChart() {
  const ctx = chartCanvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = chartCanvas.clientWidth;
  const height = 240;

  chartCanvas.width = width * ratio;
  chartCanvas.height = height * ratio;
  chartCanvas.style.height = `${height}px`;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (solves.length < 2) {
    ctx.fillStyle = "#8e9bb7";
    ctx.font = "14px Inter";
    ctx.fillText("Add more solves to see progress.", 18, 30);
    return;
  }

  const values = solves.slice().reverse().map(s => s.time);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const padding = 24;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;
  const range = Math.max(max - min, 1);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;

  for (let i = 0; i < 4; i++) {
    const y = padding + (graphHeight / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, "#4f7cff");
  gradient.addColorStop(1, "#8f5cff");

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.beginPath();

  values.forEach((value, index) => {
    const x = padding + (graphWidth / (values.length - 1)) * index;
    const y = padding + graphHeight - ((value - min) / range) * graphHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  values.forEach((value, index) => {
    const x = padding + (graphWidth / (values.length - 1)) * index;
    const y = padding + graphHeight - ((value - min) / range) * graphHeight;
    ctx.fillStyle = "#dfe7ff";
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function saveSolves() {
  localStorage.setItem("cubeTimerSolves", JSON.stringify(solves));
}

function renderAll() {
  updateHeaderStats();
  renderTable();
  drawChart();
}

function startTimer() {
  inspectionActive = false;
  inspectionEl.classList.add("hidden");
  timerRunning = true;
  startTime = performance.now();
  statusEl.textContent = "Running";
  timerEl.classList.remove("ready");
  timerEl.classList.add("running");

  timerInterval = setInterval(() => {
    const elapsed = performance.now() - startTime;
    timerEl.textContent = formatTime(elapsed);
  }, 10);
}

function stopTimer() {
  if (!timerRunning) return;

  clearInterval(timerInterval);
  timerRunning = false;
  timerEl.classList.remove("running");

  const elapsed = Math.round(performance.now() - startTime);
  timerEl.textContent = formatTime(elapsed);
  statusEl.textContent = "Saved";

  solves.unshift({
    time: elapsed,
    scramble: currentScramble,
    createdAt: new Date().toISOString()
  });

  saveSolves();
  setNewScramble();
  renderAll();
}

function startInspection() {
  inspectionActive = true;
  inspectionTime = 15;
  inspectionEl.textContent = inspectionTime;
  inspectionEl.classList.remove("hidden");
  statusEl.textContent = "Inspection";
  timerEl.classList.remove("ready");
  timerEl.textContent = "00:00.000";

  clearInterval(inspectionInterval);
  inspectionInterval = setInterval(() => {
    inspectionTime--;
    inspectionEl.textContent = inspectionTime;

    if (inspectionTime <= 0) {
      clearInterval(inspectionInterval);
      startTimer();
    }
  }, 1000);
}

function armTimer() {
  if (timerRunning || inspectionActive) return;
  holdArmed = true;
  preparing = true;
  timerEl.classList.add("ready");
  statusEl.textContent = "Release to start";
}

function releaseTimer() {
  if (!holdArmed || timerRunning || inspectionActive) return;
  holdArmed = false;
  preparing = false;

  if (inspectionEnabled) startInspection();
  else startTimer();
}

function cancelArm() {
  if (timerRunning || inspectionActive) return;
  holdArmed = false;
  preparing = false;
  timerEl.classList.remove("ready");
  statusEl.textContent = "Ready";
}

document.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;
  e.preventDefault();

  if (timerRunning) {
    stopTimer();
    return;
  }

  if (!e.repeat) armTimer();
});

document.addEventListener("keyup", (e) => {
  if (e.code !== "Space") return;
  e.preventDefault();
  releaseTimer();
});

window.addEventListener("blur", cancelArm);

timerZone.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (timerRunning) {
    stopTimer();
    return;
  }
  armTimer();
});

timerZone.addEventListener("pointerup", (e) => {
  e.preventDefault();
  releaseTimer();
});

timerZone.addEventListener("pointerleave", () => {
  if (!timerRunning && !inspectionActive && preparing) cancelArm();
});

newScrambleBtn.addEventListener("click", setNewScramble);

inspectionToggleBtn.addEventListener("click", () => {
  inspectionEnabled = !inspectionEnabled;
  inspectionToggleBtn.textContent = `Inspection: ${inspectionEnabled ? "ON" : "OFF"}`;
  inspectionToggleBtn.classList.toggle("active", inspectionEnabled);
  inspectionStateEl.textContent = inspectionEnabled ? "Enabled" : "Disabled";
});

clearAllBtn.addEventListener("click", () => {
  const ok = confirm("Do you really want to clear all solves?");
  if (!ok) return;

  solves = [];
  saveSolves();
  timerEl.textContent = "00:00.000";
  statusEl.textContent = "Ready";
  renderAll();
});

copyScrambleBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(currentScramble);
    copyScrambleBtn.textContent = "Copied";
    setTimeout(() => {
      copyScrambleBtn.textContent = "Copy";
    }, 1200);
  } catch {
    copyScrambleBtn.textContent = "Failed";
    setTimeout(() => {
      copyScrambleBtn.textContent = "Copy";
    }, 1200);
  }
});

window.addEventListener("resize", drawChart);

setNewScramble();
inspectionStateEl.textContent = inspectionEnabled ? "Enabled" : "Disabled";
renderAll();
timerEl.textContent = "00:00.000";
statusEl.textContent = "Ready";