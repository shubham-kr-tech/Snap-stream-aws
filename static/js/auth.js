/**
 * SnapStream - Authentication JavaScript
 * REAL backend integration with Flask APIs
 */

document.addEventListener("DOMContentLoaded", () => {
  initAuthForms();
});

function initAuthForms() {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  if (registerForm) registerForm.addEventListener("submit", handleRegister);
}

// ===================== LOGIN =====================
async function handleLogin(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const email = form.querySelector("#email").value.trim();
  const password = form.querySelector("#password").value;

  clearFormErrors(form);

  let hasErrors = false;

  if (!email) {
    showFieldError("email", "Email is required");
    hasErrors = true;
  } else if (!isValidEmail(email)) {
    showFieldError("email", "Please enter a valid email");
    hasErrors = true;
  }

  if (!password) {
    showFieldError("password", "Password is required");
    hasErrors = true;
  }

  if (hasErrors) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML =
    '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span> Logging in...';

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (window.showToast) window.showToast(data.message || "Login failed", "error");
      else console.log(data.message || "Login failed");
      return;
    }

    // ✅ Toast message (no OK button)
    if (window.showToast) window.showToast("Login successful! Redirecting...", "success");

    // redirect directly
    setTimeout(() => {
      window.location.href = data.redirect || "/dashboard";
    }, 500);
  } catch (err) {
    if (window.showToast) window.showToast("Server error. Try again.", "error");
    console.log(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Login";
  }
}

// ===================== REGISTER =====================
async function handleRegister(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const username = form.querySelector("#username").value.trim();
  const email = form.querySelector("#email").value.trim();
  const password = form.querySelector("#password").value;
  const confirmPassword = form.querySelector("#confirm-password").value;

  clearFormErrors(form);

  let hasErrors = false;

  if (!username) {
    showFieldError("username", "Username is required");
    hasErrors = true;
  } else if (username.length < 3) {
    showFieldError("username", "Username must be at least 3 characters");
    hasErrors = true;
  }

  if (!email) {
    showFieldError("email", "Email is required");
    hasErrors = true;
  } else if (!isValidEmail(email)) {
    showFieldError("email", "Please enter a valid email");
    hasErrors = true;
  }

  if (!password) {
    showFieldError("password", "Password is required");
    hasErrors = true;
  } else if (password.length < 6) {
    showFieldError("password", "Password must be at least 6 characters");
    hasErrors = true;
  }

  if (!confirmPassword) {
    showFieldError("confirm-password", "Please confirm your password");
    hasErrors = true;
  } else if (password !== confirmPassword) {
    showFieldError("confirm-password", "Passwords do not match");
    hasErrors = true;
  }

  if (hasErrors) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML =
    '<span class="spinner" style="width:1rem;height:1rem;border-width:2px;"></span> Creating account...';

  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (window.showToast) window.showToast(data.message || "Registration failed", "error");
      return;
    }

    // ✅ Toast message (no OK button)
    if (window.showToast) window.showToast("Account created successfully! Please login.", "success");

    setTimeout(() => {
      window.location.href = data.redirect || "/login";
    }, 700);
  } catch (err) {
    if (window.showToast) window.showToast("Server error. Try again.", "error");
    console.log(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Register";
  }
}

// ===================== HELPERS =====================
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.classList.add("error");

    const existingError = field.parentElement.querySelector(".form-error");
    if (existingError) existingError.remove();

    const errorSpan = document.createElement("span");
    errorSpan.className = "form-error";
    errorSpan.textContent = message;
    field.parentElement.appendChild(errorSpan);
  }
}

function clearFormErrors(form) {
  form.querySelectorAll(".form-input.error").forEach((input) => {
    input.classList.remove("error");
  });
  form.querySelectorAll(".form-error").forEach((error) => {
    error.remove();
  });
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
