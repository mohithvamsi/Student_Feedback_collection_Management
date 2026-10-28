"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
 
/* ---------- 1. DATA ---------- */
const DEPTS = {
  CSE:  { faculty: ["Dr. Anita Rao", "Prof. Rahul Mehta"],  courses: ["Data Structures", "Database Systems"] },
  ECE:  { faculty: ["Dr. Kavya Nair", "Prof. Sameer Iyer"], courses: ["Digital Electronics", "Signals & Systems"] },
  MECH: { faculty: ["Dr. Vikram Singh", "Prof. Neha Kulkarni"], courses: ["Thermodynamics", "Machine Design"] }
};
const QUESTIONS = [["Teaching quality", "Clear, structured, well-paced lectures"], ["Communication", "Explains ideas clearly and listens"],
  ["Subject knowledge", "Depth of knowledge, real examples"], ["Classroom engagement", "Encourages questions and discussion"]];
const WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
const COLORS = ["#7c3aed", "#14b8a6", "#f5a524"];
const TOTAL_STUDENTS = 480, KEY = "edupulse_feedback_v1";
const COMMENTS = ["Very clear explanations and helpful examples.", "Please share lecture notes before class.", "Doubt-clearing sessions are really useful.",
  "Pace is a little fast for new topics.", "Great energy — classes never feel boring.", "More practical demonstrations would help.", "Assignments match the syllabus well.", ""];
 
/* Build 48 realistic records the first time the page opens */
function seed() {
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const depts = Object.keys(DEPTS), bias = [.5, 0, .3, -.3, .2, -.6], out = [];
  for (let i = 0; i < 48; i++) {
    const d = depts[i % 3], f = Math.floor(rnd() * 2);
    const q = QUESTIONS.map(() => Math.max(1, Math.min(5, Math.round(4 + bias[depts.indexOf(d) * 2 + f] + (rnd() - .5) * 2.2))));
    out.push({ id: "S" + i, roll: d.slice(0, 2) + "21" + (100 + i), dept: d, faculty: DEPTS[d].faculty[f], course: DEPTS[d].courses[Math.floor(rnd() * 2)],
      q, avg: q.reduce((a, b) => a + b) / 4, comment: COMMENTS[Math.floor(rnd() * 8)], date: new Date(Date.now() - rnd() * 150 * 864e5).toISOString() });
  }
  return out;
}
function load() { try { const r = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(r)) return r; } catch (e) {} return seed(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(records)); } catch (e) {} }
let records = load(); save();
 
/* ---------- 2. HELPERS ---------- */
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fdate = iso => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const badge = v => `<span class="badge ${v >= 4 ? "" : v >= 3 ? "mid" : "low"}">${v.toFixed(1)} ★</span>`;
const allFaculty = () => Object.entries(DEPTS).flatMap(([d, v]) => v.faculty.map(n => ({ name: n, dept: d })));
function toast(msg, type = "ok") { const t = $("#toast"); t.textContent = msg; t.className = "toast show " + type; clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 3500); }
const opts = (list, first) => `<option value="">${first}</option>` + list.map(x => `<option>${esc(x)}</option>`).join("");
const bars = rows => rows.map(([l, v, max]) => `<div class="bar"><span>${esc(l)}</span><div><i style="--w:${(v / max * 100).toFixed(0)}%"></i></div><b>${v % 1 ? v.toFixed(1) : v}</b></div>`).join("");
 
