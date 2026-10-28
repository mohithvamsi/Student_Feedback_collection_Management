const $ = (selector) => document.querySelector(selector);
const state = { token: null, user: null, mode: "login", feedback: [], toastTimer: null };

const views = ["#hero", "#auth-panel", "#dashboard", "#feedback-panel"];
function showView(view) {
  views.forEach((selector) => { $(selector).hidden = selector !== view; });
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function toast(message, isError = false) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.toggle("error", isError);
  node.hidden = false;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => { node.hidden = true; }, 4200);
}
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`/api${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
function setAuthMode(mode) {
  state.mode = mode;
  const signup = mode === "signup";
  $("#auth-eyebrow").textContent = signup ? "GET STARTED" : "WELCOME BACK";
  $("#auth-title").textContent = signup ? "Create your student account" : "Sign in to CampusVoice";
  $("#auth-description").textContent = signup ? "Join the conversation about better learning." : "Access your feedback dashboard.";
  $("#name-label").hidden = !signup;
  $("#department-label").hidden = !signup;
  $("#full-name").required = signup;
  $("#department").required = false;
  $("#password").autocomplete = signup ? "new-password" : "current-password";
  $("#auth-submit").textContent = signup ? "Create account" : "Sign in";
  $("#switch-auth").firstChild.textContent = signup ? "Already have an account? " : "New here? ";
  $("#switch-auth-button").textContent = signup ? "Sign in" : "Create a student account";
  showView("#auth-panel");
}
function escapeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function statCard(label, value, note, icon) {
  return `<article class="stat-card"><span class="stat-icon" aria-hidden="true">${icon}</span><span class="stat-label">${escapeText(label)}</span><strong>${escapeText(value)}</strong><small>${escapeText(note)}</small></article>`;
}
async function loadDashboard() {
  try {
    const data = await api("/feedback");
    state.feedback = data.feedback;
    $("#welcome-title").textContent = `Welcome, ${state.user.fullName}`;
    $("#welcome-subtitle").textContent = state.user.role === "admin" ? "Review feedback and track course improvements." : "Your feedback helps improve learning.";
    $("#dash-eyebrow").textContent = state.user.role === "admin" ? "ADMIN OVERVIEW" : "YOUR SPACE";
    $("#new-feedback-button").hidden = state.user.role === "admin";
    $("#nav-feedback").hidden = state.user.role === "admin";
    $("#list-title").textContent = state.user.role === "admin" ? "Recent student feedback" : "Your feedback";
    const total = state.feedback.length;
    const reviewed = state.feedback.filter((item) => item.status === "reviewed" || item.status === "resolved").length;
    const avg = total ? (state.feedback.reduce((sum, item) => sum + item.rating, 0) / total).toFixed(1) : "—";
    $("#stats-grid").innerHTML = state.user.role === "admin"
      ? statCard("Feedback received", total, "Across all courses", "✦") + statCard("Reviewed", reviewed, "Reviewed or resolved", "✓") + statCard("Average rating", avg, "Out of 5 stars", "★")
      : statCard("Feedback submitted", total, "Your total contributions", "✦") + statCard("Reviewed", reviewed, "Seen by an administrator", "✓") + statCard("Average rating", avg, "Your submitted ratings", "★");
    renderFeedback();
    $("#nav-dashboard").hidden = false;
    $("#nav-login").hidden = true;
    $("#logout-button").hidden = false;
    showView("#dashboard");
  } catch (error) { toast(error.message, true); }
}
function renderFeedback() {
  const filter = $("#status-filter").value;
  const rows = state.feedback.filter((item) => filter === "all" || item.status === filter);
  if (!rows.length) {
    $("#feedback-list").innerHTML = `<div class="empty-state"><strong>No feedback to show yet</strong><p>${state.user.role === "admin" ? "Student submissions will appear here." : "Your course feedback will appear here after you submit it."}</p>${state.user.role !== "admin" ? '<button class="button" id="empty-new-feedback">Give your first feedback</button>' : ""}</div>`;
    $("#empty-new-feedback")?.addEventListener("click", openFeedback);
    return;
  }
  $("#feedback-list").innerHTML = rows.map((item) => {
    const status = ["submitted", "reviewed", "resolved"].includes(item.status) ? item.status : "submitted";
    const stars = "★".repeat(item.rating) + "☆".repeat(5 - item.rating);
    const adminMeta = state.user.role === "admin" ? `<div class="meta">Student: ${escapeText(item.studentName)} · ${escapeText(item.studentEmail)}</div>` : "";
    const adminAction = state.user.role === "admin" ? `<label class="status-control">Update status<select data-status-id="${escapeText(item.id)}" aria-label="Update status for ${escapeText(item.courseName)}"><option value="submitted" ${status === "submitted" ? "selected" : ""}>Submitted</option><option value="reviewed" ${status === "reviewed" ? "selected" : ""}>Reviewed</option><option value="resolved" ${status === "resolved" ? "selected" : ""}>Resolved</option></select></label>` : "";
    return `<article class="feedback-item"><div class="feedback-item-top"><div><h3>${escapeText(item.courseName)} <span class="meta">${item.courseCode ? `· ${escapeText(item.courseCode)}` : ""}</span></h3><div class="meta">Faculty: ${escapeText(item.facultyName)} · ${escapeText(dateLabel(item.createdAt))}</div>${adminMeta}</div><span class="status ${status}">${escapeText(status)}</span></div><p><span class="stars" aria-label="${item.rating} out of 5 stars">${stars}</span> · ${escapeText(item.category.replaceAll("-", " "))}</p><p>${escapeText(item.comments)}</p>${adminAction}</article>`;
  }).join("");
  document.querySelectorAll("[data-status-id]").forEach((select) => select.addEventListener("change", async () => {
    try {
      await api(`/feedback/${encodeURIComponent(select.dataset.statusId)}/status`, { method: "PATCH", body: JSON.stringify({ status: select.value }) });
      toast("Feedback status updated.");
      await loadDashboard();
    } catch (error) { toast(error.message, true); await loadDashboard(); }
  }));
}
function openFeedback() { $("#feedback-form").reset(); showView("#feedback-panel"); }
async function startSession(data) {
  state.token = data.token;
  state.user = data.user;
  await loadDashboard();
}
$("#nav-login").addEventListener("click", () => setAuthMode("login"));
$("#hero-login").addEventListener("click", () => setAuthMode("login"));
$("#hero-signup").addEventListener("click", () => setAuthMode("signup"));
$("#switch-auth-button").addEventListener("click", () => setAuthMode(state.mode === "login" ? "signup" : "login"));
$("#nav-dashboard").addEventListener("click", loadDashboard);
$("#nav-feedback").addEventListener("click", openFeedback);
$("#new-feedback-button").addEventListener("click", openFeedback);
$("#cancel-feedback").addEventListener("click", loadDashboard);
$("#back-dashboard").addEventListener("click", loadDashboard);
$("#status-filter").addEventListener("change", renderFeedback);
$("#year").textContent = new Date().getFullYear();

$("#auth-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#auth-submit");
  button.disabled = true;
  try {
    const payload = { email: $("#email").value.trim(), password: $("#password").value };
    if (state.mode === "signup") {
      payload.fullName = $("#full-name").value.trim();
      payload.department = $("#department").value.trim();
    }
    const result = await api(state.mode === "signup" ? "/auth/register" : "/auth/login", { method: "POST", body: JSON.stringify(payload) });
    await startSession(result);
    toast(state.mode === "signup" ? "Account created. Welcome to CampusVoice!" : "Signed in successfully.");
  } catch (error) { toast(error.message, true); }
  finally { button.disabled = false; }
});

$("#feedback-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#submit-feedback");
  const rating = Number(document.querySelector('input[name="rating"]:checked')?.value);
  const payload = {
    courseName: $("#course-name").value.trim(),
    courseCode: $("#course-code").value.trim(),
    facultyName: $("#faculty-name").value.trim(),
    rating,
    category: $("#category").value,
    comments: $("#comments").value.trim()
  };
  button.disabled = true;
  try {
    await api("/feedback", { method: "POST", body: JSON.stringify(payload) });
    toast("Thank you! Your feedback has been submitted.");
    await loadDashboard();
  } catch (error) { toast(error.message, true); }
  finally { button.disabled = false; }
});

$("#logout-button").addEventListener("click", () => {
  state.token = null;
  state.user = null;
  state.feedback = [];
  $("#nav-dashboard").hidden = true;
  $("#nav-feedback").hidden = true;
  $("#nav-login").hidden = false;
  $("#logout-button").hidden = true;
  showView("#hero");
  toast("You have signed out.");
});

(async function init() {
  try {
    const health = await fetch("/api/health");
    if (!health.ok) throw new Error();
  } catch { toast("The server is not responding. Start the backend and refresh.", true); }
})();
