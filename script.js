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
        <td colspan="3" style="color:#8e9bb7; padding:18px;">Nenhum solve ainda.</td>
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
  const height = 280;

  chartCanvas.width = width * ratio;
  chartCanvas.height = height * ratio;
  chartCanvas.style.height = `${height}px`;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (solves.length < 2) {
    ctx.fillStyle = "#8e9bb7";
    ctx.font = "14px Inter";
    ctx.fillText("Adicione mais solves para ver o gráfico.", 20, 30);
    return;
  }

  const values = solves.slice().reverse().map(s => s.time);
  const max = Math.max(...values);
  const min = Math.min(...values);

  const paddingTop = 20;
  const paddingRight = 18;
  const paddingBottom = 24;
  const paddingLeft = 18;

  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;
  const range = Math.max(max - min, 1);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;

  for (let i = 0; i < 4; i++) {
    const y = paddingTop + (graphHeight / 3) * i;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(width - paddingRight, y);
    ctx.stroke();
  }

  const points = values.map((value, index) => {
    const x = paddingLeft + (graphWidth / (values.length - 1)) * index;
    const normalized = (value - min) / range;

    // menor tempo sobe, maior tempo desce
    const y = paddingTop + graphHeight - (normalized * graphHeight);

    return { x, y, value };
  });

  const fillGradient = ctx.createLinearGradient(0, paddingTop, 0, height);
  fillGradient.addColorStop(0, "rgba(78,127,255,0.20)");
  fillGradient.addColorStop(0.55, "rgba(141,93,255,0.10)");
  fillGradient.addColorStop(1, "rgba(141,93,255,0.01)");

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    ctx.bezierCurveTo(cx, prev.y, cx, curr.y, curr.x, curr.y);
  }

  ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
  ctx.lineTo(points[0].x, height - paddingBottom);
  ctx.closePath();
  ctx.fillStyle = fillGradient;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    ctx.bezierCurveTo(cx, prev.y, cx, curr.y, curr.x, curr.y);
  }

  ctx.strokeStyle = "rgba(104,145,255,0.22)";
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  const lineGradient = ctx.createLinearGradient(paddingLeft, 0, width - paddingRight, 0);
  lineGradient.addColorStop(0, "#5b8cff");
  lineGradient.addColorStop(1, "#a86fff");

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    ctx.bezierCurveTo(cx, prev.y, cx, curr.y, curr.x, curr.y);
  }

  ctx.strokeStyle = lineGradient;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  points.forEach((point, index) => {
    const isLast = index === points.length - 1;

    ctx.beginPath();
    ctx.arc(point.x, point.y, isLast ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isLast ? "#ffffff" : "#d8e2ff";
    ctx.fill();

    if (isLast) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(104,145,255,0.16)";
      ctx.fill();
    }
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
  inspectionToggleBtn.textContent = `Inspeção: ${inspectionEnabled ? "ON" : "OFF"}`;
  inspectionToggleBtn.classList.toggle("active", inspectionEnabled);
  inspectionStateEl.textContent = inspectionEnabled ? "Enabled" : "Disabled";
});

clearAllBtn.addEventListener("click", () => {
  const ok = confirm("Deseja realmente apagar todos os solves?");
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
    copyScrambleBtn.textContent = "Copiado";
    setTimeout(() => {
      copyScrambleBtn.textContent = "⧉ Copiar scramble";
    }, 1200);
  } catch {
    copyScrambleBtn.textContent = "Falhou";
    setTimeout(() => {
      copyScrambleBtn.textContent = "⧉ Copiar scramble";
    }, 1200);
  }
});

window.addEventListener("resize", drawChart);

setNewScramble();
inspectionStateEl.textContent = inspectionEnabled ? "Enabled" : "Disabled";
renderAll();
timerEl.textContent = "00:00.000";
statusEl.textContent = "Ready";