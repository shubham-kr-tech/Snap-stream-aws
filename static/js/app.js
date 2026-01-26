/**
 * SnapStream - Main Application JavaScript
 * Common functionality used across all pages
 */

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});

/**
 * Initialize the application
 */
function initializeApp() {
  // Ensure toast container exists early
  createToastContainer();

  initNavbar();
  initUserDropdown();
  initSidebar();
  initTheme();

  // update auth UI based on Flask session
  updateAuthUI();
}

/**
 * Initialize navbar functionality
 */
function initNavbar() {
  const navbarToggle = document.querySelector(".navbar-toggle");
  const navbarNav = document.querySelector(".navbar-nav");

  if (navbarToggle && navbarNav) {
    navbarToggle.addEventListener("click", () => {
      navbarNav.classList.toggle("active");
    });

    // Close navbar when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".navbar")) {
        navbarNav.classList.remove("active");
      }
    });
  }
}

/**
 * Initialize user dropdown
 */
function initUserDropdown() {
  const userDropdown = document.querySelector(".user-dropdown");

  if (userDropdown) {
    const toggle = userDropdown.querySelector(".user-dropdown-toggle");

    if (toggle) {
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle("active");
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener("click", () => {
      userDropdown.classList.remove("active");
    });
  }
}

/**
 * Initialize sidebar functionality
 */
function initSidebar() {
  const sidebarToggle = document.querySelector(".sidebar-toggle");
  const sidebar = document.querySelector(".sidebar");

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }

  // Active link fix (supports /dashboard and /dashboard.html both)
  const currentPath = window.location.pathname.replace(".html", "");
  const sidebarLinks = document.querySelectorAll(".sidebar-link");

  sidebarLinks.forEach((link) => {
    const href = (link.getAttribute("href") || "").replace(".html", "");

    if (href === currentPath) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

/**
 * Initialize theme (dark/light mode)
 */
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  const themeToggle = document.querySelector(".theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
    });
  }
}

/**
 * Fetch current logged-in user from Flask session
 */
async function getCurrentUser() {
  try {
    const res = await fetch("/api/me", {
      method: "GET",
      credentials: "include",
      cache: "no-store", // 🔥 important: prevents browser caching old session response
    });

    const data = await res.json();

    if (res.ok && data.success) {
      return data.user;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Update UI based on authentication state (SESSION BASED)
 */
async function updateAuthUI() {
  const authButtons = document.querySelector(".auth-buttons");
  const userDropdown = document.querySelector(".user-dropdown");
  const usernameDisplay = document.querySelector(".username-display");
  const userAvatar = document.querySelector(".user-avatar");

  const user = await getCurrentUser();

  if (user) {
    // logged in
    if (authButtons) authButtons.classList.add("hidden");
    if (userDropdown) userDropdown.classList.remove("hidden");

    const uname = user.username || "User";
    if (usernameDisplay) usernameDisplay.textContent = uname;
    if (userAvatar) userAvatar.textContent = uname.charAt(0).toUpperCase();
  } else {
    // not logged in
    if (authButtons) authButtons.classList.remove("hidden");
    if (userDropdown) userDropdown.classList.add("hidden");

    if (usernameDisplay) usernameDisplay.textContent = "";
    if (userAvatar) userAvatar.textContent = "U";
  }
}

/**
 * Check if user is authenticated (SESSION BASED)
 */
async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

/**
 * Require authentication - redirect to login if not authenticated
 * Use this on protected pages (dashboard/upload/media etc.)
 */
async function requireAuth() {
  const ok = await isAuthenticated();
  if (!ok) {
    window.location.href = "/login";
    return false;
  }
  return true;
}

/**
 * Logout user (SESSION + localStorage clear)
 */
async function logout() {
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch (e) {}

  // clear old localStorage (optional but recommended)
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  localStorage.removeItem("rememberMe");

  showToast("Logged out successfully", "success");

  // direct redirect (no delay)
  setTimeout(() => {
    window.location.href = "/login";
  }, 300);
}

/**
 * Show toast notification
 */
function showToast(message, type = "info", title = "") {
  const container =
    document.querySelector(".toast-container") || createToastContainer();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const icons = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${title}</div>` : ""}
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("hiding");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

/**
 * Create toast container if it doesn't exist
 */
function createToastContainer() {
  let container = document.querySelector(".toast-container");
  if (container) return container;

  container = document.createElement("div");
  container.className = "toast-container";
  document.body.appendChild(container);
  return container;
}

// Export
window.showToast = showToast;
window.logout = logout;
window.updateAuthUI = updateAuthUI;
window.requireAuth = requireAuth;
window.isAuthenticated = isAuthenticated;