/* ---------- 3. NAVIGATION ---------- */
function show(view) {
  $$(".view").forEach(v => v.hidden = v.id !== "view-" + view);
  $$(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  $("#sidebar").classList.remove("open"); $("#scrim").classList.remove("open"); window.scrollTo(0, 0);
  if (view === "dashboard") renderDashboard(); if (view === "admin") renderAdmin();
}
$$("[data-view]").forEach(b => b.onclick = () => show(b.dataset.view));
$$("[data-go]").forEach(b => b.onclick = () => show(b.dataset.go));
$("#menu-btn").onclick = () => { $("#sidebar").classList.add("open"); $("#scrim").classList.add("open"); };
$("#scrim").onclick = () => { $("#sidebar").classList.remove("open"); $("#scrim").classList.remove("open"); };
$("#global-search").oninput = e => { $("#f-search").value = e.target.value; show("admin"); $("#global-search").focus(); };
 
/* Notifications: newest 4 responses */
let unread = true;
function renderBell() {
  const latest = [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  $("#bell-dot").hidden = !unread;
  $("#bell-menu").innerHTML = "<b>Latest feedback</b>" + latest.map(r => `<p><strong>${esc(r.roll)}</strong> rated ${esc(r.faculty)} ${r.avg.toFixed(1)}★<br><span class="muted">${esc(r.course)} · ${fdate(r.date)}</span></p>`).join("") + '<button id="mark">Mark all as read</button>';
  $("#mark").onclick = () => { unread = false; renderBell(); };
}
$("#bell-btn").onclick = e => { e.stopPropagation(); $("#bell-menu").hidden = !$("#bell-menu").hidden; };
document.addEventListener("click", e => { if (!e.target.closest(".dropdown")) $("#bell-menu").hidden = true; });
 
/* ---------- 4. DASHBOARD ---------- */
function lineChart(labels, vals) {
  const W = 520, H = 220, max = Math.max(...vals, 1), x = i => 30 + i * (W - 60) / (vals.length - 1), y = v => H - 34 - v / max * (H - 70);
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7c3aed" stop-opacity=".3"/><stop offset="1" stop-color="#7c3aed" stop-opacity="0"/></linearGradient></defs>
  <polygon points="${x(0)},${H - 34} ${pts} ${x(vals.length - 1)},${H - 34}" fill="url(#g)"/><polyline points="${pts}" fill="none" stroke="#7c3aed" stroke-width="3" stroke-linejoin="round"/>
  ${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="#fff" stroke="#7c3aed" stroke-width="3"/><text x="${x(i)}" y="${y(v) - 12}" text-anchor="middle">${v}</text><text x="${x(i)}" y="${H - 10}" text-anchor="middle">${labels[i]}</text>`).join("")}</svg>`;
}
function donut(items) {
  const total = items.reduce((a, i) => a + i.v, 0) || 1; let off = 0;
  const arcs = items.map(i => { const len = i.v / total * 100, c = `<circle r="15.9" cx="21" cy="21" fill="none" stroke="${i.c}" stroke-width="6" stroke-dasharray="${len} ${100 - len}" stroke-dashoffset="${-off}" transform="rotate(-90 21 21)"/>`; off += len; return c; }).join("");
  return `<div class="donut-wrap"><svg viewBox="0 0 42 42">${arcs}<text x="21" y="22.500" text-anchor="middle" style="font-size:7px;font-weight:800;fill:#16213e">${total}</text></svg><div class="legend">${items.map(i => `<p style="--c:${i.c}"><i></i>${i.l} — <b style="color:inherit">${i.v}</b></p>`).join("")}</div></div>`;
}
function renderDashboard() {
  const students = new Set(records.map(r => r.roll)).size;
  const kp = [["Total students", TOTAL_STUDENTS, "users", "#7c3aed"], ["Feedback submitted", records.length, "check", "#14b8a6"], ["Pending feedback", Math.max(0, TOTAL_STUDENTS - students), "clock", "#f5a524"], ["Faculty members", allFaculty().length, "cap", "#3b82f6"]];
  $("#kpis").innerHTML = kp.map(k => `<div class="kpi"><svg class="i" style="--c:${k[3]}"><use href="#i-${k[2]}"/></svg><div><span>${k[0]}</span><strong>${k[1]}</strong></div></div>`).join("");
  const now = new Date(), labels = [], counts = [];
  for (let k = 5; k >= 0; k--) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); labels.push(d.toLocaleString(undefined, { month: "short" })); counts.push(records.filter(r => { const t = new Date(r.date); return t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear(); }).length); }
  $("#trend").innerHTML = lineChart(labels, counts);
  $("#donut").innerHTML = donut(Object.keys(DEPTS).map((d, i) => ({ l: d, v: records.filter(r => r.dept === d).length, c: COLORS[i] })));
  const rank = allFaculty().map(f => [f.name, mean(records.filter(r => r.faculty === f.name).map(r => r.avg)), 5]).sort((a, b) => b[1] - a[1]);
  $("#ranking").innerHTML = bars(rank);
  $("#recent").innerHTML = [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map(r => `<tr><td><strong>${esc(r.roll)}</strong><br><span class="muted">${fdate(r.date)}</span></td><td>${esc(r.faculty)}</td><td>${esc(r.course)}</td><td>${badge(r.avg)}</td></tr>`).join("");
}
 
/* ---------- 5. STUDENT FEEDBACK FORM ---------- */
const ratings = [0, 0, 0, 0];
$("#dept").innerHTML = opts(Object.keys(DEPTS), "Select department");
$("#course").innerHTML = opts([], "Select department first"); $("#faculty").innerHTML = opts([], "Select department first");
$("#dept").onchange = () => { const d = DEPTS[$("#dept").value]; $("#course").innerHTML = opts(d ? d.courses : [], "Select course"); $("#faculty").innerHTML = opts(d ? d.faculty : [], "Select faculty"); };
$("#questions").innerHTML = QUESTIONS.map((q, i) => `<div class="q"><div><strong>${q[0]}</strong><small>${q[1]}</small></div><div class="rate"><div class="stars" data-q="${i}">${[5, 4, 3, 2, 1].map(v => `<button type="button" data-v="${v}" aria-label="${v} star">★</button>`).join("")}</div><em id="w${i}"></em></div></div>`).join("");
$$(".stars button").forEach(b => b.onclick = () => {
  const i = +b.parentElement.dataset.q, v = +b.dataset.v; ratings[i] = v;
  $$("button", b.parentElement).forEach(x => x.classList.toggle("on", +x.dataset.v <= v)); $("#w" + i).textContent = WORDS[v]; setErr("ratings", "");
});
$("#comment").oninput = () => $("#count").textContent = $("#comment").value.length;
$("#roll").oninput = e => { e.target.value = e.target.value.toUpperCase(); setErr("roll", ""); };
["dept", "course", "faculty"].forEach(id => $("#" + id).addEventListener("change", () => setErr(id, "")));
function setErr(f, msg) { const e = $(`[data-err="${f}"]`); e.textContent = msg; const fld = e.closest(".field"); if (fld) fld.classList.toggle("bad", !!msg); }
function resetForm() { ratings.fill(0); $$(".stars button").forEach(b => b.classList.remove("on")); QUESTIONS.forEach((q, i) => $("#w" + i).textContent = ""); $("#count").textContent = 0; $$(".err").forEach(e => e.textContent = ""); $$(".bad").forEach(e => e.classList.remove("bad")); }
$("#reset").onclick = () => setTimeout(() => { resetForm(); $("#dept").onchange(); }, 0);
 
$("#fb-form").onsubmit = e => {
  e.preventDefault();
  const v = { roll: $("#roll").value.trim().toUpperCase(), dept: $("#dept").value, course: $("#course").value, faculty: $("#faculty").value };
  const errs = {};
  if (!v.roll) errs.roll = "Roll number is required."; else if (!/^[A-Z0-9\/-]{4,20}$/.test(v.roll)) errs.roll = "Use 4–20 letters or numbers (- and / allowed).";
  ["dept", "course", "faculty"].forEach(k => { if (!v[k]) errs[k] = "Please select an option."; });
  if (ratings.includes(0)) errs.ratings = "Please rate all four questions.";
  ["roll", "dept", "course", "faculty", "ratings"].forEach(k => setErr(k, errs[k] || ""));
  if (Object.keys(errs).length) { toast("Please fix the highlighted fields.", "error"); return; }
  if (records.some(r => r.roll === v.roll && r.faculty === v.faculty && r.course === v.course)) { setErr("roll", "You already rated this faculty for this course."); toast("Duplicate feedback blocked.", "error"); return; }
  records.push({ id: "N" + Date.now(), ...v, q: [...ratings], avg: mean(ratings), comment: $("#comment").value.trim(), date: new Date().toISOString() });
  save(); unread = true; renderBell(); e.target.reset(); resetForm(); $("#dept").onchange();
  toast("Thank you! Your feedback was submitted successfully."); setTimeout(() => show("dashboard"), 1200);
};
 
/* ---------- 6. ADMIN PANEL ---------- */
const sort = { key: "date", dir: -1 };
$("#f-dept").innerHTML = opts(Object.keys(DEPTS), "All departments");
function fillAdminLists() {
  const d = $("#f-dept").value, fac = $("#f-faculty").value, cou = $("#f-course").value;
  const F = d ? DEPTS[d].faculty : allFaculty().map(f => f.name), C = d ? DEPTS[d].courses : Object.values(DEPTS).flatMap(x => x.courses);
  $("#f-faculty").innerHTML = opts(F, "All faculty"); $("#f-course").innerHTML = opts(C, "All courses");
  $("#f-faculty").value = F.includes(fac) ? fac : ""; $("#f-course").value = C.includes(cou) ? cou : "";
}
fillAdminLists();
$("#f-dept").onchange = () => { fillAdminLists(); renderAdmin(); };
["f-faculty", "f-course", "f-from", "f-to"].forEach(id => $("#" + id).onchange = renderAdmin);
$("#f-search").oninput = e => { $("#global-search").value = e.target.value; renderAdmin(); };
$("#f-reset").onclick = () => { ["f-search", "f-dept", "f-from", "f-to", "global-search"].forEach(id => $("#" + id).value = ""); fillAdminLists(); renderAdmin(); };
$$("th[data-sort]").forEach(th => th.onclick = () => { sort.dir = sort.key === th.dataset.sort ? -sort.dir : 1; sort.key = th.dataset.sort; renderAdmin(); });
 
function filtered() {
  const q = $("#f-search").value.trim().toLowerCase(), d = $("#f-dept").value, f = $("#f-faculty").value, c = $("#f-course").value;
  const from = $("#f-from").value ? new Date($("#f-from").value) : null, to = $("#f-to").value ? new Date($("#f-to").value + "T23:59:59") : null;
  return records.filter(r => (!d || r.dept === d) && (!f || r.faculty === f) && (!c || r.course === c) && (!from || new Date(r.date) >= from) && (!to || new Date(r.date) <= to)
    && (!q || [r.roll, r.faculty, r.course, r.comment, r.dept].join(" ").toLowerCase().includes(q)))
    .sort((a, b) => (a[sort.key] > b[sort.key] ? 1 : a[sort.key] < b[sort.key] ? -1 : 0) * sort.dir);
}
function renderAdmin() {
  const rows = filtered(), avg = mean(rows.map(r => r.avg)), pos = rows.length ? rows.filter(r => r.avg >= 4).length / rows.length * 100 : 0;
  $("#admin-kpis").innerHTML = [["Matching records", rows.length], ["Average rating", avg.toFixed(2) + " / 5"], ["Positive (4★ and above)", pos.toFixed(0) + "%"]].map(k => `<div class="kpi"><div><span>${k[0]}</span><strong>${k[1]}</strong></div></div>`).join("");
  $("#q-avg").innerHTML = bars(QUESTIONS.map((q, i) => [q[0], mean(rows.map(r => r.q[i])), 5]));
  $("#dist").innerHTML = bars([5, 4, 3, 2, 1].map(s => [s + " star" + (s > 1 ? "s" : ""), rows.filter(r => Math.round(r.avg) === s).length, Math.max(1, rows.length)]));
  $$("th[data-sort]").forEach(th => th.textContent = th.textContent.replace(/ [▲▼]$/, "") + (th.dataset.sort === sort.key ? (sort.dir > 0 ? " ▲" : " ▼") : ""));
  $("#admin-rows").innerHTML = rows.map(r => `<tr><td>${fdate(r.date)}</td><td><strong>${esc(r.roll)}</strong></td><td>${esc(r.dept)}</td><td>${esc(r.faculty)}</td><td>${esc(r.course)}</td><td>${badge(r.avg)}</td><td class="wrap">${esc(r.comment) || "—"}</td></tr>`).join("");
  $("#empty").hidden = rows.length > 0;
}
$("#export").onclick = () => {
  const cell = v => { let t = String(v); if (/^[=+\-@]/.test(t)) t = "'" + t; return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  const csv = [["Date", "Roll", "Department", "Faculty", "Course", ...QUESTIONS.map(q => q[0]), "Average", "Comment"]]
    .concat(filtered().map(r => [r.date, r.roll, r.dept, r.faculty, r.course, ...r.q, r.avg.toFixed(2), r.comment])).map(r => r.map(cell).join(",")).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" })); a.download = "feedback-export.csv"; a.click(); URL.revokeObjectURL(a.href);
  toast("CSV exported.");
};
 
/* ---------- 7. START ---------- */
renderBell(); show("dashboard");
 