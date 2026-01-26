/**
 * SnapStream - Media JavaScript (REAL Flask)
 * GET /api/media
 * DELETE /api/media/<id>
 */

let allMedia = [];
let currentFilter = "all";
let currentSort = "latest";
let searchQuery = "";

document.addEventListener("DOMContentLoaded", async () => {
  if (window.requireAuth) {
    const ok = await window.requireAuth();
    if (!ok) return;
  }

  initFilters();
  initSearch();
  await loadMedia();
});

function initFilters() {
  const filterSelect = document.getElementById("filter-type");
  const sortSelect = document.getElementById("sort-by");

  if (filterSelect) {
    filterSelect.addEventListener("change", (e) => {
      currentFilter = e.target.value;
      renderMediaGrid();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      renderMediaGrid();
    });
  }
}

function initSearch() {
  const searchInput = document.getElementById("search-input");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderMediaGrid();
    });
  }
}

async function loadMedia() {
  const mediaGrid = document.getElementById("media-grid");
  if (!mediaGrid) return;

  mediaGrid.innerHTML = `<p style="padding:20px;color:gray;">Loading media...</p>`;

  try {
    const res = await fetch("/api/media", {
      method: "GET",
      credentials: "include",
    });

    const data = await res.json();
    console.log("MEDIA API =>", data);

    if (!data.success) {
      window.showToast?.(data.message || "Failed to load media", "error");
      mediaGrid.innerHTML = `<p style="padding:20px;color:red;">Failed to load media</p>`;
      return;
    }

    allMedia = data.media || [];
    renderMediaGrid();
  } catch (err) {
    console.error(err);
    window.showToast?.("Server error while loading media", "error");
    mediaGrid.innerHTML = `<p style="padding:20px;color:red;">Server error</p>`;
  }
}

function renderMediaGrid() {
  const mediaGrid = document.getElementById("media-grid");
  if (!mediaGrid) return;

  let filtered = [...allMedia];

  // Filter by type
  if (currentFilter !== "all") {
    filtered = filtered.filter((m) => {
      const t = getTypeGroup(m.type);
      return t === currentFilter;
    });
  }

  // Search
  if (searchQuery) {
    filtered = filtered.filter((m) =>
      (m.filename || "").toLowerCase().includes(searchQuery)
    );
  }

  // Sort
  if (currentSort === "latest") {
    filtered.sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
  } else if (currentSort === "oldest") {
    filtered.sort((a, b) => new Date(a.uploaded_at) - new Date(b.uploaded_at));
  }

  if (filtered.length === 0) {
    mediaGrid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:40px; color:gray;">
        <h3 style="margin-bottom:8px;">No media found</h3>
        <p style="margin-bottom:16px;">Upload your first media file to see it here.</p>
        <a href="/upload" class="btn btn-primary">Upload Media</a>
      </div>
    `;
    return;
  }

  mediaGrid.innerHTML = filtered
    .map((item) => {
      const fileUrl = `/static/uploads/${item.stored_name}`;
      const typeGroup = getTypeGroup(item.type);

      return `
        <div class="media-card" style="padding:14px;">
          
          <div class="media-preview" style="height:160px; display:flex; align-items:center; justify-content:center; background:#f3f4f6; border-radius:12px; overflow:hidden;">
            ${
              typeGroup === "image"
                ? `<img src="${fileUrl}" style="width:100%; height:100%; object-fit:cover;" />`
                : `<div style="font-weight:700; color:#6b7280;">${item.type.toUpperCase()}</div>`
            }
          </div>

          <div class="media-info" style="margin-top:12px;">
            <div class="media-name" title="${item.filename}" style="font-weight:600;">
              ${item.filename}
            </div>

            <div class="media-meta" style="margin-top:6px; display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
              <span style="color:gray; font-size:13px;">${item.uploaded_at}</span>
              <span class="badge badge-secondary">${item.status}</span>
            </div>

            <div style="margin-top:8px; color:gray; font-size:13px;">
              Size: ${item.size_kb} KB
            </div>

            <div class="media-actions" style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
              <a href="${fileUrl}" target="_blank" class="btn btn-secondary btn-sm">View</a>
              <button class="btn btn-danger btn-sm" onclick="deleteMedia('${item.id}')">Delete</button>
            </div>
          </div>

        </div>
      `;
    })
    .join("");
}

function getTypeGroup(ext) {
  ext = (ext || "").toLowerCase();
  if (["jpg", "jpeg", "png", "gif"].includes(ext)) return "image";
  if (["mp4"].includes(ext)) return "video";
  if (["mp3", "wav"].includes(ext)) return "audio";
  return "other";
}

async function deleteMedia(mediaId) {
  const ok = confirm("Are you sure you want to delete this file?");
  if (!ok) return;

  try {
    const res = await fetch(`/api/media/${mediaId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json();

    if (data.success) {
      window.showToast?.("Media deleted successfully", "success");
      await loadMedia();
    } else {
      window.showToast?.(data.message || "Delete failed", "error");
    }
  } catch (err) {
    console.error(err);
    window.showToast?.("Server error while deleting", "error");
  }
}

window.deleteMedia = deleteMedia;
