/**
 * SnapStream - Authentication JavaScript
 * FINAL working version for Flask + AWS
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
    showFieldError("email", "Enter a valid email");
    hasErrors = true;
  }

  if (!password) {
    showFieldError("password", "Password is required");
    hasErrors = true;
  }

  if (hasErrors) return;

  submitBtn.disabled = true;
  submitBtn.innerText = "Logging in...";

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Login failed");
      return;
    }

    window.location.href = data.redirect || "/dashboard";

  } catch (err) {
    console.error(err);
    alert("Server error. Try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Login";
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

  if (!username || username.length < 3) {
    showFieldError("username", "Username must be at least 3 characters");
    hasErrors = true;
  }

  if (!email || !isValidEmail(email)) {
    showFieldError("email", "Valid email is required");
    hasErrors = true;
  }

  if (!password || password.length < 6) {
    showFieldError("password", "Password must be at least 6 characters");
    hasErrors = true;
  }

  if (password !== confirmPassword) {
    showFieldError("confirm-password", "Passwords do not match");
    hasErrors = true;
  }

  if (hasErrors) return;

  submitBtn.disabled = true;
  submitBtn.innerText = "Creating account...";

  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Registration failed");
      return;
    }

    window.location.href = data.redirect || "/login";

  } catch (err) {
    console.error(err);
    alert("Server error. Try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Register";
  }
}

// ===================== HELPERS =====================
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;

  field.classList.add("error");

  const error = document.createElement("span");
  error.className = "form-error";
  error.innerText = message;

  field.parentElement.appendChild(error);
}

function clearFormErrors(form) {
  form.querySelectorAll(".form-error").forEach(e => e.remove());
  form.querySelectorAll(".error").forEach(e => e.classList.remove("error"));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
