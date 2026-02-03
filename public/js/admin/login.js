// Admin Login Page JavaScript

const form = document.getElementById('login-form');
const errorEl = document.getElementById('error');
const themeToggle = document.getElementById('theme-toggle');

// Theme toggle handler
function updateThemeLabel(theme) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  themeToggle.setAttribute('aria-label', 'Toggle theme: switch to ' + nextTheme + ' mode');
}

function toggleLoginTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeLabel(newTheme);
}

themeToggle.addEventListener('click', toggleLoginTheme);
themeToggle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleLoginTheme();
  }
});

// Set initial aria-label
updateThemeLabel(document.documentElement.getAttribute('data-theme') || 'light');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  const username = form.username.value.trim();
  const password = form.password.value;

  if (!username || !password) {
    errorEl.textContent = 'Username and password are required.';
    errorEl.hidden = false;
    if (!username) {
      form.username.focus();
    } else {
      form.password.focus();
    }
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (data.success) {
      window.location.href = '/admin/';
    } else {
      errorEl.textContent = data.error || 'Login failed';
      errorEl.hidden = false;
    }
  } catch (err) {
    errorEl.textContent = 'Connection error. Please try again.';
    errorEl.hidden = false;
  }
});
