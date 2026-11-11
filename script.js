const STORAGE_KEY = "goldTrackJournal_v1";
const $ = (id) => document.getElementById(id);

let data = loadData();
let currentTab = "all";

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.workouts) && Array.isArray(saved.food)) return saved;
  } catch (error) {}
  return { workouts: [], food: [] };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

$("workoutDate").value = todayISO();
$("foodDate").value = todayISO();
$("todayLabel").textContent = new Date().toLocaleDateString(undefined, {
  weekday: "long", month: "long", day: "numeric"
}).toUpperCase();

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}

function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}

$("workoutForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    type: "workout",
    exercise: $("exercise").value.trim(),
    date: $("workoutDate").value,
    sets: Number($("sets").value),
    reps: Number($("reps").value),
    load: $("load").value === "" ? null : Number($("load").value),
    effort: $("effort").value,
    notes: $("workoutNotes").value.trim(),
    createdAt: Date.now()
  };

  if (!entry.exercise || !entry.date || entry.sets < 1 || entry.reps < 1) return;
  data.workouts.push(entry);
  saveData();
  $("workoutForm").reset();
  $("workoutDate").value = todayISO();
  $("sets").value = 3;
  $("reps").value = 8;
  render();
  toast("Workout entry saved!");
});

$("foodForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    type: "food",
    meal: $("mealType").value,
    name: $("foodName").value.trim(),
    group: $("foodGroup").value,
    date: $("foodDate").value,
    feeling: $("foodFeeling").value,
    notes: $("foodNotes").value.trim(),
    createdAt: Date.now()
  };
  if (!entry.name || !entry.date) return;
  data.food.push(entry);
  saveData();
  $("foodForm").reset();
  $("foodDate").value = todayISO();
  render();
  toast("Food journal entry saved!");
});

function getAchievements() {
  const workouts = data.workouts;
  const uniqueDays = new Set(workouts.map(w => w.date)).size;
  const uniqueExercises = new Set(workouts.map(w => w.exercise.toLowerCase())).size;
  const achievements = [
    { title: "First Session", desc: "Log your first workout.", icon: "✦", earned: workouts.length >= 1 },
    { title: "Finding Your Rhythm", desc: "Log 5 workout sessions.", icon: "♜", earned: workouts.length >= 5 },
    { title: "Regular Practice", desc: "Log 10 workout sessions.", icon: "⚡", earned: workouts.length >= 10 },
    { title: "Movement Explorer", desc: "Try 5 different exercises.", icon: "◇", earned: uniqueExercises >= 5 },
    { title: "Showed Up", desc: "Be active on 3 different days.", icon: "☀", earned: uniqueDays >= 3 },
    { title: "Food Journal Starter", desc: "Log your first meal.", icon: "◈", earned: data.food.length >= 1 },
    { title: "Food Journal Habit", desc: "Log 10 meals or snacks.", icon: "✧", earned: data.food.length >= 10 }
  ];
  return achievements;
}

function renderStats() {
  $("workoutCount").textContent = data.workouts.length;
  $("exerciseCount").textContent = data.workouts.length;
  $("mealCount").textContent = data.food.length;
  $("achievementCount").textContent = getAchievements().filter(a => a.earned).length;
}

function renderAchievements() {
  $("achievementList").innerHTML = getAchievements().map(a => `
    <div class="achievement ${a.earned ? "" : "locked"}">
      <div class="achievement-icon">${a.earned ? a.icon : "🔒"}</div>
      <div><strong>${safeText(a.title)} ${a.earned ? "✓" : ""}</strong>
      <small>${safeText(a.desc)}</small></div>
    </div>
  `).join("");
}

function renderActivity() {
  const all = [
    ...data.workouts.map(x => ({...x, kind: "workout"})),
    ...data.food.map(x => ({...x, kind: "food"}))
  ].filter(x => currentTab === "all" || x.kind === currentTab)
   .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  if (!all.length) {
    $("activityList").innerHTML = '<p class="empty-state">No entries yet. Add a workout or food journal entry above.</p>';
    return;
  }

  $("activityList").innerHTML = all.map(item => {
    if (item.kind === "workout") {
      const loadText = item.load === null ? "Weight not recorded" : `${item.load} lb used`;
      return `<div class="activity-item">
        <div><div class="activity-title">${safeText(item.exercise)}</div>
        <div class="activity-sub">${safeText(item.date)} · ${item.sets} sets × ${item.reps} reps · ${loadText}</div></div>
        <span class="activity-tag">WORKOUT</span>
      </div>`;
    }
    return `<div class="activity-item">
      <div><div class="activity-title">${safeText(item.meal)} · ${safeText(item.name)}</div>
      <div class="activity-sub">${safeText(item.date)} · ${safeText(item.group || "Mixed meal")} · ${safeText(item.feeling)}</div></div>
      <span class="activity-tag">${safeText(item.meal).toUpperCase()}</span>
    </div>`;
  }).join("");
}

function drawChart() {
  const canvas = $("progressChart");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    days.push({ iso, label: d.toLocaleDateString(undefined, { weekday: "short" }) });
  }
  const counts = days.map(day => data.workouts.filter(w => w.date === day.iso).length);
  const max = Math.max(3, ...counts);
  const pad = { left: 34, right: 16, top: 18, bottom: 32 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  ctx.font = "12px DM Sans, sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 3; i++) {
    const y = pad.top + chartH - (chartH * i / 3);
    ctx.strokeStyle = "#343536";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(width - pad.right, y); ctx.stroke();
    ctx.fillStyle = "#8f8e89";
    ctx.fillText(String(Math.round(max * i / 3)), pad.left - 9, y + 4);
  }

  const slot = chartW / 7;
  counts.forEach((count, i) => {
    const barW = Math.min(43, slot * .48);
    const barH = count === 0 ? 3 : (count / max) * chartH;
    const x = pad.left + slot * i + (slot - barW) / 2;
    const y = pad.top + chartH - barH;
    ctx.fillStyle = "#d9aa50";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, barW, barH, 6);
    else ctx.rect(x, y, barW, barH);
    ctx.fill();
    ctx.fillStyle = "#aaa9a3";
    ctx.textAlign = "center";
    ctx.fillText(days[i].label, x + barW / 2, height - 10);
    if (count > 0) {
      ctx.fillStyle = "#f3d28f";
      ctx.fillText(String(count), x + barW / 2, Math.max(12, y - 7));
    }
  });
}

function render() {
  renderStats();
  renderAchievements();
  renderActivity();
  drawChart();
}

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    currentTab = button.dataset.tab;
    renderActivity();
  });
});

$("clearBtn").addEventListener("click", () => {
  if (!confirm("Delete all workout and food journal entries from this browser? This cannot be undone.")) return;
  data = { workouts: [], food: [] };
  saveData();
  render();
  toast("Your journal has been cleared.");
});

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "gold-track-journal.json";
  link.click();
  URL.revokeObjectURL(url);
  toast("Journal backup downloaded.");
});

render();
