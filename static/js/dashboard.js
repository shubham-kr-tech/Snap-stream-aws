/**
 * SnapStream - Dashboard JavaScript (REAL Flask)
 * Loads stats + recent activity from Flask backend
 * GET /api/dashboard/stats
 * GET /api/dashboard/activity
 */

document.addEventListener("DOMContentLoaded", async () => {
  // 🔥 protect page (if app.js provides requireAuth)
  if (window.requireAuth) {
    const ok = await window.requireAuth();
    if (!ok) return;
  }

  await initDashboard();
});

/**
 * Initialize dashboard
 */
async function initDashboard() {
  await Promise.all([loadDashboardStats(), loadRecentActivity()]);
}

/**
 * Load dashboard statistics (REAL)
 */
async function loadDashboardStats() {
  try {
    const res = await fetch("/api/dashboard/stats", {
      method: "GET",
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      console.log("Stats API error:", data);
      return;
    }

    renderStats(data);
  } catch (error) {
    console.error("Failed to load stats:", error);
    window.showToast?.("Failed to load dashboard stats", "error");
  }
}

/**
 * Render statistics cards
 */
function renderStats(data) {
  const totalUploads = document.getElementById("total-uploads");
  const processing = document.getElementById("processing");
  const completed = document.getElementById("completed");
  const failed = document.getElementById("failed");

  if (totalUploads) totalUploads.textContent = data.total_uploads ?? 0;
  if (processing) processing.textContent = data.processing ?? 0;
  if (completed) completed.textContent = data.completed ?? 0;
  if (failed) failed.textContent = data.failed ?? 0;
}

/**
 * Load recent activity (REAL)
 */
async function loadRecentActivity() {
  const activityList = document.getElementById("activity-list");
  if (!activityList) return;

  // Skeleton
  activityList.innerHTML = createActivitySkeleton(5);

  try {
    const res = await fetch("/api/dashboard/activity", {
      method: "GET",
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      console.log("Activity API error:", data);
      activityList.innerHTML =
        '<p class="text-center" style="padding: 2rem; color: var(--gray);">Failed to load recent activity</p>';
      return;
    }

    const activities = data.activity || [];

    if (activities.length > 0) {
      renderActivity(activities);
    } else {
      renderEmptyActivity();
    }
  } catch (error) {
    console.error("Failed to load activity:", error);
    activityList.innerHTML =
      '<p class="text-center" style="padding: 2rem; color: var(--gray);">Failed to load recent activity</p>';
  }
}

/**
 * Render activity list
 */
function renderActivity(activities) {
  const activityList = document.getElementById("activity-list");

  activityList.innerHTML = activities
    .map((activity) => {
      const type = getMediaType(activity.type);
      const statusClass = getStatusBadgeClass(activity.status);

      return `
        <div class="activity-item" style="display:flex; gap:12px; padding:12px 16px; border-bottom:1px solid var(--border);">
          <div class="activity-icon ${type}" style="display:flex; align-items:center; justify-content:center;">
            ${getActivityIcon(type)}
          </div>

          <div class="activity-content" style="flex:1; min-width:0;">
            <div class="activity-title" style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${activity.filename}
            </div>

            <div class="activity-meta" style="display:flex; gap:10px; align-items:center; margin-top:4px; font-size:12px; color:var(--gray);">
              <span class="badge ${statusClass}">${activity.status}</span>
              <span>${formatDate(activity.uploaded_at)}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

/**
 * Render empty activity state
 */
function renderEmptyActivity() {
  const activityList = document.getElementById("activity-list");

  activityList.innerHTML = `
    <div class="empty-state" style="padding: 2rem; text-align:center;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
        <polyline points="13 2 13 9 20 9"></polyline>
      </svg>
      <h3>No recent activity</h3>
      <p>Upload your first media file to get started</p>
      <a href="/upload" class="btn btn-primary">Upload Media</a>
    </div>
  `;
}

/**
 * Helpers
 */
function getMediaType(extOrType) {
  const val = (extOrType || "").toLowerCase();

  // backend sends "jpg" / "png" / "mp4" etc
  if (["jpg", "jpeg", "png", "gif"].includes(val)) return "image";
  if (["mp4"].includes(val)) return "video";
  if (["mp3", "wav"].includes(val)) return "audio";

  // if already image/video/audio
  if (["image", "video", "audio"].includes(val)) return val;

  return "image";
}

function getStatusBadgeClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "badge-success";
  if (s === "processing") return "badge-warning";
  if (s === "failed") return "badge-danger";
  return "badge-secondary";
}

function formatDate(dateString) {
  // backend gives: "2026-01-25 17:39:56"
  if (!dateString) return "";
  return dateString; // keep simple
}

/**
 * Icons
 */
function getActivityIcon(type) {
  const icons = {
    image: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
    video: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`,
    audio: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`,
  };

  return icons[type] || icons.image;
}

/**
 * Skeleton loader
 */
function createActivitySkeleton(count) {
  let html = "";
  for (let i = 0; i < count; i++) {
    html += `
      <div class="activity-item" style="display:flex; gap:12px; padding:12px 16px; border-bottom:1px solid var(--border);">
        <div class="skeleton" style="width: 2.5rem; height: 2.5rem; border-radius: var(--radius);"></div>
        <div style="flex: 1;">
          <div class="skeleton" style="width: 60%; height: 1rem; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="width: 40%; height: 0.75rem;"></div>
        </div>
      </div>
    `;
  }
  return html;
}
